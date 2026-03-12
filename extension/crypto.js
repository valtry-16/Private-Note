/**
 * ZeroVault Extension Crypto — matches web app's AES-256-GCM + PBKDF2
 */

const PBKDF2_ITERATIONS = 600000;
const SALT_LENGTH = 32;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;

function getRandomBytes(length) {
  return crypto.getRandomValues(new Uint8Array(length));
}

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveKey(password, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

async function decrypt(encryptedData, masterPassword) {
  const parts = encryptedData.split(".");
  if (parts.length !== 3) throw new Error("Invalid encrypted data format");

  const salt = new Uint8Array(base64ToBuffer(parts[0]));
  const iv = new Uint8Array(base64ToBuffer(parts[1]));
  const ciphertext = base64ToBuffer(parts[2]);

  const key = await deriveKey(masterPassword, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

async function encrypt(plaintext, masterPassword) {
  const encoder = new TextEncoder();
  const salt = getRandomBytes(SALT_LENGTH);
  const iv = getRandomBytes(IV_LENGTH);
  const key = await deriveKey(masterPassword, salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encoder.encode(plaintext)
  );

  return [
    bufferToBase64(salt.buffer),
    bufferToBase64(iv.buffer),
    bufferToBase64(ciphertext),
  ].join(".");
}

// Verify master password against stored verification token
async function verifyMasterPassword(password, encryptedVerification) {
  try {
    const result = await decrypt(encryptedVerification, password);
    return result === "zerovault-verification-token-v1";
  } catch {
    return false;
  }
}
