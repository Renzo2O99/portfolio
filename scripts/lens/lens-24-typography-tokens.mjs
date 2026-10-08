// NOTE: lens-24-typography-tokens.mjs — Detecta familias de fuentes hardcodeadas en className/style en lugar de tokens --font-* (ThemeCustomizer).
// NOTE: Escanea modules (excepto theme-customizer), app, shared, infrastructure y common.

import { existsSync, readdirSync, readFileSync } from "fs";
import { join, relative } from "path";
import { getModuleOverride } from "./shared.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const SRC = join(ROOT, "src");

const EXCLUDED_SEGMENTS = ["/theme-customizer/"];
const EXCLUDED_SUFFIXES = [".css", ".test.", ".spec.", ".story.", ".script.ts"];
// Preview de fuente del ThemeCustomizer: muestra la fuente seleccionada dinámicamente, no es UI de producción.
const EXCLUDED_FILES = ["src/shared/ui/parts/CustomizerSelect.tsx"];

// font-[Inter], font-["Open Sans"] — familia arbitraria sin token --font-*
const FONT_ARBITRARY_CLASS = /font-\[["']?[A-Za-z][^\]"']*["']?\]/;
// fontFamily: "Inter" — familia inline
const FONT_INLINE_STYLE = /fontFamily:\s*["']/;

function classify(line) {
  const fa = line.match(FONT_ARBITRARY_CLASS);
  if (fa) {
    return { severity: "🟠", match: fa[0], kind: "Fuente arbitraria", fix: "usar token del ThemeCustomizer (font-sans, font-serif, font-mono, font-heading)" };
  }
  const fi = line.match(FONT_INLINE_STYLE);
  if (fi) {
    return { severity: "🟠", match: fi[0], kind: "Fuente inline", fix: "usar token del ThemeCustomizer (var(--font-sans), var(--font-serif), var(--font-mono))" };
  }
  return null;
}

function isExcluded(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  if (EXCLUDED_SUFFIXES.some((s) => normalized.endsWith(s))) return true;
  if (EXCLUDED_FILES.some((f) => normalized.includes(f))) return true;
  return EXCLUDED_SEGMENTS.some((seg) => normalized.includes(seg));
}

function scanFile(filePath, violations) {
  if (filePath.replace(/\\/g, "/").includes("/editor/") && getModuleOverride("editor", "24") === true) return;
  const content = readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const seen = new Set();

  for (let i = 0; i < lines.length; i++) {
    if (!/font-\[|fontFamily/.test(lines[i])) continue;
    const found = classify(lines[i]);
    if (!found) continue;
    const key = `${filePath}:${i + 1}`;
    if (seen.has(key)) continue;
    seen.add(key);
    violations.push({
      lens: "24",
      severity: found.severity,
      file: relative(ROOT, filePath).replace(/\\/g, "/"),
      msg: `${found.kind} hardcodeada "${found.match}" → ${found.fix}`,
    });
  }
}

function scanDir(dir, violations) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(full, violations);
    } else if ((entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) && !isExcluded(full)) {
      scanFile(full, violations);
    }
  }
}

export function lens24TypographyTokensGlobal() {
  const violations = [];
  const scopes = ["modules", "app", "shared", "infrastructure", "common"].map((s) => join(SRC, s));
  for (const scope of scopes) scanDir(scope, violations);
  return violations;
}

export default function lens24() {
  return [];
}
