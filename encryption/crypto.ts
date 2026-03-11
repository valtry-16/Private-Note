/**
 * ZeroVault Encryption Module
 * Implements AES-256-GCM encryption with PBKDF2 key derivation.
 * All encryption/decryption happens client-side only.
 */

const PBKDF2_ITERATIONS = 600_000;
const SALT_LENGTH = 32;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;
const VERIFICATION_PLAINTEXT = "zerovault-verification-token-v1";

function getRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

function bufferToBase64(buffer: ArrayBufferLike): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const saltBuffer = new Uint8Array(salt) as unknown as BufferSource;
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
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encrypt(
  plaintext: string,
  masterPassword: string
): Promise<string> {
  const encoder = new TextEncoder();
  const salt = getRandomBytes(SALT_LENGTH);
  const iv = getRandomBytes(IV_LENGTH);
  const key = await deriveKey(masterPassword, salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    encoder.encode(plaintext)
  );

  // Format: base64(salt) + "." + base64(iv) + "." + base64(ciphertext)
  return [
    bufferToBase64(salt.buffer),
    bufferToBase64(iv.buffer),
    bufferToBase64(ciphertext),
  ].join(".");
}

export async function decrypt(
  encryptedData: string,
  masterPassword: string
): Promise<string> {
  const parts = encryptedData.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const salt = new Uint8Array(base64ToBuffer(parts[0]));
  const iv = new Uint8Array(base64ToBuffer(parts[1]));
  const ciphertext = base64ToBuffer(parts[2]);

  const key = await deriveKey(masterPassword, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

export async function encryptFile(
  file: File,
  masterPassword: string
): Promise<{ encryptedData: Blob; metadata: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const salt = getRandomBytes(SALT_LENGTH);
  const iv = getRandomBytes(IV_LENGTH);
  const key = await deriveKey(masterPassword, salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    arrayBuffer
  );

  const metadata = JSON.stringify({
    name: file.name,
    type: file.type,
    size: file.size,
    salt: bufferToBase64(salt.buffer),
    iv: bufferToBase64(iv.buffer),
  });

  return {
    encryptedData: new Blob([ciphertext]),
    metadata: await encrypt(metadata, masterPassword),
  };
}

export async function decryptFile(
  encryptedBlob: Blob,
  encryptedMetadata: string,
  masterPassword: string
): Promise<File> {
  const metadataJson = await decrypt(encryptedMetadata, masterPassword);
  const metadata = JSON.parse(metadataJson);

  const salt = new Uint8Array(base64ToBuffer(metadata.salt));
  const iv = new Uint8Array(base64ToBuffer(metadata.iv));
  const key = await deriveKey(masterPassword, salt);

  const arrayBuffer = await encryptedBlob.arrayBuffer();
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    arrayBuffer
  );

  return new File([decrypted], metadata.name, { type: metadata.type });
}

export async function generateVerificationToken(
  masterPassword: string
): Promise<string> {
  return encrypt(VERIFICATION_PLAINTEXT, masterPassword);
}

export function generateRecoveryKey(): string {
  const bytes = getRandomBytes(24);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Format as 8 groups of 6 chars separated by hyphens for readability
  return hex.match(/.{1,6}/g)!.join("-").toUpperCase();
}

export async function verifyMasterPassword(
  masterPassword: string,
  encryptedVerification: string
): Promise<boolean> {
  try {
    const decrypted = await decrypt(encryptedVerification, masterPassword);
    return decrypted === VERIFICATION_PLAINTEXT;
  } catch {
    return false;
  }
}

export async function hashForBreachCheck(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest(
    "SHA-1",
    encoder.encode(password)
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

export function generatePassword(
  length: number = 20,
  options: {
    uppercase?: boolean;
    lowercase?: boolean;
    numbers?: boolean;
    symbols?: boolean;
  } = {}
): string {
  const {
    uppercase = true,
    lowercase = true,
    numbers = true,
    symbols = true,
  } = options;

  let charset = "";
  if (uppercase) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (lowercase) charset += "abcdefghijklmnopqrstuvwxyz";
  if (numbers) charset += "0123456789";
  if (symbols) charset += "!@#$%^&*()_+-=[]{}|;:,.<>?";

  if (!charset) charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  const randomValues = getRandomBytes(length);
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length];
  }
  return password;
}

export function calculatePasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  if (password.length >= 20) score++;

  if (score <= 2) return { score, label: "Weak", color: "bg-red-500" };
  if (score <= 4) return { score, label: "Fair", color: "bg-yellow-500" };
  if (score <= 5) return { score, label: "Strong", color: "bg-blue-500" };
  return { score, label: "Very Strong", color: "bg-green-500" };
}
