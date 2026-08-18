export const STAFF_SESSION_COOKIE = "procura_staff_session";
export const STAFF_SESSION_SECONDS = 10 * 60 * 60;

interface StaffSessionPayload {
  expiresAt: number;
  passwordVersion: string;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function passwordVersion(password: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return toBase64Url(new Uint8Array(digest).slice(0, 16));
}

async function getSigningKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export function isStaffAuthConfigured() {
  return Boolean(process.env.STAFF_ACCESS_PASSWORD && process.env.SESSION_SECRET);
}

export async function createStaffSessionToken() {
  const password = process.env.STAFF_ACCESS_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!password || !secret) throw new Error("Autenticazione dipendenti non configurata.");

  const payload: StaffSessionPayload = {
    expiresAt: Date.now() + STAFF_SESSION_SECONDS * 1000,
    passwordVersion: await passwordVersion(password),
  };
  const encodedPayload = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await getSigningKey(secret),
    new TextEncoder().encode(encodedPayload),
  );
  return `${encodedPayload}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifyStaffSessionToken(token?: string | null) {
  const password = process.env.STAFF_ACCESS_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!token || !password || !secret) return false;

  try {
    const [encodedPayload, encodedSignature, extra] = token.split(".");
    if (!encodedPayload || !encodedSignature || extra) return false;
    const validSignature = await crypto.subtle.verify(
      "HMAC",
      await getSigningKey(secret),
      fromBase64Url(encodedSignature),
      new TextEncoder().encode(encodedPayload),
    );
    if (!validSignature) return false;

    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(encodedPayload)),
    ) as StaffSessionPayload;
    return (
      Number.isFinite(payload.expiresAt) &&
      payload.expiresAt > Date.now() &&
      payload.passwordVersion === (await passwordVersion(password))
    );
  } catch {
    return false;
  }
}
