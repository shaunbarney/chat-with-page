// background.js

console.log('Background script loaded start');

chrome.runtime.onInstalled.addListener(() => {
  console.log("onInstalled event triggered");
  // Keep the side panel automatic opening
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  console.log("Side panel behaviour set to open automatically");
});


// Listen for messages from chat.js requesting the page HTML
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageHTML") {
    console.log("Received request to get page HTML");
    // Get the currently active tab to inject the script into it
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id) {
        console.log("No valid active tab found");
        sendResponse({ error: "No active tab found" });
        return;
      }

      console.log("Injecting content script into tab:", activeTab.id);
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ['content.js']
      }).then(() => {
        console.log("Content script injected successfully");
        // The response will be sent once content.js sends the HTML back
        // We'll wait for that in another listener below or we can rely on 
        // content.js sending a message directly to chat.js.
      }).catch((error) => {
        console.error("Error injecting content script:", error);
        sendResponse({ error: error.message });
      });
    });

    // Indicate we will send a response asynchronously
    return true;
  }
});

console.log('Background script loaded end');
