// NOTE: lens-33-imports.mjs — Lens universal de imports: posición top-of-file + errores en imports.
// NOTE: Reglas: (33.0) directivas "use client"/"use server" en primera posición,
// NOTE: (33.1) imports solo en cabecera, (33.2) sin namespace `import *`,
// NOTE: (33.3) sin acceso `React.*` (usar named imports), (33.4) sin `import React` sin uso,
// NOTE: (33.5) sin imports duplicados del mismo origen. Doc: .opencode/lenses/33-imports.md.

import { existsSync, readdirSync, readFileSync } from "fs";
import { join, relative } from "path";
import { getModuleOverride } from "./shared.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const SRC = join(ROOT, "src");

const EXCLUDED_SUFFIXES = [".test.", ".spec.", ".story."];
const SCOPES = ["modules", "app", "shared", "infrastructure", "common"];

/**
 * Ventana de EXCEPTION (misma convención que lens-22): una línea
 * `// EXCEPTION:` silencia las reglas 33.2–33.5 hasta `};` o +25 líneas.
 * (Lens-32 valida aparte que el bloque tenga PLAN + TIMELINE.)
 */
function buildExceptionWindows(lines) {
  const skipped = new Set();
  let inBlock = false;
  let blockStart = 0;
  for (let i = 0; i < lines.length; i++) {
    if (inBlock) {
      const trimmed = lines[i].trim();
      if (/^};/.test(trimmed) || /^}\s*;/.test(trimmed) || i > blockStart + 25) {
        inBlock = false;
      } else {
        skipped.add(i);
      }
      continue;
    }
    if (/\/\/\s*EXCEPTION:/.test(lines[i])) {
      inBlock = true;
      blockStart = i;
      skipped.add(i);
    }
  }
  return skipped;
}

function stripComments(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\/[^\n]*/g, "");
}

/**
 * Regla 33.0: las directivas "use client"/"use server" van arriba del todo,
 * antes de cualquier import/export/código (solo comentarios y líneas vacías
 * pueden precederlas). Una directiva tardía rompe el build y no admite EXCEPTION.
 * Severidad: 🔴 Crítica (rompe el build).
 */
function checkDirectives(lines, relPath, violations) {
  let seenCode = false;
  let inBlock = false;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (inBlock) {
      if (t.includes("*/")) inBlock = false;
      continue;
    }
    if (!t || t.startsWith("//")) continue;
    if (t.startsWith("/*")) {
      if (!t.includes("*/", 2)) inBlock = true;
      continue;
    }
    if (t.startsWith("*")) continue;
    if (/^["']use (client|server)["'];?$/.test(t)) {
      if (seenCode) {
        violations.push({
          lens: "33",
          severity: "🔴",
          file: `${relPath}:${i + 1}`,
          msg: `Directiva ${t.replace(/;$/, "")} fuera de posición (línea ${i + 1}): debe ser la primera sentencia del archivo, antes de imports/exports/código. Mover a top.`,
        });
      }
      continue;
    }
    seenCode = true;
  }
}

/**
 * Regla 33.1 (esencia original): los imports viven en la cabecera del archivo,
 * tras "use client"/"use server", comentarios de cabecera y líneas vacías.
 * Severidad: 🟡 Menor (higiene, dificulta lectura y tree-shaking).
 */
function checkTopImports(lines, relPath, violations) {
  let headerEndIndex = lines.length;
  let inJSDoc = false;
  let jsdocHasParam = false;
  let jsdocStart = -1;
  let inImport = false;

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) continue;
    if (t === '"use client";' || t === "'use client';" || t === '"use server";' || t === "'use server';") continue;
    if (inImport) {
      if (/;\s*$/.test(t)) inImport = false;
      continue;
    }
    if (/^import\s+/.test(t)) {
      if (!/;\s*$/.test(t)) inImport = true;
      continue;
    }

    if (t.startsWith("/**")) {
      inJSDoc = true;
      jsdocHasParam = t.includes("@param") || t.includes("@returns") || t.includes("@example") || t.includes("@description");
      jsdocStart = i;
      if (t.includes("*/")) {
        if (jsdocHasParam) {
          headerEndIndex = jsdocStart;
          break;
        }
        inJSDoc = false;
      }
      continue;
    }
    if (inJSDoc) {
      if (t.includes("@param") || t.includes("@returns") || t.includes("@example") || t.includes("@description")) jsdocHasParam = true;
      if (t.includes("*/")) {
        inJSDoc = false;
        if (jsdocHasParam) {
          headerEndIndex = jsdocStart;
          break;
        }
      }
      continue;
    }
    if (t.startsWith("//")) continue;
    if (t.startsWith("/*") || t.startsWith("*")) continue;

    if (/^(export\s+|const\s+|let\s+|var\s+|function\s+|class\s+|type\s+|interface\s+)/.test(t)) {
      headerEndIndex = i;
      break;
    }
  }

  for (let i = headerEndIndex; i < lines.length; i++) {
    const t = lines[i].trim();
    if (/^import\s+/.test(t)) {
      violations.push({
        lens: "33",
        severity: "🟡",
        file: `${relPath}:${i + 1}`,
        msg: `Import fuera de cabecera (línea ${i + 1}): los imports deben estar al inicio del archivo, antes de JSDoc de función/código. Mover a top.`,
      });
    }
  }
}

/**
 * Reglas 33.2–33.5: errores en imports.
 * - 33.2 🟠 Namespace `import * as X` (rompe tree-shaking; solo con EXCEPTION si el SDK lo exige).
 * - 33.3 🟡 Acceso `React.*` (usar named imports desde "react").
 * - 33.4 🟡 `import React` default sin ningún uso (el JSX transform automático no lo requiere).
 * - 33.5 🟡 Imports duplicados del mismo origen en un archivo (fusionar en uno solo).
 */
function checkImportErrors(content, lines, relPath, violations, skipped) {
  const code = stripComments(content);
  const codeLines = code.split("\n");

  // Recolectar sentencias import con su línea inicial.
  const imports = [];
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (current !== null) {
      current.text += `\n${lines[i]}`;
      if (/;\s*$/.test(t)) {
        current.end = i;
        imports.push(current);
        current = null;
      }
      continue;
    }
    if (/^import\s+/.test(t)) {
      current = { start: i, end: i, text: lines[i] };
      if (/;\s*$/.test(t)) {
        imports.push(current);
        current = null;
      }
    }
  }

  const inWindow = (i) => skipped.has(i);

  for (const imp of imports) {
    if (inWindow(imp.start)) continue;
    // 33.2 Namespace import.
    const ns = imp.text.match(/import\s+(?:type\s+)?\*\s+as\s+(\w+)\s+from\s+["']([^"']+)["']/);
    if (ns) {
      violations.push({
        lens: "33",
        severity: "🟠",
        file: `${relPath}:${imp.start + 1}`,
        msg: `Namespace import \`import * as ${ns[1]} from "${ns[2]}"\` — usar named imports (o documentar EXCEPTION con PLAN + TIMELINE si el SDK lo exige).`,
      });
    }
  }

  // 33.3 Accesos React.* (una violación por archivo con los miembros encontrados).
  const reactUses = new Map();
  const reactUseRe = /\bReact\.([A-Za-z_][\w]*)/g;
  let m;
  while ((m = reactUseRe.exec(code)) !== null) {
    const lineNum = code.slice(0, m.index).split("\n").length;
    if (!reactUses.has(m[1])) reactUses.set(m[1], lineNum);
  }
  if (reactUses.size > 0) {
    const members = [...reactUses.keys()].join(", ");
    const firstLine = Math.min(...reactUses.values());
    violations.push({
      lens: "33",
      severity: "🟡",
      file: `${relPath}:${firstLine}`,
      msg: `Acceso React.* (${members}) — usar named imports (\`import { ${[...reactUses.keys()].slice(0, 3).join(", ")}${reactUses.size > 3 ? ", ..." : ""} } from "react"\` / \`import type\` para tipos).`,
    });
  }

  // 33.4 `import React` default sin uso (fuera de sus propias líneas de import).
  const hasReactDefault = imports.some((imp) => /^import\s+React\s*(,|\s+from)/.test(imp.text.trim()));
  if (hasReactDefault && !/\bReact\b/.test(codeLines.filter((_, i) => !imports.some((imp) => i >= imp.start && i <= imp.end)).join("\n"))) {
    const imp = imports.find((imp) => /^import\s+React\s*(,|\s+from)/.test(imp.text.trim()));
    violations.push({
      lens: "33",
      severity: "🟡",
      file: `${relPath}:${(imp?.start ?? 0) + 1}`,
      msg: "`import React` sin uso — eliminar (el JSX transform automático no lo requiere) o importar solo lo usado.",
    });
  }

  // 33.5 Orígenes duplicados en el mismo archivo.
  const bySource = new Map();
  for (const imp of imports) {
    if (inWindow(imp.start)) continue;
    const src = imp.text.match(/from\s+["']([^"']+)["']/)?.[1] ?? imp.text.match(/^import\s+["']([^"']+)["']/)?.[1];
    if (!src) continue;
    if (!bySource.has(src)) bySource.set(src, []);
    bySource.get(src).push(imp.start + 1);
  }
  for (const [src, dupLines] of bySource) {
    if (dupLines.length > 1) {
      violations.push({
        lens: "33",
        severity: "🟡",
        file: `${relPath}:${dupLines[1]}`,
        msg: `Import duplicado de "${src}" (líneas ${dupLines.join(", ")}) — fusionar en un solo import.`,
      });
    }
  }
}

function isExcluded(filePath) {
  return EXCLUDED_SUFFIXES.some((s) => filePath.endsWith(s));
}

function scanFile(filePath, violations) {
  if (isExcluded(filePath)) return;
  const content = readFileSync(filePath, "utf8");
  const relPath = relative(ROOT, filePath).replace(/\\/g, "/");
  const lines = content.split("\n");
  const skipped = buildExceptionWindows(lines);
  checkDirectives(lines, relPath, violations);
  checkTopImports(lines, relPath, violations);
  checkImportErrors(content, lines, relPath, violations, skipped);
}

function scanDir(dir, violations) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      scanDir(full, violations);
    } else if ((entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) && !isExcluded(full)) {
      scanFile(full, violations);
    }
  }
}

export function lens33ImportsGlobal() {
  const violations = [];
  for (const scope of SCOPES) scanDir(join(SRC, scope), violations);
  return violations;
}

export default function lens33() {
  return [];
}
