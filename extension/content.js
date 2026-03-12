/**
 * ZeroVault Content Script
 * Detects login forms, offers autofill, and captures submitted credentials for saving.
 */

(function () {
  "use strict";

  let hasDetectedForm = false;
  let autofillBadge = null;

  // ─── Detect Login Forms ───
  function detectLoginForms() {
    const passwordFields = document.querySelectorAll('input[type="password"]:not([data-zv-detected])');

    passwordFields.forEach((passField) => {
      passField.setAttribute("data-zv-detected", "true");

      // Find the form or closest container
      const form = passField.closest("form");

      // Find associated username/email field
      let userField = null;
      if (form) {
        userField = form.querySelector(
          'input[type="email"], input[type="text"][name*="user"], input[type="text"][name*="email"], input[type="text"][name*="login"], input[autocomplete="username"], input[autocomplete="email"]'
        );
      } else {
        // Look for nearby text inputs
        const parent = passField.parentElement?.parentElement || document.body;
        userField = parent.querySelector(
          'input[type="email"], input[type="text"][name*="user"], input[type="text"][name*="email"]'
        );
      }

      // Add autofill badge near password field
      addAutofillBadge(passField);

      // Listen for form submission to capture credentials
      if (form && !form.hasAttribute("data-zv-listener")) {
        form.setAttribute("data-zv-listener", "true");
        form.addEventListener("submit", () => {
          captureCredentials(userField, passField);
        });
      }

      // Also capture on Enter key in password field
      passField.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          captureCredentials(userField, passField);
        }
      });
    });
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
        // Send message to background to open popup
        chrome.runtime.sendMessage({ action: "openPopup" });
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
    chrome.runtime.sendMessage({
      action: "credentialsCaptured",
      data: { domain, username },
    });
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
