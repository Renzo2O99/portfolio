import { join } from "node:path";
import { findFiles, getRelativePath, MODULES_DIR, readFileSafe } from "./helpers.mjs";

export default function lens14(modName) {
  const violations = [];
  for (const f of findFiles(join(MODULES_DIR, modName), /\.(ts|tsx)$/)) {
    const content = readFileSafe(f);
    const relPath = getRelativePath(f);

    if (/<img\s[^>]*src=/.test(content) && !content.includes("next/image")) {
      violations.push({ lens: "14", severity: "🟡", file: relPath, msg: "Uso de <img> HTML. Usar next/image" });
    }

    if (content.includes("console.log(") && !relPath.includes(".test.")) {
      violations.push({ lens: "14", severity: "🟡", file: relPath, msg: "console.log en produccion. Usar logger o eliminar" });
    }

    for (const m of content.matchAll(/<input[^>]*>/gi)) {
      const tag = m[0];
      const hasId = /id=["']([^"']+)["']/.test(tag);
      const hasAriaLabel = tag.includes("aria-label") || tag.includes("aria-labelledby");
      if (!hasId && !hasAriaLabel) {
        const ctx = content.substring(Math.max(0, (m.index || 0) - 300), Math.min(content.length, (m.index || 0) + 300));
        if (!ctx.includes("htmlFor=")) {
          violations.push({ lens: "14", severity: "🟡", file: relPath, msg: "Input sin label asociado. Agregar aria-label o htmlFor" });
        }
      }
    }

    for (const m of content.matchAll(/<Button[^>]*>[\s\S]*?<\/Button>/gi)) {
      const tag = m[0];
      const textHtml = tag.replace(/<[^>]*>/g, "").trim();
      if (!textHtml && !tag.includes("aria-label")) {
        violations.push({ lens: "14", severity: "🟡", file: relPath, msg: "Boton icon-only sin aria-label" });
      }
    }

    for (const m of content.matchAll(/<div[^>]*onClick[^>]*>/gi)) {
      const tag = m[0];
      if (!tag.includes("role=") && !tag.includes("onKeyDown") && !tag.includes("tabIndex")) {
        violations.push({ lens: "14", severity: "🟡", file: relPath, msg: "div con onClick sin role, onKeyDown ni tabIndex" });
      }
    }

    for (const m of content.matchAll(/next\/dynamic/g)) {
      violations.push({ lens: "14", severity: "🟡", file: relPath, msg: "Usa next/dynamic para lazy loading. Verificar si es necesario." });
    }
  }
  return violations;
}
