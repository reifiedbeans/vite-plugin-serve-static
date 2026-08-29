import fs, { ReadStream, Stats } from "fs";
import { ServerResponse } from "http";
import path from "path";

import { Connect } from "vite";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Config } from "../config.ts";
import { createMiddleware } from "../middleware.ts";
import { createMockReq, createMockRes, mockLogger, mockNext } from "./mocks.ts";

vi.mock("fs");
const mockCreateReadStream = vi.mocked(fs.createReadStream);
const mockStatSync = vi.mocked(fs.statSync);
const mockPipe = vi.fn();

const testConfig: Config = {
  rules: [
    {
      pattern: /\/test-data\/(.*)/,
      resolve: (groups) => path.join("..", "test-data", groups[1] ?? ""),
    },
  ],
};

function expectYield(res: ServerResponse<Connect.IncomingMessage>) {
  expect(mockNext).toHaveBeenCalledOnce();
  expect(res.writeHead).not.toHaveBeenCalled();
  expect(res.end).not.toHaveBeenCalled();
}

function expectNotFound(res: ServerResponse<Connect.IncomingMessage>) {
  expect(res.writeHead).toHaveBeenCalledWith(404);
  expect(res.end).toHaveBeenCalledOnce();
  expect(mockNext).not.toHaveBeenCalled();
}

describe("middleware", () => {
  beforeEach(() => {
    mockCreateReadStream.mockReturnValue({ pipe: mockPipe } as unknown as ReadStream);
    mockStatSync.mockReturnValue({ size: 1, isFile: () => true } as Stats);
  });

  it("works with string resolvers", () => {
    // given
    mockStatSync.mockReturnValue({ size: 50, isFile: () => true } as Stats);
    const config: Config = {
      rules: [
        {
          pattern: /^\/hello/,
          resolve: path.join(".", "hello"),
        },
      ],
    };
    const middleware = createMiddleware(config, mockLogger);
    const req = createMockReq({ url: "/hello" });
    const res = createMockRes();

    // when
    middleware(req, res, mockNext);

    // then
    expect(res.writeHead).toHaveBeenCalledWith(
      200,
      expect.objectContaining({ "content-length": 50, "content-type": "application/octet-stream" }),
    );
    expect(mockCreateReadStream).toHaveBeenCalledWith(path.join(".", "hello"));
    expect(mockPipe).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("works with function resolvers", () => {
    const config: Config = {
      rules: [
        {
          pattern: /^\/profile/,
          resolve: () => path.join("..", "profile.json"),
        },
        {
          pattern: /^\/images\/.*/,
          resolve: ([match]) => path.join("..", match),
        },
      ],
    };

    const tests = [
      {
        url: "/profile",
        file: path.join("..", "profile.json"),
        size: 150,
        type: "application/json; charset=utf-8",
      },
      {
        url: "/images/cat.jpg",
        file: path.join("..", "images", "cat.jpg"),
        size: 990,
        type: "image/jpeg",
      },
    ];

    const middleware = createMiddleware(config, mockLogger);

    for (const test of tests) {
      // given
      mockStatSync.mockReturnValue({ size: test.size, isFile: () => true } as Stats);
      const req = createMockReq({ url: test.url });
      const res = createMockRes();

      // when
      middleware(req, res, mockNext);

      // then
      expect(res.writeHead).toHaveBeenCalledWith(
        200,
        expect.objectContaining({ "content-length": test.size, "content-type": test.type }),
      );
      expect(mockCreateReadStream).toHaveBeenCalledWith(test.file);
      expect(mockPipe).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    }
  });

  it("matches against the request path without the query string", () => {
    const config: Config = {
      rules: [
        {
          pattern: /^\/profile\/(.*)$/,
          resolve: (match) => path.join("..", `${match[1]!}.json`),
        },
      ],
    };
    const middleware = createMiddleware(config, mockLogger);
    const req = createMockReq({ url: "/profile/alice?size=small" });
    const res = createMockRes();

    middleware(req, res, mockNext);

    expect(mockCreateReadStream).toHaveBeenCalledWith(path.join("..", "alice.json"));
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("applies per-rule headers", () => {
    // given
    const config: Config = {
      rules: [
        {
          pattern: /^\/hello/,
          resolve: path.join(".", "hello"),
          headers: {
            "Cache-Control": "no-store",
            "X-Static-File": "true",
          },
        },
      ],
    };
    const middleware = createMiddleware(config, mockLogger);
    const req = createMockReq({ url: "/hello" });
    const res = createMockRes();

    // when
    middleware(req, res, mockNext);

    // then
    expect(res.writeHead).toHaveBeenCalledWith(
      200,
      expect.objectContaining({
        "content-length": 1,
        "content-type": "application/octet-stream",
        "cache-control": "no-store",
        "x-static-file": "true",
      }),
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("drops undefined header values", () => {
    // given
    const config: Config = {
      rules: [
        {
          pattern: /^\/hello/,
          resolve: path.join(".", "hello"),
          headers: {
            "Cache-Control": undefined,
            "X-Static-File": "true",
          },
        },
      ],
    };
    const middleware = createMiddleware(config, mockLogger);
    const req = createMockReq({ url: "/hello" });
    const res = createMockRes();

    // when
    middleware(req, res, mockNext);

    // then
    const [status, headers] = vi.mocked(res.writeHead).mock.calls[0]!;
    expect(status).toBe(200);
    expect(headers).toMatchObject({ "x-static-file": "true" });
    expect(headers).not.toHaveProperty("cache-control");
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("uses the content type from headers when provided", () => {
    // given
    const config: Config = {
      contentType: "text/plain",
      rules: [
        {
          pattern: /^\/profile/,
          resolve: path.join("..", "profile.json"),
          headers: { "Content-Type": "text/plain" },
        },
      ],
    };
    const middleware = createMiddleware(config, mockLogger);
    const req = createMockReq({ url: "/profile" });
    const res = createMockRes();

    // when
    middleware(req, res, mockNext);

    // then
    expect(res.writeHead).toHaveBeenCalledWith(
      200,
      expect.objectContaining({
        "content-type": "text/plain",
      }),
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("uses global content type when no header override is provided", () => {
    // given
    const config: Config = {
      contentType: "text/plain",
      rules: [
        {
          pattern: /^\/profile/,
          resolve: path.join("..", "profile.json"),
        },
      ],
    };
    const middleware = createMiddleware(config, mockLogger);
    const req = createMockReq({ url: "/profile" });
    const res = createMockRes();

    // when
    middleware(req, res, mockNext);

    // then
    expect(res.writeHead).toHaveBeenCalledWith(
      200,
      expect.objectContaining({ "content-length": 1, "content-type": "text/plain" }),
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("uses octet-stream as the content type fallback when there is no MIME type match", () => {
    // given
    const config: Config = {
      rules: [
        {
          pattern: /^\/binary/,
          resolve: path.join("..", "file.unknown"),
        },
      ],
    };
    const middleware = createMiddleware(config, mockLogger);
    const req = createMockReq({ url: "/binary" });
    const res = createMockRes();

    // when
    middleware(req, res, mockNext);

    // then
    expect(res.writeHead).toHaveBeenCalledWith(
      200,
      expect.objectContaining({ "content-type": "application/octet-stream" }),
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("returns a 404 if the resolved path cannot be opened", () => {
    // given
    mockStatSync.mockReturnValue(undefined);
    const middleware = createMiddleware(testConfig, mockLogger);
    const req = createMockReq();
    const res = createMockRes();

    // when
    middleware(req, res, mockNext);

    // then
    expectNotFound(res);
  });

  it("returns a 404 if the resolved path does not point to a file", () => {
    // given
    mockStatSync.mockReturnValue({ isFile: () => false } as Stats);
    const middleware = createMiddleware(testConfig, mockLogger);
    const req = createMockReq();
    const res = createMockRes();

    // when
    middleware(req, res, mockNext);

    // then
    expectNotFound(res);
  });

  it("yields if the url is undefined", () => {
    // given
    const middleware = createMiddleware(testConfig, mockLogger);
    const req = createMockReq({ url: undefined });
    const res = createMockRes();

    // when
    middleware(req, res, mockNext);

    // then
    expectYield(res);
  });

  it("yields if the config is empty", () => {
    // given
    const middleware = createMiddleware({ rules: [] }, mockLogger);
    const req = createMockReq();
    const res = createMockRes();

    // when
    middleware(req, res, mockNext);

    // then
    expectYield(res);
  });

  it("yields if none of the config patterns match", () => {
    // given
    const middleware = createMiddleware(testConfig, mockLogger);
    const req = createMockReq({ url: "/index.html" });
    const res = createMockRes();

    // when
    middleware(req, res, mockNext);

    // then
    expectYield(res);
  });

  it("supports the legacy array config format", () => {
    // given
    const config: Config = [
      {
        pattern: /^\/hello/,
        resolve: path.join(".", "hello"),
      },
    ];
    const middleware = createMiddleware(config, mockLogger);
    const req = createMockReq({ url: "/hello" });
    const res = createMockRes();

    // when
    middleware(req, res, mockNext);

    // then
    expect(res.writeHead).toHaveBeenCalledWith(
      200,
      expect.objectContaining({ "content-length": 1, "content-type": "application/octet-stream" }),
    );
    expect(mockCreateReadStream).toHaveBeenCalledWith(path.join(".", "hello"));
    expect(mockPipe).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });
});
