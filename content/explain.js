/**
 * Includs Extension - Explain Feature
 * 
 * Uses OpenAI API to explain/simplify selected text.
 * Calls API directly from content script.
 */

const IncludsExplain = (function() {
  'use strict';
  
  // Configuration
  const CONFIG = {
    maxTextLength: 5000,
    minTextLength: 10,
    defaultModel: 'gpt-4o-mini',
    defaultEndpoint: 'https://api.openai.com/v1/chat/completions'
  };
  
  // Default system prompt
  const DEFAULT_PROMPT = `You are a helpful assistant that explains text in simple, clear language. 
When given text, provide a brief, easy-to-understand explanation or simplification.
- Use simple words and short sentences
- Avoid jargon unless you explain it
- Be concise but thorough
- If the text is already simple, just provide a brief summary`;

  /**
   * Get OpenAI settings from storage
   */
  async function getSettings() {
    try {
      // API key from local storage (never synced)
      const localData = await chrome.storage.local.get(['openaiApiKey']);
      
      // Other settings from sync storage
      const syncData = await chrome.storage.sync.get({
        openaiModel: CONFIG.defaultModel,
        openaiEndpoint: CONFIG.defaultEndpoint,
        openaiPrompt: DEFAULT_PROMPT
      });
      
      return {
        apiKey: localData.openaiApiKey || '',
        model: syncData.openaiModel,
        endpoint: syncData.openaiEndpoint,
        prompt: syncData.openaiPrompt
      };
    } catch (error) {
      console.error('[Includs Explain] Error loading settings:', error);
      return {
        apiKey: '',
        model: CONFIG.defaultModel,
        endpoint: CONFIG.defaultEndpoint,
        prompt: DEFAULT_PROMPT
      };
    }
  }
  
  /**
   * Validate text before sending to API
   */
  function validateText(text) {
    if (!text || typeof text !== 'string') {
      return { valid: false, error: 'No text provided' };
    }
    
    const trimmed = text.trim();
    
    if (trimmed.length < CONFIG.minTextLength) {
      return { valid: false, error: 'Text is too short. Please select more text.' };
    }
    
    if (trimmed.length > CONFIG.maxTextLength) {
      return { valid: false, error: `Text is too long (${trimmed.length} chars). Maximum is ${CONFIG.maxTextLength} characters.` };
    }
    
    return { valid: true, text: trimmed };
  }
  
  /**
   * Call OpenAI API to explain text
   */
  async function explainText(text) {
    // Validate text
    const validation = validateText(text);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    // Get settings
    const settings = await getSettings();
    
    if (!settings.apiKey) {
      return { 
        success: false, 
        error: 'OpenAI API key not configured. Please add your API key in the extension Options.' 
      };
    }
    
    try {
      console.log('[Includs Explain] Sending request to OpenAI...');
      
      const response = await fetch(settings.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({
          model: settings.model,
          messages: [
            {
              role: 'system',
              content: settings.prompt
            },
            {
              role: 'user',
              content: `Please explain or simplify the following text:\n\n${validation.text}`
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Includs Explain] API error:', response.status, errorData);
        
        if (response.status === 401) {
          return { success: false, error: 'Invalid OpenAI API key. Please check your key in Options.' };
        }
        if (response.status === 429) {
          return { success: false, error: 'Rate limit exceeded. Please try again later.' };
        }
        if (response.status === 400) {
          return { success: false, error: errorData.error?.message || 'Invalid request to OpenAI.' };
        }
        
        return { success: false, error: `OpenAI API error: ${response.status}` };
      }
      
      const data = await response.json();
      const explanation = data.choices?.[0]?.message?.content;
      
      if (!explanation) {
        return { success: false, error: 'No response from OpenAI' };
      }
      
      console.log('[Includs Explain] Received explanation');
      return { success: true, explanation };
      
    } catch (error) {
      console.error('[Includs Explain] Error:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return { success: false, error: 'Network error. Please check your internet connection.' };
      }
      
      return { success: false, error: 'Failed to get explanation. Please try again.' };
    }
  }
  
  /**
   * Get selected text from the page
   */
  function getSelectedText() {
    const selection = window.getSelection();
    return selection ? selection.toString().trim() : '';
  }
  
  /**
   * Detect paragraph at cursor position (fallback if no selection)
   */
  function getParagraphAtCursor() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return '';
    
    const range = selection.getRangeAt(0);
    let node = range.startContainer;
    
    // Walk up to find paragraph-level element
    while (node && node !== document.body) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();
        if (['p', 'article', 'section', 'div', 'li', 'td', 'blockquote'].includes(tagName)) {
          return node.textContent?.trim() || '';
        }
      }
      node = node.parentNode;
    }
    
    return '';
  }
  
  /**
   * Get text to explain (selection or paragraph)
   */
  function getTextToExplain() {
    const selected = getSelectedText();
    if (selected) return { text: selected, source: 'selection' };
    
    const paragraph = getParagraphAtCursor();
    if (paragraph) return { text: paragraph, source: 'paragraph' };
    
    return { text: '', source: 'none' };
  }
  
  // Public API
  return {
    explainText,
    getSelectedText,
    getParagraphAtCursor,
    getTextToExplain,
    validateText
  };
  
})();

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.IncludsExplain = IncludsExplain;
}
