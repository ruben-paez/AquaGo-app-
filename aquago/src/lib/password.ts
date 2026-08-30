import crypto from "crypto";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `s1:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [v, salt, hash] = stored.split(":");
  if (v !== "s1" || !salt || !hash) return false;
  try {
    const check = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), check);
  } catch {
    return false;
  }
}

export function randomToken(): string {
  return crypto.randomBytes(24).toString("hex");
}
