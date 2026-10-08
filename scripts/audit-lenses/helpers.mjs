import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export const ROOT = new URL("../..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
export const MODULES_DIR = join(ROOT, "src/modules");
export const SHARED_DIR = join(ROOT, "src/shared");
export const INFRA_DIR = join(ROOT, "src/infrastructure");
export const COMMON_DIR = join(ROOT, "src/common");

export function findFiles(dir, pattern, _results = []) {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
        findFiles(fullPath, pattern, _results);
      } else if (entry.isFile() && entry.name.match(pattern)) {
        _results.push(fullPath);
      }
    }
  } catch {}
  return _results;
}

export function readFileSafe(path) {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return "";
  }
}

export function getRelativePath(absPath) {
  return relative(ROOT, absPath).replace(/\\/g, "/");
}

export function getModules() {
  try {
    return readdirSync(MODULES_DIR).filter((e) => statSync(join(MODULES_DIR, e)).isDirectory());
  } catch {
    return [];
  }
}
