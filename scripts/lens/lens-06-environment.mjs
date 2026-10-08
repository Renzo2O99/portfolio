import { join } from "node:path";
import { getModDir, MODULES_DIR, findFiles, readFileSafe, getRelativePath, getModuleOverride } from "./shared.mjs";

export default function lens06(modName) {
  const violations = [];
  const modPath = getModDir(modName);
  const files = findFiles(modPath, /\.(ts|tsx)$/);

  for (const f of files) {
    const content = readFileSafe(f);
    const lines = content.split("\n");
    const relPath = getRelativePath(f);

    const envMatches = [...content.matchAll(/process\.env\.(\w+)/g)];
    // NOTE: Gate aceptados para process.env sin requireEnv:
    //   - requireEnv() importado en el archivo
    //   - NEXT_PUBLIC_* (se inyecta al bundle cliente, válido en runtime)
    //   - if (!env) / env || X / env ?? X / const X = env; if (!X) (fallback explícito)
    //   - short-circuit con `&&` y guard de NODE_ENV (patrón dev-fallback: `NODE_ENV === "production" && env ? ... : DEFAULT`)
    const hasFallbackGuard =
      /if\s*\(\s*!\s*process\.env\.\w+/m.test(content) ||
      /process\.env\.\w+\s*\|\|/.test(content) ||
      /process\.env\.\w+\s*\?\?/.test(content) ||
      /const\s+(\w+)\s*=\s*process\.env\.\w+[\s\S]{0,300}?if\s*\(\s*(?:!\s*)?\1\s*\)/.test(content) ||
      /process\.env\.NODE_ENV\s*===\s*["']production["']\s*&&\s*process\.env\.\w+/.test(content);
    for (const m of envMatches) {
      const envVar = m[1];
      if (envVar === "NODE_ENV") continue;
      if (!content.includes("requireEnv") && !envVar.startsWith("NEXT_PUBLIC_") && !hasFallbackGuard) {
        const lineNum = lines.findIndex((l) => l.includes(envVar)) + 1;
        violations.push({ lens: "06", severity: "🔴", file: `${relPath}:${lineNum}`, msg: `process.env.${envVar} sin requireEnv()` });
      }
    }

    if (content.includes('"use client"') || content.includes("'use client'")) {
      for (const m of envMatches) {
        const envVar = m[1];
        if (envVar === "NODE_ENV") continue;
        if (!envVar.startsWith("NEXT_PUBLIC_")) {
          const lineNum = lines.findIndex((l) => l.includes(envVar)) + 1;
          violations.push({ lens: "06", severity: "🔴", file: `${relPath}:${lineNum}`, msg: `Client leak: process.env.${envVar} en 'use client'` });
        }
      }
    }
  }

  return violations;
}
