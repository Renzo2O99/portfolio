import { existsSync } from "node:fs";
import { join } from "node:path";
import { findFiles, getRelativePath, MODULES_DIR, readFileSafe } from "./helpers.mjs";

const BANNED_ABBREVS = /^(nb|val|res|req|fn|cb|idx|cnt|tmp|str|obj|arr|bool|num|err|evt)$/;
const VAGUE_FUNCTIONS = /^(handleStuff|processData|doThings|helper|utils|misc|doSomething|runTask|execute)$/;
const VAGUE_PARAMS = /^(data|info|item|result|response)$/;
const VAGUE_VERBS = /\b(handle|process|manage|do|run|execute)[A-Z]\w+/;

function hasBooleanPrefix(name) {
  return /^(is|has|can|should)[A-Z_]/.test(name);
}

export default function lens02(modName) {
  const violations = [];
  const modPath = join(MODULES_DIR, modName);

  const partsDir = join(modPath, "ui/parts");
  if (existsSync(partsDir)) {
    for (const f of findFiles(partsDir, /\.tsx$/)) {
      const content = readFileSafe(f);
      if (/from ["']@\/modules\/[^/]+\/(store|hooks)/.test(content)) {
        violations.push({ lens: "02", severity: "🔴", file: getRelativePath(f), msg: "Smart/Dumb violado: ui/parts/ importa store o hook de negocio" });
      }
    }
  }

  for (const f of findFiles(modPath, /\.(ts|tsx)$/)) {
    const content = readFileSafe(f);
    const relPath = getRelativePath(f);
    const lines = content.split("\n");

    if (relPath.endsWith(".tsx") && lines.length > 250) {
      violations.push({ lens: "02", severity: "🟠", file: relPath, msg: `God Component: ${lines.length} lineas (limite: 250)` });
    }

    for (const match of content.matchAll(/(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?)\s*\(([^)]*)\)/g)) {
      const params = match[1].split(",").map((p) => p.trim().split(":")[0].trim().split("=")[0].trim());
      for (const param of params) {
        if (param && BANNED_ABBREVS.test(param)) {
          violations.push({ lens: "02", severity: "🟡", file: relPath, msg: `Parametro "${param}" usa abreviatura prohibida` });
        }
        if (param && VAGUE_PARAMS.test(param)) {
          violations.push({ lens: "02", severity: "🟡", file: relPath, msg: `Parametro generico "${param}" no describe que representa` });
        }
      }
    }

    for (const match of content.matchAll(/catch\s*\(\s*(\w+)\s*\)/g)) {
      if (match[1].length <= 2 && !/^[erid]$/.test(match[1])) {
        violations.push({ lens: "02", severity: "🟡", file: relPath, msg: `catch "${match[1]}" muy corto. Usar "error"` });
      }
    }

    for (const match of content.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)) {
      if (VAGUE_FUNCTIONS.test(match[1])) {
        violations.push({ lens: "02", severity: "🟡", file: relPath, msg: `Funcion "${match[1]}" tiene nombre vago. Usar verbo especifico (create, toggle, validate, fetch)` });
      }
      if (VAGUE_VERBS.test(match[1])) {
        violations.push({ lens: "02", severity: "🟡", file: relPath, msg: `Funcion "${match[1]}" usa verbo vago (handle/process/manage). Usar verbo especifico` });
      }
    }

    for (const line of lines) {
      const varMatch = line.match(/(?:const|let|var)\s+(\w+)\s*[:=]/);
      if (varMatch) {
        const name = varMatch[1];
        if (name.includes("Ref") || name.includes("handle") || name.includes("Handler")) continue;
        if (line.includes(": boolean") || (line.includes("=") && (line.includes("true") || line.includes("false")))) {
          if (!hasBooleanPrefix(name) && !name.startsWith("_")) {
            violations.push({ lens: "02", severity: "🟡", file: relPath, msg: `Variable booleana "${name}" sin prefijo is/has/can/should` });
          }
        }
      }
    }

    for (const match of content.matchAll(/export\s+(?:async\s+)?function\s+(get(\w+)|fetch(\w+)|find(\w+)|load(\w+))/g)) {
      const fnName = match[1];
      if (fnName.endsWith("s")) continue;
      const fnStart = lines.findIndex((l) => l.includes(`function ${fnName}`));
      if (fnStart === -1) continue;
      let bracketCount = 0,
        started = false;
      const fnLines = [];
      for (let i = fnStart; i < lines.length; i++) {
        fnLines.push(lines[i]);
        for (const ch of lines[i]) {
          if (ch === "{") {
            bracketCount++;
            started = true;
          }
          if (ch === "}") bracketCount--;
        }
        if (started && bracketCount <= 0) break;
      }
      const fnBody = fnLines.join("\n");
      if (/return\s+\[/.test(fnBody) || /return\s+\w+s\b/.test(fnBody) || /\.map\(/.test(fnBody) || /\.filter\(/.test(fnBody)) {
        violations.push({ lens: "02", severity: "🟠", file: relPath, msg: `Funcion "${fnName}" retorna array pero sugiere entidad singular` });
      }
    }
  }

  return violations;
}
