// NOTE: lens-23-radius-tokens.mjs — Detecta radios hardcodeados en className/style en lugar de tokens derivados de --radius (ThemeCustomizer).
// NOTE: Escanea modules (excepto theme-customizer), app, shared, infrastructure y common.

import { existsSync, readdirSync, readFileSync } from "fs";
import { join, relative } from "path";
import { getModuleOverride } from "./shared.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const SRC = join(ROOT, "src");

const EXCLUDED_SEGMENTS = ["/theme-customizer/"];
const EXCLUDED_SUFFIXES = [".css", ".test.", ".spec.", ".story.", ".script.ts"];

// rounded-[10px], rounded-t-[8px], rounded-bl-[4px] — valor fijo sin var(--radius)
const RADIUS_ARBITRARY_CLASS = /rounded(?:-[trbl]{1,2})?-\[([0-9.]+(?:px|rem|em|%))\]/;
// borderRadius: "10px" — valor fijo inline
const RADIUS_INLINE_STYLE = /borderRadius:\s*["']([0-9.]+(?:px|rem|em|%))["']/;
// rounded-full — pastilla absoluta (9999px) que ignora --radius
const ROUNDED_FULL = /\brounded-full\b/;

// Valores semánticos que NO dependen del theme y son legítimos
const FULL_CIRCLE = "50%";

/**
 * Determina si un `rounded-full` forma parte de una pastilla/badge legitima.
 *
 * Una pastilla (pills, badges, chips de estado) es un rectangulo con los extremos
 * redondeados: su radio no debe escalar con `--radius`, porque en theme oscuro o con
 * radius grande seguira siendo una capsula, no un circulo. Se distingue de un misuse
 * real por combines SIEMPRE estas señales:
 * - tipografia de etiqueta: `uppercase`, `tracking-widest` o texto <= 11px;
 * - padding asimetrico (px distinto de py), propio de una capsula.
 *
 * Registrado en AGENTS.md > Gotchas Comunes > 12 (convencion de pills del proyecto).
 *
 * @param {string} line - Linea de className a evaluar.
 * @returns {boolean} `true` si la linea describe una pastilla.
 */
export function isPillLegit(line) {
  if (!ROUNDED_FULL.test(line)) return false;

  // NOTE: sin `\b` tras `]`: `]` y el espacio siguiente son ambos no-word, asi que
  // un `\b` ahi nunca casa y las pills con `text-[11px]` se reportaban como pastilla.
  // El rango llega a 13px: una pill de etiqueta de dato (`px-3 py-1.5 text-[13px]`) es
  // tan legitima como la de `text-[10px]`, solo que con un cuerpo un punto mayor.
  const hasLabelTypography = /\buppercase\b/.test(line) || /\btracking-(?:widest|wide)\b/.test(line) || /\btext-\[(?:9|10|11|12|13)px\]/.test(line) || /\btext-xs\b/.test(line);
  // NOTE: rango numerico completo. `[0-1.]` no casaba con `px-2.5` (empieza por `2`),
  // asi que `hasAsymmetricPadding` era false en practicamente toda pastilla real.
  const numeric = String.raw`([0-9]*\.?[0-9]+)`;
  const px = line.match(new RegExp(String.raw`\bpx-${numeric}`));
  const py = line.match(new RegExp(String.raw`\bpy-${numeric}`));
  const pl = line.match(new RegExp(String.raw`\bpl-${numeric}`));
  const pr = line.match(new RegExp(String.raw`\bpr-${numeric}`));
  // El padding horizontal tambien puede venir desglosado (`pl-1.5 pr-2`), tipico de
  // las pills que dejan sitio al punto de color de la libreta.
  const horizontal = px ? parseFloat(px[1]) : pl || pr ? parseFloat(pl?.[1] ?? "0") + parseFloat(pr?.[1] ?? "0") : null;
  const hasAsymmetricPadding = horizontal !== null && py !== null && horizontal !== parseFloat(py[1]);

  // Badge/contador: `h-*` fijo + `min-w-*` + `px-*` pequeño. El alto manda y el ancho
  // crece con el digito, asi que la forma es un circulo por construccion, no una
  // pastilla (que se estiraria con el texto). Cifras de 1 digito: circulo; de 2: capsula.
  const isCounterBadge = /\bh-[0-9.]+/.test(line) && /\bmin-w-[0-9.]+/.test(line) && horizontal !== null && horizontal <= 1.5;
  if (isCounterBadge) return true;

  return hasLabelTypography && hasAsymmetricPadding;
}

/**
 * Determina si un `rounded-full` es un círculo real (legítimo) o una pastilla (violación).
 * Círculo legítimo: size-* igual en ambos ejes sin padding, icon buttons, o w/h idénticos sin padding.
 * Pastilla (violación): padding horizontal/vertical, o w/h asimétricos (h-8 px-4, h-10 px-6, px-3 py-1).
 */
export function isCircleLegit(line) {
  if (isPillLegit(line)) return true;
  const hasPadding = /\bpx-|\bpy-/.test(line);
  const hasSizeClass = /\bsize-/.test(line);
  const isIconButton = /\bsize="icon/.test(line);
  const w = line.match(/\bw-([0-9.]+)/);
  const h = line.match(/\bh-([0-9.]+)/);

  if (hasPadding) return false;
  if (isIconButton || hasSizeClass) return true;
  if (w && h && w[1] === h[1]) return true;
  if (!w && !h) return true;
  return false;
}

function classify(line) {
  const rc = line.match(RADIUS_ARBITRARY_CLASS);
  if (rc && rc[1] !== FULL_CIRCLE) {
    return { severity: "🟠", match: rc[0], kind: "Radius arbitrario", fix: "usar token derivado de --radius (rounded-(--radius), rounded-md, rounded-lg, rounded-xl o rounded-[calc(var(--radius)*X)])" };
  }
  const rs = line.match(RADIUS_INLINE_STYLE);
  if (rs && rs[1] !== FULL_CIRCLE) {
    return { severity: "🟠", match: rs[0], kind: "Radius inline", fix: "usar token derivado de --radius (rounded-(--radius), rounded-md, rounded-lg) o clase semántica" };
  }
  if (ROUNDED_FULL.test(line) && !isCircleLegit(line)) {
    return { severity: "🟡", match: "rounded-full", kind: "Pastilla", fix: "usar token derivado de --radius (rounded-xl, rounded-(--radius)) para que el radius del ThemeCustomizer se aplique" };
  }
  return null;
}

function isExcluded(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  if (EXCLUDED_SUFFIXES.some((s) => normalized.endsWith(s))) return true;
  return EXCLUDED_SEGMENTS.some((seg) => normalized.includes(seg));
}

function scanFile(filePath, violations) {
  if (filePath.replace(/\\/g, "/").includes("/editor/") && getModuleOverride("editor", "23") === true) return;
  const content = readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const seen = new Set();

  for (let i = 0; i < lines.length; i++) {
    if (!/rounded|borderRadius/.test(lines[i])) continue;
    const found = classify(lines[i]);
    if (!found) continue;
    const key = `${filePath}:${i + 1}`;
    if (seen.has(key)) continue;
    seen.add(key);
    violations.push({
      lens: "23",
      severity: found.severity,
      file: relative(ROOT, filePath).replace(/\\/g, "/"),
      msg: `${found.kind} hardcodeado "${found.match}" → ${found.fix}`,
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

export function lens23RadiusTokensGlobal() {
  const violations = [];
  const scopes = ["modules", "app", "shared", "infrastructure", "common"].map((s) => join(SRC, s));
  for (const scope of scopes) scanDir(scope, violations);
  return violations;
}

export default function lens23() {
  return [];
}
