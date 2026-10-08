import { join } from "node:path";
import { findFiles, getModDir, getRelativePath, MODULES_DIR, readFileSafe } from "./shared.mjs";

export default function lens15(modName) {
  const violations = [];
  const modPath = getModDir(modName);
  const files = findFiles(modPath, /\.tsx$/);

  for (const f of files) {
    const content = readFileSafe(f);
    const relPath = getRelativePath(f);
    const lines = content.split("\n");
    // Los tags citados en la documentacion (`<input type="color">` en el TSDoc de una
    // primitiva) no son marcado: sin esta mascara el lens exigia un label a un input
    // que solo existe dentro de un comentario.
    const codeLines = content
      .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
      .replace(/^[ \t]*\/\/.*$/gm, (line) => " ".repeat(line.length))
      .split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = codeLines[i] ?? "";
      const lineNum = i + 1;

      if (/<button(?![^>]*aria-label)[^>]*>/.test(line) && !/<button[^>]*>\s*\w+/.test(line)) {
        const nextLine = codeLines[i + 1] || "";
        if (nextLine.includes("<") && nextLine.includes("/>")) {
          violations.push({ lens: "15", severity: "🟠", file: `${relPath}:${lineNum}`, msg: "Botón con solo icono sin aria-label. Añadir aria-label descriptivo" });
        }
      }

      if (/<div[^>]*onClick/.test(line) && !/role=/.test(line) && !/asChild/.test(line)) {
        violations.push({ lens: "15", severity: "🟠", file: `${relPath}:${lineNum}`, msg: "div con onClick sin role. Usar <button> o añadir role + tabIndex + onKeyDown" });
      }

      if (/<div[^>]*className[^>]*nav/i.test(line) && !/<nav/.test(line)) {
        violations.push({ lens: "15", severity: "🟡", file: `${relPath}:${lineNum}`, msg: "div con className de nav. Usar elemento semántico <nav>" });
      }

      if (/<input[^>]*>/.test(line) && !/id=/.test(line) && !/aria-label/.test(line) && !/aria-labelledby/.test(line)) {
        const ctx = content.substring(Math.max(0, i > 0 ? 0 : 0), Math.min(content.length, i + 300));
        if (!ctx.includes("htmlFor=") && !ctx.includes("for=")) {
          violations.push({ lens: "15", severity: "🟡", file: `${relPath}:${lineNum}`, msg: "Input sin label asociado. Agregar aria-label o htmlFor" });
        }
      }
    }

    if (content.includes("error") && (content.includes("setError") || content.includes("error &&"))) {
      // El archivo puede delegar el render del error en un subcomponente: si le pasa
      // `error={...}` a un componente (tag en mayusculas), ese subcomponente lo pinta
      // con la primitiva que ya emite `role="alert"` + `aria-live="polite"`
      // (`FieldError` de @/common). Exigirlo aqui seria un falso positivo por archivo.
      const delegatesErrorRendering = /<[A-Z]\w*[\s\S]{0,600}?\berror=\{/.test(content);
      const usesErrorPrimitive = /\b(FieldError|FormMessage)\b/.test(content);
      if (!content.includes("aria-live") && !delegatesErrorRendering && !usesErrorPrimitive) {
        const alreadyReported = violations.some((v) => v.lens === "15" && v.file === relPath && v.msg.includes("aria-live"));
        if (!alreadyReported) {
          violations.push({ lens: "15", severity: "🟡", file: relPath, msg: 'Mensajes de error dinámicos sin aria-live. Añadir aria-live="polite"' });
        }
      }
    }
  }

  return violations;
}
