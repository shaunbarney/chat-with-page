// Ensure the script is executed on initial load and dynamic URL changes
if (!window.contentScriptInjected) {
  window.contentScriptInjected = true;

  injectContentMonitoring();
}

function injectContentMonitoring() {
  // Extract the text content on initial page load
  attemptToSendMainText();

  // Monitor for SPA navigation changes
  let lastUrl = location.href;
  new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      console.log("Detected URL change. Reinjecting content...");
      lastUrl = currentUrl;
      attemptToSendMainText();
    }
  }).observe(document.body, { childList: true, subtree: true });
}

function attemptToSendMainText(retryCount = 0) {
  const mainElement = document.querySelector('main');

  if (!mainElement) {
    console.log("No <main> element found on the page.");
    chrome.runtime.sendMessage({ action: "updateChat", html: "" });
    return;
  }

  // Extract visible text content only
  const mainText = extractVisibleText(mainElement);

  // Retry mechanism for dynamically loaded content
  if (!mainText && retryCount < 3) {
    console.log("No visible text in <main> yet. Retrying...");
    setTimeout(() => attemptToSendMainText(retryCount + 1), 500);
    return;
  }

  if (!mainText) {
    console.log("Main element is present but no visible text found.");
  } else {
    console.log("Main visible text found and being sent:", mainText.slice(0, 100) + "...");
  }

  chrome.runtime.sendMessage({ action: "updateChat", html: mainText });
}

/**
 * Extracts visible text content from a DOM element.
 * Filters out scripts, styles, and hidden elements.
 */
function extractVisibleText(element) {
  const clonedElement = element.cloneNode(true);

  // Remove all <script> and <style> elements
  clonedElement.querySelectorAll('script, style').forEach((el) => el.remove());

  // Remove hidden elements
  clonedElement.querySelectorAll('[style*="display:none"], [style*="visibility:hidden"]').forEach((el) => el.remove());

  // Extract and return visible text
  return clonedElement.innerText.trim();
}
