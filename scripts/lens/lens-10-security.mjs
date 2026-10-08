import { join } from "node:path";
import { findFiles, getModDir, getRelativePath, MODULES_DIR, readFileSafe } from "./shared.mjs";

export default function lens10(modName) {
  const violations = [];
  const modPath = getModDir(modName);
  const files = findFiles(modPath, /\.(ts|tsx)$/);

  for (const f of files) {
    const content = readFileSafe(f);
    const relPath = getRelativePath(f);

    if (content.includes("dangerouslySetInnerHTML") && !content.includes("sanitize") && !content.includes("DOMPurify")) {
      violations.push({ lens: "10", severity: "🔴", file: relPath, msg: "dangerouslySetInnerHTML sin sanitización. Usar DOMPurify" });
    }

    const innerHtmlMatches = [...content.matchAll(/\.innerHTML\s*=/g)];
    if (innerHtmlMatches.length > 0) {
      violations.push({ lens: "10", severity: "🔴", file: relPath, msg: "innerHTML directo detectado. Usar dangerouslySetInnerHTML con DOMPurify" });
    }

    const sqlMatches = [...content.matchAll(/execute\(\s*`/g)];
    if (sqlMatches.length > 0) {
      violations.push({ lens: "10", severity: "🔴", file: relPath, msg: "Posible SQL injection: execute con template literal. Usar parámetros preparados" });
    }

    const secretPatterns = [/(?:api[_-]?key|apikey)\s*[:=]\s*['"][A-Za-z0-9]{20,}['"]/gi, /(?:token|secret|password|passwd|pwd|connection[_-]?string)\s*[:=]\s*['"][^'"]{8,}['"]/gi, /sk-[a-zA-Z0-9]{20,}/g, /ghp_[a-zA-Z0-9]{36}/g];
    for (const pattern of secretPatterns) {
      for (const m of content.matchAll(pattern)) {
        const beforeMatch = content.substring(0, m.index);
        const lineNum = (beforeMatch.match(/\n/g) || []).length + 1;
        const line = content.split("\n")[lineNum - 1] || "";
        if (line.trim().startsWith("//") || line.trim().startsWith("import")) continue;
        if (/^[A-Z_]+["']?\s*:/.test(line.trim())) continue;
        violations.push({ lens: "10", severity: "🔴", file: `${relPath}:${lineNum}`, msg: `Posible secret: "${(m[0] || "").substring(0, 30)}..."` });
      }
    }
  }

  return violations;
}
