/**
 * Device-local PIN unlock.
 *
 * The PIN never leaves the browser and is never stored. A PBKDF2 key derived
 * from the PIN encrypts the current Supabase session with AES-GCM, so a wrong
 * PIN cannot decrypt it and the refresh token is not readable from storage.
 * This is a quick-unlock for this device, not a new account credential.
 */

const STORAGE_KEY = 'mpesatrack_pin_lock_v1';
const LOCK_FLAG_KEY = 'mpesatrack_pin_locked_v1';
const ITERATIONS = 150000;
const MAX_ATTEMPTS = 5;
const LOCK_MS = 60_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(bytes) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function fromBase64(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function readRecord() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1 || !parsed.salt || !parsed.iv || !parsed.ciphertext) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeRecord(record) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

function assertPin(pin) {
  if (!/^\d{6}$/.test(String(pin ?? ''))) throw new Error('Enter a 6-digit PIN.');
}

function assertCrypto() {
  if (!globalThis.crypto?.subtle) {
    throw new Error('PIN unlock needs a secure connection. Use HTTPS or localhost.');
  }
}

async function deriveKey(pin, salt) {
  assertCrypto();
  const material = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromBase64(salt), iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function sessionPayload(session) {
  if (!session?.refresh_token) throw new Error('Sign in before setting up PIN unlock.');
  return JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at || null,
  });
}

async function encrypt(pin, salt, payload) {
  const key = await deriveKey(pin, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(payload));
  return { iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(cipher)) };
}

async function decrypt(pin, record) {
  const key = await deriveKey(pin, record.salt);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(record.iv) },
    key,
    fromBase64(record.ciphertext),
  );
  return JSON.parse(decoder.decode(plain));
}

export function hasPinLock() {
  return Boolean(readRecord());
}

export function pinLockInfo() {
  const record = readRecord();
  if (!record) return { enabled: false, lockedUntil: 0 };
  return {
    enabled: true,
    lockedUntil: Number(record.lockedUntil) || 0,
    attemptsLeft: Math.max(0, MAX_ATTEMPTS - (Number(record.failedAttempts) || 0)),
  };
}

export async function setPinLock(pin, session) {
  assertPin(pin);
  const salt = toBase64(crypto.getRandomValues(new Uint8Array(16)));
  const encrypted = await encrypt(pin, salt, sessionPayload(session));
  writeRecord({
    version: 1,
    salt,
    ...encrypted,
    failedAttempts: 0,
    lockedUntil: 0,
    createdAt: Date.now(),
  });
}

/** Checks the PIN and returns the stored session tokens. */
export async function verifyPin(pin) {
  assertPin(pin);
  const record = readRecord();
  if (!record) throw new Error('No PIN is set on this device.');

  const lockedUntil = Number(record.lockedUntil) || 0;
  if (lockedUntil > Date.now()) {
    throw new Error(`Too many attempts. Try again in ${Math.ceil((lockedUntil - Date.now()) / 1000)} seconds.`);
  }

  try {
    const payload = await decrypt(pin, record);
    writeRecord({ ...record, failedAttempts: 0, lockedUntil: 0 });
    return payload;
  } catch {
    const failed = (Number(record.failedAttempts) || 0) + 1;
    const locked = failed >= MAX_ATTEMPTS;
    writeRecord({
      ...record,
      failedAttempts: locked ? 0 : failed,
      lockedUntil: locked ? Date.now() + LOCK_MS : 0,
    });
    throw new Error(locked
      ? `Too many attempts. Try again in ${LOCK_MS / 1000} seconds.`
      : 'Incorrect PIN.');
  }
}

export async function changePinLock(currentPin, newPin, session) {
  assertPin(newPin);
  const payload = await verifyPin(currentPin);
  const salt = toBase64(crypto.getRandomValues(new Uint8Array(16)));
  const encrypted = await encrypt(newPin, salt, sessionPayload(session || payload));
  writeRecord({
    version: 1,
    salt,
    ...encrypted,
    failedAttempts: 0,
    lockedUntil: 0,
    createdAt: Date.now(),
  });
}

/** Re-encrypts the latest session after a PIN unlock so refresh tokens stay current. */
export async function renewPinLock(pin, session) {
  const record = readRecord();
  if (!record || !session?.refresh_token) return;
  try {
    await decrypt(pin, record);
  } catch {
    return;
  }
  const encrypted = await encrypt(pin, record.salt, sessionPayload(session));
  writeRecord({ ...record, ...encrypted, failedAttempts: 0, lockedUntil: 0 });
}

export function clearPinLock() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LOCK_FLAG_KEY);
}

/**
 * With PIN unlock on, "Log out" locks the device instead of revoking the
 * Supabase refresh token. The live session stays available so the PIN can
 * unlock it without depending on a stale encrypted copy of the tokens.
 */
export function isAppLocked() {
  try {
    return localStorage.getItem(LOCK_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

export function lockApp() {
  try {
    localStorage.setItem(LOCK_FLAG_KEY, '1');
  } catch {
    // Storage is unavailable; the session stays usable as before.
  }
}

export function clearAppLock() {
  try {
    localStorage.removeItem(LOCK_FLAG_KEY);
  } catch {
    // Nothing to clear.
  }
}
