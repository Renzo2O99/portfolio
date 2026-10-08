import { join } from "node:path";
import { findFiles, getModDir, getRelativePath, MODULES_DIR, ROOT, readFileSafe } from "./shared.mjs";

const emojiRegex = /\/\/\s*(?:[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}])/u;
const emojiBlockRegex = /\{\/\*.*(?:[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}])/u;
const numberedListRegex = /\{\/\*\s*\d+\./;
const fixCommentRegex = /\/\/.*FIX/;
const redundantRegex = /\/\/\s*(Calcula|Retorna|Limpia|Establece|Verifica|Comprueba|Usa|Importa|Exporta|Define|Declara|Inicializa|Convierte|Construye|Obtiene|Agrega|Elimina|Actualiza|Calculate|Return|Clear|Set|Check|Initialize|Convert|Build|Get|Add|Remove|Update|Create|Fetch|Validate)\b/i;
const keywordRegex = /\/\/\s*(EXCEPTION|PLAN|TIMELINE|HACK|FIXME|TODO|OPTIMIZE|SECURITY|BUG|NOTE)\s*:/;
const anyKeywordRegex = /\/\/\s*(EXCEPTION|PLAN|TIMELINE|HACK|FIXME|TODO|OPTIMIZE|SECURITY|BUG|NOTE)\b/i;
const todoAnyRegex = /\/\/\s*TODO\b/;
const todoIssueRegex = /\/\/\s*TODO\([#@][\w-]+\)\s*:/;
const commentedCodeRegex = /^\s*\/\/\s*(let|const|var|function|export|import|return|if|for|while|await|async|try|catch)\b/i;
const emptyCommentRegex = /^\s*\/\/\s*$/;
const lyingCommentRegex = /\/\/\s*(Ya validado|Ya sanitizado|Ya autorizado|Nunca llega aquí|Esto no falla|No hace falta|No falla)/i;
const techAnnotationRegex = /\/\/\s*(biome-ignore|@ts-(expect|ignore)|eslint-(disable|enable)|c8\s+ignore|istanbul\s+ignore|vitest-(skip|only)|jest-(skip|only))\b/;
const algorithmicRegex = /\/\/\s*(O\([^)]*\)|Throttle\b|Debounce\b|Backoff\b|TTL\b)/i;
const urlCommentRegex = /\/\/\s*https?:\/\//;
const inlineCommentRegex = /^(?!\s*\/\/)(?!\s*\/\*)(?!\s*\*)[^\n]*\s\/\/\s+\S/;
const nameColonRegex = /\/\/\s*[a-záéíóúñ][\w-]*\s*[:：]/;

export default function lens16(modName) {
  const violations = [];
  const modPath = getModDir(modName);
  auditFiles(findFiles(modPath, /\.(ts|tsx)$/), violations);
  return violations;
}

export function lens16Global() {
  const violations = [];
  const targets = [
    [join(ROOT, "src/app"), /\.(ts|tsx)$/],
    [join(ROOT, "src/common"), /\.(ts|tsx)$/],
    [join(ROOT, "src/shared"), /\.(ts|tsx)$/],
    [join(ROOT, "src/infrastructure"), /\.(ts|tsx)$/],
  ];
  for (const [dir, pattern] of targets) {
    auditFiles(findFiles(dir, pattern), violations);
  }
  return violations;
}

function auditFiles(files, violations) {
  for (const f of files) {
    const content = readFileSafe(f);
    const lines = content.split("\n");
    const relPath = getRelativePath(f);

    let inTsDoc = false;
    let inBlockComment = false;
    let motivationEnd = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      const trimmed = line.trim();
      const isLineComment = /^\s*\/\//.test(line);

      if (/^\s*\/\*\*/.test(trimmed)) {
        inTsDoc = true;
        inBlockComment = true;
      } else if (/^\s*\/\*/.test(trimmed)) {
        inBlockComment = true;
      }

      if (inBlockComment) {
        if (/\*\//.test(trimmed)) {
          inBlockComment = false;
          if (inTsDoc) inTsDoc = false;
        }
        if (/EXCEPTION\s*:/.test(trimmed) && !/PLAN\s*:/.test(trimmed)) {
          const blockWindow = lines.slice(i, i + 10).join(" ");
          if (!/PLAN\s*:/.test(blockWindow)) {
            violations.push({ lens: "16", severity: "🟠", file: `${relPath}:${lineNum}`, msg: "EXCEPTION sin PLAN en bloque de comentarios (12-comments.md §12.2.1)" });
          }
          if (!/TIMELINE\s*:/.test(blockWindow)) {
            violations.push({ lens: "16", severity: "🟠", file: `${relPath}:${lineNum}`, msg: "EXCEPTION sin TIMELINE en bloque de comentarios (12-comments.md §12.2.1)" });
          }
        }
        continue;
      }

      if (!isLineComment) {
        if (inlineCommentRegex.test(line) && !/\.push\(/.test(line)) {
          violations.push({ lens: "16", severity: "🟡", file: `${relPath}:${lineNum}`, msg: "Comentario en línea junto a código (12.5). Mover arriba o eliminar" });
        }
        continue;
      }

      // `//` entre hijos JSX se RENDERIZA como texto visible (solo `{/* */}`
      // es comentario real en JSX). Heurística: línea `//` con prev no-vacía
      // terminada en `>` y next no-vacía empezada en `<`, fuera de template literals.
      if (/\.tsx$/.test(f)) {
        let prev = -1;
        for (let j = i - 1; j >= 0; j--) {
          if (lines[j].trim() !== "") {
            prev = j;
            break;
          }
        }
        let next = -1;
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].trim() !== "") {
            next = j;
            break;
          }
        }
        if (prev !== -1 && next !== -1 && lines[prev].trimEnd().endsWith(">") && lines[next].trimStart().startsWith("<")) {
          const tickCount = (lines.slice(0, i).join("\n").replace(/\\`/g, "").match(/`/g) || []).length;
          if (tickCount % 2 === 0) {
            violations.push({ lens: "16", severity: "🟠", file: `${relPath}:${lineNum}`, msg: "Comentario // entre hijos JSX: se renderiza como texto visible. Usar {/* */}" });
          }
        }
      }

      // Cualquier keyword válido inicia un bloque de comentario permitido:
      // las líneas `//` contiguas siguientes son continuación del mismo
      // bloque y quedan cubiertas (no solo EXCEPTION, que además extiende
      // motivationEnd con su ventana de PLAN/TIMELINE más abajo).
      if (isLineComment && keywordRegex.test(line) && !/\/\/\s*EXCEPTION\s*:/.test(line)) {
        let blockEnd = i;
        for (let j = i + 1; j < lines.length && /^\s*\/\//.test(lines[j]); j++) {
          blockEnd = j;
        }
        if (blockEnd > motivationEnd) motivationEnd = blockEnd;
      }

      const isMotivation = i <= motivationEnd;

      if (emojiRegex.test(line)) {
        violations.push({ lens: "16", severity: "🟡", file: `${relPath}:${lineNum}`, msg: "Comentario con emoji decorativo. Eliminar." });
      }

      if (emojiBlockRegex.test(line)) {
        violations.push({ lens: "16", severity: "🟡", file: `${relPath}:${lineNum}`, msg: "Comentario JSX con emoji decorativo. Eliminar." });
      }

      if (numberedListRegex.test(line)) {
        violations.push({ lens: "16", severity: "🟡", file: `${relPath}:${lineNum}`, msg: "Lista numerada obvia en JSX. Eliminar comentario." });
      }

      if (fixCommentRegex.test(line) && !line.includes("EXCEPTION") && !line.includes("PLAN") && !line.includes("TIMELINE")) {
        violations.push({ lens: "16", severity: "🟡", file: `${relPath}:${lineNum}`, msg: "FIX comment sin documentación EXCEPTION/PLAN/TIMELINE" });
      }

      if (lyingCommentRegex.test(line)) {
        violations.push({ lens: "16", severity: "🔴", file: `${relPath}:${lineNum}`, msg: "Comentario que miente u oculta un bug (ya validado/sanitizado/autorizado). Eliminar o corregir." });
      }

      if (commentedCodeRegex.test(line)) {
        violations.push({ lens: "16", severity: "🟡", file: `${relPath}:${lineNum}`, msg: "Código comentado. Eliminar, no comentar código muerto." });
      }

      if (emptyCommentRegex.test(line)) {
        violations.push({ lens: "16", severity: "🟡", file: `${relPath}:${lineNum}`, msg: "Comentario vacío. Eliminar." });
      }

      if (redundantRegex.test(line) && !isMotivation) {
        violations.push({ lens: "16", severity: "🟡", file: `${relPath}:${lineNum}`, msg: `Comentario redundante que describe qué hace el código. Eliminar o reemplazar con comentario de "por qué".` });
      }

      const isRealComment = /^\s*\/\//.test(line);
      if (isRealComment && todoAnyRegex.test(line)) {
        if (!todoIssueRegex.test(line)) {
          violations.push({ lens: "16", severity: "🟡", file: `${relPath}:${lineNum}`, msg: "TODO sin issue/usuario. Formato: // TODO(#123): ... o // TODO(@user): ..." });
        }
      } else if (isRealComment && anyKeywordRegex.test(line) && !keywordRegex.test(line)) {
        violations.push({ lens: "16", severity: "🟡", file: `${relPath}:${lineNum}`, msg: "Keyword mal formateado (12.2). Formato: // KEYWORD: descripción (uppercase, dos puntos + espacio)" });
      }

      if (/\/\/\s*EXCEPTION\s*:/.test(line)) {
        const windowLines = lines.slice(i, i + 11);
        const nextText = windowLines.join(" ");
        if (!/PLAN\s*:/.test(nextText)) {
          violations.push({ lens: "16", severity: "🟠", file: `${relPath}:${lineNum}`, msg: "EXCEPTION sin PLAN en las 10 líneas siguientes (12-comments.md §12.2.1)" });
        }
        if (!/TIMELINE\s*:/.test(nextText)) {
          violations.push({ lens: "16", severity: "🟠", file: `${relPath}:${lineNum}`, msg: "EXCEPTION sin TIMELINE en las 10 líneas siguientes (12-comments.md §12.2.1)" });
        }
        const timelineLine = windowLines.find((l) => /TIMELINE\s*:/.test(l));
        if (timelineLine && !/TIMELINE:\s*(Q[1-4]\s\d{4}|N\/A)/.test(timelineLine)) {
          violations.push({ lens: "16", severity: "🟠", file: `${relPath}:${lineNum}`, msg: "TIMELINE con formato inválido. Usar 'Q1-Q4 YYYY' o 'N/A'." });
        }
        const timelineIdx = windowLines.findIndex((l) => /TIMELINE\s*:/.test(l));
        motivationEnd = timelineIdx === -1 ? i + 10 : i + 1 + timelineIdx;
      }

      if (/EXCEPTION\s*:/.test(trimmed) && !/EXCEPTION\s*:.*PLAN\s*:/.test(trimmed) && !/\/\//.test(trimmed)) {
        const blockWindow = lines.slice(i, i + 10).join(" ");
        if (!/PLAN\s*:/.test(blockWindow)) {
          violations.push({ lens: "16", severity: "🟠", file: `${relPath}:${lineNum}`, msg: "EXCEPTION sin PLAN en bloque de comentarios (12-comments.md §12.2.1)" });
        }
        if (!/TIMELINE\s*:/.test(blockWindow)) {
          violations.push({ lens: "16", severity: "🟠", file: `${relPath}:${lineNum}`, msg: "EXCEPTION sin TIMELINE en bloque de comentarios (12-comments.md §12.2.1)" });
        }
      }

      if (/\/\/\s*(HACK|FIXME)\s*:/.test(line)) {
        const nextText = lines.slice(i + 1, i + 11).join(" ");
        if (!/\/\/\s*PLAN\s*:/.test(nextText) || !/\/\/\s*TIMELINE\s*:/.test(nextText)) {
          violations.push({ lens: "16", severity: "🟠", file: `${relPath}:${lineNum}`, msg: `${line.trim().slice(3).split(":")[0]} sin PLAN+TIMELINE en las 10 líneas siguientes (12-comments.md §12.2)` });
        }
      }

      const isAllowed = keywordRegex.test(line) || anyKeywordRegex.test(line) || techAnnotationRegex.test(line) || algorithmicRegex.test(line) || urlCommentRegex.test(line) || isMotivation || redundantRegex.test(line);
      if (!isAllowed) {
        if (nameColonRegex.test(line)) {
          violations.push({ lens: "16", severity: "🟡", file: `${relPath}:${lineNum}`, msg: "Comentario con formato pseudo-keyword o que repite nombre (12.5). Usar keyword permitido (12.2) o eliminar" });
        } else {
          violations.push({ lens: "16", severity: "🟡", file: `${relPath}:${lineNum}`, msg: "Comentario sin keyword permitido (12.6 regla de oro). Usar KEYWORD (EXCEPTION/NOTE/TODO/...) o eliminar" });
        }
      }
    }
  }
}
