import { join } from "node:path";
import { findFiles, getModDir, getModuleOverride, getRelativePath, MODULES_DIR, readFileSafe } from "./shared.mjs";

export default function lens11(modName) {
  const violations = [];
  const modPath = getModDir(modName);
  const files = findFiles(modPath, /\.(ts|tsx)$/);

  const hasErrorBoundary = files.some((f) => f.includes("ErrorBoundary") || f.includes("error-boundary"));
  if (!hasErrorBoundary) {
    violations.push({ lens: "11", severity: "🔴", file: `${modName}/`, msg: "Módulo sin Error Boundary propio. Crear *ErrorBoundary.tsx en ui/parts/" });
  }

  for (const f of files) {
    const content = readFileSafe(f);
    if (/\/\/\s*EXCEPTION/.test(content)) continue;
    const relPath = getRelativePath(f);
    const lines = content.split("\n");

    const emptyCatchMatches = content.matchAll(/catch\s*\(\s*\w*\s*\)\s*\{\s*\}/g);
    for (const m of emptyCatchMatches) {
      const lineNum = lines.findIndex((l) => l.includes("catch") && l.includes("{}")) + 1;
      violations.push({ lens: "11", severity: "🟠", file: `${relPath}:${lineNum}`, msg: "Catch vacío. Manejar error, loguear o re-lanzar" });
    }

    const catchLogMatches = content.matchAll(/catch\s*\(\s*\w+\s*\)\s*\{\s*console\.log\(/g);
    for (const m of catchLogMatches) {
      const lineNum = lines.findIndex((l) => l.includes("catch") && l.includes("console.log")) + 1;
      violations.push({ lens: "11", severity: "🟡", file: `${relPath}:${lineNum}`, msg: "Catch con console.log. Usar console.error o manejar apropiadamente" });
    }

    const promiseLines = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(".then(") && !lines[i].includes(".catch")) {
        promiseLines.push(i + 1);
      }
    }
    if (promiseLines.length > 0) {
      const alreadyReported = violations.some((v) => v.lens === "11" && v.file.startsWith(relPath) && v.msg.includes("Promise sin .catch"));
      if (!alreadyReported) {
        violations.push({ lens: "11", severity: "🟡", file: `${relPath}:${promiseLines[0]}`, msg: `Promise sin .catch() (${promiseLines.length} ocurrencias). Añadir manejo de errores` });
      }
    }

    const hasQueryFn = /queryFn:\s*async/.test(content);
    const hasCentralizedHandling = content.includes("useAuthMutation") || content.includes("run(") || content.includes("handleAuthError");
    // NOTE: Queries cacheables ("use cache") propagan el error al wrapper
    // (action con try/catch) por diseño — atrapar en lib ocultaría el fallo.
    const isCacheableQuery = content.includes('"use cache"');
    if (
      content.includes("async ") &&
      content.includes("await ") &&
      !content.includes("try") &&
      !hasCentralizedHandling &&
      !isCacheableQuery &&
      !content.includes(".catch(") &&
      !hasQueryFn &&
      !relPath.endsWith(".action.ts") &&
      !relPath.includes("/services/") &&
      !relPath.includes("/seeds/") &&
      !relPath.endsWith("guard.service.ts") &&
      !relPath.endsWith("auth.service.ts") &&
      !relPath.includes("safe-action")
    ) {
      violations.push({ lens: "11", severity: "🟡", file: relPath, msg: "Función async con await sin try/catch ni .catch()" });
    }

    if (/setInterval\(/.test(content) && !content.includes("clearInterval")) {
      violations.push({ lens: "11", severity: "🟠", file: relPath, msg: "setInterval sin clearInterval — posible memory leak" });
    }

    if (/addEventListener\(/.test(content) && !content.includes("removeEventListener")) {
      violations.push({ lens: "11", severity: "🟠", file: relPath, msg: "addEventListener sin removeEventListener — posible memory leak" });
    }
  }

  return violations;
}
