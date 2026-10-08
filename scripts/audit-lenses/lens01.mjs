import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { findFiles, getRelativePath, MODULES_DIR, readFileSafe } from "./helpers.mjs";

const REQUIRED_DIRS = ["actions", "models", "lib", "hooks", "store", "ui"];
const BLACKLIST_DIRS = ["utils", "helpers", "core", "manager", "controller"];
const BLACKLIST_INTERNAL = ["components", "shared"];
const UI_BRAND_DIRS = ["forms", "parts", "cards", "filters", "modals", "sections", "skeletons"];
const EXCLUDED_DIRS_MAP = { auth: ["store"], "theme-customizer": ["actions", "models", "store", "ui"] };

export default function lens01(modName) {
  const violations = [];
  const modPath = join(MODULES_DIR, modName);
  const excluded = EXCLUDED_DIRS_MAP[modName] || [];

  for (const dir of REQUIRED_DIRS) {
    if (excluded.includes(dir)) continue;
    if (!existsSync(join(modPath, dir))) {
      violations.push({ lens: "01", severity: "🟡", file: `${modName}/`, msg: `Carpeta obligatoria faltante: ${dir}/` });
    }
  }

  for (const entry of readdirSync(modPath, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (BLACKLIST_DIRS.includes(entry.name)) {
      violations.push({ lens: "01", severity: "🔴", file: `${modName}/${entry.name}/`, msg: `Carpeta prohibida: ${entry.name}. Usar lib/ o *.util.ts` });
    }
    if (BLACKLIST_INTERNAL.includes(entry.name)) {
      violations.push({ lens: "01", severity: "🔴", file: `${modName}/${entry.name}/`, msg: `Carpeta prohibida dentro de modulo: ${entry.name}` });
    }
  }

  for (const entry of readdirSync(modPath, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === "ui") continue;
    const indexPath = join(modPath, entry.name, "index.ts");
    if (existsSync(indexPath)) {
      violations.push({ lens: "01", severity: "🟡", file: `${modName}/${entry.name}/index.ts`, msg: "Barrel file interno. Solo debe haber index.ts en raiz del modulo." });
    }
  }

  for (const store of findFiles(join(modPath, "store"), /\.store\.ts$/)) {
    const name = store.split(/[/\\]/).pop();
    if (!name.startsWith("use-")) {
      violations.push({ lens: "01", severity: "🟡", file: getRelativePath(store), msg: `Store sin prefijo use-: ${name}. Usar use-${name}` });
    }
  }

  for (const f of findFiles(modPath, /(config|setup|client)\.ts$/)) {
    const name = f.split(/[/\\]/).pop();
    if (!name.endsWith(".config.ts")) {
      violations.push({ lens: "01", severity: "🟡", file: getRelativePath(f), msg: `Config sin sufijo .config.ts: ${name}` });
    }
  }

  for (const f of findFiles(modPath, /(util|helper|utils)\.ts$/)) {
    const name = f.split(/[/\\]/).pop();
    if (!name.endsWith(".util.ts")) {
      violations.push({ lens: "01", severity: "🟡", file: getRelativePath(f), msg: `Utilidad sin sufijo .util.ts: ${name}` });
    }
  }

  const uiDir = join(modPath, "ui");
  if (existsSync(uiDir)) {
    const uiSubdirs = readdirSync(uiDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    const unknownDirs = uiSubdirs.filter((d) => !UI_BRAND_DIRS.includes(d) && !["shell"].includes(d));
    for (const d of unknownDirs) {
      violations.push({ lens: "01", severity: "🟡", file: `${modName}/ui/${d}/`, msg: `Carpeta UI no estandar: ${d}. Usar forms/, parts/, cards/, filters/, modals/, sections/, skeletons/` });
    }
  }

  for (const f of findFiles(modPath, /\.(ts|tsx)$/)) {
    const content = readFileSafe(f);
    if (/interface\s+I[A-Z]/.test(content)) {
      violations.push({ lens: "01", severity: "🟡", file: getRelativePath(f), msg: "Interfaz con prefijo I (IUser). Usar User sin prefijo." });
    }
    if (/export\s+default\s+/.test(content)) {
      violations.push({ lens: "01", severity: "🟡", file: getRelativePath(f), msg: "export default detectado. Usar export nombrado." });
    }
  }

  return violations;
}
