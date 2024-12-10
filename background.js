console.log('Background script loaded start');

// Set up the extension on installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("onInstalled event triggered");

  // Ensure the side panel opens automatically when the extension icon is clicked
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  console.log("Side panel behavior set to open automatically");
});

// Listen for messages from chat.js requesting the page HTML
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageHTML") {
    console.log("Received request to get page HTML");

    // Query the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];

      if (!activeTab || !activeTab.id) {
        console.error("No valid active tab found");
        sendResponse({ error: "No active tab found" });
        return;
      }

      console.log("Injecting content script into tab:", activeTab.id);

      // Inject content.js into the active tab
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ['content.js']
      }).then(() => {
        console.log("Content script injected successfully");
        sendResponse({ success: true });
      }).catch((error) => {
        console.error("Error injecting content script:", error);
        sendResponse({ error: error.message });
      });
    });

    // Indicate we will send a response asynchronously
    return true;
  }

  console.warn("Unknown request action received:", request.action);
});

console.log('Background script loaded end');
