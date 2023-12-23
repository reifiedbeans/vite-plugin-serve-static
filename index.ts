import { Plugin } from "vite";

import { Config } from "./lib/config.ts";
import middleware from "./lib/middleware.ts";

export default function serveStatic(config: Config): Plugin {
  return {
    name: "serve-static",
    configureServer(server) {
      server.middlewares.use(middleware(config));
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware(config));
    },
  };
}

export * from "./lib/config.ts";
