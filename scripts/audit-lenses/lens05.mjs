import { join } from "node:path";
import { findFiles, getModules, getRelativePath, MODULES_DIR, readFileSafe } from "./helpers.mjs";

export function lens05Module(modName) {
  const violations = [];
  const modPath = join(MODULES_DIR, modName);
  for (const f of findFiles(modPath, /\.(ts|tsx)$/)) {
    const content = readFileSafe(f);
    const relPath = getRelativePath(f);

    for (const m of content.matchAll(/throw new Error\(["'`]([^"'`]+)["'`]\)/g)) {
      violations.push({ lens: "05", severity: "🟡", file: relPath, msg: `Error literal: "${m[1]}". Centralizar en constantes` });
    }
    for (const m of content.matchAll(/console\.(error|warn)\(["'`]([^"'`${}]+)["'`]/g)) {
      violations.push({ lens: "05", severity: "🟡", file: relPath, msg: `Console.${m[1]} literal: "${m[2]}". Centralizar en constantes` });
    }
    for (const m of content.matchAll(/toast\.(?:success|error|info|warning)\(["'`]([^"'`]{8,})["'`]/g)) {
      violations.push({ lens: "05", severity: "🟡", file: relPath, msg: `Toast literal: "${m[1]}". Centralizar en constantes` });
    }
    for (const m of content.matchAll(/title=["'`]([^"'`]{10,})["'`]/g)) {
      if (!m[1].includes("{") && !m[1].includes("$")) {
        violations.push({ lens: "05", severity: "🟡", file: relPath, msg: `Title literal: "${m[1]}". Centralizar en constantes` });
      }
    }
    for (const m of content.matchAll(/placeholder=["'`]([^"'`]{8,})["'`]/g)) {
      violations.push({ lens: "05", severity: "🟡", file: relPath, msg: `Placeholder literal: "${m[1]}". Centralizar en constantes` });
    }
  }
  return violations;
}

export function lens05CrossModule() {
  const violations = [];
  const allStrings = {};
  for (const mod of getModules()) {
    for (const f of findFiles(join(MODULES_DIR, mod), /\.(ts|tsx)$/)) {
      const content = readFileSafe(f);
      for (const m of content.matchAll(/toast\.(?:success|error|info|warning)\(["'`]([^"'`]+)["'`]/g)) {
        if (!allStrings[m[1]]) allStrings[m[1]] = [];
        allStrings[m[1]].push(getRelativePath(f));
      }
      for (const m of content.matchAll(/aria-label=["'`]([^"'`]+)["'`]/g)) {
        if (!allStrings[m[1]]) allStrings[m[1]] = [];
        allStrings[m[1]].push(getRelativePath(f));
      }
    }
  }
  for (const [str, sources] of Object.entries(allStrings)) {
    const uniqueModules = [...new Set(sources.map((s) => s.split("/")[2]))];
    if (uniqueModules.length >= 2) {
      violations.push({ lens: "05", severity: "🟠", file: uniqueModules.join(", "), msg: `String duplicado en >=2 modulos: "${str}". Mover a shared/constants/` });
    }
  }
  return violations;
}
