import { Plugin } from "vite";

import { Config } from "./config.ts";
import applyMiddleware from "./middleware.ts";

export default function serveStatic(config: Config): Plugin {
  return {
    name: "serve-static",
    configureServer(server) {
      applyMiddleware(server, config, server.config.server.cors);
    },
    configurePreviewServer(server) {
      applyMiddleware(server, config, server.config.preview.cors);
    },
  };
}

export * from "./config.ts";
