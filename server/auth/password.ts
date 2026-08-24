import { hash, verify } from "@node-rs/argon2";
import type { Algorithm } from "@node-rs/argon2";

const OPTIONS = {
  algorithm: 2 as Algorithm,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

export function hashPassword(password: string) {
  return hash(password, OPTIONS);
}

export function verifyPassword(passwordHash: string, password: string) {
  return verify(passwordHash, password);
}
