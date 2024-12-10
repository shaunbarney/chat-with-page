document.getElementById('saveKey').addEventListener('click', () => {
  const apiKey = document.getElementById('apiKey').value.trim();
  const selectedModel = document.getElementById('modelSelect').value;

  if (apiKey) {
    // Save the API key and selected model in Chrome's local storage
    chrome.storage.local.set({ openaiApiKey: apiKey, openaiModel: selectedModel }, () => {
      document.getElementById('status').textContent = "API Key and model saved successfully!";
      document.getElementById('status').style.color = "green";
    });
  } else {
    document.getElementById('status').textContent = "Please enter a valid API Key.";
    document.getElementById('status').style.color = "red";
  }
});

// Load the saved API key and model on page load
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['openaiApiKey', 'openaiModel'], (result) => {
    if (result.openaiApiKey) {
      document.getElementById('apiKey').value = result.openaiApiKey;
    }
    if (result.openaiModel) {
      document.getElementById('modelSelect').value = result.openaiModel;
    }
  });
});
