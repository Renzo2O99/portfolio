// NOTE: lens-26-component-naming.mjs — Detecta componentes custom en kebab-case dentro de archivos .tsx.
// NOTE: Convención 5.1: componentes React = PascalCase.tsx. Solo primitives oficiales shadcn/ui usan kebab-case.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const SRC = join(ROOT, "src");

const EXCLUDED_SEGMENTS = ["/theme-customizer/"];
const EXCLUDED_SUFFIXES = [".css", ".test.", ".spec.", ".story.", ".script.ts", ".config.ts", ".d.ts"];

const SHADCN_PRIMITIVES = new Set([
  "accordion",
  "alert",
  "alert-dialog",
  "aspect-ratio",
  "avatar",
  "badge",
  "breadcrumb",
  "button",
  "calendar",
  "card",
  "carousel",
  "checkbox",
  "collapsible",
  "command",
  "context-menu",
  "data-table",
  "dialog",
  "drawer",
  "dropdown-menu",
  "form",
  "hover-card",
  "input",
  "input-otp",
  "label",
  "menubar",
  "navigation-menu",
  "pagination",
  "popover",
  "progress",
  "radio-group",
  "resizable",
  "scroll-area",
  "select",
  "separator",
  "sheet",
  "sidebar",
  "skeleton",
  "slider",
  "sonner",
  "switch",
  "table",
  "tabs",
  "textarea",
  "toast",
  "toggle",
  "toggle-group",
  "tooltip",
]);

const KEBAB_COMPONENT_FILE = /^[a-z0-9]+(-[a-z0-9]+)*\.tsx$/;
const EXPORTS_COMPONENT = /export\s+(?:function|const)\s+[A-Z][A-Za-z0-9]*/;

function scanDir(dir, violations) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(full, violations);
      continue;
    }
    if (!KEBAB_COMPONENT_FILE.test(entry.name)) continue;
    if (EXCLUDED_SUFFIXES.some((s) => entry.name.endsWith(s))) continue;
    if (EXCLUDED_SEGMENTS.some((seg) => full.replace(/\\/g, "/").includes(seg))) continue;
    const base = entry.name.replace(/\.tsx$/, "");
    if (SHADCN_PRIMITIVES.has(base)) continue;
    const content = readFileSync(full, "utf8");
    if (!EXPORTS_COMPONENT.test(content)) continue;
    violations.push({
      lens: "26",
      severity: "🟡",
      file: relative(ROOT, full).replace(/\\/g, "/"),
      msg: `Componente custom en kebab-case (${entry.name}). Renombrar a PascalCase.tsx (constitución 5.1): solo primitives shadcn oficiales usan kebab-case`,
    });
  }
}

export function lens26ComponentNamingGlobal() {
  const violations = [];
  const scopes = ["modules", "app", "shared", "infrastructure", "common"].map((s) => join(SRC, s));
  for (const scope of scopes) scanDir(scope, violations);
  return violations;
}

export default function lens26() {
  return [];
}
