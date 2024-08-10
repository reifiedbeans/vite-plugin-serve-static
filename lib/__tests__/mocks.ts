import { Logger } from "vite";
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
