import { join } from "node:path";
import { findFiles, getModDir, getModuleOverride, getRelativePath, MODULES_DIR, readFileSafe } from "./shared.mjs";

const FORBIDDEN_ABBREVIATIONS = ["nb", "val", "res", "req", "fn", "cb", "idx", "cnt", "tmp", "str", "obj", "arr", "bool", "num", "err", "evt"];

const ALLOWED_SINGLE_CHARS = ["e", "r", "g", "b", "a", "id", "db", "ui", "ctx", "fs", "env", "acc", "prev", "next"];
const VAGUE_PARAMS = /^(data|info|item|result|response)$/;

export default function lens03(modName) {
  const violations = [];
  const modPath = getModDir(modName);
  const files = findFiles(modPath, /\.(ts|tsx)$/);

  for (const f of files) {
    const content = readFileSafe(f);
    const relPath = getRelativePath(f);
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      if (/for\s*\(/.test(line)) continue;
      if (/^\s*\/\//.test(line)) continue;

      const singleCharMatch = line.match(/(?:const|let|var)\s+([a-zA-Z])\s*[=:]/);
      if (singleCharMatch) {
        const varName = singleCharMatch[1];
        if (!ALLOWED_SINGLE_CHARS.includes(varName)) {
          violations.push({ lens: "03", severity: "🟠", file: `${relPath}:${lineNum}`, msg: `Variable de 1 carácter: "${varName}". Usar nombre descriptivo` });
        }
      }

      for (const abbr of FORBIDDEN_ABBREVIATIONS) {
        const abbrRegex = new RegExp(`\\b${abbr}\\s*[=:]`);
        if (abbrRegex.test(line) && !/^\s*\/\//.test(line) && !content.includes("/** EXCEPTION") && !content.includes("// EXCEPTION")) {
          violations.push({ lens: "03", severity: "🟡", file: `${relPath}:${lineNum}`, msg: `Abreviatura prohibida: "${abbr}". Usar nombre completo` });
        }
      }
    }

    for (const match of content.matchAll(/(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?)\s*\(([^)]*)\)/g)) {
      const params = match[1].split(",").map((p) => p.trim().split(":")[0].trim().split("=")[0].trim());
      for (const param of params) {
        if (param && VAGUE_PARAMS.test(param)) {
          const allowNavItemParam = param === "item" && getModuleOverride(modName, "03", "nav-item-param");
          if (!allowNavItemParam) {
            violations.push({ lens: "03", severity: "🟡", file: relPath, msg: `Parámetro genérico "${param}" no describe qué representa` });
          }
        }
      }
    }

    for (const match of content.matchAll(/catch\s*\(\s*(\w+)\s*\)/g)) {
      if (match[1].length <= 2 && !/^[erid]$/.test(match[1])) {
        violations.push({ lens: "03", severity: "🟡", file: relPath, msg: `catch "${match[1]}" muy corto. Usar "error"` });
      }
    }
  }

  return violations;
}
