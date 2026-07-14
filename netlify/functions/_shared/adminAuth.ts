import crypto from "node:crypto";
import type { HandlerEvent } from "@netlify/functions";
import { ADMIN_COOKIE_NAME } from "@shared/constants";
import { requireEnv } from "./validation";

interface AdminSessionToken {
  username: string;
  exp: number;
}

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createAdminCookie(username: string) {
  const secret = requireEnv("ADMIN_SESSION_SECRET");
  const payload = toBase64Url(JSON.stringify({ username, exp: Date.now() + 1000 * 60 * 60 * 12 }));
  const signature = sign(payload, secret);
  const token = `${payload}.${signature}`;
  const secureFlag = process.env.NODE_ENV === "production" || process.env.NETLIFY ? "; Secure" : "";
  return `${ADMIN_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax${secureFlag}; Max-Age=43200`;
}

export function clearAdminCookie() {
  const secureFlag = process.env.NODE_ENV === "production" || process.env.NETLIFY ? "; Secure" : "";
  return `${ADMIN_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax${secureFlag}; Max-Age=0`;
}

function parseCookies(rawCookie: string | undefined) {
  return Object.fromEntries(
    (rawCookie ?? "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [part.slice(0, index), part.slice(index + 1)];
      }),
  );
}

export function readAdminSession(event: HandlerEvent): AdminSessionToken | null {
  const token = parseCookies(event.headers.cookie)[ADMIN_COOKIE_NAME];
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expectedSignature = sign(payload, requireEnv("ADMIN_SESSION_SECRET"));
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  const session = JSON.parse(fromBase64Url(payload)) as AdminSessionToken;
  if (session.exp < Date.now()) {
    return null;
  }

  return session;
}

export function assertAdmin(event: HandlerEvent) {
  const session = readAdminSession(event);
  if (!session) {
    throw new Error("Nao autenticado.");
  }
  return session;
}
