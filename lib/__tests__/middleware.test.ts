import fs, { ReadStream, Stats } from "fs";
import { ServerResponse } from "http";
import path from "path";
import { Connect } from "vite";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Config } from "../config.ts";
import middleware from "../middleware.ts";

vi.mock("fs");
const mockCreateReadStream = vi.mocked(fs.createReadStream);
const mockStatSync = vi.mocked(fs.statSync);
const mockPipe = vi.fn();

const mockConfig: Config = [
  {
    pattern: /\/test-data\/(.*)/,
    resolve: (groups) => `../test-data/${groups[1]}`,
  },
];

function mockReq(opts?: Partial<Connect.IncomingMessage>) {
  return { url: "/test-data/hello", ...opts } as Connect.IncomingMessage;
}

function mockRes(opts?: Partial<ServerResponse<Connect.IncomingMessage>>) {
  return { end: vi.fn(), writeHead: vi.fn(), ...opts } as ServerResponse<Connect.IncomingMessage>;
}

const mockNext = vi.fn() as Connect.NextFunction;

function expectedHeaders(length: number, type?: string) {
  return {
    "Content-Length": length,
    ...(type && { "Content-Type": type }),
  };
}

function expectYield(res: ReturnType<typeof mockRes>) {
  expect(mockNext).toHaveBeenCalledOnce();
  expect(res.writeHead).not.toHaveBeenCalled();
  expect(res.end).not.toHaveBeenCalled();
}

function expectNotFound(res: ReturnType<typeof mockRes>) {
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
    const middlewareFn = middleware(config);
    const req = mockReq({ url: "/hello" });
    const res = mockRes();

    // when
    middlewareFn(req, res, mockNext);

    // then
    expect(res.writeHead).toHaveBeenCalledWith(200, expectedHeaders(50, undefined));
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

    const middlewareFn = middleware(config);

    for (const test of tests) {
      // given
      mockStatSync.mockReturnValue({ size: test.size, isFile: () => true } as Stats);
      const req = mockReq({ url: test.url });
      const res = mockRes();

      // when
      middlewareFn(req, res, mockNext);

      // then
      expect(res.writeHead).toHaveBeenCalledWith(200, expectedHeaders(test.size, test.type));
      expect(mockCreateReadStream).toHaveBeenCalledWith(test.file);
      expect(mockPipe).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    }
  });

  it("returns a 404 if the resolved path cannot be opened", () => {
    // given
    mockStatSync.mockReturnValue(undefined);
    const middlewareFn = middleware(mockConfig);
    const req = mockReq();
    const res = mockRes();

    // when
    middlewareFn(req, res, mockNext);

    // then
    expectNotFound(res);
  });

  it("returns a 404 if the resolved path does not point to a file", () => {
    // given
    mockStatSync.mockReturnValue({ isFile: () => false } as Stats);
    const middlewareFn = middleware(mockConfig);
    const req = mockReq();
    const res = mockRes();

    // when
    middlewareFn(req, res, mockNext);

    // then
    expectNotFound(res);
  });

  it("yields if the url is undefined", () => {
    // given
    const middlewareFn = middleware(mockConfig);
    const req = mockReq({ url: undefined });
    const res = mockRes();

    // when
    middlewareFn(req, res, mockNext);

    // then
    expectYield(res);
  });

  it("yields if the config is empty", () => {
    // given
    const middlewareFn = middleware([]);
    const req = mockReq();
    const res = mockRes();

    // when
    middlewareFn(req, res, mockNext);

    // then
    expectYield(res);
  });

  it("yields if none of the config patterns match", () => {
    // given
    const middlewareFn = middleware(mockConfig);
    const req = mockReq({ url: "/index.html" });
    const res = mockRes();

    // when
    middlewareFn(req, res, mockNext);

    // then
    expectYield(res);
  });
});
