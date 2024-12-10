// Ensure the script is executed on initial load and dynamic URL changes
if (!window.contentScriptInjected) {
  window.contentScriptInjected = true;

  initContentScript();
}

/**
 * Initialize content script monitoring for page load and dynamic URL changes.
 */
function initContentScript() {
  console.log("[Content Script] Initializing content script...");

  // Extract text content on initial page load
  extractAndSendText();

  // Monitor for SPA navigation changes
  monitorUrlChanges();
}

/**
 * Monitors for URL changes in single-page applications (SPAs).
 * Calls `extractAndSendText` when a URL change is detected.
 */
function monitorUrlChanges() {
  console.log("[Content Script] Setting up URL change monitoring...");

  let lastUrl = location.href;

  const observer = new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      console.log(`[Content Script] URL change detected: ${lastUrl} -> ${currentUrl}`);
      lastUrl = currentUrl;
      extractAndSendText();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Extracts text content from the main element (or fallback) and sends it to the extension.
 * Includes retry logic for dynamically loaded content.
 */
function extractAndSendText(retryCount = 0) {
  console.log("[Content Script] Attempting to extract text content...");

  let contentText = "";

  // Try to extract from <main>
  const mainElement = document.querySelector('main');
  if (mainElement) {
    console.log("[Content Script] Found <main> element.");
    contentText = extractVisibleText(mainElement);
  }

  // Fallback: Concatenate text from all <article> elements
  if (!contentText) {
    const articleElements = document.querySelectorAll('article');
    if (articleElements.length > 0) {
      console.log(`[Content Script] Found ${articleElements.length} <article> elements.`);
      contentText = Array.from(articleElements)
        .map((article) => extractVisibleText(article))
        .join("\n\n");
    }
  }

  // Fallback: Extract from <section>
  if (!contentText) {
    const sectionElement = document.querySelector('section');
    if (sectionElement) {
      console.log("[Content Script] Found <section> element.");
      contentText = extractVisibleText(sectionElement);
    }
  }

  // Fallback: First <div> inside <body>
  if (!contentText) {
    const firstDiv = document.body.querySelector('div');
    if (firstDiv) {
      console.log("[Content Script] Found first <div> inside <body>.");
      contentText = extractVisibleText(firstDiv);
    }
  }

  // Final fallback: Entire <body>
  if (!contentText) {
    console.log("[Content Script] Using <body> as fallback.");
    contentText = extractVisibleText(document.body);
  }

  // Retry logic for dynamically loaded content
  if (!contentText && retryCount < 3) {
    console.log(`[Content Script] No visible text found. Retrying (${retryCount + 1}/3)...`);
    setTimeout(() => extractAndSendText(retryCount + 1), 500);
    return;
  }

  if (contentText) {
    console.log("[Content Script] Text content extracted successfully. Preview:", contentText.slice(0, 100));
  } else {
    console.warn("[Content Script] No visible text found even after retries.");
  }

  sendMessageToExtension(contentText);
}

/**
 * Sends extracted text content to the extension via a Chrome message.
 * @param {string} text - The text content to send.
 */
function sendMessageToExtension(text) {
  console.log("[Content Script] Sending extracted text to extension...");
  chrome.runtime.sendMessage({ action: "updateChat", html: text }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("[Content Script] Error sending message to extension:", chrome.runtime.lastError.message);
    } else {
      console.log("[Content Script] Message sent successfully. Response:", response);
    }
  });
}

/**
 * Extracts visible text content from a DOM element.
 * Filters out scripts, styles, and hidden elements.
 * @param {HTMLElement} element - The DOM element to extract text from.
 * @returns {string} - The visible text content.
 */
function extractVisibleText(element) {
  console.log("[Content Script] Extracting visible text from element:", element.tagName);
  const clonedElement = element.cloneNode(true);

  // Remove <script>, <style>, and metadata elements
  clonedElement.querySelectorAll('script, style, meta, link, iframe').forEach((el) => el.remove());
  console.log("[Content Script] Removed script, style, and metadata elements.");

  // Remove elements that are not visible
  clonedElement.querySelectorAll('[style*="display:none"], [style*="visibility:hidden"]').forEach((el) => el.remove());
  console.log("[Content Script] Removed hidden elements.");

  // Remove irrelevant sections like nav, header, footer, and aside
  clonedElement.querySelectorAll('nav, footer, header, aside').forEach((el) => el.remove());
  console.log("[Content Script] Removed irrelevant sections (nav, footer, header, aside).");

  // Extract and return only visible text
  const visibleText = clonedElement.innerText.trim();
  console.log("[Content Script] Extracted visible text:", visibleText.slice(0, 100) || "No visible text found.");
  return visibleText;
}
