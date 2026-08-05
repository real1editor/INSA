/**
 * Merkato Configuration
 * Optional global config for the Merkato platform.
 * 
 * You can set your Gemini API key here to avoid using the in-chat input.
 * This file is loaded before main.js and exposes window.MERKATO_CONFIG.
 * 
 * IMPORTANT: Do NOT commit real API keys to version control.
 */

window.MERKATO_CONFIG = {
  // Paste your Gemini API key below, or leave empty to use the chat input.
  GEMINI_API_KEY: '',

  // Gemini model name. Recommended options:
  // - gemini-3.6-flash         (default; latest stable Flash release)
  // - gemini-2.5-flash         (retired; may return 404)
  // - gemini-flash-latest      (alias for latest Flash; may change without notice)
  GEMINI_MODEL: 'gemini-3.6-flash',
};
