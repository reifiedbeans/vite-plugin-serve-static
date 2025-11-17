# vite-plugin-serve-static

[![npm](https://img.shields.io/npm/v/vite-plugin-serve-static/latest)](https://www.npmjs.com/package/vite-plugin-serve-static)
[![vite](https://img.shields.io/npm/dependency-version/vite-plugin-serve-static/peer/vite)](https://github.com/vitejs/vite)
[![license: MIT](https://img.shields.io/npm/l/vite-plugin-serve-static)](https://github.com/reifiedbeans/vite-plugin-serve-static/blob/main/LICENSE)

A simple Vite plugin for serving arbitrary static files that aren't in your `public` directory.

```typescript
// vite.config.ts
import path from "path";
import { defineConfig } from "vite";
import serveStatic from "vite-plugin-serve-static";

const serveStaticPlugin = serveStatic([
  {
    pattern: /^\/metadata\.json/,
    resolve: path.join(".", "metadata.json"),
  },
  {
    pattern: /^\/dog-photos\/.*/,
    resolve: ([match]) => path.join("..", "dog-photos", match),
  },
  {
    pattern: /^\/author-photos\/(.*)/,
    resolve: (groups) => path.join("..", "authors", groups[1]) + ".jpg",
  },
]);

export default defineConfig({
  plugins: [serveStaticPlugin],
});
```

## Config

The configuration is defined as an array of objects defining which patterns to intercept and how to resolve them.

Each `pattern` is defined as a [regular expression]. The `resolve` property can either be a string containing the path to a single file or a function that returns a string given the result of executing the `pattern` against the request path.

## License

Licensed under the [MIT License](https://github.com/reifiedbeans/vite-plugin-serve-static/blob/main/LICENSE).

[regular expression]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp
