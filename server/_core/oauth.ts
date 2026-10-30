import { ONE_YEAR_MS } from "../../shared/const.js";
import { randomBytes } from "node:crypto";
import type { Express, Request, Response } from "express";
import { getUserByOpenId, upsertUser } from "../db";
import {
  currentOAuthStateNonce,
  getOAuthStateCookieName,
  getOAuthStateCookieOptions,
  getSessionCookieName,
  getSessionCookieOptions,
} from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function decodeOAuthState(value: string) {
  try {
    const decoded = JSON.parse(Buffer.from(value, "base64").toString("utf8")) as Record<string, unknown>;
    if (typeof decoded.redirectUri !== "string" || typeof decoded.nonce !== "string" || !/^[a-f0-9]{64}$/.test(decoded.nonce)) return null;
    return { redirectUri: decoded.redirectUri, nonce: decoded.nonce };
  } catch {
    return null;
  }
}

function isAllowedRedirectUri(req: Request, value: string) {
  try {
    const target = new URL(value);
    if (target.username || target.password || target.search || target.hash) return false;
    if (target.protocol === "https:" || target.protocol === "http:") {
      let expectedOrigin: string | null = null;
      const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL;
      if (apiBase) expectedOrigin = new URL(apiBase).origin;
      if (!expectedOrigin) {
        const previewUrlValue = process.env.EXPO_PACKAGER_PROXY_URL || process.env.EXPO_WEB_PREVIEW_URL;
        if (previewUrlValue) {
          const previewUrl = new URL(previewUrlValue);
          previewUrl.hostname = previewUrl.hostname.replace(/^8081-/, "3000-");
          if (previewUrl.port === "8081") previewUrl.port = "3000";
          expectedOrigin = previewUrl.origin;
        }
      }
      if (!expectedOrigin) {
        const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
        const requestProtocol = req.protocol === "https" || forwardedProto === "https" ? "https:" : "http:";
        if (target.host.toLowerCase() === (req.get("host") ?? "").toLowerCase()) expectedOrigin = `${requestProtocol}//${target.host}`;
      }
      return Boolean(expectedOrigin && target.origin === expectedOrigin && target.pathname === "/api/oauth/callback");
    }
    const approvedScheme = /^(?:manus[a-z0-9+.-]*|exp(?:\+[a-z0-9+.-]+)?):$/i.test(target.protocol);
    return approvedScheme && /(?:\/|\/\/)(?:--\/)?oauth\/callback\/?$/i.test(value);
  } catch {
    return false;
  }
}

async function syncUser(userInfo: {
  openId?: string | null;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  platform?: string | null;
}) {
  if (!userInfo.openId) throw new Error("openId missing from user info");

  const lastSignedIn = new Date();
  await upsertUser({
    openId: userInfo.openId,
    name: userInfo.name || null,
    email: userInfo.email ?? null,
    loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
    lastSignedIn,
  });
  const saved = await getUserByOpenId(userInfo.openId);
  return saved ?? {
    openId: userInfo.openId,
    name: userInfo.name,
    email: userInfo.email,
    loginMethod: userInfo.loginMethod ?? null,
    lastSignedIn,
  };
}

function buildUserResponse(
  user:
    | Awaited<ReturnType<typeof getUserByOpenId>>
    | {
        openId: string;
        name?: string | null;
        email?: string | null;
        loginMethod?: string | null;
        lastSignedIn?: Date | null;
      },
) {
  return {
    id: (user as any)?.id ?? null,
    openId: user?.openId ?? null,
    name: user?.name ?? null,
    email: user?.email ?? null,
    loginMethod: user?.loginMethod ?? null,
    lastSignedIn: (user?.lastSignedIn ?? new Date()).toISOString(),
  };
}

export function registerOAuthRoutes(app: Express) {
  app.post("/api/oauth/state", (req: Request, res: Response) => {
    const redirectUri = req.body?.redirectUri;
    const platform = req.body?.platform;
    if (
      typeof redirectUri !== "string" ||
      (platform !== "web" && platform !== "native") ||
      !isAllowedRedirectUri(req, redirectUri)
    ) {
      res.status(400).json({ error: "Invalid OAuth redirect URI" });
      return;
    }

    const nonce = randomBytes(32).toString("hex");
    const state = Buffer.from(JSON.stringify({ redirectUri, nonce }), "utf8").toString("base64");
    if (platform === "web") {
      res.cookie(getOAuthStateCookieName(req), nonce, {
        ...getOAuthStateCookieOptions(req),
        maxAge: 5 * 60 * 1000,
      });
    }
    res.json({ state });
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    const parsedState = decodeOAuthState(state);
    const expectedNonce = currentOAuthStateNonce(req);
    res.clearCookie(getOAuthStateCookieName(req), getOAuthStateCookieOptions(req));
    if (
      !parsedState ||
      !isAllowedRedirectUri(req, parsedState.redirectUri) ||
      !expectedNonce ||
      parsedState.nonce !== expectedNonce
    ) {
      res.status(403).json({ error: "OAuth state validation failed. Restart sign-in." });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, parsedState.redirectUri);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      await syncUser(userInfo);
      const sessionToken = await sdk.createSessionToken(userInfo.openId!, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(getSessionCookieName(req), sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      const frontendUrl =
        process.env.EXPO_WEB_PREVIEW_URL ||
        process.env.EXPO_PACKAGER_PROXY_URL ||
        "http://localhost:8081";
      res.redirect(302, frontendUrl);
    } catch {
      console.error("[OAuth] Callback failed");
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  app.get("/api/oauth/mobile", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    const parsedState = decodeOAuthState(state);
    if (!parsedState || !isAllowedRedirectUri(req, parsedState.redirectUri)) {
      res.status(403).json({ error: "OAuth state validation failed. Restart sign-in." });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, parsedState.redirectUri);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      const user = await syncUser(userInfo);
      const sessionToken = await sdk.createSessionToken(userInfo.openId!, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(getSessionCookieName(req), sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });
      res.json({ app_session_id: sessionToken, user: buildUserResponse(user) });
    } catch {
      console.error("[OAuth] Mobile exchange failed");
      res.status(500).json({ error: "OAuth mobile exchange failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(getSessionCookieName(req), { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.json({ user: buildUserResponse(user) });
    } catch {
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });

  app.post("/api/auth/session", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        res.status(400).json({ error: "Bearer token required" });
        return;
      }
      const token = authHeader.slice("Bearer ".length).trim();
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(getSessionCookieName(req), token, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });
      res.json({ success: true, user: buildUserResponse(user) });
    } catch {
      console.error("[Auth] /api/auth/session failed");
      res.status(401).json({ error: "Invalid token" });
    }
  });
}
