import { Plugin } from "vite";

import { Config } from "./config.ts";
import middleware from "./middleware.ts";

export default function serveStatic(config: Config): Plugin {
  return {
    name: "serve-static",
    configureServer(server) {
      return () => server.middlewares.use(middleware(config));
    },
    configurePreviewServer(server) {
      return () => server.middlewares.use(middleware(config));
    },
  };
}

export * from "./config.ts";
