import { ServerResponse } from "http";
import { Connect, Logger } from "vite";
import { vi } from "vitest";

export const mockLogger = vi.mocked<Logger>({
  clearScreen: vi.fn(),
  hasErrorLogged: () => false,
  hasWarned: false,
  info: vi.fn(),
  warn: vi.fn(),
  warnOnce: vi.fn(),
  error: vi.fn(),
});

export function createMockReq(opts?: Partial<Connect.IncomingMessage>) {
  return { url: "/test-data/hello", ...opts } as Connect.IncomingMessage;
}

export function createMockRes(opts?: Partial<ServerResponse<Connect.IncomingMessage>>) {
  return { end: vi.fn(), writeHead: vi.fn(), ...opts } as ServerResponse<Connect.IncomingMessage>;
}

export const mockNext = vi.fn() as Connect.NextFunction;
