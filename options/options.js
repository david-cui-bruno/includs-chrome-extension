/**
 * Includs Extension - Options Page
 * 
 * Handles settings management for OpenAI and ElevenLabs API keys,
 * typography defaults, and general settings.
 */

(function() {
  'use strict';
  
  // Default settings
  const DEFAULTS = {
    // Sync storage (global settings)
    sync: {
      enabledByDefault: true,
      fontScale: 1.0,
      lineHeight: 1.5,
      ttsSpeed: 'normal',
      toolbarPosition: 'right',
      explainMode: 'simple',
      helpTipsEnabled: true,
      _version: 1
    },
    // Local storage (API keys, device-specific)
    local: {
      openaiApiKey: '',
      openaiEndpoint: 'https://api.openai.com/v1/chat/completions',
      openaiModel: 'gpt-4o-mini',
      openaiKeyValid: false,
      elevenLabsApiKey: '',
      elevenLabsVoiceId: '',
      elevenLabsKeyValid: false,
      elevenLabsVoices: []
    }
  };
  
  // DOM elements
  const elements = {};
  
  /**
   * Initialize the options page
   */
  async function init() {
    cacheElements();
    bindEvents();
    await loadSettings();
    console.log('[Includs Options] Initialized');
  }
  
  /**
   * Cache DOM element references
   */
  function cacheElements() {
    // OpenAI
    elements.openaiKey = document.getElementById('openai-key');
    elements.openaiEndpoint = document.getElementById('openai-endpoint');
    elements.openaiModel = document.getElementById('openai-model');
    elements.openaiStatus = document.getElementById('openai-status');
    elements.testOpenai = document.getElementById('test-openai');
    elements.explainMode = document.getElementById('explain-mode');
    
    // ElevenLabs
    elements.elevenLabsKey = document.getElementById('elevenlabs-key');
    elements.elevenLabsStatus = document.getElementById('elevenlabs-status');
    elements.testElevenLabs = document.getElementById('test-elevenlabs');
    elements.elevenLabsVoice = document.getElementById('elevenlabs-voice');
    elements.previewVoice = document.getElementById('preview-voice');
    
    // Typography
    elements.fontScale = document.getElementById('font-scale');
    elements.fontScaleValue = document.getElementById('font-scale-value');
    elements.lineHeight = document.getElementById('line-height');
    elements.lineHeightValue = document.getElementById('line-height-value');
    
    // General
    elements.enabledByDefault = document.getElementById('enabled-by-default');
    elements.toolbarPosition = document.getElementById('toolbar-position');
    elements.helpTipsEnabled = document.getElementById('help-tips-enabled');
    
    // Actions
    elements.saveSettings = document.getElementById('save-settings');
    elements.resetSettings = document.getElementById('reset-settings');
    elements.saveStatus = document.getElementById('save-status');
    
    // Footer
    elements.openOnboarding = document.getElementById('open-onboarding');
  }
  
  /**
   * Bind event listeners
   */
  function bindEvents() {
    // Toggle password visibility
    document.querySelectorAll('.toggle-visibility').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const input = document.getElementById(targetId);
        input.type = input.type === 'password' ? 'text' : 'password';
        btn.textContent = input.type === 'password' ? '👁️' : '🙈';
      });
    });
    
    // Test OpenAI key
    elements.testOpenai.addEventListener('click', testOpenAIKey);
    
    // Test ElevenLabs key
    elements.testElevenLabs.addEventListener('click', testElevenLabsKey);
    
    // Preview voice
    elements.previewVoice.addEventListener('click', previewSelectedVoice);
    
    // Slider updates
    elements.fontScale.addEventListener('input', () => {
      elements.fontScaleValue.textContent = Math.round(elements.fontScale.value * 100) + '%';
    });
    
    elements.lineHeight.addEventListener('input', () => {
      elements.lineHeightValue.textContent = elements.lineHeight.value;
    });
    
    // Save settings
    elements.saveSettings.addEventListener('click', saveSettings);
    
    // Reset settings
    elements.resetSettings.addEventListener('click', resetSettings);
    
    // Open onboarding
    elements.openOnboarding.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: chrome.runtime.getURL('onboarding/onboarding.html') });
    });
    
    // Auto-save API keys on blur (for convenience)
    elements.openaiKey.addEventListener('blur', () => {
      if (elements.openaiKey.value) {
        saveApiKey('openai');
      }
    });
    
    elements.elevenLabsKey.addEventListener('blur', () => {
      if (elements.elevenLabsKey.value) {
        saveApiKey('elevenlabs');
      }
    });
  }
  
  /**
   * Load settings from storage
   */
  async function loadSettings() {
    try {
      // Load sync settings
      const syncData = await chrome.storage.sync.get(DEFAULTS.sync);
      
      // Load local settings
      const localData = await chrome.storage.local.get(DEFAULTS.local);
      
      // Populate form
      // OpenAI
      elements.openaiKey.value = localData.openaiApiKey || '';
      elements.openaiEndpoint.value = localData.openaiEndpoint || DEFAULTS.local.openaiEndpoint;
      elements.openaiModel.value = localData.openaiModel || DEFAULTS.local.openaiModel;
      elements.explainMode.value = syncData.explainMode || DEFAULTS.sync.explainMode;
      updateStatus('openai', localData.openaiKeyValid, localData.openaiApiKey);
      
      // ElevenLabs
      elements.elevenLabsKey.value = localData.elevenLabsApiKey || '';
      updateStatus('elevenlabs', localData.elevenLabsKeyValid, localData.elevenLabsApiKey);
      
      // Load voices if key is valid
      if (localData.elevenLabsKeyValid && localData.elevenLabsVoices?.length > 0) {
        populateVoiceDropdown(localData.elevenLabsVoices, localData.elevenLabsVoiceId);
      }
      
      // Typography
      elements.fontScale.value = syncData.fontScale;
      elements.fontScaleValue.textContent = Math.round(syncData.fontScale * 100) + '%';
      elements.lineHeight.value = syncData.lineHeight;
      elements.lineHeightValue.textContent = syncData.lineHeight;
      
      // General
      elements.enabledByDefault.checked = syncData.enabledByDefault;
      elements.toolbarPosition.value = syncData.toolbarPosition;
      elements.helpTipsEnabled.checked = syncData.helpTipsEnabled;
      
      // TTS Speed
      document.querySelector(`input[name="tts-speed"][value="${syncData.ttsSpeed}"]`).checked = true;
      
    } catch (error) {
      console.error('[Includs Options] Error loading settings:', error);
      showSaveStatus('Error loading settings', 'error');
    }
  }
  
  /**
   * Save all settings
   */
  async function saveSettings() {
    try {
      // Get TTS speed
      const ttsSpeed = document.querySelector('input[name="tts-speed"]:checked').value;
      
      // Sync settings
      const syncSettings = {
        enabledByDefault: elements.enabledByDefault.checked,
        fontScale: parseFloat(elements.fontScale.value),
        lineHeight: parseFloat(elements.lineHeight.value),
        ttsSpeed: ttsSpeed,
        toolbarPosition: elements.toolbarPosition.value,
        explainMode: elements.explainMode.value,
        helpTipsEnabled: elements.helpTipsEnabled.checked,
        _version: 1
      };
      
      // Local settings
      const localSettings = {
        openaiEndpoint: elements.openaiEndpoint.value,
        openaiModel: elements.openaiModel.value,
        elevenLabsVoiceId: elements.elevenLabsVoice.value
      };
      
      // Save
      await chrome.storage.sync.set(syncSettings);
      await chrome.storage.local.set(localSettings);
      
      showSaveStatus('Settings saved!', 'success');
      console.log('[Includs Options] Settings saved');
      
    } catch (error) {
      console.error('[Includs Options] Error saving settings:', error);
      showSaveStatus('Error saving settings', 'error');
    }
  }
  
  /**
   * Save API key separately (for auto-save on blur)
   */
  async function saveApiKey(provider) {
    try {
      if (provider === 'openai') {
        await chrome.storage.local.set({ openaiApiKey: elements.openaiKey.value });
      } else if (provider === 'elevenlabs') {
        await chrome.storage.local.set({ elevenLabsApiKey: elements.elevenLabsKey.value });
      }
    } catch (error) {
      console.error(`[Includs Options] Error saving ${provider} key:`, error);
    }
  }
  
  /**
   * Reset settings to defaults
   */
  async function resetSettings() {
    if (!confirm('Are you sure you want to reset all settings to defaults?\n\nNote: API keys will NOT be cleared.')) {
      return;
    }
    
    try {
      // Reset sync storage (except version)
      await chrome.storage.sync.set(DEFAULTS.sync);
      
      // Reset local storage (keep API keys)
      const currentLocal = await chrome.storage.local.get(['openaiApiKey', 'elevenLabsApiKey']);
      await chrome.storage.local.set({
        ...DEFAULTS.local,
        openaiApiKey: currentLocal.openaiApiKey || '',
        elevenLabsApiKey: currentLocal.elevenLabsApiKey || ''
      });
      
      // Reload form
      await loadSettings();
      
      showSaveStatus('Settings reset to defaults', 'success');
      console.log('[Includs Options] Settings reset');
      
    } catch (error) {
      console.error('[Includs Options] Error resetting settings:', error);
      showSaveStatus('Error resetting settings', 'error');
    }
  }
  
  /**
   * Test OpenAI API key
   */
  async function testOpenAIKey() {
    const apiKey = elements.openaiKey.value.trim();
    
    if (!apiKey) {
      showSaveStatus('Please enter an API key first', 'error');
      return;
    }
    
    updateStatus('openai', null); // Loading state
    elements.testOpenai.disabled = true;
    
    try {
      const endpoint = elements.openaiEndpoint.value || DEFAULTS.local.openaiEndpoint;
      const model = elements.openaiModel.value || DEFAULTS.local.openaiModel;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5
        })
      });
      
      if (response.ok) {
        await chrome.storage.local.set({ 
          openaiApiKey: apiKey,
          openaiKeyValid: true 
        });
        updateStatus('openai', true, apiKey);
        showSaveStatus('OpenAI key is valid!', 'success');
      } else {
        const error = await response.json();
        await chrome.storage.local.set({ openaiKeyValid: false });
        updateStatus('openai', false, apiKey);
        showSaveStatus(`OpenAI error: ${error.error?.message || 'Invalid key'}`, 'error');
      }
      
    } catch (error) {
      console.error('[Includs Options] OpenAI test error:', error);
      await chrome.storage.local.set({ openaiKeyValid: false });
      updateStatus('openai', false, apiKey);
      showSaveStatus('Could not connect to OpenAI', 'error');
    }
    
    elements.testOpenai.disabled = false;
  }
  
  /**
   * Test ElevenLabs API key and load voices
   */
  async function testElevenLabsKey() {
    // Get and clean the API key
    let apiKey = elements.elevenLabsKey.value;
    // Remove any whitespace, newlines, or hidden characters
    apiKey = apiKey.replace(/\s/g, '').trim();
    
    if (!apiKey) {
      showSaveStatus('Please enter an API key first', 'error');
      return;
    }
    
    console.log('[Includs Options] Testing ElevenLabs key');
    console.log('[Includs Options] Key length:', apiKey.length);
    console.log('[Includs Options] Key starts with:', apiKey.substring(0, 5));
    
    updateStatus('elevenlabs', null); // Loading state
    elements.testElevenLabs.disabled = true;
    
    try {
      console.log('[Includs Options] Making request to ElevenLabs /v1/voices...');
      
      // Use /v1/voices endpoint directly - it has broader permissions
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'xi-api-key': apiKey
        }
      });
      
      console.log('[Includs Options] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        const voices = data.voices || [];
        
        console.log('[Includs Options] Voices found:', voices.length);
        
        await chrome.storage.local.set({ 
          elevenLabsApiKey: apiKey,
          elevenLabsKeyValid: true,
          elevenLabsVoices: voices.map(v => ({ 
            voice_id: v.voice_id, 
            name: v.name,
            preview_url: v.preview_url 
          }))
        });
        
        populateVoiceDropdown(voices);
        updateStatus('elevenlabs', true, apiKey);
        showSaveStatus(`ElevenLabs key valid! ${voices.length} voices available.`, 'success');
        
      } else {
        const errorText = await response.text();
        console.error('[Includs Options] ElevenLabs error response:', errorText);
        await chrome.storage.local.set({ elevenLabsKeyValid: false });
        updateStatus('elevenlabs', false, apiKey);
        
        // Parse error for better message
        try {
          const errorJson = JSON.parse(errorText);
          const message = errorJson.detail?.message || errorJson.detail || 'Invalid key or missing permissions';
          showSaveStatus(`ElevenLabs: ${message}`, 'error');
        } catch {
          showSaveStatus(`ElevenLabs error (${response.status})`, 'error');
        }
      }
      
    } catch (error) {
      console.error('[Includs Options] ElevenLabs test error:', error);
      console.error('[Includs Options] Error stack:', error.stack);
      await chrome.storage.local.set({ elevenLabsKeyValid: false });
      updateStatus('elevenlabs', false, apiKey);
      showSaveStatus('Could not connect to ElevenLabs: ' + error.message, 'error');
    }
    
    elements.testElevenLabs.disabled = false;
  }
  
  /**
   * Populate voice dropdown
   */
  function populateVoiceDropdown(voices, selectedId = '') {
    elements.elevenLabsVoice.innerHTML = '';
    elements.elevenLabsVoice.disabled = false;
    elements.previewVoice.disabled = false;
    
    voices.forEach(voice => {
      const option = document.createElement('option');
      option.value = voice.voice_id;
      option.textContent = voice.name;
      option.dataset.previewUrl = voice.preview_url || '';
      if (voice.voice_id === selectedId) {
        option.selected = true;
      }
      elements.elevenLabsVoice.appendChild(option);
    });
    
    // Select first if none selected
    if (!selectedId && voices.length > 0) {
      elements.elevenLabsVoice.value = voices[0].voice_id;
    }
  }
  
  /**
   * Preview selected voice
   */
  async function previewSelectedVoice() {
    const selectedOption = elements.elevenLabsVoice.selectedOptions[0];
    const previewUrl = selectedOption?.dataset.previewUrl;
    
    if (previewUrl) {
      const audio = new Audio(previewUrl);
      audio.play();
    } else {
      showSaveStatus('No preview available for this voice', 'error');
    }
  }
  
  /**
   * Update status indicator
   */
  function updateStatus(provider, isValid, hasKey = null) {
    const statusEl = provider === 'openai' ? elements.openaiStatus : elements.elevenLabsStatus;
    const dotEl = statusEl.querySelector('.status-dot');
    const textEl = statusEl.querySelector('.status-text');
    
    dotEl.classList.remove('not-set', 'valid', 'invalid', 'loading');
    
    if (isValid === null) {
      // Loading
      dotEl.classList.add('loading');
      textEl.textContent = 'Testing...';
    } else if (isValid) {
      dotEl.classList.add('valid');
      textEl.textContent = 'Valid';
    } else if (hasKey) {
      dotEl.classList.add('invalid');
      textEl.textContent = 'Invalid';
    } else {
      dotEl.classList.add('not-set');
      textEl.textContent = 'Not set';
    }
  }
  
  /**
   * Show save status message
   */
  function showSaveStatus(message, type) {
    elements.saveStatus.textContent = message;
    elements.saveStatus.className = 'save-status ' + type;
    
    // Clear after 3 seconds
    setTimeout(() => {
      elements.saveStatus.textContent = '';
      elements.saveStatus.className = 'save-status';
    }, 3000);
  }
  
  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', init);
  
})();
