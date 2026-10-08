import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { findFiles, getModules, getRelativePath, MODULES_DIR, readFileSafe } from "./shared.mjs";

export default function lens20() {
  const violations = [];
  const modules = getModules();

  for (const mod of modules) {
    const modPath = join(MODULES_DIR, mod);
    const allFiles = findFiles(modPath, /\.(ts|tsx)$/);
    const actionCount = allFiles.filter((f) => f.endsWith(".action.ts")).length;
    const totalLines = allFiles.reduce((sum, f) => sum + readFileSafe(f).split("\n").length, 0);

    const actionsDir = join(modPath, "actions");
    let hasActionSubdirs = false;
    if (existsSync(actionsDir)) {
      const entries = readdirSync(actionsDir, { withFileTypes: true });
      hasActionSubdirs = entries.some((e) => e.isDirectory());
    }
    const flatActions = hasActionSubdirs ? 0 : actionCount;

    if (flatActions > 10) {
      violations.push({ lens: "20", severity: "🟠", file: `${mod}/`, msg: `Módulo con ${actionCount} actions en raíz de actions/. Organizar en subdirectorios por dominio (admin/, public/, media/, etc.)` });
    }

    if (totalLines < 50 && modules.length > 1) {
      violations.push({ lens: "20", severity: "🟡", file: `${mod}/`, msg: `Módulo trivial: ${totalLines} líneas. Evaluar si debería fusionarse con otro` });
    }
  }

  return violations;
}
