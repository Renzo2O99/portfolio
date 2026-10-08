import { existsSync } from "node:fs";
import { join } from "node:path";
import { getModDir, MODULES_DIR, findFiles, readFileSafe, getRelativePath } from "./shared.mjs";

const AUTH_IMPORT_EXCLUSION = /@\/modules\/auth\/(server|internal)/;

export default function lens09(modName) {
  const violations = [];
  const modPath = getModDir(modName);

  const hooksDir = join(modPath, "hooks");
  if (existsSync(hooksDir)) {
    const hookFiles = findFiles(hooksDir, /\.ts$/);
    for (const f of hookFiles) {
      const content = readFileSafe(f);
      const lineCount = content.split("\n").length;
      if (lineCount > 300) {
        violations.push({ lens: "09", severity: "🟠", file: getRelativePath(f), msg: `Hook grande: ${lineCount} líneas (límite recomendado: 300). Evaluar si debe ser módulo separado` });
      }
    }
  }

  const actionsDir = join(modPath, "actions");
  if (existsSync(actionsDir)) {
    const actionFiles = findFiles(actionsDir, /\.action\.ts$/);
    for (const f of actionFiles) {
      const content = readFileSafe(f);
      const crossModuleImports = content.matchAll(new RegExp(`from ["']@\\/modules\\/(?!${modName}\\/)(?!auth\\/)[^"']+["']`, "g"));
      for (const m of crossModuleImports) {
        if (AUTH_IMPORT_EXCLUSION.test(m[0])) continue;
        violations.push({ lens: "09", severity: "🟠", file: getRelativePath(f), msg: `Action importa de módulo externo: ${m[0]}. Evaluar si la lógica debería estar en el módulo dueño` });
      }
    }
  }

  // ── Responsabilidad Fantasma: lógica de papelera fuera de trash/ ──
  if (modName !== "trash") {
    const allFiles = findFiles(modPath, /\.(ts|tsx)$/);
    for (const f of allFiles) {
      const content = readFileSafe(f);
      const rel = getRelativePath(f);
      // Mutación directa de deletedAt (soft-delete/restore) fuera de trash
      if (/\.set\(\s*\{\s*deletedAt/.test(content)) {
        violations.push({ lens: "09", severity: "🟠", file: rel, msg: `Responsabilidad fantasma: muta deletedAt fuera de trash/ (dominio papelera). Mover a src/modules/trash/actions/` });
      } else if (/\bmove\w*ToTrash\b/.test(content)) {
        // Hook/action que orquesta moveToTrash fuera de trash — exigir import/call/definición, no solo string "[moveNoteToTrash]"
        // Si importa desde trash/, está delegando correctamente (no es fantasma)
        if (/from\s+["']@\/modules\/trash/.test(content)) continue;
        const hasTrashImport = /from\s+["'][^"']*move-\w*-to-trash/.test(content);
        const hasTrashCall = /\bmoveNoteToTrash\s*\(|\bmoveNotebookToTrash\s*\(/.test(content);
        const isDefinition = /export\s+(async\s+)?function\s+move\w*ToTrash/.test(content);
        const isReExport = /export\s+\{\s*move\w*ToTrash/.test(content);
        if (hasTrashImport || hasTrashCall || isDefinition || isReExport) {
          violations.push({ lens: "09", severity: "🟠", file: rel, msg: `Responsabilidad fantasma: lógica moveToTrash fuera de trash/. Mover a src/modules/trash/` });
        }
      }
    }
  }

  return violations;
}
