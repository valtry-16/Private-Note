/**
 * ZeroVault Background Service Worker
 * Handles message passing between popup and content scripts,
 * including smart username-based password lookup.
 */

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "credentialsCaptured") {
    chrome.action.setBadgeText({ text: "1", tabId: sender.tab?.id });
    chrome.action.setBadgeBackgroundColor({ color: "#3b82f6" });
  }

  if (message.action === "openPopup") {
    chrome.action.setBadgeText({ text: "•", tabId: sender.tab?.id });
    chrome.action.setBadgeBackgroundColor({ color: "#22c55e" });
  }

  // Smart autofill: look up username in cached decrypted passwords
  if (message.action === "lookupUsername") {
    const { username, domain } = message;
    chrome.storage.session.get("decryptedPasswords", (result) => {
      const passwords = result.decryptedPasswords || [];
      if (passwords.length === 0) {
        sendResponse(null);
        return;
      }

      const input = (username || "").toLowerCase();

      // Priority 1: match both username AND domain
      let match = passwords.find((p) => {
        const pUser = (p.username || "").toLowerCase();
        const pDomain = extractDomain(p.website || "");
        return pUser === input && domain.includes(pDomain);
      });

      // Priority 2: match username only
      if (!match) {
        match = passwords.find((p) => {
          return (p.username || "").toLowerCase() === input;
        });
      }

      // Priority 3: partial username match on same domain
      if (!match) {
        match = passwords.find((p) => {
          const pUser = (p.username || "").toLowerCase();
          const pDomain = extractDomain(p.website || "");
          return pUser && input.includes(pUser) && domain.includes(pDomain);
        });
      }

      if (match) {
        sendResponse({ password: match.password, username: match.username });
      } else {
        sendResponse(null);
      }
    });

    // Return true to indicate we'll call sendResponse asynchronously
    return true;
  }
});

function extractDomain(url) {
  try {
    if (!url.includes("://")) url = "https://" + url;
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url.replace("www.", "").split("/")[0];
  }
}

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
