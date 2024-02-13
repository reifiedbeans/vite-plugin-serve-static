import fs from "fs";
import { contentType } from "mime-types";
import path from "path";
import { Connect } from "vite";

import { Config } from "./config.ts";

const middleware = (config: Config): Connect.NextHandleFunction => {
  return (req, res, next) => {
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
          "Content-Type": type || undefined,
        });

        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
        return;
      }
    }

    return next();
  };
};

export default middleware;
