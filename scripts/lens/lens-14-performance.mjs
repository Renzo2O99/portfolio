import { join } from "node:path";
import { findFiles, getModDir, getRelativePath, MODULES_DIR, readFileSafe } from "./shared.mjs";

export default function lens14(modName) {
  const violations = [];
  const modPath = getModDir(modName);
  const files = findFiles(modPath, /\.(ts|tsx)$/);

  for (const f of files) {
    const content = readFileSafe(f);
    const relPath = getRelativePath(f);
    const lines = content.split("\n");
    const hasException = /\/\/\s*EXCEPTION/.test(content);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      if (/<img\s/.test(line) && !hasException && !line.includes("next/image") && !line.includes("Cloudinary")) {
        violations.push({ lens: "14", severity: "🟠", file: `${relPath}:${lineNum}`, msg: "<img> sin next/image. Usar next/image para optimización automática" });
      }

      if (/useEffect\s*\(/.test(line)) {
        const nextLines = lines.slice(i, i + 10).join("\n");
        if (/set\w+\(.*\.filter\(/.test(nextLines) || /set\w+\(.*\.map\(/.test(nextLines) || /set\w+\(.*\.sort\(/.test(nextLines)) {
          violations.push({ lens: "14", severity: "🟡", file: `${relPath}:${lineNum}`, msg: "useEffect para cálculo derivado. Usar useMemo en su lugar" });
        }
      }
    }

    const codeOnly = content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    if (/console\.log\(/.test(codeOnly) && !relPath.includes(".test.") && !relPath.includes("/seeds/") && !relPath.endsWith(".script.ts")) {
      violations.push({ lens: "14", severity: "🟡", file: relPath, msg: "console.log en producción. Usar logger o eliminar" });
    }

    if (/next\/dynamic/.test(content) && !isJustifiedDynamic(content)) {
      violations.push({ lens: "14", severity: "🟡", file: relPath, msg: "Usa next/dynamic para lazy loading. Verificar si es necesario." });
    }
  }

  return violations;
}

// NOTE: next/dynamic justificado cuando el componente es cliente pesado con ssr:false (lazy loading de estado)
// o con loading: (skeleton de reemplazo que evita CLS mientras el chunk carga).
function isJustifiedDynamic(content) {
  return /ssr:\s*false/.test(content) || /loading:\s*\(/.test(content);
}
