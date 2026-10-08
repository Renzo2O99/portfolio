import { existsSync } from "node:fs";
import { join } from "node:path";
import { findFiles, getRelativePath, MODULES_DIR, ROOT, readFileSafe } from "./helpers.mjs";

const REQUIRED_FILES = ["index.ts", "server.ts", "server-ui.ts"];

export default function lens06(modName) {
  const violations = [];
  const modPath = join(MODULES_DIR, modName);

  for (const f of findFiles(modPath, /\.(ts|tsx)$/)) {
    const content = readFileSafe(f);
    const relPath = getRelativePath(f);

    for (const m of content.matchAll(/process\.env\.(\w+)/g)) {
      if (m[1] === "NODE_ENV") continue;
      if (!content.includes("requireEnv") && !m[1].startsWith("NEXT_PUBLIC_")) {
        violations.push({ lens: "06", severity: "🔴", file: relPath, msg: `process.env.${m[1]} sin requireEnv()` });
      }
    }

    if (content.includes('"use client"') || content.includes("'use client'")) {
      for (const m of content.matchAll(/process\.env\.(\w+)/g)) {
        if (m[1] === "NODE_ENV" || m[1].startsWith("NEXT_PUBLIC_")) continue;
        violations.push({ lens: "06", severity: "🔴", file: relPath, msg: `Client leak: process.env.${m[1]} en 'use client'` });
      }
    }

    for (const m of content.matchAll(/from ["']@\/(shared|infrastructure|common)\/(.+?)["']/g)) {
      const layer = m[1];
      const barrelPath = join(ROOT, "src", layer, "index.ts");
      if (!existsSync(barrelPath)) continue;
      const targetFile = m[2]
        .replace(/\.(ts|tsx)$/, "")
        .split("/")
        .pop();
      if (targetFile && readFileSafe(barrelPath).includes(targetFile)) {
        violations.push({ lens: "06", severity: "🟠", file: relPath, msg: `Import directo a ruta interna de ${layer}/. Usar @/${layer}` });
      }
    }

    for (const m of content.matchAll(/from ["']@\/modules\/([^/"']+)/g)) {
      const otherMod = m[1];
      if (otherMod !== modName) {
        violations.push({ lens: "06", severity: "🔴", file: relPath, msg: `Import directo a modulo hermano "${otherMod}". Viola DAG. Usar Slot Injection o shared/` });
      }
    }
  }

  for (const file of REQUIRED_FILES) {
    if (!existsSync(join(modPath, file))) {
      violations.push({ lens: "06", severity: "🔴", file: `${modName}/`, msg: `Falta archivo de API publica: ${file}` });
    }
  }

  const indexPath = join(modPath, "index.ts");
  if (existsSync(indexPath)) {
    const idxContent = readFileSafe(indexPath);
    if (/from ["'].*\.action\.ts["']/.test(idxContent)) {
      violations.push({ lens: "06", severity: "🔴", file: `${modName}/index.ts`, msg: "index.ts exporta Server Actions. Deben ir en server.ts" });
    }

    for (const m of idxContent.matchAll(/export.*from ['"](.+?)['"]/g)) {
      if (!m[1].includes("hooks")) continue;
      const hookPath = join(modPath, m[1].replace(/^\.\//, "") + ".ts");
      if (!existsSync(hookPath)) continue;
      const hookContent = readFileSafe(hookPath);
      const fnName = hookContent.match(/export function (\w+)/)?.[1];
      if (fnName?.startsWith("use") && !hookContent.includes("@example")) {
        violations.push({ lens: "06", severity: "🟠", file: getRelativePath(hookPath), msg: `Hook publico "${fnName}" sin @example en TSDoc` });
      }
    }
  }

  const serverPath = join(modPath, "server.ts");
  if (existsSync(serverPath)) {
    for (const m of readFileSafe(serverPath).matchAll(/from ["'].*\.tsx["']/g)) {
      violations.push({ lens: "06", severity: "🔴", file: `${modName}/server.ts`, msg: `server.ts importa componente UI: ${m[1]}` });
    }
  }

  return violations;
}
