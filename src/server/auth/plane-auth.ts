import crypto from "node:crypto";
import type { AuthHook } from "@fulmenhq/tsfulmen/foundry";
import type { FastifyRequest } from "fastify";
import type { PlaneAuthConfig } from "../../config/types.js";

function isLoopbackIp(ip: string): boolean {
  const normalized = ip.trim();
  return normalized === "127.0.0.1" || normalized === "::1";
}

function constantTimeEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function getAuthorizationHeader(request: FastifyRequest): string {
  const authHeader = request.headers?.authorization;
  if (Array.isArray(authHeader)) return authHeader[0] ?? "";
  return typeof authHeader === "string" ? authHeader : "";
}

function parseBasicAuth(header: string): { user: string; pass: string } | null {
  if (!header.toLowerCase().startsWith("basic ")) return null;
  const b64 = header.slice("basic ".length).trim();
  if (b64 === "") return null;

  let decoded = "";
  try {
    decoded = Buffer.from(b64, "base64").toString("utf-8");
  } catch {
    return null;
  }

  const idx = decoded.indexOf(":");
  if (idx < 0) return null;

  return {
    user: decoded.slice(0, idx),
    pass: decoded.slice(idx + 1),
  };
}

function parseBearerToken(header: string): string {
  if (!header.toLowerCase().startsWith("bearer ")) return "";
  return header.slice("bearer ".length).trim();
}

export function createPlaneAuthHook(config: PlaneAuthConfig): AuthHook {
  const allowLoopback = config.allowUnauthenticatedLoopback;

  return (req: unknown) => {
    const request = req as FastifyRequest;
    const ip = typeof request.ip === "string" ? request.ip : "";

    if (config.mode === "disabled") {
      return { authenticated: true, identity: "disabled" };
    }

    const header = getAuthorizationHeader(request);

    if (config.mode === "bearerToken") {
      const expected = (config.bearerToken || "").trim();
      const token = parseBearerToken(header);

      if (expected === "") {
        if (allowLoopback && isLoopbackIp(ip)) {
          return { authenticated: true, identity: `loopback:${ip}` };
        }
        return { authenticated: false, reason: "Bearer token not configured" };
      }

      if (token !== "" && constantTimeEquals(token, expected)) {
        return { authenticated: true, identity: "bearerToken" };
      }

      return { authenticated: false, reason: "Invalid bearer token" };
    }

    // basicAuth
    const expectedUser = (config.basicUser || "").trim();
    const expectedPass = (config.basicPassword || "").trim();

    if (expectedUser === "" || expectedPass === "") {
      if (allowLoopback && isLoopbackIp(ip)) {
        return { authenticated: true, identity: `loopback:${ip}` };
      }
      return { authenticated: false, reason: "Basic auth credentials not configured" };
    }

    const parsed = parseBasicAuth(header);
    if (!parsed) {
      return { authenticated: false, reason: "Missing basic auth header" };
    }

    const userOk = constantTimeEquals(parsed.user, expectedUser);
    const passOk = constantTimeEquals(parsed.pass, expectedPass);
    if (userOk && passOk) {
      return { authenticated: true, identity: `basic:${parsed.user}` };
    }

    return { authenticated: false, reason: "Invalid basic auth credentials" };
  };
}
