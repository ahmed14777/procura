import { del } from "@vercel/blob";
import { getRedis, hasRemoteStorage } from "@/lib/serverStorage";

const CLEANUP_INDEX_KEY = "procura:blob-cleanup";

export async function registerBlobForCleanup(url: string, expiresAt: number) {
  if (!hasRemoteStorage()) return;
  await getRedis().zadd(CLEANUP_INDEX_KEY, { score: expiresAt, member: url });
}

export async function unregisterBlobFromCleanup(urls: string[]) {
  if (!hasRemoteStorage() || urls.length === 0) return;
  await getRedis().zrem(CLEANUP_INDEX_KEY, ...urls);
}

export async function cleanupExpiredBlobs() {
  if (!hasRemoteStorage()) return 0;
  const redis = getRedis();
  const urls = await redis.zrange<string[]>(CLEANUP_INDEX_KEY, "-inf", Date.now(), {
    byScore: true,
  });
  if (urls.length === 0) return 0;
  await del(urls);
  await redis.zrem(CLEANUP_INDEX_KEY, ...urls);
  return urls.length;
}
