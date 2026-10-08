import { join } from "node:path";
import { findFiles, getRelativePath, MODULES_DIR, readFileSafe } from "./helpers.mjs";

export default function lens10(modName) {
  const violations = [];
  for (const f of findFiles(join(MODULES_DIR, modName), /\.(ts|tsx)$/)) {
    const content = readFileSafe(f);
    const relPath = getRelativePath(f);

    const secretPatterns = [/(?:api[_-]?key|apikey)\s*[:=]\s*['"][A-Za-z0-9]{20,}['"]/gi, /(?:token|secret|password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]/gi, /sk-[a-zA-Z0-9]{20,}/g, /ghp_[a-zA-Z0-9]{36}/g];
    for (const pattern of secretPatterns) {
      for (const m of content.matchAll(pattern)) {
        const beforeMatch = content.substring(0, m.index);
        const lineNum = (beforeMatch.match(/\n/g) || []).length + 1;
        const line = content.split("\n")[lineNum - 1] || "";
        if (line.trim().startsWith("//") || line.trim().startsWith("import")) continue;
        violations.push({ lens: "10", severity: "🔴", file: relPath, msg: `Posible secret: "${m[0].substring(0, 30)}..."` });
      }
    }

    if (content.includes("dangerouslySetInnerHTML") && !content.includes("sanitize") && !content.includes("DOMPurify")) {
      violations.push({ lens: "10", severity: "🔴", file: relPath, msg: "dangerouslySetInnerHTML sin sanitizacion" });
    }

    for (const m of content.matchAll(/catch\s*(?:\([^)]*\))?\s*\{\s*\}/g)) {
      violations.push({ lens: "10", severity: "🟠", file: relPath, msg: "catch vacio sin logging ni re-throw" });
    }

    if (content.includes("async ") && content.includes("await ") && !content.includes("try") && !content.includes(".catch(") && !relPath.endsWith(".action.ts")) {
      violations.push({ lens: "10", severity: "🟡", file: relPath, msg: "Funcion async con await sin try/catch ni .catch()" });
    }

    if (/setInterval\(/.test(content) && !content.includes("clearInterval")) {
      violations.push({ lens: "10", severity: "🟠", file: relPath, msg: "setInterval sin clearInterval — posible memory leak" });
    }
    if (/addEventListener\(/.test(content) && !content.includes("removeEventListener")) {
      violations.push({ lens: "10", severity: "🟠", file: relPath, msg: "addEventListener sin removeEventListener — posible memory leak" });
    }
  }
  return violations;
}
