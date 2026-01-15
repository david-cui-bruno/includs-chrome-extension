# Chrome Extension Technical Specification v2

## 0) Summary

A Manifest V3 Chrome extension that injects a consistent floating right-side accessibility toolbar into webpages, provides per-site/global typography controls, text paragraph/selection explain/paraphrase via OpenAI API, and high-quality text-to-speech playback via ElevenLabs (page or selection) with speed + voice controls. Includes a first-run onboarding flow and lightweight in-context help. Toolbar UI is injected but no page modification occurs unless user actively clicks actions.

---

## MVP Definition

**Core features for initial release:**

- **Floating right-side toolbar** — Consistent UI injected on all pages
- **Text size/line spacing controls** — Adjustable typography settings
- **Explain paragraph/selection** — Simplify text via OpenAI (paragraph detection + manual selection)
- **Read aloud selection/page** — High-quality TTS via ElevenLabs with voice and speed controls
- **Voice + speed settings** — Configurable ElevenLabs TTS preferences
- **Options page** — Full settings including OpenAI + ElevenLabs API key configuration
- **Onboarding page** — First-run tutorial

**Deferred to v2+:**
- Simplify Mode (full reading view overlay)

---

## 1) User-facing Surfaces

### A) In-page Floating Right-Side Toolbar (Primary UI)

**Injection behavior:** Toolbar UI is injected via content script on every page, but **no page modification occurs unless the user actively clicks toolbar actions**. The toolbar itself is isolated in Shadow DOM and does not affect page functionality.

**Toolbar buttons:**
- **Text settings** (A-/A+, line spacing)
- **Explain** (paragraph or selection)
  - "Explain paragraph" — detects current paragraph at cursor
  - "Explain selection" — enabled when text is selected
- **Read** (page) / **Read** (selection)
- **Pause/Stop** (visible while speaking)
- **Voice + Speed** quick controls
- **Help** (tooltips + "Reset" entry)

### B) Options Page (Full Settings)

- Presets
- Per-site overrides list (edit/remove)
- **OpenAI configuration** (for Explain feature):
  - API key input
  - Model configuration (flexible, user-configurable)
- **ElevenLabs configuration** (for TTS):
  - API key input
  - Voice selector + preview
  - Speed settings
- Privacy controls (explain/TTS provider settings)
- Accessibility: toolbar size, position, hotkeys

### C) Onboarding Page (First Run)

- 3–5 screens max
- Shows what buttons do
- Optional "Read this" demo

---

## 2) Architecture (Manifest V3)

### Components

#### 1. Service Worker (Background) - Minimal Implementation

**Responsibilities:**
- Handle ElevenLabs TTS API calls (relay from content script)
- Fetch available ElevenLabs voices
- Handle extension install events → open onboarding
- Store and retrieve settings (via chrome.storage)

**Note:** Service worker is minimal - only handles TTS API calls and onboarding. All other logic (DOM manipulation, OpenAI calls, UI) lives in content script to avoid wake-up complexity.

#### 2. Content Script (Runs on Pages)

**Responsibilities:**
- Inject toolbar + overlay UI (isolated in Shadow DOM)
- **No page modification unless user clicks actions** — toolbar is passive until activated
- Apply typography CSS overrides (text size, line spacing) — only when user adjusts settings
- Capture selections and send to background for TTS
- Detect current paragraph for "Explain paragraph" feature
- Make OpenAI API calls directly (no service worker relay)
- Handle SPA navigation cleanup

#### 3. UI Bundle (Toolbar + Overlays)

- Rendered by content script
- Keyboard accessible (tab order, ESC to close overlays)
- "Safe click" design: big targets, no destructive actions
- Shadow DOM for CSS isolation

#### 4. Offscreen Document (Required for TTS)

- **Purpose:** Play audio received from ElevenLabs API
- **Why needed:** Service workers cannot play audio directly; offscreen document provides a DOM context for `Audio` element
- **Lifecycle:** Created when TTS starts, kept alive during playback, closed after playback ends
- **Manifest config:** `"reasons": ["AUDIO_PLAYBACK"]`

---

## 3) Permissions & Security

### Permissions (Lean)

- `storage` — save settings and per-site overrides
- `scripting` — inject content scripts and CSS (required for toolbar injection)
- `offscreen` — create offscreen document for audio playback (ElevenLabs TTS)

### Host Permissions

- **Page access:** `<all_urls>` (works everywhere automatically)
- **API access:** 
  - `https://api.openai.com/*` (for Explain feature)
  - `https://api.elevenlabs.io/*` (for TTS feature)
- **Rationale:** Simpler UX, works immediately on all sites
- **Note:** Users can disable per-site via toolbar toggle

### Data Privacy

- Typography controls are local-only (no data sent externally).
- "Explain" calls send selected text/paragraph to OpenAI:
  - Clearly disclose in onboarding + options
  - Include "never send full page; only selected text/paragraph" assurance
  - Default to minimal text necessary
  - Text length limits enforced (see section 7)
- "Read aloud" calls send text to ElevenLabs:
  - Clearly disclose in onboarding + options
  - Text is sent to ElevenLabs servers for TTS processing
  - No text is stored by extension after playback

---

## 4) Settings & Data Model

### Storage Strategy

Use `chrome.storage.sync` for small global settings that should roam across devices, and `chrome.storage.local` for device-specific or large data.

#### `chrome.storage.sync` (Global Settings)

**Purpose:** Small settings that should sync across user's devices

**Data:**
- `enabledByDefault: boolean`
- `fontScale: number` (e.g., 1.0–1.8)
- `lineHeight: number` (e.g., 1.2–2.2)
- `ttsSpeed: 'slow' | 'normal' | 'fast'` (mapped to ElevenLabs speed values)
- `toolbarPosition: "right" | "left"` (floating right-side by default)
- `explainMode: "simple" | "very_simple" | "bullets"`
- `helpTipsEnabled: boolean`
- `_version: number` (for migrations)

**Size:** ~2-3KB total (well under 100KB sync limit)

#### `chrome.storage.local` (Device-Specific / Large Data)

**Purpose:** Data that can grow large or should stay device-specific

**Data:**
- **Per-site overrides:** Map keyed by origin
  - Key format: `site_${origin}` (e.g., `site_https://example.com`)
  - Value: `{ enabled?: boolean, fontScale?: number, lineHeight?: number }`
- **Explain cache:** Map keyed by hash
  - Key format: `explain_${hash(text + mode)}`
  - Value: `{ text: string, mode: string, result: string, timestamp: number }`
  - TTL: 24 hours (cleanup on startup)
- **OpenAI configuration:**
  - `openaiApiKey: string` (stored in `chrome.storage.local` only, **never synced**)
  - `openaiModel: string` (user-configurable, flexible API endpoint/model selection)
  - `openaiKeyValid: boolean` (cached validation status)
- **ElevenLabs configuration:**
  - `elevenLabsApiKey: string` (stored in `chrome.storage.local` only, **never synced**)
  - `elevenLabsVoiceId: string` (selected voice ID)
  - `elevenLabsKeyValid: boolean` (cached validation status)
  - **Security note:** API keys are stored locally and never synced across devices for security

**Size:** Unlimited (local storage has no hard limit)

### Settings Migration

- All settings objects include `_version` field (integer)
- Current version: 1
- Increment version on schema changes
- Migration function runs on extension startup (`runtime.onInstalled` + `runtime.onStartup`)
- Migration is idempotent (safe to run multiple times)

**Example migration:**
```javascript
// v1 → v2: renamed 'speed' to 'ttsSpeed'
if (!settings._version || settings._version < 2) {
  if (settings.speed !== undefined) {
    settings.ttsSpeed = settings.speed;
    delete settings.speed;
  }
  settings._version = 2;
}
```

---

## 5) Simplify Mode: Technical Behavior

**Status:** Deferred to v2+ (not in MVP)

### Goal

Transform a cluttered webpage into a clean reading view while keeping "Exit Simplify" always available.

### Implementation Approach (v2+)

#### 1. Readability Extraction

- Use a readability algorithm (e.g., Mozilla Readability port) inside content script.
- Extract:
  - `title`
  - `main content HTML`
  - `byline` (optional)

#### 2. Rendering

- Create an overlay container (shadow DOM recommended to avoid CSS conflicts).
- Use `mode: 'closed'` for better isolation.
- Insert:
  - Title
  - Main content
  - (Optional) site name
- Hide underlying page via `document.documentElement.style.overflow = "hidden"` and an overlay that covers the viewport.

#### 3. Clutter Reduction on Non-Overlay Mode (Optional)

- If you want "soft simplify" (not a full reading view), apply heuristics:
  - Hide elements with common ad/popup roles
  - Collapse sidebars
- Keep this optional; the overlay approach is more reliable.

#### 4. Accessibility

- Preserve heading structure
- Maintain clickable links (but keep them visually simple)
- Ensure keyboard navigation works in simplified view

---

## 6) Typography Controls: Technical Behavior

### Approach

Apply CSS variables and injected stylesheet via `chrome.scripting.insertCSS()` (bypasses CSP).

- Inject a style tag with:
  - `:root { --ext-font-scale: ${scale}; --ext-line-height: ${height}; }`
  - `html { font-size: calc(16px * var(--ext-font-scale)); }`
  - `body, p, li { line-height: var(--ext-line-height); }`
- Store scale/line-height in settings and update live.

**Important:** Apply modest scaling to avoid breaking page layouts. Changes only apply when user actively adjusts settings.

### CSP Compatibility

- Use `chrome.scripting.insertCSS()` for all CSS injection (not inline styles)
- This API bypasses most CSP restrictions
- If injection fails, log error and continue with available features
- Don't break extension if CSP blocks injection

---

## 7) Explain / Paraphrase Tool: Technical Behavior

### Flow

1. User selects text OR clicks "Explain paragraph" (detects paragraph under mouse)
2. Content script extracts text:
   - **Selection mode:** `window.getSelection().toString().trim()`
   - **Paragraph mode:** Detect paragraph element under mouse pointer using `document.elementFromPoint()`
     - Traverse up to nearest block element (`<p>`, `<div>`, `<article>`, `<section>`, `<li>`)
     - Extract `.innerText` from that element
     - If no suitable element found, show tooltip "No paragraph detected"
   - Validate length (see section 7.4)
3. User clicks "Explain"
4. Content script makes direct API call to OpenAI:
   - Endpoint: Configurable (user sets in options, supports current API style)
   - Headers: `Authorization: Bearer ${apiKey}`
   - Body: See prompts below
5. Response returned:
   - `{ simplifiedText, bullets?, readingLevelHint? }`
6. Content script displays an overlay:
   - Original snippet (collapsed)
   - Simplified explanation
   - Buttons: Copy / Read / Close

### OpenAI Configuration

#### API Key Management

- Stored in `chrome.storage.local` (NOT sync - security)
- Options page includes:
  - API key input (password field, show/hide toggle)
  - **Model/endpoint configuration** (flexible, user-configurable):
    - API endpoint URL (defaults to current OpenAI API style)
    - Model name/identifier (user can specify any model)
    - No hardcoded model list — keep it flexible for API changes
  - "Test Key" button (makes minimal API call to verify)
  - Status indicator: ✓ Valid | ✗ Invalid | ⚠ Not Set
  - Cost estimate per request (displayed below model selector)

#### First-Use Flow

- If user clicks "Explain" without API key:
  1. Show overlay: "OpenAI API key required"
  2. Button: "Open Settings"
  3. On click → `chrome.runtime.openOptionsPage()`
  4. Options page highlights API key field with message

#### Prompts

**Simple mode:**
```
Rewrite the following text using simple words and short sentences. 
Keep the exact same meaning. Aim for a 6th grade reading level. 
Do not add information that isn't in the original text.

Text to rewrite:
{text}
```

**Very simple mode:**
```
Explain this text like I'm 10 years old. Use very simple words. 
One idea per sentence. Keep the same meaning.

Text to explain:
{text}
```

**Bullets mode:**
```
Summarize the key points from this text as a bulleted list. 
Use simple language. Maximum 5 bullets. Keep it concise.

Text to summarize:
{text}
```

### Text Length Limits

**For Explain feature:**
- **Minimum:** 200+ characters (ensure meaningful content)
- **Maximum:** 3,000 characters (~500-600 words)
- **Reason:** API cost control, response time, token limits, ensure quality explanations

**Validation:**
```javascript
function validateSelection(text) {
  if (text.length < 200) {
    showTooltip("Select more text to explain (at least 200 characters)", 2000);
    return false;
  }
  if (text.length > 3000) {
    showTooltip("Selection too long. Please select less text (max 500 words).", 3000);
    return false;
  }
  return true;
}
```

### Error Handling

#### Error Response Format

**Standard message protocol:**
```javascript
// Success response
{
  type: "EXPLAIN_RESPONSE",
  requestId: "uuid-v4",
  success: true,
  simplifiedText: "...",
  bullets: [...],  // Optional
  readingLevelHint: "6th grade"  // Optional
}

// Error response
{
  type: "EXPLAIN_RESPONSE",
  requestId: "uuid-v4",
  success: false,
  error: {
    code: "NO_API_KEY" | "INVALID_API_KEY" | "RATE_LIMITED" | "QUOTA_EXCEEDED" | "NETWORK_ERROR" | "TEXT_TOO_SHORT" | "TEXT_TOO_LONG" | "UNKNOWN",
    message: "Human-readable message",
    retryAfter: 5000  // Optional: ms to wait
  }
}
```

#### Error Code Mapping

| HTTP Status | OpenAI Error | Our Code | User Message |
|-------------|--------------|----------|--------------|
| - | No key in storage | `NO_API_KEY` | "Please add your OpenAI API key in settings" |
| 401 | Invalid API key | `INVALID_API_KEY` | "Your API key is invalid. Check settings." |
| 429 | Rate limit | `RATE_LIMITED` | "Too many requests. Please wait a moment." |
| 429 | Quota exceeded | `QUOTA_EXCEEDED` | "OpenAI quota exceeded. Check your usage." |
| - | Network failure | `NETWORK_ERROR` | "Couldn't connect. Check your internet." |
| - | Text < 200 chars | `TEXT_TOO_SHORT` | "Select more text to explain (at least 200 characters)." |
| - | Text > 3000 chars | `TEXT_TOO_LONG` | "Selected text is too long. Select less text." |
| - | Other | `UNKNOWN` | "Something went wrong. Please try again." |

#### Error Handling Behavior

- All async responses include `requestId` for correlation
- Content script should timeout after 30 seconds and show error
- Retry logic: Only retry on `NETWORK_ERROR`, max 1 retry
- Never crash the page on API errors

### Caching

- Cache keyed by `hash(text + mode)` with 24-hour TTL
- Stored in `chrome.storage.local`
- Cleanup: Remove entries older than 24 hours on startup
- Hash function: Simple string hash (e.g., djb2 or crypto.subtle)

---

## 8) TTS: Technical Behavior

### Implementation: ElevenLabs API

**Why ElevenLabs:**
- High-quality, natural-sounding voices
- Consistent cross-platform behavior (not dependent on OS voices)
- Full control over voice options and quality

**Tradeoffs:**
- Requires network for every playback (no offline support)
- API cost per character (~$0.30/1M characters on Starter plan)
- Text sent to external service (privacy disclosure required)

### Architecture Flow

```
Content Script                Service Worker              Offscreen Document
     │                              │                            │
     │  TTS_SPEAK { text, voice,    │                            │
     │              speed, apiKey } │                            │
     │ ────────────────────────────>│                            │
     │                              │                            │
     │                              │  TTS_SPEAK { text, ... }   │
     │                              │ ──────────────────────────>│
     │                              │                            │
     │                              │     fetch(elevenlabs.io)   │
     │                              │     → audio blob received  │
     │                              │     → Audio.play()         │
     │                              │                            │
     │  TTS_EVENT { type: 'start' } │                            │
     │ <────────────────────────────│<───────────────────────────│
     │                              │                            │
     │  TTS_EVENT { type: 'end' }   │                            │
     │ <────────────────────────────│<───────────────────────────│
```

**Why this architecture:**
- Offscreen document fetches audio directly from ElevenLabs (avoids blob URL context issues)
- Service worker acts as a relay (content scripts can't message offscreen directly)
- Offscreen document has DOM context required for Audio element playback

### ElevenLabs API Integration

**Endpoint:** `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`

**Headers:**
```javascript
{
  "xi-api-key": apiKey,
  "Content-Type": "application/json",
  "Accept": "audio/mpeg"
}
```

**Request body:**
```javascript
{
  "text": "Text to speak",
  "model_id": "eleven_turbo_v2_5",  // Default: fast + good quality
  "voice_settings": {
    "stability": 0.5,
    "similarity_boost": 0.75,
    "speed": 1.0  // 0.5 to 2.0
  }
}
```

**Response:** Audio stream (MP3)

### Voice Selection

**Fetching voices:**
- `GET https://api.elevenlabs.io/v1/voices`
- Cache voice list in `chrome.storage.local` (refresh on options page load)
- Display voice name + preview in options

**Options page:**
- Voice dropdown (fetched from API)
- "Preview" button (plays short sample)
- Voice ID stored in settings

### Speed Control

- ElevenLabs `speed` parameter: 0.5 (slow) to 2.0 (fast)
- Map to presets:
  - Slow ~ 0.75
  - Normal ~ 1.0
  - Fast ~ 1.25

### Offscreen Document for Audio Playback

**Why needed:** Service workers cannot play audio directly.

**Implementation:**
```javascript
// In service worker
async function speakText(text, voiceId, speed, apiKey) {
  // Ensure offscreen document exists
  const hasDoc = await chrome.offscreen.hasDocument();
  if (!hasDoc) {
    await chrome.offscreen.createDocument({
      url: 'offscreen/offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Play ElevenLabs TTS audio'
    });
  }
  
  // Relay to offscreen document (which will fetch + play)
  chrome.runtime.sendMessage({ 
    type: 'TTS_SPEAK', 
    text, 
    voiceId, 
    speed, 
    apiKey 
  });
}

// In offscreen.js
let currentAudio = null;

chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.type === 'TTS_SPEAK') {
    // Fetch audio from ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${msg.voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': msg.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text: msg.text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: msg.speed }
        })
      }
    );
    
    const audioBlob = await response.blob();
    const blobUrl = URL.createObjectURL(audioBlob);
    
    currentAudio = new Audio(blobUrl);
    currentAudio.onended = () => {
      chrome.runtime.sendMessage({ type: 'TTS_EVENT', event: 'end' });
      URL.revokeObjectURL(blobUrl);
      currentAudio = null;
    };
    currentAudio.play();
    chrome.runtime.sendMessage({ type: 'TTS_EVENT', event: 'start' });
  }
  
  if (msg.type === 'TTS_PAUSE' && currentAudio) {
    currentAudio.pause();
    chrome.runtime.sendMessage({ type: 'TTS_EVENT', event: 'paused' });
  }
  
  if (msg.type === 'TTS_RESUME' && currentAudio) {
    currentAudio.play();
    chrome.runtime.sendMessage({ type: 'TTS_EVENT', event: 'resumed' });
  }
  
  if (msg.type === 'TTS_STOP' && currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
    chrome.runtime.sendMessage({ type: 'TTS_EVENT', event: 'stopped' });
  }
});
```

### TTS Highlighting Strategy

**Limitation:** ElevenLabs standard API does not provide word-level timestamps.

**Approach:**
- **No word-level highlighting** in MVP (would require streaming + word timestamps API)
- Show simple **progress indicator** during playback
- For long text: split into chunks, highlight current chunk

**Future enhancement (v2+):**
- Use ElevenLabs streaming endpoint with word timestamps
- Enable word-level highlighting

### "Read this page" Text Source

- Use `document.body.innerText` for simplicity (MVP approach)
- May include navigation/footer text — acceptable tradeoff for MVP
- Future enhancement (v2+): Use readability extraction for cleaner main content

### Text Length Limits for TTS

**"Read Selection":**
- **Minimum:** 10 characters
- **Maximum:** 5,000 characters (API limit + cost control)

**"Read Page":**
- Split into chunks of ~2,500 characters at sentence boundaries
- **Chunking strategy:**
  - Split on sentence-ending punctuation (. ! ?)
  - Ensure chunks don't exceed ~2,500 characters
  - Keep sentences intact (don't split mid-sentence)
- **Playback:**
  - Play chunks sequentially
  - Brief pause (~500ms) between chunks
  - Show progress indicator: "Reading chunk 2 of 5"
- **Stop handling:**
  - User can stop at any time
  - Stops current chunk and discards remaining chunks
- Use `document.body.innerText` to get page content

### ElevenLabs Configuration (Options Page)

- API key input (password field, show/hide toggle)
- "Test Key" button (fetches voices to verify)
- Status indicator: ✓ Valid | ✗ Invalid | ⚠ Not Set
- Voice selector dropdown (populated from API)
- Voice preview button
- Speed preset selector (Slow / Normal / Fast)
- Cost estimate display (~$0.30/1M characters)

### Error Handling

| HTTP Status | ElevenLabs Error | Our Code | User Message |
|-------------|------------------|----------|--------------|
| - | No key in storage | `NO_TTS_API_KEY` | "Please add your ElevenLabs API key in settings" |
| 401 | Invalid API key | `INVALID_TTS_API_KEY` | "Your ElevenLabs API key is invalid. Check settings." |
| 429 | Rate limit | `TTS_RATE_LIMITED` | "Too many requests. Please wait a moment." |
| 400 | Text too long | `TTS_TEXT_TOO_LONG` | "Text is too long. Select less text." |
| - | Network failure | `TTS_NETWORK_ERROR` | "Couldn't connect to ElevenLabs. Check your internet." |
| - | Quota exceeded | `TTS_QUOTA_EXCEEDED` | "ElevenLabs quota exceeded. Check your usage." |

### First-Use Flow

- If user clicks "Read" without ElevenLabs API key:
  1. Show overlay: "ElevenLabs API key required for read aloud"
  2. Button: "Open Settings"
  3. On click → `chrome.runtime.openOptionsPage()`
  4. Options page highlights API key field

---

## 9) Consistency Across Websites: Technical Strategy

- Toolbar and overlays live in shadow DOM to prevent site CSS from breaking your UI.
- Use a single design token set (spacing, sizes, typography) and keep button order fixed.
- Avoid site-specific CSS selectors except in the readability extraction step.
- Toolbar persists across SPA navigation (single injection per page load).

### SPA Navigation Handling

**Requirement:** Toolbar persists across dynamic navigations (SPA route changes).

**Behavior:**
- Toolbar remains visible and functional across page navigations
- Overlays (Explain results) close on navigation
- TTS playback stops on navigation
- Implementation details deferred until build phase

---

## 10) Onboarding & Help: Technical Behavior

### On Install

- `chrome.runtime.onInstalled` opens onboarding page/tab.
- Onboarding page shows 3-5 screens explaining features.

### In-Page Help Tips

- Tooltip system:
  - First-run shows 1–2 tips max
  - "Don't show again" stored in settings
- Help button in toolbar shows contextual tips.

### Reset

- "Reset to default" clears:
  - Global settings (sync)
  - Per-site overrides (local)
  - Cached explain results (local)
  - Does NOT clear API key (user must do manually)

---

## 11) Accessibility (a11y) of Toolbar Itself

### ARIA Requirements

**Container:**
```html
<div role="toolbar" aria-label="Accessibility toolbar">
```

**Buttons:**
- `aria-label` on all buttons (descriptive, not just icon)
- Icons: `aria-hidden="true"` on icon spans
- State: `aria-disabled` for context-dependent buttons (Explain when no selection)

**Example:**
```html
<button 
  aria-label="Explain selected text"
  aria-disabled="true"
  class="toolbar-btn"
>
  <span aria-hidden="true">💡</span>
  <span class="sr-only">Explain</span>
</button>
```

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Move between toolbar buttons |
| Enter/Space | Activate button |
| Escape | Close any overlay, stop TTS |
| Arrow keys | Navigate within toolbar (optional enhancement) |

### Focus Management

- Visible focus indicators (2px outline, high contrast)
- When overlay opens → focus the overlay
- When overlay closes → return focus to triggering button
- Trap focus within overlays (don't let Tab escape to page behind)

### Screen Reader Support

**Live region for announcements:**
```javascript
const announcer = document.createElement('div');
announcer.setAttribute('role', 'status');
announcer.setAttribute('aria-live', 'polite');
announcer.setAttribute('aria-atomic', 'true');
announcer.className = 'sr-only';
document.body.appendChild(announcer);

function announce(message) {
  announcer.textContent = message;
  setTimeout(() => announcer.textContent = '', 1000);
}
```

**Screen reader only class:**
```css
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
```

### Testing Requirements

- Test with NVDA/JAWS/VoiceOver
- Ensure all interactive elements keyboard accessible
- Verify focus management in overlays
- Test with screen reader enabled

---

## 12) Messaging API (Internal)

### Message Protocol

**Settings:**
- `GET_SETTINGS` → `SETTINGS_RESPONSE`
- `SET_SETTINGS` → `SETTINGS_UPDATED`
- `APPLY_SITE_OVERRIDE` → `OVERRIDE_APPLIED`

**Explain:**
- `EXPLAIN_REQUEST` → `EXPLAIN_RESPONSE` (includes error handling)

**TTS (ElevenLabs):**
- `TTS_SPEAK` → `TTS_STARTED` (content → background → offscreen → fetch + play audio)
- `TTS_PAUSE` → `TTS_PAUSED` (pause current audio playback)
- `TTS_RESUME` → `TTS_RESUMED` (resume paused audio)
- `TTS_STOP` → `TTS_STOPPED` (stop and discard audio)
- `TTS_VOICES_REQUEST` → `TTS_VOICES_RESPONSE` (fetches from ElevenLabs API)
- `TTS_EVENT` (from offscreen → background → content script: `start`, `end`, `paused`, `resumed`, `error`)

**Error Format:**
- All async responses include `requestId` for correlation
- Error responses use same message type with `success: false`
- See section 7.3 for error code details

---

## 13) MVP Scope (Tight, Buildable)

### Must-Have MVP

- Floating right-side toolbar injected + consistent UI
- Text size + line spacing controls
- Explain paragraph/selection → overlay result (with OpenAI integration)
- TTS for selection + page via ElevenLabs + speed + voice pick
- Onboarding page
- Options page with OpenAI + ElevenLabs key configuration
- Basic error handling
- Toolbar persists across SPA navigation
- Accessibility (ARIA, keyboard nav)

### Defer

- Simplify Mode (full reading view overlay) — v2+
- Word-level TTS highlighting (requires ElevenLabs streaming API) — v2+
- Context menus
- Per-site override UI polish (basic version in MVP)
- Advanced help system (basic tooltips in MVP)
- Settings migration UI (automatic migration only)

---

## 14) Technical Decisions Summary

### Service Worker Strategy
- **Minimal service worker** - Only handles TTS relay (to offscreen document) and onboarding
- All other logic (DOM, OpenAI API calls, UI) in content script
- ElevenLabs calls routed through offscreen document (which has DOM context for audio playback)

### Storage Strategy
- **Split storage:** `sync` for global settings, `local` for per-site overrides, cache, API keys
- Prevents hitting sync limits while keeping important settings synced

### TTS Implementation
- **ElevenLabs API** for high-quality, natural voices
- Audio played via offscreen document (service workers can't play audio)
- No word-level highlighting in MVP (ElevenLabs standard API doesn't provide timestamps)
- Progress indicator shown during playback
- Requires network; no offline support

### CSP Handling
- Use `chrome.scripting.insertCSS()` to bypass CSP restrictions
- Graceful degradation if injection fails

### OpenAI Integration
- Direct API calls from content script (no service worker relay)
- API key stored in `local` storage (not synced)
- Comprehensive error handling with user-friendly messages

### API Call Architecture Note
**Why OpenAI and ElevenLabs use different patterns:**
- **OpenAI (content script):** Returns JSON text response, no special handling needed
- **ElevenLabs (offscreen document):** Returns audio that must be played via `Audio` element, which requires a DOM context. Service workers cannot play audio, so we route through offscreen document.

---

## 15) File Structure (Proposed)

```
includs-chrome-extension/
├── manifest.json
├── background/
│   └── service-worker.js
├── offscreen/
│   ├── offscreen.html
│   └── offscreen.js          (audio playback for ElevenLabs TTS)
├── content/
│   ├── content.js
│   ├── toolbar.js
│   ├── explain.js
│   └── tts-client.js
├── ui/
│   ├── toolbar.css
│   ├── overlay.css
│   └── components/
│       ├── toolbar.html (template)
│       └── explain-overlay.html
├── options/
│   ├── options.html
│   ├── options.js
│   └── options.css
├── onboarding/
│   ├── onboarding.html
│   ├── onboarding.js
│   └── onboarding.css
└── icons/
    └── (extension icons)
```

---

## 16) Next Steps

1. Set up manifest.json with proper permissions (storage, scripting, offscreen)
2. Create minimal service worker (ElevenLabs TTS relay + onboarding)
3. Create offscreen document for audio playback
4. Build content script infrastructure
5. Implement floating right-side toolbar UI
6. Implement typography controls
7. Add OpenAI Explain integration (paragraph detection + selection)
8. Add ElevenLabs TTS functionality
9. Build options page with OpenAI + ElevenLabs key management
10. Create onboarding flow
11. Add error handling throughout
12. Ensure toolbar persists across SPA navigation
13. Add accessibility features (ARIA, keyboard nav)
14. Test with screen readers

---

**End of Specification v2**
