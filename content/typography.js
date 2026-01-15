/**
 * Includs Extension - Typography Controls
 * 
 * Manages font size and line height adjustments on pages.
 * Stores settings per-site or uses global defaults.
 */

const IncludsTypography = (function() {
  'use strict';
  
  // Configuration
  const CONFIG = {
    fontScale: {
      min: 0.8,
      max: 2.0,
      step: 0.1,
      default: 1.0
    },
    lineHeight: {
      min: 1.0,
      max: 2.5,
      step: 0.1,
      default: 1.5
    }
  };
  
  // Current state
  let currentSettings = {
    fontScale: CONFIG.fontScale.default,
    lineHeight: CONFIG.lineHeight.default
  };
  
  // Style element reference
  let styleElement = null;
  
  /**
   * Initialize typography controls
   */
  async function init() {
    await loadSettings();
    injectStyles();
    applySettings();
    console.log('[Includs Typography] Initialized with settings:', currentSettings);
  }
  
  /**
   * Load settings from storage
   */
  async function loadSettings() {
    try {
      // Get global defaults from sync storage
      const syncData = await chrome.storage.sync.get({
        fontScale: CONFIG.fontScale.default,
        lineHeight: CONFIG.lineHeight.default
      });
      
      // Check for per-site override in local storage
      const origin = window.location.origin;
      const siteKey = `site_${origin}`;
      const localData = await chrome.storage.local.get(siteKey);
      const siteSettings = localData[siteKey];
      
      // Use site settings if available, otherwise use global defaults
      if (siteSettings && (siteSettings.fontScale !== undefined || siteSettings.lineHeight !== undefined)) {
        currentSettings.fontScale = siteSettings.fontScale ?? syncData.fontScale;
        currentSettings.lineHeight = siteSettings.lineHeight ?? syncData.lineHeight;
        console.log('[Includs Typography] Using per-site settings for', origin);
      } else {
        currentSettings.fontScale = syncData.fontScale;
        currentSettings.lineHeight = syncData.lineHeight;
        console.log('[Includs Typography] Using global settings');
      }
      
    } catch (error) {
      console.error('[Includs Typography] Error loading settings:', error);
    }
  }
  
  /**
   * Save current settings
   */
  async function saveSettings(savePerSite = true) {
    try {
      if (savePerSite) {
        // Save as per-site override
        const origin = window.location.origin;
        const siteKey = `site_${origin}`;
        
        // Get existing site settings
        const localData = await chrome.storage.local.get(siteKey);
        const existingSettings = localData[siteKey] || {};
        
        // Merge with new typography settings
        await chrome.storage.local.set({
          [siteKey]: {
            ...existingSettings,
            fontScale: currentSettings.fontScale,
            lineHeight: currentSettings.lineHeight
          }
        });
        
        console.log('[Includs Typography] Saved per-site settings for', origin);
      } else {
        // Save as global defaults
        await chrome.storage.sync.set({
          fontScale: currentSettings.fontScale,
          lineHeight: currentSettings.lineHeight
        });
        
        console.log('[Includs Typography] Saved global settings');
      }
    } catch (error) {
      console.error('[Includs Typography] Error saving settings:', error);
    }
  }
  
  /**
   * Inject the style element
   */
  function injectStyles() {
    if (styleElement) return;
    
    styleElement = document.createElement('style');
    styleElement.id = 'includs-typography-styles';
    styleElement.setAttribute('data-includs', 'true');
    document.head.appendChild(styleElement);
  }
  
  /**
   * Apply current settings to the page
   */
  function applySettings() {
    if (!styleElement) {
      injectStyles();
    }
    
    // Only apply if settings differ from defaults (to minimize page impact)
    const fontScaleChanged = Math.abs(currentSettings.fontScale - 1.0) > 0.01;
    const lineHeightChanged = Math.abs(currentSettings.lineHeight - 1.5) > 0.01;
    
    if (!fontScaleChanged && !lineHeightChanged) {
      styleElement.textContent = '';
      return;
    }
    
    // Build CSS
    let css = ':root { ';
    css += `--includs-font-scale: ${currentSettings.fontScale}; `;
    css += `--includs-line-height: ${currentSettings.lineHeight}; `;
    css += '}\n';
    
    // Apply font scale
    if (fontScaleChanged) {
      css += `
        html {
          font-size: calc(100% * var(--includs-font-scale)) !important;
        }
      `;
    }
    
    // Apply line height
    if (lineHeightChanged) {
      css += `
        body, p, li, td, th, dd, dt, span, div, article, section, main {
          line-height: var(--includs-line-height) !important;
        }
      `;
    }
    
    styleElement.textContent = css;
    console.log('[Includs Typography] Applied settings:', currentSettings);
  }
  
  /**
   * Increase font size
   */
  function increaseFontSize() {
    const newScale = Math.min(currentSettings.fontScale + CONFIG.fontScale.step, CONFIG.fontScale.max);
    if (newScale !== currentSettings.fontScale) {
      currentSettings.fontScale = Math.round(newScale * 10) / 10; // Avoid floating point issues
      applySettings();
      saveSettings();
      return true;
    }
    return false;
  }
  
  /**
   * Decrease font size
   */
  function decreaseFontSize() {
    const newScale = Math.max(currentSettings.fontScale - CONFIG.fontScale.step, CONFIG.fontScale.min);
    if (newScale !== currentSettings.fontScale) {
      currentSettings.fontScale = Math.round(newScale * 10) / 10;
      applySettings();
      saveSettings();
      return true;
    }
    return false;
  }
  
  /**
   * Increase line height
   */
  function increaseLineHeight() {
    const newHeight = Math.min(currentSettings.lineHeight + CONFIG.lineHeight.step, CONFIG.lineHeight.max);
    if (newHeight !== currentSettings.lineHeight) {
      currentSettings.lineHeight = Math.round(newHeight * 10) / 10;
      applySettings();
      saveSettings();
      return true;
    }
    return false;
  }
  
  /**
   * Decrease line height
   */
  function decreaseLineHeight() {
    const newHeight = Math.max(currentSettings.lineHeight - CONFIG.lineHeight.step, CONFIG.lineHeight.min);
    if (newHeight !== currentSettings.lineHeight) {
      currentSettings.lineHeight = Math.round(newHeight * 10) / 10;
      applySettings();
      saveSettings();
      return true;
    }
    return false;
  }
  
  /**
   * Reset to defaults
   */
  async function resetToDefaults() {
    currentSettings.fontScale = CONFIG.fontScale.default;
    currentSettings.lineHeight = CONFIG.lineHeight.default;
    applySettings();
    
    // Remove per-site override
    const origin = window.location.origin;
    const siteKey = `site_${origin}`;
    const localData = await chrome.storage.local.get(siteKey);
    const existingSettings = localData[siteKey];
    
    if (existingSettings) {
      delete existingSettings.fontScale;
      delete existingSettings.lineHeight;
      await chrome.storage.local.set({ [siteKey]: existingSettings });
    }
    
    console.log('[Includs Typography] Reset to defaults');
  }
  
  /**
   * Get current settings
   */
  function getSettings() {
    return { ...currentSettings };
  }
  
  /**
   * Get formatted display values
   */
  function getDisplayValues() {
    return {
      fontScale: Math.round(currentSettings.fontScale * 100) + '%',
      lineHeight: currentSettings.lineHeight.toFixed(1)
    };
  }
  
  // Public API
  return {
    init,
    increaseFontSize,
    decreaseFontSize,
    increaseLineHeight,
    decreaseLineHeight,
    resetToDefaults,
    getSettings,
    getDisplayValues,
    applySettings
  };
  
})();

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.IncludsTypography = IncludsTypography;
}
