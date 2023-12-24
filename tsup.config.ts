import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["lib/index.ts"],
  target: "es2020",
  format: ["esm"],
  dts: true,
});
