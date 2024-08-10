import { Plugin } from "vite";

import { Config } from "./config.ts";
import applyMiddleware from "./middleware.ts";

export default function serveStatic(config: Config): Plugin {
  return {
    name: "serve-static",
    configureServer(server) {
      applyMiddleware(server, config);
    },
    configurePreviewServer(server) {
      applyMiddleware(server, config);
    },
  };
}

export * from "./config.ts";
