import { Plugin } from "vite";

import { Config } from "./config.ts";
import { createMiddleware } from "./middleware.ts";

export default function serveStatic(config: Config): Plugin {
  return {
    name: "serve-static",
    configureServer(server) {
      const middleware = createMiddleware(config, server.config.logger);
      return () => server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      const middleware = createMiddleware(config, server.config.logger);
      return () => server.middlewares.use(middleware);
    },
  };
}

export * from "./config.ts";
