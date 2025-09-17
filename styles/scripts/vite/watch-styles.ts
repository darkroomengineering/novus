import { exec } from "node:child_process";
import { existsSync } from "node:fs";
import type { Plugin } from "vite";

const watchFiles = [
  "styles/colors.ts",
  "styles/typography.ts",
  "styles/easings.ts",
  "styles/layout.ts",
];

export function watchStyles(): Plugin {
  function runCommand() {
    exec("bun ./styles/scripts/setup.ts");
  }

  return {
    name: "watch-styles",
    enforce: "pre",
    configureServer(server) {
      // Check if the generated css folder exists
      if (!existsSync("./styles/css/generated")) {
        runCommand();
      }

      server.watcher.add(watchFiles);
      server.watcher.on("change", (path) => {
        if (watchFiles.some((file) => path.includes(file))) {
          runCommand();
        }
      });
    },
  };
}
