export const STORAGE_KEY = "demandlab.workspace.v1";

export const createId = (prefix = "item") => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export function loadWorkspace() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed && parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

const bytesToBase64 = (bytes) => {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
};

const base64ToBytes = (value) => {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

async function deriveKey(passphrase, salt) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 250000 }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function encryptWorkspace(workspace, passphrase) {
  if (!passphrase || passphrase.length < 8) throw new Error("Use a passphrase of at least eight characters.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const payload = new TextEncoder().encode(JSON.stringify({ ...workspace, version: 1, savedAt: new Date().toISOString() }));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, payload);
  return { version: 1, encrypted: true, algorithm: "AES-GCM", kdf: "PBKDF2-SHA256-250000", salt: bytesToBase64(salt), iv: bytesToBase64(iv), data: bytesToBase64(new Uint8Array(encrypted)) };
}

export async function decryptWorkspace(envelope, passphrase) {
  try {
    const salt = base64ToBytes(envelope.salt);
    const iv = base64ToBytes(envelope.iv);
    const key = await deriveKey(passphrase, salt);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, base64ToBytes(envelope.data));
    const workspace = JSON.parse(new TextDecoder().decode(decrypted));
    if (!workspace || !Array.isArray(workspace.projects)) throw new Error("Invalid workspace payload.");
    return workspace;
  } catch {
    throw new Error("The passphrase is incorrect or the encrypted workspace is damaged.");
  }
}

export function saveEncryptedEnvelope(envelope) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    return true;
  } catch {
    return false;
  }
}

export function saveWorkspace(workspace) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...workspace, version: 1, savedAt: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

export function clearWorkspace() {
  localStorage.removeItem(STORAGE_KEY);
}

export function downloadTextFile(fileName, content, type = "application/json") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function exportWorkspace(workspace) {
  downloadTextFile(`demandlab-workspace-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(workspace, null, 2));
}

export async function importWorkspace(file) {
  const parsed = JSON.parse(await file.text());
  if (!parsed || !Array.isArray(parsed.projects)) throw new Error("This is not a valid DemandLab workspace backup.");
  return { ...parsed, version: 1 };
}
