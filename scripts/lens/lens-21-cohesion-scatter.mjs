// NOTE: lens-21-cohesion-scatter.mjs — Detecta componentes con alta cohesión dispersados en múltiples subdirectorios de ui/.
// NOTE: Sugiere consolidar en una sola carpeta con nombre de subdominio.

import { existsSync, readdirSync, statSync } from "fs";
import { join } from "path";

const SRC = join(import.meta.dirname, "..", "..", "src", "modules");
const UI_SUFFIXES = [
  "Card",
  "Dialog",
  "Modal",
  "Button",
  "View",
  "Section",
  "Grid",
  "Form",
  "Input",
  "Select",
  "Menu",
  "List",
  "Item",
  "Panel",
  "Sheet",
  "Shell",
  "Skeleton",
  "EmptyState",
  "ErrorBoundary",
  "Filter",
  "FacetedFilter",
  "Popover",
  "Tooltip",
  "Dropdown",
  "Table",
  "Pagination",
  "Columns",
  "Actions",
  "BulkActions",
  "CommandMenu",
  "RightSidebar",
  "Tab",
  "Tabs",
  "Badge",
];

function stripSuffix(name) {
  for (const s of UI_SUFFIXES) {
    if (name.endsWith(s) && name.length > s.length) {
      return name.slice(0, -s.length);
    }
  }
  return name;
}

function scanViolations(modPath) {
  const uiPath = join(modPath, "ui");
  if (!existsSync(uiPath)) return [];

  const entries = readdirSync(uiPath, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith("."));

  const byDir = {};
  for (const d of dirs) {
    const dirFull = join(uiPath, d.name);
    const tsxFiles = readdirSync(dirFull).filter((f) => f.endsWith(".tsx"));
    if (tsxFiles.length > 0) {
      byDir[d.name] = { dir: d.name, files: tsxFiles };
    }
  }

  const index = {};
  for (const [, info] of Object.entries(byDir)) {
    for (const f of info.files) {
      const name = f.replace(/\.tsx$/, "");
      const base = stripSuffix(name);
      if (!index[base]) index[base] = [];
      index[base].push({ dir: info.dir, archivo: f });
    }
  }

  const violations = [];
  for (const [base, occurrences] of Object.entries(index)) {
    const uniqueDirs = [...new Set(occurrences.map((o) => o.dir))];
    // NOTE: Ignoro bases cortas (<5 chars) — suelen ser entidades; cards/ + skeletons/ es caso normal.
    if (uniqueDirs.length >= 2 && base.length >= 5) {
      const isEntity = uniqueDirs.length === 2 && uniqueDirs.includes("cards") && uniqueDirs.includes("skeletons");
      if (isEntity) continue;

      // NOTE: Carpetas semánticas válidas por constitución (brújula UI). Si TODAS las
      // ocurrencias viven en carpetas semánticas, la dispersión ES la organización correcta.
      const SEMANTIC_DIRS = new Set(["cards", "forms", "parts", "sections", "shell", "modals", "filters", "skeletons", "internal"]);
      const allSemantic = uniqueDirs.every((d) => SEMANTIC_DIRS.has(d));
      if (allSemantic) continue;

      const suggestedDir = base.toLowerCase().replace(/_/g, "-");
      violations.push({
        base,
        occurrences: occurrences.map((o) => `${o.dir}/${o.archivo}`),
        dirs: uniqueDirs,
        suggestedDir,
      });
    }
  }

  return violations;
}

function scan() {
  if (!existsSync(SRC)) return [];

  const modules = readdirSync(SRC).filter((m) => {
    const p = join(SRC, m);
    return statSync(p).isDirectory() && existsSync(join(p, "ui"));
  });

  const results = [];
  for (const mod of modules) {
    const violations = scanViolations(join(SRC, mod));
    for (const v of violations) {
      results.push({
        lens: "21",
        severity: "🟡",
        file: `src/modules/${mod}/ui/`,
        msg: `**${v.base}*** disperso en ${v.dirs.join(", ")}. Sugerencia: unificar en \`ui/${v.suggestedDir}/\``,
      });
    }
  }
  return results;
}

export default scan;
export { scan as run };

// NOTE: Standalone
if (process.argv[1] === import.meta.filename) {
  const results = scan();
  if (results.length === 0) {
    console.log("✅ No se detectaron componentes dispersos.");
  } else {
    console.log(`\n## Lens 21 — Cohesión Dispersa (${results.length} grupo(s))`);
    for (const r of results) {
      console.log(`- ${r.severity} ${r.file} — ${r.msg}`);
    }
  }
}
