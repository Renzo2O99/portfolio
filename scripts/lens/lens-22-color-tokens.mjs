// NOTE: lens-22-color-tokens.mjs — Detecta colores hardcodeados en className/style en lugar de tokens del ThemeCustomizer.
// NOTE: Escanea modules (excepto theme-customizer), app, shared, infrastructure y common.

import { existsSync, readdirSync, readFileSync } from "fs";
import { join, relative } from "path";
import { getModuleOverride } from "./shared.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const SRC = join(ROOT, "src");

const EXCLUDED_SEGMENTS = ["/theme-customizer/"];
const EXCLUDED_SUFFIXES = [".css", ".test.", ".spec.", ".story.", ".script.ts"];

const CHROMATIC = /(?:^|[\s"(])(bg|text|border|ring|fill|stroke|decoration|from|to|via|divide|outline|shadow|caret|accent|placeholder)-(red|blue|green|emerald|amber|orange|yellow|purple|pink|rose|sky|cyan|teal|lime|indigo|violet|fuchsia)-(50|100|200|300|400|500|600|700|800|900|950)(?![\w-])(\/[0-9.]+)?/;
const HEX_ARBITRARY = /\[#(?:[0-9a-fA-F]{3,8})\]/;
const HEX_STYLE = /(?:color|background(?:-color)?|border(?:-color)?|fill|stroke|outline-color|box-shadow|text-shadow):\s*#(?:[0-9a-fA-F]{3,8})/;
const NEUTRAL = /(?:^|[\s"(])(bg|text|border|ring|fill|stroke|decoration|from|to|via|divide|outline|shadow|caret|placeholder)-(zinc|gray|slate|neutral|stone)-(50|100|200|300|400|500|600|700|800|900|950)(?![\w-])(\/[0-9.]+)?/;

function cleanMatch(raw) {
  return raw.replace(/^[\s"'(]+/, "");
}

function classify(line) {
  const c = line.match(CHROMATIC);
  if (c) return { severity: "🔴", match: cleanMatch(c[0]), kind: "Cromático", fix: "usar token del ThemeCustomizer (--primary, --destructive, --status-*) o clase semántica (bg-primary, text-destructive)" };
  const ha = line.match(HEX_ARBITRARY);
  if (ha) return { severity: "🟠", match: ha[0], kind: "Hex arbitrario", fix: "usar token del ThemeCustomizer (--background, --card, --muted, --border, --primary)" };
  const hs = line.match(HEX_STYLE);
  if (hs) return { severity: "🟠", match: hs[0], kind: "Hex inline", fix: "usar token del ThemeCustomizer (--background, --card, --muted, --border, --primary)" };
  const n = line.match(NEUTRAL);
  if (n) return { severity: "🟡", match: cleanMatch(n[0]), kind: "Neutro", fix: "usar token neutro (--muted-foreground, --border, --card, --input)" };
  return null;
}

function isExcluded(filePath) {
  if (EXCLUDED_SUFFIXES.some((s) => filePath.endsWith(s))) return true;
  return EXCLUDED_SEGMENTS.some((seg) => filePath.includes(seg));
}

function scanFile(filePath, violations) {
  if (filePath.replace(/\\/g, "/").includes("/editor/") && getModuleOverride("editor", "22") === true) return;
  const content = readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const seen = new Set();
  let inExceptionBlock = false;
  let exceptionLine = 0;

  for (let i = 0; i < lines.length; i++) {
    if (inExceptionBlock) {
      const trimmed = lines[i].trim();
      if (/^};/.test(trimmed) || /^}\s*;/.test(trimmed) || i > exceptionLine + 25) inExceptionBlock = false;
      else continue;
    }
    if (/\/\/\s*EXCEPTION:/.test(lines[i])) {
      inExceptionBlock = true;
      exceptionLine = i;
      continue;
    }
    if (!/className|cn\(|style=|background|color|border|text-|bg-/.test(lines[i])) continue;
    const found = classify(lines[i]);
    if (!found) continue;
    const key = `${filePath}:${i + 1}`;
    if (seen.has(key)) continue;
    seen.add(key);
    violations.push({
      lens: "22",
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

export function lens22ColorTokensGlobal() {
  const violations = [];
  const scopes = ["modules", "app", "shared", "infrastructure", "common"].map((s) => join(SRC, s));
  for (const scope of scopes) scanDir(scope, violations);
  return violations;
}

export default function lens22() {
  return [];
}
