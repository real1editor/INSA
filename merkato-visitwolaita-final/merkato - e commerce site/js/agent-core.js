/**
 * Agent Core Module
 * Provides reusable async handler for interacting with the Gemini REST API,
 * including handling multi-turn tool loops.
 */

export async function runAgentTurn({ systemInstruction, messages, tools, toolHandlers, onStatusUpdate }) {
  // Retrieve API Key from window or localStorage
  const apiKey = (typeof window !== 'undefined' && (window.MERKATO_CONFIG?.GEMINI_API_KEY || window.GEMINI_API_KEY)) || (typeof localStorage !== 'undefined' ? localStorage.getItem('GEMINI_API_KEY') : null);
  if (!apiKey) {
    throw new Error('API_KEY_MISSING');
  }

  const modelName = (typeof window !== 'undefined' && window.MERKATO_CONFIG?.GEMINI_MODEL) || 'gemini-3.6-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  let loopLimit = 10; // Prevent infinite tool call loops
  let currentTurn = 0;

  while (currentTurn < loopLimit) {
    currentTurn++;

    // Prepare Request Payload
    const payload = {
      contents: messages
    };

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    if (tools && tools.length > 0) {
      payload.tools = [
        {
          functionDeclarations: tools
        }
      ];
    }

    // Call Gemini API with retry for rate limiting
    let response;
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount <= maxRetries) {
      const fetchResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (fetchResponse.ok) {
        response = fetchResponse;
        break;
      }

      if (fetchResponse.status === 429 && retryCount < maxRetries) {
        retryCount++;
        const waitSeconds = 4;
        if (onStatusUpdate) {
          onStatusUpdate(`⚡ Rate limited. Retrying in ${waitSeconds}s... (${retryCount}/${maxRetries})`);
        }
        await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
        continue;
      }

      const errorText = await fetchResponse.text();
      throw new Error(`Gemini API Error (${fetchResponse.status}): ${errorText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (!candidate || !candidate.content) {
      throw new Error('Invalid or empty response from Gemini API.');
    }

    const modelContent = candidate.content;
    const parts = modelContent.parts || [];

    // Find any function calls
    const functionCalls = parts.filter(part => part.functionCall);

    if (functionCalls.length > 0) {
      // Add the model's assistant message (containing functionCalls) to history
      messages.push(modelContent);

      const toolResponseParts = [];

      for (const part of functionCalls) {
        const call = part.functionCall;
        const name = call.name;
        const args = call.args || {};

        if (onStatusUpdate) {
          if (name === 'searchCatalog') {
            onStatusUpdate('⚡ Searching Merkato catalog...');
          } else if (name === 'addToCart') {
            onStatusUpdate('⚡ Adding item to cart...');
          } else {
            onStatusUpdate(`⚡ Executing tool ${name}...`);
          }
        }

        const handler = toolHandlers[name];
        let result;
        if (handler) {
          try {
            result = await handler(args);
          } catch (err) {
            result = { error: err.message };
          }
        } else {
          result = { error: `Tool handler for '${name}' not found.` };
        }

        toolResponseParts.push({
          functionResponse: {
            name: name,
            response: { result: result }
          }
        });
      }

      // Add tool responses back to history
      messages.push({
        role: 'user',
        parts: toolResponseParts
      });

      // Clear the temporary status update
      if (onStatusUpdate) {
        onStatusUpdate(null);
      }

      // Continue the loop to send tool responses back to Gemini
      continue;
    } else {
      // No function calls, we have the final assistant message.
      // Append assistant's final text message to history and return.
      messages.push(modelContent);
      return modelContent;
    }
  }

  throw new Error('Exceeded maximum tool loop limit.');
}
