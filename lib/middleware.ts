import * as mime from "mime-types";
import corsMiddleware from "cors";
import fs from "fs";
import path from "path";
import { Connect, Logger, PreviewServer, ViteDevServer } from "vite";

import { Config as PluginConfig } from "./config.ts";
import { isDevServer, setupLogger } from "./utils.ts";

export function createMiddleware(
  config: PluginConfig,
  rawLogger: Logger,
): Connect.NextHandleFunction {
  const log = setupLogger(rawLogger);

  return function serveStaticMiddleware(req, res, next) {
    if (!req.url) {
      return next();
    }

    for (const { pattern, resolve } of config) {
      const match = pattern.exec(req.url);

      if (match) {
        const filePath = typeof resolve === "string" ? resolve : resolve(match);
        const stats = fs.statSync(filePath, { throwIfNoEntry: false });

        if (!stats || !stats.isFile()) {
          res.writeHead(404);
          res.end("Not found");
          log.error(`File ${filePath} is not a file`);
          return;
        }

        const type = mime.contentType(path.basename(filePath));
        res.writeHead(200, {
          "Content-Length": stats.size,
          "Content-Type": type || "application/octet-stream",
        });

        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
        return;
      }
    }

    return next();
  };
}

export default function applyMiddleware(
  server: ViteDevServer | PreviewServer,
  pluginConfig: PluginConfig,
) {
  const pluginMiddleware = createMiddleware(pluginConfig, server.config.logger);
  const corsConfig = isDevServer(server) ? server.config.server.cors : server.config.preview.cors;

  // https://github.com/vitejs/vite/blob/fcf50c2e881356ea0d725cc563722712a2bf5695/packages/vite/src/node/server/index.ts#L852-L854
  if (corsConfig !== false) {
    const config = typeof corsConfig === "boolean" ? {} : corsConfig;
    server.middlewares.use(corsMiddleware(config));
  }

  server.middlewares.use(pluginMiddleware);
}
