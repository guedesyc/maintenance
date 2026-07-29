import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { register } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const distIndex = path.join(directory, "dist", "index.html");

// The Express deployment may not run a separate frontend build step.
if (!existsSync(distIndex)) {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  execFileSync(npm, ["run", "build"], { cwd: directory, stdio: "inherit", env: process.env });
}

register("tsx/esm", import.meta.url);
await import("./server.ts");
