import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE_NAME = "bayu_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

export interface LibrarianSession {
  role: "LIBRARIAN";
  librarianId: string;
  staffId: string;
  fullName: string;
  position: string;
  exp: number;
}

export interface MemberSession {
  role: "MEMBER";
  memberId: string;
  personId: string;
  fullName: string;
  email: string;
  exp: number;
}

export type SessionPayload = LibrarianSession | MemberSession;

type SessionInput = Omit<LibrarianSession, "exp"> | Omit<MemberSession, "exp">;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not configured");
  }
  return secret;
}

function base64url(input: Buffer): string {
  return input.toString("base64url");
}

function sign(data: string): string {
  return base64url(createHmac("sha256", getSecret()).update(data).digest());
}

export function createSessionToken(payload: SessionInput): string {
  const fullPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  } as SessionPayload;
  const encoded = base64url(Buffer.from(JSON.stringify(fullPayload)));
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expectedSignature = sign(encoded);
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload: SessionPayload = JSON.parse(Buffer.from(encoded, "base64url").toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
