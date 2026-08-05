/**
 * Agent Core Module
 * Handles the core conversational turn logic, including API calls,
 * retry mechanisms, and tool execution.
 */

const API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";
const MODEL_NAME = "gemini-3.6-flash"; // Primary model
const FALLBACK_MODEL_NAME = "gemini-flash-latest"; // Fallback model

/**
 * Executes a single conversational turn with the Gemini API,
 * including retry logic for rate limits and tool execution.
 * @param {object} params - Parameters for the agent turn.
 * @param {string} params.systemInstruction - The system instruction for the model.
 * @param {Array<object>} params.messages - The conversation history.
 * @param {Array<object>} params.tools - Function declarations for the model.
 * @param {object} params.toolHandlers - Mappings of tool names to their client-side implementations.
 * @param {function} params.onStatusUpdate - Callback for status updates.
 * @returns {Promise<object>} The final model response.
 */
export async function runAgentTurn({ systemInstruction, messages, tools, toolHandlers, onStatusUpdate }) {
  const apiKey = window.MERKATO_CONFIG?.GEMINI_API_KEY || window.GEMINI_API_KEY || localStorage.getItem('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('API_KEY_MISSING');
  }

  let retries = 0;
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 4000;

  let currentModel = MODEL_NAME;

  while (retries <= MAX_RETRIES) {
    try {
      onStatusUpdate(`⚡ Thinking with ${currentModel}...`);

      const requestBody = {
        contents: [
          { role: "user", parts: [{ text: systemInstruction }] },
          ...messages
        ],
        tools: [{ functionDeclarations: tools }]
      };

      const response = await fetch(
        `${API_BASE_URL}${currentModel}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (response.status === 429) {
        if (retries < MAX_RETRIES) {
          onStatusUpdate(`Rate limit hit. Retrying in ${RETRY_DELAY_MS / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          retries++;
          continue; // Retry the request
        } else {
          throw new Error('Rate limit exceeded after multiple retries.');
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        throw new Error(`API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();

      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No candidates returned from API.');
      }

      const candidate = data.candidates[0];
      const finishReason = candidate.finishReason;

      if (finishReason === 'STOP' || finishReason === 'MAX_TOKENS') {
        // Model returned a text response or finished normally
        return candidate.content;
      } else if (finishReason === 'TOOL_CODE') {
        // Model wants to call a tool
        const functionCall = candidate.content.parts[0].functionCall;
        if (functionCall) {
          onStatusUpdate(`⚙️ Calling tool: ${functionCall.name}...`);
          const toolOutput = await handleToolCall(functionCall, toolHandlers);
          onStatusUpdate(`✅ Tool '${functionCall.name}' executed.`);

          // Send tool output back to the model
          messages.push(candidate.content); // Add the tool_code message
          messages.push({
            role: "user",
            parts: [{ functionResponse: { name: functionCall.name, response: toolOutput } }]
          });

          // Continue the conversation turn with the tool output
          // This will effectively re-enter the loop with the updated messages
          retries = 0; // Reset retries for the next API call
          continue;
        }
      }
      
      // If we reach here, it's an unexpected finishReason or content structure
      throw new Error(`Unexpected API response finish reason: ${finishReason}`);

    } catch (error) {
      if (currentModel === MODEL_NAME && error.message.includes('API error')) {
        onStatusUpdate(`Primary model failed. Falling back to ${FALLBACK_MODEL_NAME}...`);
        currentModel = FALLBACK_MODEL_NAME;
        retries = 0; // Reset retries for fallback model
        continue;
      }
      throw error; // Re-throw if fallback also fails or other error
    }
  }
  throw new Error('Failed to get a response after multiple retries and model fallback.');
}

/**
 * Dynamically executes the appropriate tool handler based on the function call.
 * @param {object} functionCall - The functionCall object from the Gemini API.
 * @param {object} toolHandlers - Mappings of tool names to their client-side implementations.
 * @returns {Promise<any>} The result of the tool execution.
 */
async function handleToolCall(functionCall, toolHandlers) {
  const handler = toolHandlers[functionCall.name];
  if (handler) {
    return await handler(functionCall.args);
  } else {
    throw new Error(`No handler found for tool: ${functionCall.name}`);
  }
}
