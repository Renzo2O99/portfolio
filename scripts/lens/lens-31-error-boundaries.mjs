// NOTE: lens-31-error-boundaries.mjs — Detecta Error Boundaries que NO usen catchError de next/error (Next.js 16.3+).
// NOTE: Escanea src/ completo: modules, app, shared, infrastructure, common.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const SRC = join(ROOT, "src");

const EXCLUDED_SEGMENTS = ["/ai-context/", "/design-reference/", "/node_modules/", "/.next/"];
const EXCLUDED_SUFFIXES = [".test.", ".spec.", ".story.", ".css"];

const CLASS_BOUNDARY_PATTERN = /class\s+\w+\s+extends\s+(?:React\.)?Component[\s\S]{0,800}?(?:componentDidCatch|getDerivedStateFromError)/;
const THIRD_PARTY_IMPORT_PATTERN = /from\s+['"](?:react-error-boundary|@sentry\/nextjs)['"]/;
const DEFAULT_EXPORT_SUSPECT = /export\s+default\s+\w+ErrorBoundary\s*;?\s*$/m;

function isExcluded(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  if (EXCLUDED_SUFFIXES.some((s) => filePath.endsWith(s))) return true;
  if (EXCLUDED_SEGMENTS.some((seg) => normalized.includes(seg))) return true;
  if (normalized.includes("/scripts/lens/")) return true;
  return false;
}

function isExceptionBlock(lines, lineIndex) {
  const window = lines.slice(Math.max(0, lineIndex - 2), Math.min(lines.length, lineIndex + 5));
  const hasException = window.some((l) => /\/\/\s*EXCEPTION\s*:/i.test(l));
  const hasPlan = window.some((l) => /\/\/\s*PLAN\s*:/i.test(l));
  const hasTimeline = window.some((l) => /\/\/\s*TIMELINE\s*:/i.test(l));
  return hasException && hasPlan && hasTimeline;
}

function isExemptedFile(relPath) {
  return relPath === "src/app/global-error.tsx";
}

function scanFile(filePath, violations, opts = {}) {
  if (!opts.force && isExcluded(filePath)) return;
  const rootForPath = opts.root ?? ROOT;
  const relPath = opts.relPath ?? relative(rootForPath, filePath).replace(/\\/g, "/");
  if (!opts.force && isExemptedFile(relPath)) return;

  const content = opts.content ?? readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  if (CLASS_BOUNDARY_PATTERN.test(content)) {
    const classLine = lines.findIndex((l) => /class\s+\w+\s+extends\s+(?:React\.)?Component/.test(l));
    const lineIndex = classLine >= 0 ? classLine : 0;
    if (isExceptionBlock(lines, lineIndex)) return;

    violations.push({
      lens: "31",
      severity: "🔴",
      file: relPath,
      msg: "Class ErrorBoundary legacy detectado. Migrar a catchError de next/error (AGENTS.md → Error Boundaries). Excepción de portabilidad solo con // EXCEPTION + // PLAN + // TIMELINE",
    });
    return;
  }

  const thirdPartyMatch = content.match(THIRD_PARTY_IMPORT_PATTERN);
  if (thirdPartyMatch) {
    const importLine = lines.findIndex((l) => THIRD_PARTY_IMPORT_PATTERN.test(l));
    if (!isExceptionBlock(lines, importLine)) {
      violations.push({
        lens: "31",
        severity: "🔴",
        file: relPath,
        msg: `Import de librería externa de Error Boundary (${thirdPartyMatch[0]}). Usar catchError de next/error`,
      });
      return;
    }
  }

  if (DEFAULT_EXPORT_SUSPECT.test(content) && !/catchError\s*\(/.test(content)) {
    const exportLine = lines.findIndex((l) => /export\s+default\s+\w+ErrorBoundary\s*;?\s*$/.test(l));
    if (!isExceptionBlock(lines, exportLine)) {
      violations.push({
        lens: "31",
        severity: "🟠",
        file: relPath,
        msg: "export default XxxErrorBoundary sin catchError() detectado. Verificar que el archivo use el HOC catchError de next/error",
      });
    }
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

export function lens31ErrorBoundariesGlobal() {
  const violations = [];
  const scopes = ["modules", "app", "shared", "infrastructure", "common"].map((s) => join(SRC, s));
  for (const scope of scopes) scanDir(scope, violations);
  return violations;
}

export default function lens31() {
  return [];
}
