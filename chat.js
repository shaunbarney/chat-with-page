console.log('Chat script loaded');

const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
let pageHTML = ""; // Store page text context

/**
 * Add a user or bot message to the chat interface.
 */
function addMessage(message, isUser = true) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', isUser ? 'user' : 'bot');
  messageElement.innerHTML = isUser ? message : marked.parse(message || ""); // Use Marked.js for bot responses
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return messageElement; // Return the created element
}

/**
 * Show a loading spinner while the bot is processing.
 */
function showLoadingMessage() {
  const loadingMessage = document.createElement('div');
  loadingMessage.classList.add('message', 'bot'); // Styled like a bot message
  const spinner = document.createElement('span');
  spinner.classList.add('spinner');
  loadingMessage.appendChild(spinner);
  chatMessages.appendChild(loadingMessage);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return loadingMessage;
}

/**
 * Remove the loading spinner after receiving the response.
 */
function removeLoadingMessage(loadingMessage) {
  if (loadingMessage && loadingMessage.parentElement) {
    loadingMessage.remove();
  }
}

/**
 * Build a prompt for the GPT API.
 */
function buildPrompt(userMessage, context) {
  console.log("Context:\n", context);
  return `
You are a helpful assistant. The user is viewing a webpage.
Here is the text content extracted from the page:
"${context}"

The user asked:
"${userMessage}"

Respond with a helpful, accurate answer in Markdown format.
`.trim();
}

/**
 * Redirect the user to the settings page if the API key is not set.
 */
function redirectToSettings() {
  addMessage(
    "No API Key found. Redirecting to the <a href='settings.html' target='_blank'>settings page</a> to configure it.",
    false
  );
  setTimeout(() => {
    window.open("settings.html", "_blank");
  }, 2000); // Redirect after 2 seconds
}

/**
 * Call OpenAI API with a prompt and selected model.
 */
async function callGPTAPI(prompt) {
  try {
    const { openaiApiKey, openaiModel } = await new Promise((resolve) =>
      chrome.storage.local.get(['openaiApiKey', 'openaiModel'], resolve)
    );

    if (!openaiApiKey) {
      redirectToSettings();
      throw new Error("No API Key found. Please configure it in the settings page.");
    }

    if (!openaiModel) {
      throw new Error("No model selected. Please configure it in the settings page.");
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: openaiModel,
        messages: [
          { role: 'system', content: "Provide responses in Markdown format." },
          { role: 'user', content: prompt },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${errorText}`);
    }

    const data = await response.json();
    if (!data.choices || data.choices.length === 0) {
      throw new Error("No valid response from the API.");
    }

    return data.choices[0].message?.content || "No response from the model.";
  } catch (error) {
    return `Error: ${error.message || "An unexpected error occurred."}`;
  }
}

/**
 * Handle user messages and process the response.
 */
sendButton.addEventListener('click', async () => {
  const userMessage = chatInput.value.trim();

  if (!userMessage) {
    return;
  }

  // Add user message to chat interface
  addMessage(userMessage, true);
  chatInput.value = ''; // Clear the input field

  // Show loading spinner
  const loadingMessage = showLoadingMessage();

  // Build the prompt
  const prompt = buildPrompt(userMessage, pageHTML);

  try {
    // Call the GPT API
    const botResponse = await callGPTAPI(prompt);

    // Remove loading spinner and display bot response
    removeLoadingMessage(loadingMessage);
    addMessage(botResponse, false);
  } catch (error) {
    // Remove loading spinner and show error message
    removeLoadingMessage(loadingMessage);
    addMessage("An error occurred. Please try again.", false);
  }
});

// Allow pressing Enter to send a message
chatInput.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') sendButton.click();
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "updateChat" && message.html) {
    pageHTML = message.html; // Store the page text
  }
});

// Request the page content when the panel loads
chrome.runtime.sendMessage({ action: "getPageHTML" }, (response) => {
  if (response?.error) {
    addMessage(`Error: ${response.error}`, false);
  }
});
