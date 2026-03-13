import type { CloudFrontRequest, CloudFrontRequestEvent, CloudFrontResultResponse } from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockHandle = vi.fn();

vi.mock("cognito-at-edge", () => ({
  Authenticator: vi.fn().mockImplementation(() => ({
    handle: mockHandle,
  })),
}));

const makeRequest = (uri: string, cookies?: string, querystring = ""): CloudFrontRequest =>
  ({
    uri,
    method: "GET",
    querystring,
    clientIp: "127.0.0.1",
    headers: {
      ...(cookies
        ? {
            cookie: [
              {
                key: "cookie",
                value: cookies,
              },
            ],
          }
        : {}),
    },
  }) as unknown as CloudFrontRequest;

const makeEvent = (uri: string, cookies?: string, querystring?: string): CloudFrontRequestEvent => ({
  Records: [
    {
      cf: {
        config: {
          distributionDomainName: "example.com",
          distributionId: "dist",
          eventType: "viewer-request",
          requestId: "id",
        },
        request: makeRequest(uri, cookies, querystring),
      },
    },
  ],
});

describe("cognito interceptor", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockHandle.mockReset();
  });

  const makeAuthResponse = (uri: string, cookies?: string): CloudFrontRequest =>
    ({
      uri,
      method: "GET",
      querystring: "",
      clientIp: "127.0.0.1",
      headers: {
        ...(cookies
          ? {
              cookie: [
                {
                  key: "cookie",
                  value: cookies,
                },
              ],
            }
          : {}),
      },
    }) as unknown as CloudFrontRequest;

  describe("unauthenticated requests", () => {
    it("redirects to cognito login when no cookie exists", async () => {
      mockHandle.mockResolvedValue({
        status: "302",
        statusDescription: "Found",
        headers: {
          location: [{ key: "Location", value: "https://example.auth.us-east-1.amazoncognito.com/login" }],
        },
      } satisfies CloudFrontResultResponse);

      const { handler } = await import("../src");

      const response = (await handler(makeEvent("/dashboard"))) as CloudFrontResultResponse;
      const headers = response.headers;

      if (!headers) {
        throw new Error("Expected redirect response to include headers");
      }

      expect(response.status).toBe("302");
      expect(headers.location[0].value).toContain("/login");
    });
  });

  describe("oauth callback flow", () => {
    it("returns authenticator callback response", async () => {
      mockHandle.mockResolvedValue({
        status: "302",
        statusDescription: "Found",
        headers: {
          location: [{ key: "Location", value: "https://app.example.com/" }],
          "set-cookie": [{ key: "Set-Cookie", value: "session=abc123" }],
        },
      } satisfies CloudFrontResultResponse);

      const { handler } = await import("../src");

      const response = (await handler(makeEvent("/", undefined, "code=abc123"))) as CloudFrontResultResponse;
      const headers = response.headers;

      if (!headers) {
        throw new Error("Expected callback response to include headers");
      }

      expect(mockHandle).toHaveBeenCalledTimes(1);

      expect(response.status).toBe("302");
      expect(headers["set-cookie"]).toBeDefined();
    });
  });

  describe("authenticated requests", () => {
    it("injects authenticated user header", async () => {
      const payload = Buffer.from(JSON.stringify({ "cognito:username": "user123" })).toString("base64url");
      const idToken = `header.${payload}.signature`;
      const cookies = [
        "CognitoIdentityServiceProvider.REPLACE_ME_CLIENT_ID.LastAuthUser=jane.doe",
        `CognitoIdentityServiceProvider.REPLACE_ME_CLIENT_ID.jane.doe.idToken=${idToken}`,
      ].join("; ");

      mockHandle.mockResolvedValue(makeAuthResponse("/", cookies));

      const { handler } = await import("../src");

      const response = (await handler(makeEvent("/"))) as CloudFrontRequest;

      expect(response.headers["x-authenticated-user"][0].value).toBe("user123");
      expect(response.uri).toBe("/index.html");
    });

    it("continues without user header if token cookies are missing", async () => {
      mockHandle.mockResolvedValue(makeAuthResponse("/dashboard"));

      const { handler } = await import("../src");

      const response = (await handler(makeEvent("/dashboard"))) as CloudFrontRequest;

      expect(response.headers["x-authenticated-user"]).toBeUndefined();
      expect(response.uri).toBe("/index.html");
    });
  });

  describe("routing behaviour", () => {
    it("passes through API requests", async () => {
      mockHandle.mockResolvedValue(makeAuthResponse("/api/users"));

      const { handler } = await import("../src");

      const response = (await handler(makeEvent("/api/users"))) as CloudFrontRequest;

      expect(response.uri).toBe("/api/users");
    });

    it("passes through static assets", async () => {
      mockHandle.mockResolvedValue(makeAuthResponse("/assets/app.js"));

      const { handler } = await import("../src");

      const response = (await handler(makeEvent("/assets/app.js"))) as CloudFrontRequest;

      expect(response.uri).toBe("/assets/app.js");
    });

    it("rewrites SPA routes to index.html", async () => {
      mockHandle.mockResolvedValue(makeAuthResponse("/dashboard/settings"));

      const { handler } = await import("../src");

      const response = (await handler(makeEvent("/dashboard/settings"))) as CloudFrontRequest;

      expect(response.uri).toBe("/index.html");
    });
  });

  describe("authenticator failures", () => {
    it("propagates authenticator errors", async () => {
      mockHandle.mockRejectedValue(new Error("invalid"));

      const { handler } = await import("../src");

      await expect(handler(makeEvent("/dashboard"))).rejects.toThrow("invalid");
    });
  });
});
