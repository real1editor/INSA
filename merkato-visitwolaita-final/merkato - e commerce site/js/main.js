/**
 * Main Integration Module
 * Binds the chat drawer UI, manages API key input, intercepts user input,
 * displays status indicators, and drives the conversation loop with the AI Agent.
 */

import { runAgentTurn } from './agent-core.js';
import { 
  systemInstruction, 
  merkatoHistory, 
  clearMerkatoHistory, 
  tools, 
  toolHandlers 
} from './merkato-agent.js';

// DOM Elements
let chatInput, chatSend, chatMessages, chatStatus, chatClear, chatClose, chatOverlay, chatDrawer, chatTrigger;
let apiKeyInput, apiKeySave, apiKeyStatus;

function initDOMElements() {
  chatInput = document.getElementById('merkato-chat-input');
  chatSend = document.getElementById('merkato-chat-send');
  chatMessages = document.getElementById('merkato-chat-messages');
  chatStatus = document.getElementById('merkato-chat-status');
  chatClear = document.getElementById('merkato-chat-clear');
  chatClose = document.getElementById('merkato-chat-close');
  chatOverlay = document.getElementById('merkato-chat-overlay');
  chatDrawer = document.getElementById('merkato-chat-drawer');
  chatTrigger = document.getElementById('merkato-chat-trigger');
  
  apiKeyInput = document.getElementById('merkato-api-key-input');
  apiKeySave = document.getElementById('merkato-api-key-save');
  apiKeyStatus = document.getElementById('api-key-status');
}

/**
 * Handle API Key initialization and persistence
 */
function initApiKey() {
  const configKey = window.MERKATO_CONFIG?.GEMINI_API_KEY;
  const savedKey = configKey || localStorage.getItem('GEMINI_API_KEY');
  
  if (savedKey) {
    window.GEMINI_API_KEY = savedKey;
    if (apiKeyInput) apiKeyInput.value = savedKey;
    updateApiKeyStatus(true);
  } else {
    updateApiKeyStatus(false);
  }

  if (apiKeySave) {
    apiKeySave.addEventListener('click', () => {
      const key = apiKeyInput.value.trim();
      if (key) {
        localStorage.setItem('GEMINI_API_KEY', key);
        window.GEMINI_API_KEY = key;
        updateApiKeyStatus(true);
        if (typeof window.showToast === 'function') {
          window.showToast('Gemini API Key saved successfully!', 'success');
        }
      } else {
        localStorage.removeItem('GEMINI_API_KEY');
        delete window.GEMINI_API_KEY;
        updateApiKeyStatus(false);
        if (typeof window.showToast === 'function') {
          window.showToast('API Key removed.', 'info');
        }
      }
    });
  }
}

function updateApiKeyStatus(isSet) {
  if (!apiKeyStatus) return;
  if (isSet) {
    apiKeyStatus.textContent = 'Set';
    apiKeyStatus.className = 'text-[10px] px-1.5 py-0.5 rounded font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  } else {
    apiKeyStatus.textContent = 'Not Set';
    apiKeyStatus.className = 'text-[10px] px-1.5 py-0.5 rounded font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
  }
}

/**
 * Drawer Toggle Operations
 */
function openChatDrawer() {
  if (chatDrawer && chatOverlay) {
    chatOverlay.classList.remove('hidden');
    chatDrawer.classList.remove('translate-x-full');
  }
}

function closeChatDrawer() {
  if (chatDrawer && chatOverlay) {
    chatOverlay.classList.add('hidden');
    chatDrawer.classList.add('translate-x-full');
  }
}

function initDrawerToggles() {
  if (chatTrigger) chatTrigger.addEventListener('click', openChatDrawer);
  if (chatClose) chatClose.addEventListener('click', closeChatDrawer);
  if (chatOverlay) chatOverlay.addEventListener('click', closeChatDrawer);
}

/**
 * Chat History Helpers
 */
function appendMessageBubble(role, contentText) {
  if (!chatMessages) return;

  const bubbleWrapper = document.createElement('div');
  bubbleWrapper.className = 'flex gap-3 items-start';

  const isModel = role === 'model' || role === 'system';
  
  const iconHTML = isModel 
    ? `<div class="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 shrink-0"><i class="fas fa-robot w-5 h-5"></i></div>`
    : `<div class="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 shrink-0"><i class="fas fa-user w-5 h-5"></i></div>`;

  const bubbleClass = isModel
    ? 'p-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm max-w-[85%] text-gray-800 dark:text-gray-200'
    : 'p-3 rounded-xl bg-red-600 text-white text-sm max-w-[85%] ml-auto';

  // Sanitize and simple formatting (newlines to breaks, bold markup)
  let formattedText = contentText
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/\n/g, '<br/>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  bubbleWrapper.innerHTML = isModel 
    ? `${iconHTML}<div class="${bubbleClass}">${formattedText}</div>`
    : `<div class="${bubbleClass}">${formattedText}</div>${iconHTML}`;

  chatMessages.appendChild(bubbleWrapper);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendErrorBubble(message) {
  if (!chatMessages) return;

  const bubbleWrapper = document.createElement('div');
  bubbleWrapper.className = 'flex gap-3 items-start';

  const iconHTML = `<div class="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 shrink-0"><i class="fas fa-exclamation-triangle w-5 h-5"></i></div>`;
  const bubbleClass = 'p-3 rounded-xl bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-sm max-w-[85%] border border-red-200 dark:border-red-900/50';

  bubbleWrapper.innerHTML = `${iconHTML}<div class="${bubbleClass}">${message}</div>`;
  chatMessages.appendChild(bubbleWrapper);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Handle Conversational Turn Execution
 */
async function handleMerkatoUserMessage() {
  if (!chatInput) return;
  const text = chatInput.value.trim();
  if (!text) return;

  const apiKey = window.MERKATO_CONFIG?.GEMINI_API_KEY || window.GEMINI_API_KEY || localStorage.getItem('GEMINI_API_KEY');
  if (!apiKey) {
    appendMessageBubble('model', 'Please set your Gemini API key in the chat settings above to activate the assistant.');
    if (chatStatus) {
      chatStatus.textContent = '⚠️ API Key not configured';
      chatStatus.classList.remove('hidden');
    }
    return;
  }

  // Render User Message UI
  appendMessageBubble('user', text);
  chatInput.value = '';

  // Append user message to history state
  merkatoHistory.push({
    role: 'user',
    parts: [{ text }]
  });

  // Enable active status indicator handler
  const setStatus = (statusText) => {
    if (!chatStatus) return;
    if (statusText) {
      chatStatus.textContent = statusText;
      chatStatus.classList.remove('hidden');
    } else {
      chatStatus.classList.add('hidden');
    }
  };

  // Disable input controls immediately during API call to prevent duplicate requests
  if (chatSend) chatSend.disabled = true;
  if (chatInput) {
    chatInput.disabled = true;
  }

  setStatus('⚡ Thinking...');

  try {
    // Run loop in Agent Core
    const finalModelResponse = await runAgentTurn({
      systemInstruction,
      messages: merkatoHistory,
      tools,
      toolHandlers,
      onStatusUpdate: setStatus
    });

    setStatus(null);

    // Render Final Assistant Message UI
    const responseText = finalModelResponse.parts?.[0]?.text || "(No text response)";
    appendMessageBubble('model', responseText);

  } catch (error) {
    setStatus(null);
    console.error('Agent Turn Error:', error);
    if (error.message === 'API_KEY_MISSING') {
      appendErrorBubble('Please set your Gemini API key to activate the assistant.');
    } else {
      appendErrorBubble(`Error: ${error.message}`);
    }
  } finally {
    // Re-enable input controls inside a finally block after the turn completes
    if (chatSend) chatSend.disabled = false;
    if (chatInput) {
      chatInput.disabled = false;
      chatInput.focus();
    }
  }
}

/**
 * Clear conversation history
 */
function initClearHistory() {
  if (chatClear) {
    chatClear.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear the conversation history?')) {
        clearMerkatoHistory();
        if (chatMessages) {
          chatMessages.innerHTML = `
            <div class="flex gap-3 items-start">
                <div class="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 shrink-0"><i class="fas fa-robot w-5 h-5"></i></div>
                <div class="p-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm max-w-[85%] text-gray-800 dark:text-gray-200">
                    <p class="font-semibold text-gray-900 dark:text-white mb-1">Selam! Conversation cleared.</p>
                    <p>How else can I help you shop authentic products from Wolaita Sodo today?</p>
                </div>
            </div>
          `;
        }
      }
    });
  }
}

/**
 * Initialization on DOM Content Loaded
 */
function init() {
  initDOMElements();
  initApiKey();
  initDrawerToggles();
  initClearHistory();

  if (chatSend) {
    chatSend.addEventListener('click', handleMerkatoUserMessage);
  }

  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleMerkatoUserMessage();
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
