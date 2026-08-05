import { createHash, randomBytes } from "crypto";

/** Matches Postgres hash_portal_code(salt, code). */
export function hashAccessCode(salt: string, code: string): string {
  return createHash("sha256")
    .update(salt + code.toUpperCase().trim(), "utf8")
    .digest("hex");
}

export function generateAccessCodeMaterial() {
  const salt = randomBytes(16).toString("hex");
  // 10-char uppercase hex — unique enough for short-lived invites
  const code = randomBytes(5).toString("hex").toUpperCase();
  const hash = hashAccessCode(salt, code);
  return { salt, code, hash };
}

export const SIGNING_INVITE_COOKIE = "signing_invite_session";
