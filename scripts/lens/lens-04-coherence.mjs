import { join } from "node:path";
import { findFiles, getModDir, getModuleOverride, getRelativePath, MODULES_DIR, readFileSafe } from "./shared.mjs";

const VAGUE_FUNCTIONS = /^(handleStuff|processData|doThings|helper|utils|misc|doSomething|runTask|execute)$/;
const VAGUE_VERBS = /\b(handle|process|manage|do|run|execute)[A-Z]\w+/;

function hasBooleanPrefix(name) {
  return /^(is|has|can|should)[A-Z_]/.test(name);
}

export default function lens04(modName) {
  const violations = [];
  const modPath = getModDir(modName);
  const files = findFiles(modPath, /\.(ts|tsx)$/);

  for (const f of files) {
    const content = readFileSafe(f);
    const relPath = getRelativePath(f);
    const lines = content.split("\n");

    for (const match of content.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)) {
      if (VAGUE_FUNCTIONS.test(match[1])) {
        violations.push({ lens: "04", severity: "🟡", file: relPath, msg: `Función "${match[1]}" tiene nombre vago. Usar verbo específico (create, toggle, validate, fetch)` });
      }
      if (VAGUE_VERBS.test(match[1]) && !/^handle[A-Z]/.test(match[1])) {
        violations.push({ lens: "04", severity: "🟡", file: relPath, msg: `Función "${match[1]}" usa verbo vago (handle/process/manage). Usar verbo específico` });
      }
    }

    for (const line of lines) {
      const varMatch = line.match(/(?:const|let|var)\s+(\w+)\s*[:=]/);
      if (varMatch) {
        const name = varMatch[1];
        if (name.includes("Ref") || name.includes("handle") || name.includes("Handler")) continue;
        if (line.includes("dynamic(")) continue;
        if (line.includes("await db.") || line.includes("db.select")) continue;
        // Una arrow function no es un booleano: los `: boolean` de la linea son las
        // anotaciones de sus parametros (p. ej. `const f = (o: { a: boolean }) => {`),
        // no el tipo de la constante. El nombre sigue la constitucion de funciones.
        if (/=>\s*\{?\s*$/.test(line.trimEnd())) continue;
        const rhs = line.split(/[:=]/).slice(1).join(":");
        const rhsNoStrings = rhs
          .replace(/"[^"]*"/g, "")
          .replace(/'[^']*'/g, "")
          .replace(/`[^`]*`/g, "");
        // Los literales true/false dentro de paréntesis son argumentos de
        // función (parámetros), no el tipo del valor asignado. Se descartan.
        let rhsNoCalls = rhsNoStrings;
        for (let i = 0; i < 10 && /\([^()][^()]*\)/.test(rhsNoCalls); i++) {
          rhsNoCalls = rhsNoCalls.replace(/\([^()][^()]*\)/g, "()");
        }
        const hasBooleanLiteral = /\btrue\b/.test(rhsNoCalls) || /\bfalse\b/.test(rhsNoCalls);
        // Anotación de tipo explícita no-booleana: el tipo declarado manda
        // sobre lo que sugiera el RHS (ej: `const bone: CompactBone = ...`).
        const annotationMatch = line.match(/(?:const|let|var)\s+\w+\s*:\s*([^=]+)/);
        const isExplicitNonBoolean = annotationMatch !== null && !/^boolean\b/.test(annotationMatch[1].trim());
        if ((line.includes(": boolean") || hasBooleanLiteral) && !isExplicitNonBoolean) {
          if (!hasBooleanPrefix(name) && !name.startsWith("_")) {
            violations.push({ lens: "04", severity: "🟡", file: relPath, msg: `Variable booleana "${name}" sin prefijo is/has/can/should` });
          }
        }
      }
    }

    const singularFns = content.matchAll(/export\s+(?:async\s+)?function\s+(get(\w+)|fetch(\w+)|find(\w+)|load(\w+))/g);
    for (const m of singularFns) {
      const fnName = m[1];
      if (fnName.endsWith("s")) continue;

      const fnStart = lines.findIndex((l) => l.includes(`function ${fnName}`));
      if (fnStart === -1) continue;

      let bracketCount = 0;
      let started = false;
      const fnLines = [];
      for (let i = fnStart; i < lines.length; i++) {
        const line = lines[i];
        fnLines.push(line);
        for (const ch of line) {
          if (ch === "{") {
            bracketCount++;
            started = true;
          }
          if (ch === "}") bracketCount--;
        }
        if (started && bracketCount <= 0) break;
      }

      const fnBody = fnLines.join("\n");
      const returnsArray = /return\s+\[/.test(fnBody) || /return\s+[a-z][\w-]*s(?:;|\.map\(|\.filter\()/.test(fnBody) || /return\s+[a-z][\w-]*\.(?:map|filter)\(/.test(fnBody);

      if (returnsArray) {
        violations.push({ lens: "04", severity: "🟠", file: relPath, msg: `Función "${fnName}" retorna array pero sugiere entidad singular. Renombrar a "${fnName}s" o "${fnName}List"` });
      }
    }
  }

  return violations;
}
