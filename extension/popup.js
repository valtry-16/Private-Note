/**
 * ZeroVault Extension Popup
 * Handles login, password listing, autofill, and save prompts.
 */

// Supabase config — same as web app
const SUPABASE_URL = "https://gcsbazzmtivhmuietajs.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdjc2JhenptdGl2aG11aWV0YWpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjE3MDIsImV4cCI6MjA4ODUzNzcwMn0.g3ciFwNv6ei6BMsyWTCgsJqgQcqKIqaKhqK4GCAL5_E";

let session = null;
let masterPassword = null;
let passwords = [];

// ─── DOM Elements ───
const loginScreen = document.getElementById("login-screen");
const vaultScreen = document.getElementById("vault-screen");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const loginBtn = document.getElementById("login-btn");
const searchInput = document.getElementById("search");
const passwordList = document.getElementById("password-list");
const siteMatchSection = document.getElementById("site-match");
const siteMatchesList = document.getElementById("site-matches-list");
const lockBtn = document.getElementById("lock-btn");
const saveBanner = document.getElementById("save-banner");
const saveYes = document.getElementById("save-yes");
const saveNo = document.getElementById("save-no");

// ─── Initialize ───
document.addEventListener("DOMContentLoaded", async () => {
  // Eye toggle for password fields
  document.querySelectorAll(".eye-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.target);
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      btn.querySelector(".eye-open").classList.toggle("hidden", isHidden);
      btn.querySelector(".eye-closed").classList.toggle("hidden", !isHidden);
    });
  });

  const stored = await chrome.storage.session.get(["session", "masterPassword"]);
  if (stored.session && stored.masterPassword) {
    session = stored.session;
    masterPassword = stored.masterPassword;
    showVault();
    loadPasswords();
  }

  // Check for pending save from content script
  const pending = await chrome.storage.session.get("pendingCredentials");
  if (pending.pendingCredentials && session && masterPassword) {
    showSaveBanner(pending.pendingCredentials);
  }
});

// ─── Login ───
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const master = document.getElementById("master-password").value;

  loginBtn.disabled = true;
  loginError.classList.add("hidden");

  try {
    // Sign in with Supabase
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ email, password }),
    });

    const authData = await authRes.json();

    if (!authRes.ok) {
      throw new Error(authData?.error_description || authData?.msg || "Invalid email or password");
    }

    session = authData;

    // Verify master password
    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_profiles?user_id=eq.${authData.user.id}&select=encrypted_verification`,
      {
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${authData.access_token}`,
        },
      }
    );
    const profiles = await profileRes.json();
    if (!profiles[0]) throw new Error("No vault profile found");

    const valid = await verifyMasterPassword(master, profiles[0].encrypted_verification);
    if (!valid) throw new Error("Invalid master password");

    masterPassword = master;

    // Store in session (cleared when browser closes)
    await chrome.storage.session.set({ session: authData, masterPassword: master });

    showVault();
    loadPasswords();
  } catch (err) {
    console.error("ZeroVault login error:", err);
    loginError.textContent = err.message || "Login failed. Check your credentials.";
    loginError.classList.remove("hidden");
  }

  loginBtn.disabled = false;
});

// ─── Lock ───
lockBtn.addEventListener("click", async () => {
  session = null;
  masterPassword = null;
  passwords = [];
  await chrome.storage.session.clear();
  showLogin();
});

// ─── Search ───
searchInput.addEventListener("input", () => {
  renderPasswords(searchInput.value.trim().toLowerCase());
});

// ─── Show/Hide Screens ───
function showLogin() {
  loginScreen.classList.add("active");
  vaultScreen.classList.remove("active");
}

function showVault() {
  loginScreen.classList.remove("active");
  vaultScreen.classList.add("active");
}

// ─── Load & Decrypt Passwords ───
async function loadPasswords() {
  if (!session || !masterPassword) return;

  passwordList.innerHTML = '<p class="empty">Decrypting...</p>';

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/vault_items?user_id=eq.${session.user.id}&type=eq.password&is_deleted=eq.false&is_hidden=eq.false&order=updated_at.desc`,
      {
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${session.access_token}`,
        },
      }
    );
    const items = await res.json();
    passwords = [];

    for (const item of items) {
      try {
        const decrypted = JSON.parse(await decrypt(item.encrypted_data, masterPassword));
        passwords.push({ id: item.id, ...decrypted });
      } catch {
        // Skip items that fail to decrypt
      }
    }

    renderPasswords();
    matchCurrentSite();
  } catch {
    passwordList.innerHTML = '<p class="empty">Failed to load passwords</p>';
  }
}

// ─── Render Password List ───
function renderPasswords(filter = "") {
  const filtered = filter
    ? passwords.filter(
        (p) =>
          (p.title || "").toLowerCase().includes(filter) ||
          (p.website || "").toLowerCase().includes(filter) ||
          (p.username || "").toLowerCase().includes(filter)
      )
    : passwords;

  if (filtered.length === 0) {
    passwordList.innerHTML = `<p class="empty">${filter ? "No matches" : "No passwords saved"}</p>`;
    return;
  }

  passwordList.innerHTML = filtered
    .map(
      (p) => `
    <div class="password-card" data-id="${p.id}">
      <div class="pw-icon">🌐</div>
      <div class="pw-info">
        <div class="pw-title">${escapeHtml(p.title || p.website || "Untitled")}</div>
        <div class="pw-url">${escapeHtml(p.username || "")}</div>
      </div>
      <div class="pw-actions">
        <button class="autofill-btn" data-id="${p.id}" title="Autofill">📝</button>
        <button class="copy-btn" data-id="${p.id}" title="Copy Password">📋</button>
      </div>
    </div>
  `
    )
    .join("");

  // Attach event listeners
  document.querySelectorAll(".autofill-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      autofillPassword(btn.dataset.id);
    });
  });

  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      copyPassword(btn.dataset.id);
    });
  });
}

// ─── Match Current Site ───
async function matchCurrentSite() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return;

    const url = new URL(tab.url);
    const domain = url.hostname.replace("www.", "");

    const matches = passwords.filter((p) => {
      const pwDomain = extractDomain(p.website || "");
      return pwDomain && domain.includes(pwDomain);
    });

    if (matches.length > 0) {
      siteMatchSection.classList.remove("hidden");
      siteMatchesList.innerHTML = matches
        .map(
          (p) => `
        <div class="password-card" data-id="${p.id}">
          <div class="pw-icon">⭐</div>
          <div class="pw-info">
            <div class="pw-title">${escapeHtml(p.title || p.website)}</div>
            <div class="pw-url">${escapeHtml(p.username || "")}</div>
          </div>
          <div class="pw-actions">
            <button class="autofill-btn" data-id="${p.id}" title="Autofill">📝</button>
            <button class="copy-btn" data-id="${p.id}" title="Copy">📋</button>
          </div>
        </div>
      `
        )
        .join("");

      siteMatchesList.querySelectorAll(".autofill-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          autofillPassword(btn.dataset.id);
        });
      });
      siteMatchesList.querySelectorAll(".copy-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          copyPassword(btn.dataset.id);
        });
      });
    }
  } catch {
    // Tab access may fail in some contexts
  }
}

// ─── Autofill ───
async function autofillPassword(id) {
  const pw = passwords.find((p) => p.id === id);
  if (!pw) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (username, password) => {
      // Find username/email fields
      const userFields = document.querySelectorAll(
        'input[type="email"], input[type="text"][name*="user"], input[type="text"][name*="email"], input[type="text"][name*="login"], input[autocomplete="username"], input[autocomplete="email"]'
      );
      // Find password fields
      const passFields = document.querySelectorAll('input[type="password"]');

      if (userFields.length > 0) {
        const field = userFields[0];
        field.value = username;
        field.dispatchEvent(new Event("input", { bubbles: true }));
        field.dispatchEvent(new Event("change", { bubbles: true }));
      }
      if (passFields.length > 0) {
        const field = passFields[0];
        field.value = password;
        field.dispatchEvent(new Event("input", { bubbles: true }));
        field.dispatchEvent(new Event("change", { bubbles: true }));
      }
    },
    args: [pw.username || "", pw.password || ""],
  });

  showToast("Credentials filled!");
  window.close();
}

// ─── Copy Password ───
async function copyPassword(id) {
  const pw = passwords.find((p) => p.id === id);
  if (!pw) return;
  await navigator.clipboard.writeText(pw.password || "");
  showToast("Password copied!");
  // Auto-clear clipboard after 20 seconds
  setTimeout(() => navigator.clipboard.writeText(""), 20000);
}

// ─── Save New Password ───
function showSaveBanner(creds) {
  saveBanner.classList.remove("hidden");
  saveYes.onclick = async () => {
    await savePassword(creds);
    saveBanner.classList.add("hidden");
    await chrome.storage.session.remove("pendingCredentials");
  };
  saveNo.onclick = async () => {
    saveBanner.classList.add("hidden");
    await chrome.storage.session.remove("pendingCredentials");
  };
}

async function savePassword(creds) {
  if (!session || !masterPassword) return;

  const data = {
    title: creds.domain || creds.website || "Untitled",
    website: creds.website || "",
    username: creds.username || "",
    password: creds.password || "",
    notes: "Saved by ZeroVault Extension",
  };

  const encryptedData = await encrypt(JSON.stringify(data), masterPassword);
  const encryptedTitle = await encrypt(data.title, masterPassword);

  await fetch(`${SUPABASE_URL}/rest/v1/vault_items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${session.access_token}`,
      "Prefer": "return=minimal",
    },
    body: JSON.stringify({
      user_id: session.user.id,
      type: "password",
      encrypted_data: encryptedData,
      metadata: { encrypted_title: encryptedTitle },
    }),
  });

  showToast("Password saved!");
  loadPasswords();
}

// ─── Helpers ───
function extractDomain(url) {
  try {
    if (!url.includes("://")) url = "https://" + url;
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url.replace("www.", "").split("/")[0];
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}
