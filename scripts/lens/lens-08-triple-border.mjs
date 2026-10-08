import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { findFiles, getModDir, getRelativePath, isLibrary, MODULES_DIR, ROOT, readFileSafe } from "./shared.mjs";

const SRC_DIR = join(ROOT, "src");
const SERVER_ONLY_MARKERS = ['"server-only"', "next/headers", "next/cache", "next/server"];
const MAX_LEAK_DEPTH = 6;
const MAX_LEAK_NODES = 1500;

function resolveImportPath(fromFile, importSpec) {
  if (importSpec.startsWith("@/")) return join(SRC_DIR, importSpec.slice(2));
  if (importSpec.startsWith(".")) return join(dirname(fromFile), importSpec);
  return null;
}

function resolveFile(path) {
  if (!path) return null;
  if (/\.(ts|tsx|js|jsx)$/.test(path)) return existsSync(path) ? path : null;
  for (const ext of [".ts", ".tsx"]) {
    const withExt = path + ext;
    if (existsSync(withExt)) return withExt;
  }
  const indexFile = join(path, "index.ts");
  if (existsSync(indexFile)) return indexFile;
  return null;
}

function collectImportSpecs(content) {
  const specs = [];
  const lines = content.split("\n");
  for (const m of content.matchAll(/from\s+["'](.+?)["']/g)) {
    const pos = m.index ?? 0;
    const lineIdx = content.slice(0, pos).split("\n").length - 1;
    const line = lines[lineIdx] ?? "";
    if (/^\s*import\s+type\s+/.test(line)) continue;
    specs.push(m[1]);
  }
  return specs;
}

function isServerOnlySource(content) {
  // Frontera RPC oficial de Next.js: los archivos con directiva "use server"
  // son referencias remotas cuando se importan desde cliente — NO rompen el build.
  if (/^\s*["']use server["'];?\s*$/m.test(content)) return false;
  return SERVER_ONLY_MARKERS.some((marker) => content.includes(marker));
}

function isUseServerFile(content) {
  return /^\s*["']use server["'];?\s*$/m.test(content);
}

/**
 * BFS por el grafo de imports buscando fuga server→client transitiva.
 * Un archivo cliente que importa (directa o indirectamente) un módulo
 * con "server-only"/"next/headers" rompe la triple frontera y rompe el build.
 */
function findServerLeak(startFile, modName) {
  const visited = new Set([startFile]);
  const queue = [{ file: startFile, trace: [getRelativePath(startFile)] }];
  let visitedCount = 0;

  while (queue.length > 0 && visitedCount < MAX_LEAK_NODES) {
    const current = queue.shift();
    visitedCount += 1;
    if (current.trace.length > MAX_LEAK_DEPTH) continue;

    const content = readFileSafe(current.file);
    if (isServerOnlySource(content)) {
      return current.trace;
    }

    for (const spec of collectImportSpecs(content)) {
      const targetPath = resolveImportPath(current.file, spec);
      const resolved = resolveFile(targetPath);
      if (!resolved || visited.has(resolved)) continue;

      const resolvedContent = readFileSafe(resolved);
      // Server Actions son frontera RPC: no atravesar sus imports (quedan en servidor, no en bundle cliente)
      if (isUseServerFile(resolvedContent)) continue;

      const resolvedRelative = getRelativePath(resolved);
      const crossModule = resolvedRelative.match(/src\/modules\/([^/]+)\//);
      if (crossModule && crossModule[1] !== modName) continue;

      visited.add(resolved);
      queue.push({ file: resolved, trace: [...current.trace, resolvedRelative] });
    }
  }
  return null;
}

export default function lens08(modName) {
  const violations = [];
  const lib = isLibrary(modName);
  const modPath = getModDir(modName);

  if (!lib) {
    for (const file of ["index.ts", "server.ts", "server-ui.ts"]) {
      if (!existsSync(join(modPath, file))) {
        violations.push({ lens: "08", severity: "🔴", file: `${modName}/`, msg: `Falta archivo de API pública: ${file}` });
      }
    }
  }

  const indexPath = join(modPath, "index.ts");
  if (existsSync(indexPath)) {
    const content = readFileSafe(indexPath);

    if (/from ["'].*\.action\.ts["']/.test(content)) {
      violations.push({ lens: "08", severity: "🔴", file: `${modName}/index.ts`, msg: "index.ts exporta Server Actions. Deben ir en server.ts" });
    }

    const serverExport = content.match(/from\s+["'][^"']*\/server(?:-ui)?\.ts["']/);
    if (serverExport) {
      violations.push({ lens: "08", severity: "🔴", file: `${modName}/index.ts`, msg: "index.ts exporta desde server.ts/server-ui.ts — fuga server→client" });
    }

    const constantsExport = content.match(/export\s+(?:{[^}]+}|[^;]*?)\s+from\s+["'][^"']*\.constants\.ts["']/);
    if (constantsExport) {
      violations.push({ lens: "08", severity: "🟠", file: `${modName}/index.ts`, msg: "index.ts exporta constantes internas (*.constants). No exportarlas desde la API pública cliente" });
    }

    const hookExports = content.matchAll(/export.*from ['"](.+?)['"]/g);
    for (const m of hookExports) {
      const exportPath = m[1];
      if (!exportPath.includes("hooks")) continue;
      const hookFile = join(modPath, exportPath.replace(/^\.\//, "") + ".ts");
      if (!existsSync(hookFile)) continue;
      const hookContent = readFileSafe(hookFile);
      const fnMatch = hookContent.match(/export function (\w+)/);
      if (!fnMatch) continue;
      const fnName = fnMatch[1];
      if (!fnName.startsWith("use")) continue;
      if (!hookContent.includes("@example")) {
        violations.push({ lens: "08", severity: "🟠", file: getRelativePath(hookFile), msg: `Hook público "${fnName}" sin @example en TSDoc` });
      }
    }
  }

  const serverPath = join(modPath, "server.ts");
  if (existsSync(serverPath)) {
    const content = readFileSafe(serverPath);

    const tsxImports = content.matchAll(/from ["'].*\.tsx["']/g);
    for (const m of tsxImports) {
      violations.push({ lens: "08", severity: "🔴", file: `${modName}/server.ts`, msg: `server.ts importa componente UI: ${m[1]}` });
    }

    const hooksExport = content.match(/export\s+(?:{[^}]+}|[^;]*?)\s+from\s+["'][^"']*\/hooks\//);
    if (hooksExport) {
      violations.push({ lens: "08", severity: "🟠", file: `${modName}/server.ts`, msg: "server.ts exporta hooks de cliente. Los hooks van en index.ts, no en server.ts" });
    }
  }

  const serverUiPath = join(modPath, "server-ui.ts");
  if (existsSync(serverUiPath)) {
    const content = readFileSafe(serverUiPath);

    if (/from ["'].*\.action\.ts["']/.test(content)) {
      violations.push({ lens: "08", severity: "🔴", file: `${modName}/server-ui.ts`, msg: "server-ui.ts exporta Server Actions. Deben ir en server.ts" });
    }

    const uiExports = content.matchAll(/export.*from ['"](.+?)["']/g);
    for (const m of uiExports) {
      const target = resolveFile(join(modPath, m[1].replace(/^\.\//, "")));
      if (!target) continue;
      const targetContent = readFileSafe(target);
      if (targetContent.includes('"use client"')) {
        violations.push({ lens: "08", severity: "🔴", file: `${modName}/server-ui.ts`, msg: `server-ui.ts exporta Client Component: ${m[1]}. server-ui.ts solo exporta Server Components` });
      }
    }
  }

  const files = findFiles(modPath, /\.(ts|tsx)$/);
  for (const f of files) {
    const content = readFileSafe(f);
    const relPath = getRelativePath(f);
    if (!content.includes('"use client"')) continue;
    if (relPath.endsWith("server.ts") || relPath.endsWith("server-ui.ts")) continue;

    const leakTrace = findServerLeak(f, modName);
    if (leakTrace) {
      const target = leakTrace[leakTrace.length - 1];
      violations.push({
        lens: "08",
        severity: "🔴",
        file: relPath,
        msg: `Fuga transitiva server→client: archivo "use client" alcanza módulo server-only "${target}" vía ${leakTrace.join(" → ")}. Rompe triple frontera y el build`,
      });
    }
  }

  if (existsSync(indexPath)) {
    const leakTrace = findServerLeak(indexPath, modName);
    if (leakTrace) {
      const target = leakTrace[leakTrace.length - 1];
      violations.push({
        lens: "08",
        severity: "🔴",
        file: `${modName}/index.ts`,
        msg: `Fuga transitiva server→client: index.ts alcanza módulo server-only "${target}" vía ${leakTrace.join(" → ")}. Rompe triple frontera y el build`,
      });
    }
  }

  return violations;
}
