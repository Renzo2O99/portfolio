import { join } from "node:path";
import { findFiles, getModDir, getRelativePath, ROOT, readFileSafe } from "./shared.mjs";

/**
 * Lens 27 — ESLint/Biome/TS suppressions requieren bloque EXCEPTION
 *
 * Detecta supresiones de linter/TS sin bloque EXCEPTION + PLAN + TIMELINE
 * previo. El estándar del proyecto (12-comments.md §12.2) exige que toda
 * supresión esté justificada con EXCEPTION documentada.
 *
 * Patrones detectados:
 *  - eslint-disable / eslint-disable-next-line / eslint-disable-line
 *  - biome-ignore
 *  - @ts-expect-error / @ts-expect-error / ts-ignore
 *
 * Un bloque válido es:
 *   // EXCEPTION: [razón]
 *   // PLAN: [cómo removerla]
 *   // TIMELINE: [Q1-Q4 YYYY | N/A]
 * (tambien en forma JSX o block comment)
 *
 * La supresión debe tener un EXCEPTION con PLAN+TIMELINE en las 10 líneas
 * previas. Si no, se reporta violación.
 */

const SUPPRESSION_REGEX = /^\s*(\/\/|\/\*|\{\/\*)\s*(eslint-disable|biome-ignore|@ts-ignore|@ts-expect-error|ts-ignore|ts-expect-error)/i;
const EXCEPTION_REGEX = /EXCEPTION\s*:/;
const PLAN_REGEX = /PLAN\s*:/;
const TIMELINE_REGEX = /TIMELINE\s*:/;

export default function lens27(modName) {
  const modPath = getModDir(modName);
  return auditFiles(findFiles(modPath, /\.(ts|tsx)$/));
}

export function lens27Global() {
  const targets = [
    [join(ROOT, "src/app"), /\.(ts|tsx)$/],
    [join(ROOT, "src/common"), /\.(ts|tsx)$/],
    [join(ROOT, "src/shared"), /\.(ts|tsx)$/],
    [join(ROOT, "src/infrastructure"), /\.(ts|tsx)$/],
  ];
  const violations = [];
  for (const [dir, pattern] of targets) {
    violations.push(...auditFiles(findFiles(dir, pattern)));
  }
  return violations;
}

function auditFiles(files) {
  const violations = [];
  for (const file of files) {
    const content = readFileSafe(file);
    const lines = content.split("\n");
    const relPath = getRelativePath(file);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!SUPPRESSION_REGEX.test(line)) continue;

      // Ignorar eslint-enable (solo deshabilitar requiere justificación)
      if (/eslint-enable/.test(line) && !/eslint-disable/.test(line)) continue;

      // Buscar EXCEPTION válido en las 10 líneas previas
      let hasValidException = false;
      const start = Math.max(0, i - 10);
      for (let j = start; j < i; j++) {
        if (!EXCEPTION_REGEX.test(lines[j])) continue;
        // Ventana de 10 líneas después del EXCEPTION para PLAN+TIMELINE
        const window = lines.slice(j, j + 11).join(" ");
        if (PLAN_REGEX.test(window) && TIMELINE_REGEX.test(window)) {
          hasValidException = true;
          break;
        }
      }

      if (!hasValidException) {
        // Extraer qué tipo de supresión es para el mensaje
        const match = line.match(SUPPRESSION_REGEX);
        const type = match ? match[1] : "suppression";
        violations.push({
          lens: "27",
          severity: "🟠",
          file: `${relPath}:${i + 1}`,
          msg: `Supresión "${type}" sin bloque EXCEPTION + PLAN + TIMELINE en las 10 líneas previas (12-comments.md §12.2). Añadir EXCEPTION documentada antes de la supresión.`,
        });
      }
    }
  }
  return violations;
}
