/**
 * Includs Extension - Content Script
 * 
 * Main entry point that runs on every page.
 * Injects the toolbar UI via Shadow DOM for CSS isolation.
 */

(function() {
  'use strict';
  
  // Prevent double injection
  if (window.__includsInjected) {
    console.log('[Includs] Already injected, skipping');
    return;
  }
  window.__includsInjected = true;
  
  console.log('[Includs] Content script loaded on:', window.location.href);
  
  /**
   * Inject toolbar into page
   */
  function injectToolbar() {
    try {
      // Don't inject on extension pages
      if (window.location.protocol === 'chrome-extension:') {
        console.log('[Includs] Skipping injection on extension page');
        return;
      }
      
      // Check if body exists
      if (!document.body) {
        console.error('[Includs] document.body not found');
        return;
      }
      
      // Create host element
      const host = document.createElement('div');
      host.id = 'includs-toolbar-host';
      
      // Create toolbar using the Toolbar component
      if (typeof IncludsToolbar !== 'undefined') {
        IncludsToolbar.create(host);
      } else {
        console.error('[Includs] IncludsToolbar not found');
        return;
      }
      
      // Append to body
      document.body.appendChild(host);
      
      // Initialize typography controls
      if (typeof IncludsTypography !== 'undefined') {
        IncludsTypography.init();
        console.log('[Includs] Typography initialized');
      }
      
      console.log('[Includs] Toolbar injected successfully');
    } catch (error) {
      console.error('[Includs] Error injecting toolbar:', error);
    }
  }
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectToolbar);
  } else {
    injectToolbar();
  }
  
})();
