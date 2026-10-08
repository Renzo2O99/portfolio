import { findFiles, getModDir, getRelativePath, readFileSafe } from "./shared.mjs";

/**
 * Lens 33 — Imports en posición correcta (top-of-file).
 * Detecta `import ... from` que aparecen después de código, JSDoc o funciones.
 * Solo se permiten al inicio del archivo, tras "use client"/"use server", comentarios de cabecera y líneas vacías.
 *
 * Severidad: 🟡 Menor (higiene, no rompe runtime pero dificulta lectura y tree-shaking)
 */
export default function lens33(modName) {
  const violations = [];
  const modPath = getModDir(modName);
  const files = findFiles(modPath, /\.(ts|tsx)$/);

  for (const f of files) {
    const content = readFileSafe(f);
    const relPath = getRelativePath(f);
    const lines = content.split("\n");

    // Header = "use client"/"use server" + imports + file-level comments sin @param/@returns (cabecera de archivo)
    // Body empieza en el primer JSDoc de función (@param/@returns/@example/@description con contexto de función) o código
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

      // Detectar bloques JSDoc /** ... */
      if (t.startsWith("/**")) {
        inJSDoc = true;
        jsdocHasParam = t.includes("@param") || t.includes("@returns") || t.includes("@example") || t.includes("@description");
        jsdocStart = i;
        if (t.includes("*/")) {
          // JSDoc de una línea
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

      // Código real → fin de header
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

  return violations;
}
