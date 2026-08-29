import fs from "fs";
import path from "path";

import corsMiddleware from "cors";
import * as mime from "mime-types";
import { Connect, Logger, PreviewServer, ViteDevServer } from "vite";

import { normalizeConfig, Config as PluginConfig } from "./config.ts";
import { isDevServer, setupLogger } from "./utils.ts";

export function createMiddleware(
  pluginConfig: PluginConfig,
  rawLogger: Logger,
): Connect.NextHandleFunction {
  const log = setupLogger(rawLogger);
  const config = normalizeConfig(pluginConfig);

  return function serveStaticMiddleware(req, res, next) {
    if (!req.url) {
      return next();
    }

    const requestPath = req.url.replace(/\?.*$/, "");

    for (const { pattern, resolve, headers } of config.rules) {
      const match = pattern.exec(requestPath);

      if (match) {
        const filePath = typeof resolve === "string" ? resolve : resolve(match);
        const stats = fs.statSync(filePath, { throwIfNoEntry: false });

        if (!stats || !stats.isFile()) {
          res.writeHead(404);
          res.end("Not found");
          log.error(`File ${filePath} is not a file`);
          return;
        }

        const contentType =
          headers["content-type"] ||
          config.contentType ||
          mime.contentType(path.basename(filePath)) ||
          "application/octet-stream";

        res.writeHead(200, {
          "content-length": stats.size,
          "content-type": contentType,
          ...headers,
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
