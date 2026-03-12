/**
 * ZeroVault Background Service Worker
 * Handles message passing between popup and content scripts.
 */

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === "credentialsCaptured") {
    // Show badge on extension icon to indicate captured credentials
    chrome.action.setBadgeText({ text: "1", tabId: sender.tab?.id });
    chrome.action.setBadgeBackgroundColor({ color: "#3b82f6" });
  }

  if (message.action === "openPopup") {
    // Cannot programmatically open popup, but we can set badge to hint
    chrome.action.setBadgeText({ text: "•", tabId: sender.tab?.id });
    chrome.action.setBadgeBackgroundColor({ color: "#22c55e" });
  }
});

// Clear badge when popup opens
chrome.action.onClicked?.addListener(() => {
  chrome.action.setBadgeText({ text: "" });
});

// Clean up expired pending credentials (older than 5 minutes)
chrome.alarms.create("cleanPending", { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "cleanPending") {
    chrome.storage.session.get("pendingCredentials", (result) => {
      if (result.pendingCredentials) {
        const age = Date.now() - result.pendingCredentials.capturedAt;
        if (age > 5 * 60 * 1000) {
          chrome.storage.session.remove("pendingCredentials");
        }
      }
    });
  }
});
