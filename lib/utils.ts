import { LogOptions, Logger, PreviewServer, ViteDevServer } from "vite";

// https://github.com/vitejs/vite/blob/e961b31493f8493277b46773156cc6e546b9c86b/packages/vite/src/node/utils.ts#L1353-L1357
export function isDevServer(server: ViteDevServer | PreviewServer) {
  return "pluginContainer" in server;
}

type LogFunction = (msg: string, options?: LogOptions) => void;
export function setupLogger(logger: Logger) {
  const defaultOptions = { timestamp: true };

  function applyDefaultOptions(log: LogFunction): LogFunction {
    return function (msg, options) {
      log(msg, { ...defaultOptions, ...options });
    };
  }

  return {
    clearScreen: logger.clearScreen,
    hasErrorLogged: logger.hasErrorLogged,
    hasWarned: logger.hasWarned,
    info: applyDefaultOptions(logger.info),
    warn: applyDefaultOptions(logger.warn),
    warnOnce: applyDefaultOptions(logger.warnOnce),
    error: applyDefaultOptions(logger.error),
  } satisfies Logger;
}
