// NOTE: lens-32-no-permanent-exception.mjs — Detecta EXCEPTION con TIMELINE "Permanente" o PLAN "No aplicar / Mantener / N/A" en módulos de dominio.
// NOTE: Excluye common/, infrastructure/, shared/ (capas base permitidas para documentar EXCEPTION).
// NOTE: Solo flag TIMELINE "Permanente" + PLAN "No aplicar" o "Mantener" (deuda heredada real, sin plan de remoción).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const SRC = join(ROOT, "src");

const EXCLUDED_SEGMENTS = ["/ai-context/", "/design-reference/", "/node_modules/", "/.next/", "/common/", "/infrastructure/", "/shared/"];

const TIMELINE_PERMANENT = /TIMELINE:\s*Permanente\b/i;
const PLAN_NO_REMOVAL = /PLAN:\s*(No aplicar|Mantener)\b/i;

function isExcluded(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  if (EXCLUDED_SEGMENTS.some((seg) => normalized.includes(seg))) return true;
  if (normalized.includes("/scripts/lens/")) return true;
  return false;
}

function findExceptionBlocks(content) {
  const violations = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!/EXCEPTION\s*:|EXCEPCIÓN\s*:/i.test(lines[i])) continue;
    const window = lines.slice(i, Math.min(lines.length, i + 5));
    const block = window.join("\n");
    if (!/TIMELINE\s*:/i.test(block)) continue;
    if (TIMELINE_PERMANENT.test(block) || PLAN_NO_REMOVAL.test(block)) {
      const reason = TIMELINE_PERMANENT.test(block) ? "TIMELINE: Permanente" : 'PLAN: "No aplicar" o "Mantener"';
      violations.push({ line: i + 1, reason });
    }
    i += window.length;
  }
  return violations;
}

function scanFile(filePath, violations) {
  if (isExcluded(filePath)) return;
  const relPath = relative(ROOT, filePath).replace(/\\/g, "/");
  const content = readFileSync(filePath, "utf8");
  const found = findExceptionBlocks(content);
  for (const v of found) {
    violations.push({
      lens: "32",
      severity: "🟠",
      file: `${relPath}:${v.line}`,
      msg: `EXCEPTION con ${v.reason} en módulo consumidor. Buscar solución nativa (server-only, barrel split, API correcta del framework) o documentar TIMELINE accionable con PLAN ejecutable.`,
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

export function lens32NoPermanentExceptionGlobal() {
  const violations = [];
  const modulesDir = join(SRC, "modules");
  scanDir(modulesDir, violations);
  return violations;
}

export default function lens32() {
  return [];
}
