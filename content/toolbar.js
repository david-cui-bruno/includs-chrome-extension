/**
 * Includs Extension - Toolbar Component
 * 
 * Creates and manages the floating accessibility toolbar.
 * Renders inside Shadow DOM for CSS isolation.
 */

const IncludsToolbar = (function() {
  'use strict';
  
  // Toolbar state
  const state = {
    isTextSettingsOpen: false,
    isVoiceSettingsOpen: false,
    isTTSPlaying: false,
    isTTSPaused: false,
    hasSelection: false
  };
  
  // References
  let shadowRoot = null;
  let toolbarElement = null;
  
  /**
   * Get toolbar CSS
   */
  function getStyles() {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      :host {
        all: initial;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      }
      
      .toolbar {
        position: fixed;
        right: 16px;
        top: 50%;
        transform: translateY(-50%);
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 10px 8px;
        background: linear-gradient(145deg, #1e1e2f 0%, #151521 100%);
        border-radius: 16px;
        box-shadow: 
          0 4px 24px rgba(0, 0, 0, 0.4),
          0 0 0 1px rgba(255, 255, 255, 0.05);
      }
      
      .toolbar-section {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      
      .toolbar-divider {
        height: 1px;
        background: rgba(255, 255, 255, 0.1);
        margin: 4px 0;
      }
      
      .toolbar-btn {
        position: relative;
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.05);
        border: none;
        border-radius: 12px;
        cursor: pointer;
        color: #e0e0e0;
        font-size: 20px;
        transition: all 0.15s ease;
      }
      
      .toolbar-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        transform: scale(1.05);
      }
      
      .toolbar-btn:focus {
        outline: none;
        box-shadow: 0 0 0 2px #6366f1;
      }
      
      .toolbar-btn:active {
        transform: scale(0.95);
      }
      
      .toolbar-btn[aria-disabled="true"] {
        opacity: 0.4;
        cursor: not-allowed;
      }
      
      .toolbar-btn[aria-disabled="true"]:hover {
        background: rgba(255, 255, 255, 0.05);
        transform: none;
      }
      
      .toolbar-btn.active {
        background: rgba(99, 102, 241, 0.3);
        color: #a5b4fc;
      }
      
      .toolbar-btn.playing {
        background: rgba(34, 197, 94, 0.2);
        color: #86efac;
        animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
        50% { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
      }
      
      .toolbar-btn .tooltip {
        position: absolute;
        right: calc(100% + 12px);
        top: 50%;
        transform: translateY(-50%);
        background: #1e1e2f;
        color: #e0e0e0;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 13px;
        white-space: nowrap;
        opacity: 0;
        visibility: hidden;
        transition: all 0.15s ease;
        pointer-events: none;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
      
      .toolbar-btn .tooltip::after {
        content: '';
        position: absolute;
        left: 100%;
        top: 50%;
        transform: translateY(-50%);
        border: 6px solid transparent;
        border-left-color: #1e1e2f;
      }
      
      .toolbar-btn:hover .tooltip,
      .toolbar-btn:focus .tooltip {
        opacity: 1;
        visibility: visible;
      }
      
      /* Popover panels */
      .popover {
        position: absolute;
        right: calc(100% + 12px);
        top: 0;
        background: #1e1e2f;
        border-radius: 12px;
        padding: 16px;
        min-width: 180px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        opacity: 0;
        visibility: hidden;
        transform: translateX(10px);
        transition: all 0.2s ease;
      }
      
      .popover.open {
        opacity: 1;
        visibility: visible;
        transform: translateX(0);
      }
      
      .popover-title {
        font-size: 12px;
        font-weight: 600;
        color: #a0a0c0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 12px;
      }
      
      .popover-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }
      
      .popover-row:last-child {
        margin-bottom: 0;
      }
      
      .popover-label {
        font-size: 14px;
        color: #e0e0e0;
      }
      
      .popover-controls {
        display: flex;
        gap: 4px;
      }
      
      .control-btn {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.08);
        border: none;
        border-radius: 8px;
        cursor: pointer;
        color: #e0e0e0;
        font-size: 16px;
        transition: all 0.15s ease;
      }
      
      .control-btn:hover {
        background: rgba(255, 255, 255, 0.15);
      }
      
      .control-btn:focus {
        outline: none;
        box-shadow: 0 0 0 2px #6366f1;
      }
      
      .value-display {
        display: inline-block;
        min-width: 36px;
        text-align: center;
        font-size: 12px;
        color: #a5b4fc;
        background: rgba(99, 102, 241, 0.15);
        padding: 2px 6px;
        border-radius: 4px;
        margin-left: 4px;
      }
      
      .reset-btn {
        background: rgba(239, 68, 68, 0.15);
        color: #fca5a5;
      }
      
      .reset-btn:hover {
        background: rgba(239, 68, 68, 0.25);
      }
      
      /* Screen reader only */
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
      }
      
      /* TTS control buttons - hidden by default */
      .tts-controls {
        display: none;
        flex-direction: column;
        gap: 6px;
      }
      
      .tts-controls.visible {
        display: flex;
      }
      
      /* Explain modal */
      .explain-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.9);
        width: 90%;
        max-width: 500px;
        max-height: 70vh;
        background: linear-gradient(145deg, #1e1e2f 0%, #151521 100%);
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        z-index: 2147483647;
        opacity: 0;
        visibility: hidden;
        transition: all 0.2s ease;
        display: flex;
        flex-direction: column;
      }
      
      .explain-modal.open {
        opacity: 1;
        visibility: visible;
        transform: translate(-50%, -50%) scale(1);
      }
      
      .explain-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      
      .explain-modal-title {
        font-size: 16px;
        font-weight: 600;
        color: #e0e0e0;
      }
      
      .explain-modal-close {
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.08);
        border: none;
        border-radius: 6px;
        cursor: pointer;
        color: #a0a0a0;
        font-size: 18px;
        transition: all 0.15s ease;
      }
      
      .explain-modal-close:hover {
        background: rgba(255, 255, 255, 0.15);
        color: #e0e0e0;
      }
      
      .explain-modal-content {
        flex: 1;
        overflow-y: auto;
        font-size: 15px;
        line-height: 1.6;
        color: #d0d0d0;
      }
      
      .explain-modal-content p {
        margin-bottom: 12px;
      }
      
      .explain-modal-content p:last-child {
        margin-bottom: 0;
      }
      
      .explain-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px;
        color: #a0a0c0;
      }
      
      .explain-loading::after {
        content: '';
        width: 24px;
        height: 24px;
        margin-left: 12px;
        border: 3px solid rgba(99, 102, 241, 0.3);
        border-top-color: #6366f1;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      .explain-error {
        color: #fca5a5;
        background: rgba(239, 68, 68, 0.1);
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
      }
      
      .explain-source {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        font-size: 12px;
        color: #808090;
      }
      
      /* Modal backdrop */
      .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 2147483646;
        opacity: 0;
        visibility: hidden;
        transition: all 0.2s ease;
      }
      
      .modal-backdrop.open {
        opacity: 1;
        visibility: visible;
      }
    `;
  }
  
  /**
   * Get toolbar HTML
   */
  function getHTML() {
    return `
      <div class="toolbar" role="toolbar" aria-label="Includs Accessibility Toolbar">
        
        <!-- Text Settings -->
        <div class="toolbar-section">
          <button class="toolbar-btn" id="btn-text-settings" aria-label="Text settings" aria-expanded="false">
            <span aria-hidden="true">Aa</span>
            <span class="tooltip">Text Settings</span>
          </button>
          
          <div class="popover" id="popover-text-settings">
            <div class="popover-title">Text Settings</div>
            <div class="popover-row">
              <span class="popover-label">Size <span id="text-size-value" class="value-display">100%</span></span>
              <div class="popover-controls">
                <button class="control-btn" id="btn-text-smaller" aria-label="Decrease text size">A-</button>
                <button class="control-btn" id="btn-text-larger" aria-label="Increase text size">A+</button>
              </div>
            </div>
            <div class="popover-row">
              <span class="popover-label">Spacing <span id="line-spacing-value" class="value-display">1.5</span></span>
              <div class="popover-controls">
                <button class="control-btn" id="btn-spacing-less" aria-label="Decrease line spacing">−</button>
                <button class="control-btn" id="btn-spacing-more" aria-label="Increase line spacing">+</button>
              </div>
            </div>
            <div class="popover-row" style="margin-top: 8px;">
              <button class="control-btn reset-btn" id="btn-reset-typography" aria-label="Reset to defaults" style="width: 100%; font-size: 12px;">Reset</button>
            </div>
          </div>
        </div>
        
        <div class="toolbar-divider"></div>
        
        <!-- Explain -->
        <div class="toolbar-section">
          <button class="toolbar-btn" id="btn-explain" aria-label="Explain selected text">
            <span aria-hidden="true">💡</span>
            <span class="tooltip">Explain Text</span>
          </button>
        </div>
        
        <div class="toolbar-divider"></div>
        
        <!-- TTS Controls -->
        <div class="toolbar-section">
          <button class="toolbar-btn" id="btn-read-page" aria-label="Read page aloud">
            <span aria-hidden="true">📖</span>
            <span class="tooltip">Read Page</span>
          </button>
          
          <button class="toolbar-btn" id="btn-read-selection" aria-label="Read selection aloud" aria-disabled="true">
            <span aria-hidden="true">🔊</span>
            <span class="tooltip">Read Selection</span>
          </button>
          
          <div class="tts-controls" id="tts-controls">
            <button class="toolbar-btn" id="btn-pause" aria-label="Pause reading">
              <span aria-hidden="true">⏸️</span>
              <span class="tooltip">Pause</span>
            </button>
            
            <button class="toolbar-btn" id="btn-stop" aria-label="Stop reading">
              <span aria-hidden="true">⏹️</span>
              <span class="tooltip">Stop</span>
            </button>
          </div>
        </div>
        
        <div class="toolbar-divider"></div>
        
        <!-- Voice & Speed -->
        <div class="toolbar-section">
          <button class="toolbar-btn" id="btn-voice-settings" aria-label="Voice and speed settings" aria-expanded="false">
            <span aria-hidden="true">⚙️</span>
            <span class="tooltip">Voice & Speed</span>
          </button>
          
          <div class="popover" id="popover-voice-settings">
            <div class="popover-title">Voice & Speed</div>
            <div class="popover-row">
              <span class="popover-label">Speed</span>
              <div class="popover-controls">
                <button class="control-btn" id="btn-speed-slow" aria-label="Slow speed">🐢</button>
                <button class="control-btn active" id="btn-speed-normal" aria-label="Normal speed">▶️</button>
                <button class="control-btn" id="btn-speed-fast" aria-label="Fast speed">🐇</button>
              </div>
            </div>
            <div class="popover-row" style="margin-top: 8px;">
              <span class="popover-label" style="font-size: 12px; color: #808090;">
                Voice selection in Options
              </span>
            </div>
          </div>
        </div>
        
        <div class="toolbar-divider"></div>
        
        <!-- Help -->
        <div class="toolbar-section">
          <button class="toolbar-btn" id="btn-help" aria-label="Help">
            <span aria-hidden="true">❓</span>
            <span class="tooltip">Help</span>
          </button>
        </div>
        
      </div>
      
      <!-- Explain Modal -->
      <div class="modal-backdrop" id="explain-backdrop"></div>
      <div class="explain-modal" id="explain-modal" role="dialog" aria-labelledby="explain-title" aria-modal="true">
        <div class="explain-modal-header">
          <span class="explain-modal-title" id="explain-title">Explanation</span>
          <button class="explain-modal-close" id="explain-close" aria-label="Close">×</button>
        </div>
        <div class="explain-modal-content" id="explain-content">
          <!-- Content loaded dynamically -->
        </div>
      </div>
    `;
  }
  
  /**
   * Bind event listeners
   */
  function bindEvents() {
    // Text settings toggle
    const btnTextSettings = shadowRoot.getElementById('btn-text-settings');
    const popoverTextSettings = shadowRoot.getElementById('popover-text-settings');
    
    btnTextSettings.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('[Includs] Text settings button clicked');
      state.isTextSettingsOpen = !state.isTextSettingsOpen;
      console.log('[Includs] Text settings open:', state.isTextSettingsOpen);
      popoverTextSettings.classList.toggle('open', state.isTextSettingsOpen);
      btnTextSettings.setAttribute('aria-expanded', state.isTextSettingsOpen);
      
      // Close other popovers
      if (state.isTextSettingsOpen) {
        closeVoiceSettings();
        updateTypographyDisplay();
      }
    });
    
    // Reset typography button
    shadowRoot.getElementById('btn-reset-typography').addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.IncludsTypography) {
        window.IncludsTypography.resetToDefaults();
        updateTypographyDisplay();
      }
      console.log('[Includs] Typography reset');
    });
    
    // Text size controls
    shadowRoot.getElementById('btn-text-smaller').addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.IncludsTypography) {
        window.IncludsTypography.decreaseFontSize();
        updateTypographyDisplay();
      }
      console.log('[Includs] Decrease text size');
    });
    
    shadowRoot.getElementById('btn-text-larger').addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.IncludsTypography) {
        window.IncludsTypography.increaseFontSize();
        updateTypographyDisplay();
      }
      console.log('[Includs] Increase text size');
    });
    
    // Line spacing controls
    shadowRoot.getElementById('btn-spacing-less').addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.IncludsTypography) {
        window.IncludsTypography.decreaseLineHeight();
        updateTypographyDisplay();
      }
      console.log('[Includs] Decrease line spacing');
    });
    
    shadowRoot.getElementById('btn-spacing-more').addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.IncludsTypography) {
        window.IncludsTypography.increaseLineHeight();
        updateTypographyDisplay();
      }
      console.log('[Includs] Increase line spacing');
    });
    
    // Explain button
    shadowRoot.getElementById('btn-explain').addEventListener('click', async () => {
      console.log('[Includs] Explain clicked');
      await handleExplainClick();
    });
    
    // Explain modal close button
    shadowRoot.getElementById('explain-close').addEventListener('click', (e) => {
      e.stopPropagation();
      closeExplainModal();
    });
    
    // Explain backdrop click to close
    shadowRoot.getElementById('explain-backdrop').addEventListener('click', () => {
      closeExplainModal();
    });
    
    // Read page button
    shadowRoot.getElementById('btn-read-page').addEventListener('click', () => {
      console.log('[Includs] Read page clicked');
      // Will be implemented in Stage 6
      showTTSControls();
    });
    
    // Read selection button
    shadowRoot.getElementById('btn-read-selection').addEventListener('click', () => {
      if (state.hasSelection) {
        console.log('[Includs] Read selection clicked');
        // Will be implemented in Stage 6
        showTTSControls();
      }
    });
    
    // Pause button
    shadowRoot.getElementById('btn-pause').addEventListener('click', () => {
      console.log('[Includs] Pause clicked');
      state.isTTSPaused = !state.isTTSPaused;
      // Will be implemented in Stage 6
    });
    
    // Stop button
    shadowRoot.getElementById('btn-stop').addEventListener('click', () => {
      console.log('[Includs] Stop clicked');
      hideTTSControls();
      // Will be implemented in Stage 6
    });
    
    // Voice settings toggle
    const btnVoiceSettings = shadowRoot.getElementById('btn-voice-settings');
    const popoverVoiceSettings = shadowRoot.getElementById('popover-voice-settings');
    
    btnVoiceSettings.addEventListener('click', () => {
      state.isVoiceSettingsOpen = !state.isVoiceSettingsOpen;
      popoverVoiceSettings.classList.toggle('open', state.isVoiceSettingsOpen);
      btnVoiceSettings.setAttribute('aria-expanded', state.isVoiceSettingsOpen);
      
      // Close other popovers
      if (state.isVoiceSettingsOpen) {
        closeTextSettings();
      }
    });
    
    // Speed controls
    const speedButtons = ['btn-speed-slow', 'btn-speed-normal', 'btn-speed-fast'];
    speedButtons.forEach(id => {
      shadowRoot.getElementById(id).addEventListener('click', (e) => {
        // Remove active from all
        speedButtons.forEach(btnId => {
          shadowRoot.getElementById(btnId).classList.remove('active');
        });
        // Add active to clicked
        e.currentTarget.classList.add('active');
        console.log('[Includs] Speed changed:', id.replace('btn-speed-', ''));
      });
    });
    
    // Help button
    shadowRoot.getElementById('btn-help').addEventListener('click', () => {
      console.log('[Includs] Help clicked');
      alert('Includs Accessibility Toolbar\n\n• Text Settings: Adjust font size and line spacing\n• Explain: Simplify selected text using AI\n• Read: Listen to page or selection\n• Voice & Speed: Adjust TTS settings\n\nConfigure API keys in extension Options.');
    });
    
    // Close popovers when clicking outside
    document.addEventListener('click', (e) => {
      // Use composedPath() to properly track clicks through Shadow DOM
      const path = e.composedPath();
      const clickedInsideToolbar = path.some(el => el === toolbarElement);
      
      if (!clickedInsideToolbar) {
        closeAllPopovers();
      }
    });
    
    // Listen for text selection
    document.addEventListener('selectionchange', () => {
      const selection = window.getSelection();
      const hasText = selection && selection.toString().trim().length > 0;
      updateSelectionState(hasText);
    });
    
    // Keyboard navigation
    toolbarElement.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAllPopovers();
      }
    });
    
    // Close explain modal on Escape (needs to be on shadowRoot for modal focus)
    shadowRoot.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = shadowRoot.getElementById('explain-modal');
        if (modal.classList.contains('open')) {
          closeExplainModal();
        }
      }
    });
  }
  
  /**
   * Update typography display values in the popover
   */
  function updateTypographyDisplay() {
    if (!shadowRoot || !window.IncludsTypography) return;
    
    const values = window.IncludsTypography.getDisplayValues();
    
    const sizeEl = shadowRoot.getElementById('text-size-value');
    const spacingEl = shadowRoot.getElementById('line-spacing-value');
    
    if (sizeEl) sizeEl.textContent = values.fontScale;
    if (spacingEl) spacingEl.textContent = values.lineHeight;
  }
  
  /**
   * Close text settings popover
   */
  function closeTextSettings() {
    state.isTextSettingsOpen = false;
    shadowRoot.getElementById('popover-text-settings').classList.remove('open');
    shadowRoot.getElementById('btn-text-settings').setAttribute('aria-expanded', 'false');
  }
  
  /**
   * Close voice settings popover
   */
  function closeVoiceSettings() {
    state.isVoiceSettingsOpen = false;
    shadowRoot.getElementById('popover-voice-settings').classList.remove('open');
    shadowRoot.getElementById('btn-voice-settings').setAttribute('aria-expanded', 'false');
  }
  
  /**
   * Close all popovers
   */
  function closeAllPopovers() {
    closeTextSettings();
    closeVoiceSettings();
  }
  
  /**
   * Open explain modal with content
   */
  function openExplainModal(content, isError = false) {
    const modal = shadowRoot.getElementById('explain-modal');
    const backdrop = shadowRoot.getElementById('explain-backdrop');
    const contentEl = shadowRoot.getElementById('explain-content');
    
    if (isError) {
      contentEl.innerHTML = `<div class="explain-error">${content}</div>`;
    } else {
      // Convert newlines to paragraphs
      const paragraphs = content.split('\n\n').filter(p => p.trim());
      contentEl.innerHTML = paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
    }
    
    modal.classList.add('open');
    backdrop.classList.add('open');
    
    // Focus the close button for accessibility
    shadowRoot.getElementById('explain-close').focus();
  }
  
  /**
   * Show loading state in explain modal
   */
  function showExplainLoading() {
    const modal = shadowRoot.getElementById('explain-modal');
    const backdrop = shadowRoot.getElementById('explain-backdrop');
    const contentEl = shadowRoot.getElementById('explain-content');
    
    contentEl.innerHTML = '<div class="explain-loading">Getting explanation</div>';
    
    modal.classList.add('open');
    backdrop.classList.add('open');
  }
  
  /**
   * Close explain modal
   */
  function closeExplainModal() {
    const modal = shadowRoot.getElementById('explain-modal');
    const backdrop = shadowRoot.getElementById('explain-backdrop');
    
    modal.classList.remove('open');
    backdrop.classList.remove('open');
  }
  
  /**
   * Handle explain button click
   */
  async function handleExplainClick() {
    if (!window.IncludsExplain) {
      console.error('[Includs] IncludsExplain not loaded');
      return;
    }
    
    // Get text to explain
    const { text, source } = window.IncludsExplain.getTextToExplain();
    
    if (!text) {
      openExplainModal('Please select some text to explain, or click inside a paragraph.', true);
      return;
    }
    
    console.log(`[Includs] Explaining ${source}: ${text.substring(0, 50)}...`);
    
    // Show loading
    showExplainLoading();
    
    // Call OpenAI
    const result = await window.IncludsExplain.explainText(text);
    
    if (result.success) {
      openExplainModal(result.explanation);
    } else {
      openExplainModal(result.error, true);
    }
  }
  
  /**
   * Show TTS controls (pause/stop)
   */
  function showTTSControls() {
    state.isTTSPlaying = true;
    shadowRoot.getElementById('tts-controls').classList.add('visible');
    shadowRoot.getElementById('btn-read-page').classList.add('playing');
  }
  
  /**
   * Hide TTS controls
   */
  function hideTTSControls() {
    state.isTTSPlaying = false;
    state.isTTSPaused = false;
    shadowRoot.getElementById('tts-controls').classList.remove('visible');
    shadowRoot.getElementById('btn-read-page').classList.remove('playing');
  }
  
  /**
   * Update selection-dependent button states
   */
  function updateSelectionState(hasSelection) {
    state.hasSelection = hasSelection;
    
    const btnExplain = shadowRoot.getElementById('btn-explain');
    const btnReadSelection = shadowRoot.getElementById('btn-read-selection');
    
    btnExplain.setAttribute('aria-disabled', !hasSelection);
    btnReadSelection.setAttribute('aria-disabled', !hasSelection);
  }
  
  /**
   * Create and inject the toolbar
   */
  function create(hostElement) {
    // Create shadow root
    shadowRoot = hostElement.attachShadow({ mode: 'closed' });
    
    // Add styles
    const styleEl = document.createElement('style');
    styleEl.textContent = getStyles();
    shadowRoot.appendChild(styleEl);
    
    // Add HTML
    const container = document.createElement('div');
    container.innerHTML = getHTML();
    
    // Append all elements (toolbar, backdrop, modal)
    while (container.firstChild) {
      const child = container.firstChild;
      if (child.nodeType === Node.ELEMENT_NODE && child.classList.contains('toolbar')) {
        toolbarElement = child;
      }
      shadowRoot.appendChild(child);
    }
    
    // Bind events
    bindEvents();
    
    // Initialize typography display
    updateTypographyDisplay();
    
    console.log('[Includs] Toolbar created');
    
    return toolbarElement;
  }
  
  // Public API
  return {
    create,
    showTTSControls,
    hideTTSControls,
    updateSelectionState,
    closeAllPopovers
  };
  
})();

// Export for use in content.js
if (typeof window !== 'undefined') {
  window.IncludsToolbar = IncludsToolbar;
}
