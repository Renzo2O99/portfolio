import { join } from "node:path";
import { findFiles, getModDir, getRelativePath, MODULES_DIR, readFileSafe } from "./shared.mjs";

const LIMITS = {
  ".tsx": { lines: 250, type: "Componente UI" },
  ".action.ts": { lines: 150, type: "Server Action" },
  ".store.ts": { lines: 350, type: "Store Zustand" },
  ".script.ts": { lines: 600, type: "Script CLI" },
};
const HOOK_LIMIT = 200;
const UTIL_LIMIT = 100;

const isScriptFile = (name) => name.endsWith(".script.ts") || name.endsWith(".runner.ts");

export default function lens19(modName) {
  const violations = [];
  const modPath = getModDir(modName);
  const allFiles = findFiles(modPath, /\.(ts|tsx)$/);

  for (const f of allFiles) {
    const content = readFileSafe(f);
    if (/\/\/\s*EXCEPTION/.test(content)) continue;
    const lineCount = content.replace(/\n+$/, "").split("\n").length;
    const relPath = getRelativePath(f);
    const name = f.split(/[/\\]/).pop();

    let limit = null;
    let fileType = "";

    if (name.endsWith(".action.ts")) {
      limit = LIMITS[".action.ts"].lines;
      fileType = LIMITS[".action.ts"].type;
    } else if (name.endsWith(".store.ts")) {
      limit = LIMITS[".store.ts"].lines;
      fileType = LIMITS[".store.ts"].type;
    } else if (name.endsWith(".tsx")) {
      limit = LIMITS[".tsx"].lines;
      fileType = LIMITS[".tsx"].type;
    } else if (name.startsWith("use-") && name.endsWith(".ts")) {
      limit = HOOK_LIMIT;
      fileType = "Hook personalizado";
    } else if (name.endsWith(".util.ts")) {
      limit = UTIL_LIMIT;
      fileType = "Utilidad pura";
    } else if (name.endsWith(".script.ts")) {
      limit = LIMITS[".script.ts"].lines;
      fileType = LIMITS[".script.ts"].type;
    }

    if (limit && lineCount > limit) {
      const severity = lineCount > limit * 1.5 ? "🟠" : "🟡";
      violations.push({ lens: "19", severity, file: relPath, msg: `${fileType}: ${lineCount} líneas (límite: ${limit}). Evaluar fragmentación` });
    }

    const importCount = (content.match(/^import\s/gm) || []).length;
    const layerCount = new Set();
    const importLines = content.split("\n").filter((l) => /^import\s/.test(l));
    for (const line of importLines) {
      const fromMatch = line.match(/from\s+["']([^"']+)["']/);
      if (!fromMatch) continue;
      const from = fromMatch[1];
      if (from.startsWith("@/modules/")) {
        layerCount.add(`module:${from.split("/")[2]}`);
      } else if (from.startsWith("@/")) {
        layerCount.add(`layer:${from.split("/")[1]}`);
      } else if (from.startsWith(".") || from.startsWith("..")) {
        layerCount.add("module:local");
      } else {
        layerCount.add("external");
      }
    }
    if (!isScriptFile(name) && importCount > 15 && layerCount.size > 6) {
      violations.push({ lens: "19", severity: "🟡", file: relPath, msg: `${importCount} imports de ${layerCount.size} capas distintas — posible acoplamiento excesivo` });
    }

    const useStateCount = (content.match(/useState\s*\(/g) || []).length;
    if (!isScriptFile(name) && useStateCount > 10) {
      violations.push({ lens: "19", severity: "🟠", file: relPath, msg: `${useStateCount} useState — estado excesivo (>10). Considerar useReducer o Zustand` });
    }

    const lines = content.split("\n");
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const fnMatch = line.match(/(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)\s*\{/);
      if (fnMatch) {
        const startLine = i;
        let depth = 1;
        i++;
        while (i < lines.length && depth > 0) {
          for (const ch of lines[i]) {
            if (ch === "{") depth++;
            if (ch === "}") depth--;
          }
          i++;
        }
        const fnLines = i - startLine;
        if (!isScriptFile(name) && fnLines > 180) {
          violations.push({ lens: "19", severity: "🟠", file: relPath, msg: `Función en línea ${startLine + 1}: ${fnLines} líneas (límite: 100). Fragmentar en funciones más pequeñas` });
        }
      } else {
        i++;
      }
    }
  }

  return violations;
}
