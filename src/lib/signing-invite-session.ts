import { cookies } from "next/headers";
import { SIGNING_INVITE_COOKIE } from "@/lib/signing-invite-crypto";

export async function setSigningInviteCookie(token: string, expiresAt: string | Date) {
  const cookieStore = await cookies();
  const expires = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  cookieStore.set(SIGNING_INVITE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/sign",
    expires,
  });
}

export async function clearSigningInviteCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SIGNING_INVITE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/sign",
    maxAge: 0,
  });
}

export async function getSigningInviteToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SIGNING_INVITE_COOKIE)?.value ?? null;
}
