/**
 * ZeroVault Content Script
 * Detects login forms, offers autofill, captures credentials, and auto-fills
 * passwords when the user types a known username/email.
 */

(function () {
  "use strict";

  const USER_FIELD_SELECTOR =
    'input[type="email"], input[type="text"][name*="user"], input[type="text"][name*="email"], input[type="text"][name*="login"], input[autocomplete="username"], input[autocomplete="email"]';

  // ─── Detect Login Forms ───
  function detectLoginForms() {
    const passwordFields = document.querySelectorAll('input[type="password"]:not([data-zv-detected])');

    passwordFields.forEach((passField) => {
      passField.setAttribute("data-zv-detected", "true");

      const form = passField.closest("form");

      let userField = null;
      if (form) {
        userField = form.querySelector(USER_FIELD_SELECTOR);
      } else {
        const parent = passField.parentElement?.parentElement || document.body;
        userField = parent.querySelector(USER_FIELD_SELECTOR);
      }

      // Add autofill badge near password field
      addAutofillBadge(passField);

      // Attach smart autofill: when user leaves the username field, look up vault
      if (userField && !userField.hasAttribute("data-zv-smart")) {
        userField.setAttribute("data-zv-smart", "true");
        attachSmartAutofill(userField, passField);
      }

      // Listen for form submission to capture credentials
      if (form && !form.hasAttribute("data-zv-listener")) {
        form.setAttribute("data-zv-listener", "true");
        form.addEventListener("submit", () => {
          captureCredentials(userField, passField);
        });
      }

      passField.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          captureCredentials(userField, passField);
        }
      });
    });
  }

  // ─── Smart Autofill: username blur → lookup → fill password ───
  function attachSmartAutofill(userField, passField) {
    let debounceTimer = null;

    function doLookup() {
      const username = userField.value.trim();
      if (!username || username.length < 3) return;

      try {
        chrome.runtime.sendMessage(
          { action: "lookupUsername", username },
          (response) => {
            if (chrome.runtime.lastError) return;
            if (response && response.password) {
              passField.value = response.password;
              passField.dispatchEvent(new Event("input", { bubbles: true }));
              passField.dispatchEvent(new Event("change", { bubbles: true }));
              showAutofillHint(passField);
            }
          }
        );
      } catch {
        // Extension context invalidated
      }
    }

    // Trigger on blur (user tabs or clicks away from username field)
    userField.addEventListener("blur", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(doLookup, 200);
    });

    // Also trigger on Enter in username field
    userField.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === "Tab") {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(doLookup, 100);
      }
    });
  }

  // ─── Show a brief green flash on the password field after autofill ───
  function showAutofillHint(field) {
    const origBorder = field.style.borderColor;
    const origShadow = field.style.boxShadow;
    field.style.borderColor = "#22c55e";
    field.style.boxShadow = "0 0 0 2px rgba(34, 197, 94, 0.3)";
    setTimeout(() => {
      field.style.borderColor = origBorder;
      field.style.boxShadow = origShadow;
    }, 1500);
  }

  // ─── Autofill Badge ───
  function addAutofillBadge(passField) {
    if (passField.hasAttribute("data-zv-badge")) return;
    passField.setAttribute("data-zv-badge", "true");

    const badge = document.createElement("div");
    badge.className = "zv-autofill-badge";
    badge.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L3 7v6c0 5.25 3.82 10.16 9 11.28C17.18 23.16 21 18.25 21 13V7l-9-5z" stroke="#3b82f6" stroke-width="2" fill="#3b82f6" fill-opacity="0.2"/>
        <rect x="9" y="10" width="6" height="7" rx="1" fill="#3b82f6" fill-opacity="0.4" stroke="#3b82f6" stroke-width="1"/>
        <path d="M10 10V8a2 2 0 0 1 4 0v2" stroke="#3b82f6" stroke-width="1" fill="none"/>
      </svg>
    `;
    badge.title = "ZeroVault Autofill";

    // Position the badge inside the input field
    const parent = passField.parentElement;
    if (parent) {
      parent.style.position = parent.style.position || "relative";
      badge.style.position = "absolute";
      badge.style.right = "8px";
      badge.style.top = "50%";
      badge.style.transform = "translateY(-50%)";
      badge.style.cursor = "pointer";
      badge.style.zIndex = "10000";
      badge.style.padding = "4px";
      badge.style.borderRadius = "4px";
      badge.style.display = "flex";
      badge.style.alignItems = "center";
      badge.style.justifyContent = "center";
      badge.style.background = "white";
      badge.style.boxShadow = "0 1px 3px rgba(0,0,0,0.12)";

      parent.appendChild(badge);

      badge.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          chrome.runtime.sendMessage({ action: "openPopup" });
        } catch {
          // Extension context invalidated
        }
      });
    }
  }

  // ─── Capture Credentials ───
  function captureCredentials(userField, passField) {
    const username = userField?.value || "";
    const password = passField?.value || "";

    if (!password) return;

    const domain = window.location.hostname.replace("www.", "");

    // Store pending credentials for the popup to pick up
    chrome.storage.session.set({
      pendingCredentials: {
        website: window.location.origin,
        domain: domain,
        username: username,
        password: password,
        capturedAt: Date.now(),
      },
    });

    // Notify background script
    try {
      chrome.runtime.sendMessage({
        action: "credentialsCaptured",
        data: { domain, username },
      });
    } catch {
      // Extension context invalidated
    }
  }

  // ─── Listen for Autofill Messages from Background/Popup ───
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "autofill") {
      const { username, password } = message;

      const userFields = document.querySelectorAll(
        'input[type="email"], input[type="text"][name*="user"], input[type="text"][name*="email"], input[type="text"][name*="login"], input[autocomplete="username"], input[autocomplete="email"]'
      );
      const passFields = document.querySelectorAll('input[type="password"]');

      if (userFields.length > 0 && username) {
        const field = userFields[0];
        field.value = username;
        field.dispatchEvent(new Event("input", { bubbles: true }));
        field.dispatchEvent(new Event("change", { bubbles: true }));
      }

      if (passFields.length > 0 && password) {
        const field = passFields[0];
        field.value = password;
        field.dispatchEvent(new Event("input", { bubbles: true }));
        field.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  });

  // ─── Initialize ───
  detectLoginForms();

  // Re-scan for dynamically added forms (SPAs)
  const observer = new MutationObserver(() => {
    detectLoginForms();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
