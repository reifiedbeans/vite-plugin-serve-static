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

const testConfig: Config = [
  {
    pattern: /\/test-data\/(.*)/,
    resolve: (groups) => `../test-data/${groups[1]}`,
  },
];

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
    const config = [
      {
        pattern: /^\/hello/,
        resolve: "./hello",
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
      expect.objectContaining({ "Content-Length": 50, "Content-Type": "application/octet-stream" }),
    );
    expect(mockCreateReadStream).toHaveBeenCalledWith("./hello");
    expect(mockPipe).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("works with function resolvers", () => {
    const config: Config = [
      {
        pattern: /^\/profile/,
        resolve: () => "../profile.json",
      },
      {
        pattern: /^\/images\/.*/,
        resolve: ([match]) => path.join("..", match),
      },
    ];

    const tests = [
      {
        url: "/profile",
        file: "../profile.json",
        size: 150,
        type: "application/json; charset=utf-8",
      },
      {
        url: "/images/cat.jpg",
        file: "../images/cat.jpg",
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
        expect.objectContaining({ "Content-Length": test.size, "Content-Type": test.type }),
      );
      expect(mockCreateReadStream).toHaveBeenCalledWith(test.file);
      expect(mockPipe).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    }
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
    const middleware = createMiddleware([], mockLogger);
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
});
