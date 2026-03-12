/* ================= ENCRYPT ================= */

export async function encryptMessage(message, passphrase) {
  const encoder = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(message)
  );

  return {
    encryptedBlob: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv),
    salt: arrayBufferToBase64(salt)
  };
}

/* ================= DECRYPT ================= */

export async function decryptMessage(encryptedBlob, ivBase64, saltBase64, passphrase) {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const salt = base64ToArrayBuffer(saltBase64);
  const iv = base64ToArrayBuffer(ivBase64);
  const encryptedData = base64ToArrayBuffer(encryptedBlob);

  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encryptedData
  );

  return decoder.decode(decrypted);
}

/* ================= HELPERS ================= */

export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  // Chunked conversion — avoids call-stack overflow for large payloads
  const CHUNK = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, Math.min(i + CHUNK, bytes.length))
    );
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64) {
  // Strip any whitespace that may have been introduced during storage/transfer
  const cleaned = base64.replace(/\s/g, "");
  const binaryString = atob(cleaned);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
