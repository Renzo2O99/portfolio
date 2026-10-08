import { existsSync } from "node:fs";
import { join } from "node:path";
import { findFiles, getModDir, getRelativePath, isLibrary, MODULES_DIR, readFileSafe } from "./shared.mjs";

const UI_FOLDER_RULES = [
  { pattern: /Filter/i, expected: "filters/", source: "parts/" },
  { pattern: /Modal|Dialog/i, expected: "modals/", source: "parts/" },
  { pattern: /Card/i, expected: "cards/", source: "parts/" },
  { pattern: /Skeleton/i, expected: "skeletons/", source: "parts/" },
  { pattern: /CommandMenu|QuickSearch/i, expected: "modals/", source: "parts/" },
  { pattern: /Section/i, expected: "sections/", source: "parts/" },
  { pattern: /Form/i, expected: "forms/", source: "parts/" },
];

export default function lens02(modName) {
  const violations = [];
  const lib = isLibrary(modName);
  const partsDir = getModDir(modName, "ui/parts");

  if (existsSync(partsDir)) {
    const files = findFiles(partsDir, /\.tsx$/);
    for (const f of files) {
      const content = readFileSafe(f);
      const lines = content.split("\n");

      if (/from ["']@\/modules\/[^/]+\/store/.test(content)) {
        violations.push({ lens: "02", severity: "🔴", file: getRelativePath(f), msg: "Smart/Dumb violado: ui/parts/ importa store de Zustand" });
      }
      if (/from ["']@\/modules\/[^/]+\/hooks/.test(content)) {
        violations.push({ lens: "02", severity: "🔴", file: getRelativePath(f), msg: "Smart/Dumb violado: ui/parts/ importa hook de negocio" });
      }
      if (lines.length > 250 && !/\/\/\s*EXCEPTION\s*:/.test(content)) {
        violations.push({ lens: "02", severity: "🟠", file: getRelativePath(f), msg: `God Component: ${lines.length} líneas (límite: 250)` });
      }
    }
  }

  if (!lib) {
    for (const [sourceDir] of [["parts"], ["sections"], ["filters"], ["cards"]]) {
      const sourcePath = getModDir(modName, "ui", sourceDir);
      if (!existsSync(sourcePath)) continue;
      const sourceFiles = findFiles(sourcePath, /\.tsx$/);
      for (const f of sourceFiles) {
        const name = f.split(/[/\\]/).pop();
        for (const rule of UI_FOLDER_RULES) {
          if (rule.pattern.test(name) && sourceDir === rule.source.replace(/\/$/, "")) {
            violations.push({ lens: "02", severity: "🟡", file: getRelativePath(f), msg: `"${name}" parece un componente de ${rule.expected} pero está en ui/${rule.source}. Mover a ui/${rule.expected}` });
          }
        }
      }
    }
  }

  return violations;
}
