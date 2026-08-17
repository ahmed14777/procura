import { randomBytes } from "crypto";
import { del, get, put } from "@vercel/blob";
import { getRedis, hasRemoteStorage } from "@/lib/serverStorage";

const SESSION_LIFETIME_SECONDS = 10 * 60;

export interface CapturedFile {
  dataUrl: string;
  name: string;
  type: string;
}

interface CaptureSession {
  expiresAt: number;
  file?: CapturedFile;
  storedFile?: { blobUrl: string; name: string; type: string };
}

declare global {
  // eslint-disable-next-line no-var
  var captureSessions: Map<string, CaptureSession> | undefined;
}

const localSessions = globalThis.captureSessions ?? new Map<string, CaptureSession>();
globalThis.captureSessions = localSessions;
const key = (id: string) => `procura:capture:${id}`;

export async function createCaptureSession() {
  const id = randomBytes(24).toString("base64url");
  const expiresAt = Date.now() + SESSION_LIFETIME_SECONDS * 1000;
  const session = { expiresAt };
  if (hasRemoteStorage()) {
    await getRedis().set(key(id), session, { ex: SESSION_LIFETIME_SECONDS });
  } else {
    localSessions.set(id, session);
  }
  return { id, expiresAt };
}

export async function getCaptureSession(id: string) {
  if (hasRemoteStorage()) return getRedis().get<CaptureSession>(key(id));
  const session = localSessions.get(id);
  if (session && session.expiresAt <= Date.now()) {
    localSessions.delete(id);
    return undefined;
  }
  return session;
}

export async function saveCapturedFile(id: string, file: File) {
  const session = await getCaptureSession(id);
  if (!session || session.file || session.storedFile) return false;

  if (hasRemoteStorage()) {
    const blob = await put(`capture/${id}/${file.name || "photo.jpg"}`, file, {
      access: "private",
      contentType: file.type,
      addRandomSuffix: true,
    });
    const storedFile = { blobUrl: blob.url, name: file.name, type: file.type };
    const ttl = Math.max(1, Math.ceil((session.expiresAt - Date.now()) / 1000));
    await getRedis().set(key(id), { ...session, storedFile }, { ex: ttl });
    return true;
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  session.file = {
    dataUrl: `data:${file.type};base64,${base64}`,
    name: file.name,
    type: file.type,
  };
  return true;
}

export async function consumeCapturedFile(id: string) {
  const session = await getCaptureSession(id);
  if (!session) return null;

  if (session.storedFile) {
    const blob = await get(session.storedFile.blobUrl, { access: "private", useCache: false });
    if (!blob || blob.statusCode !== 200 || !blob.stream) return null;
    const bytes = Buffer.from(await new Response(blob.stream).arrayBuffer());
    const file: CapturedFile = {
      dataUrl: `data:${session.storedFile.type};base64,${bytes.toString("base64")}`,
      name: session.storedFile.name,
      type: session.storedFile.type,
    };
    await Promise.all([getRedis().del(key(id)), del(session.storedFile.blobUrl)]);
    return file;
  }

  if (!session.file) return null;
  localSessions.delete(id);
  return session.file;
}
