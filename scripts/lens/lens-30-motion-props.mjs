import { findFiles, getModDir, getRelativePath, readFileSafe } from "./shared.mjs";

/**
 * Lens 30 — Motion props deben ser strings literales, no variables centralizadas.
 *
 * Props como `mode="wait"` y `key="hide"/"show"` en motion son valores técnicos
 * que deben permanecer como strings literales. Centralizarlos en constants
 * (ej: AUTH_TEXTS.ANIMATION_WAIT) es un error: oculta la semántica de motion
 * y rompe la expectativa de que esos valores sean literales de la librería.
 *
 * Detecta:
 * - mode={VARIABLE} o mode={CONSTANT.PROP} en <AnimatePresence>
 * - key={VARIABLE} o key={CONSTANT.PROP} en <motion.div>
 * Debe ser: mode="wait" y key="hide"/"show" como strings.
 */
export default function lens30(modName) {
  const violations = [];
  const modPath = getModDir(modName);
  const files = findFiles(modPath, /\.tsx$/);

  for (const f of files) {
    const content = readFileSafe(f);
    const relPath = getRelativePath(f);
    const lines = content.split("\n");

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;

      // Detecta mode={VARIABLE} en AnimatePresence — debe ser mode="wait"
      const modeVarMatch = line.match(/<AnimatePresence[^>]*\bmode\s*=\s*\{([^}]+)\}/);
      if (modeVarMatch) {
        const varValue = modeVarMatch[1].trim();
        // Si no es string literal "wait" con comillas, es violación
        if (!/^["']wait["']$/.test(varValue)) {
          violations.push({
            lens: "30",
            severity: "🟠",
            file: `${relPath}:${lineNum}`,
            msg: `motion prop "mode" debe ser string literal "wait", no variable (${varValue}). Revertir a mode="wait"`,
          });
        }
      }

      // Detecta key={VARIABLE} con constantes en motion.div — debe ser "hide"/"show" literales
      // Patrón: key={isVisible ? AUTH_TEXTS.X : AUTH_TEXTS.Y} o key={VARIABLE}
      const keyVarMatch = line.match(/<motion\.div[^>]*\bkey\s*=\s*\{([^}]+)\}/);
      if (keyVarMatch) {
        const keyValue = keyVarMatch[1].trim();
        // Valores válidos deben contener "hide" y "show" como strings literales
        const hasHideLiteral = /["']hide["']/.test(keyValue);
        const hasShowLiteral = /["']show["']/.test(keyValue);
        const hasConstantRef = /[A-Z_]+\.[A-Z_]+/.test(keyValue) || /AUTH_TEXTS/.test(keyValue);
        if (hasConstantRef || (!hasHideLiteral && !hasShowLiteral && keyValue.length > 0)) {
          // Si contiene referencia a constante, es violación
          if (hasConstantRef) {
            violations.push({
              lens: "30",
              severity: "🟠",
              file: `${relPath}:${lineNum}`,
              msg: `motion prop "key" debe ser string literal "hide"/"show", no variable (${keyValue}). Revertir a key={isVisible ? "hide" : "show"}`,
            });
          }
        }
      }

      // Detecta mode="wait" centralizado como mode={CONSTANT} en cualquier archivo
      if (line.includes("ANIMATION_WAIT") || line.includes("ANIMATION_HIDE") || line.includes("ANIMATION_SHOW")) {
        if (line.includes("mode={") || line.includes("key={")) {
          violations.push({
            lens: "30",
            severity: "🟠",
            file: `${relPath}:${lineNum}`,
            msg: `motion prop centralizada como variable (ANIMATION_*). Debe ser string literal "wait"/"hide"/"show"`,
          });
        }
      }
    });
  }

  return violations;
}
