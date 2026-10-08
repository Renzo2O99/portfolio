import { join } from "node:path";
import { findFiles, getRelativePath, MODULES_DIR, readFileSafe } from "./helpers.mjs";

export default function lens12(modName) {
  const violations = [];
  for (const f of findFiles(join(MODULES_DIR, modName), /\.(ts|tsx)$/)) {
    const content = readFileSafe(f);
    const relPath = getRelativePath(f);
    const lines = content.split("\n");

    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("import")) return;
      if (line.includes('"any"') || line.includes("'any'") || /many|company|anyway|anywhere|anyone|anytime|anybody/.test(line)) return;
      if (/\bany\b/.test(line)) {
        violations.push({ lens: "12", severity: "🔴", file: `${relPath}:${i + 1}`, msg: "Uso de `any` detectado. Usar `unknown` con validacion" });
      }
    });

    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
      if (line.includes("!==") || line.includes("!=")) return;
      const nnMatch = line.match(/(\w+)\s*!\s*[;,)}\]]/);
      if (nnMatch) {
        violations.push({ lens: "12", severity: "🟡", file: `${relPath}:${i + 1}`, msg: `Non-null assertion \`${nnMatch[1]}!\` puede causar runtime errors` });
      }
    });

    for (const m of content.matchAll(/@ts-(?:ignore|expect-error)/g)) {
      const beforeMatch = content.substring(0, m.index);
      const lineNum = (beforeMatch.match(/\n/g) || []).length + 1;
      violations.push({ lens: "12", severity: "🟠", file: `${relPath}:${lineNum}`, msg: `TypeScript suppression (\`${m[0]}\`)` });
    }

    const useEffectCount = (content.match(/\buseEffect\(/g) || []).length;
    if (useEffectCount > 3) {
      violations.push({ lens: "12", severity: "🟠", file: relPath, msg: `${useEffectCount} useEffect — refactorizar a hooks especializados` });
    }

    const useRefCount = (content.match(/\buseRef\(/g) || []).length;
    if (useRefCount > 3) {
      violations.push({ lens: "12", severity: "🟡", file: relPath, msg: `${useRefCount} useRef — verificar necesidad` });
    }

    if (/className=\{`[^}]*\$\{/.test(content)) {
      violations.push({ lens: "12", severity: "🟡", file: relPath, msg: "Template literal dinamico en className. Usar cn()" });
    }
  }
  return violations;
}
