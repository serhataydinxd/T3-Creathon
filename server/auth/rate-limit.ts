import "server-only";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;
const MAX_HASHES = 4;
const MAX_WAITERS = 32;

type Attempt = { count: number; resetAt: number };
const globalAuth = globalThis as unknown as {
  imkanAuthAttempts?: Map<string, Attempt>;
  imkanActiveHashes?: number;
  imkanHashWaiters?: Array<() => void>;
};

const attempts = (globalAuth.imkanAuthAttempts ??= new Map());
globalAuth.imkanActiveHashes ??= 0;
globalAuth.imkanHashWaiters ??= [];

export function loginBlocked(key: string) {
  const attempt = attempts.get(key);
  if (!attempt) return false;
  if (attempt.resetAt <= Date.now()) {
    attempts.delete(key);
    return false;
  }
  return attempt.count >= MAX_FAILURES;
}

export function recordLoginFailure(key: string) {
  const current = attempts.get(key);
  if (!current || current.resetAt <= Date.now()) attempts.set(key, { count: 1, resetAt: Date.now() + WINDOW_MS });
  else current.count += 1;
}

export function clearLoginFailures(key: string) {
  attempts.delete(key);
}

export async function withHashCapacity<T>(operation: () => Promise<T>): Promise<T> {
  if (globalAuth.imkanActiveHashes! >= MAX_HASHES) {
    if (globalAuth.imkanHashWaiters!.length >= MAX_WAITERS) throw new Error("AUTH_BUSY");
    await new Promise<void>((resolve) => globalAuth.imkanHashWaiters!.push(resolve));
  }
  globalAuth.imkanActiveHashes! += 1;
  try {
    return await operation();
  } finally {
    globalAuth.imkanActiveHashes! -= 1;
    globalAuth.imkanHashWaiters!.shift()?.();
  }
}
