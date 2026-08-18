import { Redis } from "@upstash/redis";

export function hasRemoteStorage() {
  return Boolean(
    process.env.KV_REST_API_URL &&
      process.env.KV_REST_API_TOKEN &&
      process.env.BLOB_READ_WRITE_TOKEN,
  );
}

export function hasRedis() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

let redisClient: Redis | null = null;

export function getRedis() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    throw new Error("Redis non configurato.");
  }
  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
  }
  return redisClient;
}
