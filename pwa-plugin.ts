import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import type { Plugin } from "vite";

export function pwa(): Plugin {
  return {
    name: "entre-dos-pwa",
    apply: "build",
    closeBundle() {
      const files = (dir: string): string[] =>
        readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
          e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)],
        );
      const assets = files("dist").filter((p) => !p.endsWith("sw.js"));
      const version = createHash("sha256");
      assets.forEach((p) => version.update(readFileSync(p)));
      const urls = assets.map(
        (p) => "/" + p.replaceAll("\\", "/").replace(/^dist\//, ""),
      );
      const template = readFileSync("pwa/sw-template.js", "utf8");
      writeFileSync(
        "dist/sw.js",
        template
          .replace("__VERSION__", version.digest("hex").slice(0, 16))
          .replace("__ASSETS__", JSON.stringify(urls)),
      );
    },
  };
}
