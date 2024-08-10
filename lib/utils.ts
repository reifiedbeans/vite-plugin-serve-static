import { LogOptions, Logger } from "vite";

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
