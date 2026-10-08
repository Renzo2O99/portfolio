import { join } from "node:path";
import { findFiles, getRelativePath, MODULES_DIR, readFileSafe } from "./helpers.mjs";

const LIMITS = { ui: 250, action: 150, hook: 200, util: 100, store: 300 };

export default function lens09(modName) {
  const violations = [];
  for (const f of findFiles(join(MODULES_DIR, modName), /\.(ts|tsx)$/)) {
    const content = readFileSafe(f);
    const relPath = getRelativePath(f);
    const lines = content.split("\n").length;
    const fileName = f.split(/[\\/]/).pop();

    let limit = null,
      type = null;
    if (fileName.endsWith(".action.ts")) {
      limit = LIMITS.action;
      type = "Server Action";
    } else if (fileName.startsWith("use-") && fileName.endsWith(".ts")) {
      limit = LIMITS.hook;
      type = "Hook";
    } else if (fileName.endsWith(".util.ts")) {
      limit = LIMITS.util;
      type = "Utilidad";
    } else if (fileName.endsWith(".store.ts")) {
      limit = LIMITS.store;
      type = "Store";
    } else if (fileName.endsWith(".tsx")) {
      limit = LIMITS.ui;
      type = "Componente UI";
    }

    if (limit && lines > limit) {
      violations.push({ lens: "09", severity: lines > limit * 1.5 ? "🟠" : "🟡", file: relPath, msg: `${type} con ${lines} lineas (limite: ${limit})` });
    }

    const importCount = (content.match(/^import\s/gm) || []).length;
    if (importCount > 15) {
      violations.push({ lens: "09", severity: "🟡", file: relPath, msg: `${importCount} imports — posible acoplamiento excesivo` });
    }
  }
  return violations;
}
