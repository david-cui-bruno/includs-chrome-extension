/**
 * Includs Extension - Service Worker
 * 
 * Minimal service worker that handles:
 * - Opening onboarding on install
 * - TTS relay to offscreen document (Stage 6)
 */

// Open onboarding page on first install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('onboarding/onboarding.html')
    });
    console.log('[Includs] Extension installed, opening onboarding');
  }
});

// Log when service worker starts
console.log('[Includs] Service worker initialized');

// Message listener for future TTS relay (Stage 6)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Includs] Service worker received message:', message.type);
  
  // Placeholder for TTS messages - will be implemented in Stage 6
  if (message.type === 'TTS_SPEAK') {
    console.log('[Includs] TTS_SPEAK received (not yet implemented)');
    sendResponse({ success: false, error: 'TTS not yet implemented' });
  }
  
  return true; // Keep channel open for async response
});
