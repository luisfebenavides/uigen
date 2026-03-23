import { test, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("jose", () => ({
  SignJWT: vi.fn().mockImplementation(() => ({
    setProtectedHeader: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    sign: vi.fn().mockResolvedValue("mock-jwt-token"),
  })),
  jwtVerify: vi.fn(),
}));

import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import {
  createSession,
  getSession,
  deleteSession,
  verifySession,
} from "@/lib/auth";

const COOKIE_NAME = "auth-token";

const MOCK_PAYLOAD = {
  userId: "user-123",
  email: "test@example.com",
  expiresAt: new Date(),
};

function makeCookieStore(token?: string) {
  return {
    get: vi.fn((name: string) =>
      name === COOKIE_NAME && token ? { value: token } : undefined
    ),
    set: vi.fn(),
    delete: vi.fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// --- createSession ---

test("createSession sets an httpOnly cookie", async () => {
  const store = makeCookieStore();
  vi.mocked(cookies).mockResolvedValue(store as any);

  await createSession("user-123", "test@example.com");

  expect(store.set).toHaveBeenCalledOnce();
  const [name, , options] = store.set.mock.calls[0];
  expect(name).toBe(COOKIE_NAME);
  expect(options.httpOnly).toBe(true);
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
});

test("createSession stores the JWT token returned by SignJWT", async () => {
  const store = makeCookieStore();
  vi.mocked(cookies).mockResolvedValue(store as any);

  await createSession("user-123", "test@example.com");

  const [, tokenValue] = store.set.mock.calls[0];
  expect(tokenValue).toBe("mock-jwt-token");
});

test("createSession cookie expires in approximately 7 days", async () => {
  const store = makeCookieStore();
  vi.mocked(cookies).mockResolvedValue(store as any);

  const before = Date.now();
  await createSession("user-123", "test@example.com");

  const [, , options] = store.set.mock.calls[0];
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const expiresMs = (options.expires as Date).getTime();
  expect(expiresMs).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
  expect(expiresMs).toBeLessThanOrEqual(before + sevenDaysMs + 1000);
});

// --- getSession ---

test("getSession returns session payload for a valid token", async () => {
  vi.mocked(jwtVerify).mockResolvedValue({ payload: MOCK_PAYLOAD } as any);
  vi.mocked(cookies).mockResolvedValue(makeCookieStore("valid-token") as any);

  const session = await getSession();

  expect(session?.userId).toBe("user-123");
  expect(session?.email).toBe("test@example.com");
  expect(jwtVerify).toHaveBeenCalledWith("valid-token", expect.anything());
});

test("getSession returns null when no cookie is present", async () => {
  vi.mocked(cookies).mockResolvedValue(makeCookieStore() as any);

  const session = await getSession();

  expect(session).toBeNull();
  expect(jwtVerify).not.toHaveBeenCalled();
});

test("getSession returns null when jwtVerify throws", async () => {
  vi.mocked(jwtVerify).mockRejectedValue(new Error("JWTExpired"));
  vi.mocked(cookies).mockResolvedValue(makeCookieStore("expired-token") as any);

  const session = await getSession();

  expect(session).toBeNull();
});

// --- deleteSession ---

test("deleteSession removes the auth cookie", async () => {
  const store = makeCookieStore();
  vi.mocked(cookies).mockResolvedValue(store as any);

  await deleteSession();

  expect(store.delete).toHaveBeenCalledOnce();
  expect(store.delete).toHaveBeenCalledWith(COOKIE_NAME);
});

// --- verifySession ---

test("verifySession returns session payload for a valid request cookie", async () => {
  vi.mocked(jwtVerify).mockResolvedValue({ payload: MOCK_PAYLOAD } as any);
  const request = new NextRequest("http://localhost/api/test", {
    headers: { cookie: `${COOKIE_NAME}=valid-token` },
  });

  const session = await verifySession(request);

  expect(session?.userId).toBe("user-123");
  expect(session?.email).toBe("test@example.com");
  expect(jwtVerify).toHaveBeenCalledWith("valid-token", expect.anything());
});

test("verifySession returns null when request has no cookie", async () => {
  const request = new NextRequest("http://localhost/api/test");

  const session = await verifySession(request);

  expect(session).toBeNull();
  expect(jwtVerify).not.toHaveBeenCalled();
});

test("verifySession returns null when jwtVerify throws", async () => {
  vi.mocked(jwtVerify).mockRejectedValue(new Error("JWTExpired"));
  const request = new NextRequest("http://localhost/api/test", {
    headers: { cookie: `${COOKIE_NAME}=expired-token` },
  });

  const session = await verifySession(request);

  expect(session).toBeNull();
});
