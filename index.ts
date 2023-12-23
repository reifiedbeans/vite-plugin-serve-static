import fs from "fs";
import path from "path";
import { contentType } from "mime-types";
import { Plugin } from "vite";

export type ResolveFn = (match: RegExpExecArray) => string;

export type Config = {
  readonly pattern: RegExp;
  readonly resolve: string | ResolveFn;
}[];

export default function serveStatic(config: Config): Plugin {
  return {
    name: "serve-static",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
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
              console.error(`File ${filePath} is not a file`);
              return;
            }

            const type = contentType(path.basename(filePath));
            res.writeHead(200, {
              "Content-Length": stats.size,
              "Content-Type": type ? type : undefined,
            });

            const stream = fs.createReadStream(filePath);
            stream.pipe(res);
            return;
          }
        }

        return next();
      });
    },
  };
}
