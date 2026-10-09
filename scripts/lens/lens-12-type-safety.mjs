import { join } from "node:path";
import { findFiles, getModDir, getModuleOverride, getRelativePath, isLibrary, MODULES_DIR, readFileSafe } from "./shared.mjs";

const ANY_FALSE_POSITIVES = /\b(many|company|anyway|anywhere|anyone|anytime|anybody|anyways|anything)\b/i;

// Aliases de import/export renombrado: `Foo as Bar,` o `type Foo as Bar,`
// dentro de un bloque import { ... } o export { ... }. NO son casts; el
// lens solo debe cazar casts en expresiones (`valor as Tipo`).
const ALIAS_AS_PATTERN = /^\s*(?:type\s+)?[\w.]+\s+as\s+[A-Z]\w*\s*,?\s*$/;
// Export renombrado en línea única: `export { Foo as Bar, Baz as Qux } from "..."`
const EXPORT_ALIAS_PATTERN = /^\s*export\s*\{[^}]*\bas\b/;

export default function lens12(modName) {
  const violations = [];
  const modPath = getModDir(modName);
  const files = findFiles(modPath, /\.(ts|tsx)$/);

  for (const f of files) {
    const content = readFileSafe(f);
    const relPath = getRelativePath(f);
    const lines = content.split("\n");
    // EXCEPTION admitida en `//` y en `/* */`: constitution permite ambos estilos y el
    // archivo exigia solo el `//`, de modo que los casts documentados en formato bloque
    // (p. ej. el mapa de iconos de Lucide) se reportaban sin reason.
    const hasException = /(?:^|[^A-Za-z])EXCEPTION\s*:/.test(content);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      const trimmed = line.trim();

      if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("import")) continue;
      if (line.includes('"any"') || line.includes("'any'")) continue;
      if (ANY_FALSE_POSITIVES.test(line)) continue;

      if (/\bany\b/.test(line) && !/biome-ignore/.test(line)) {
        violations.push({ lens: "12", severity: "🔴", file: `${relPath}:${lineNum}`, msg: `Uso de "any": ${line.trim().substring(0, 80)}. Usar unknown + validación` });
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("import")) continue;

      const asMatch = line.match(/\bas\s+([A-Z]\w+)/);
      const asType = asMatch?.[1];
      const allowedCast = (() => {
        if (!asType) return false;
        const override = getModuleOverride(modName, "12", "image-shape-cast");
        if (override && asType === "ImageShape") return true;
        const guardOverride = getModuleOverride(modName, "12", "unknown-delegated-to-guard");
        if (guardOverride && asType === "Record") return true;
        const blocknoteOverride = getModuleOverride(modName, "12", "blocknote-typing-cast");
        if (blocknoteOverride) {
          const blocknoteTypes = new Set([
            "Block",
            "BlockWithUrl",
            "BlockCandidate",
            "BlockWithContent",
            "BlockProps",
            "Editor",
            "EditorInstance",
            "EditorPartialBlock",
            "EditorBlockSchema",
            "EditorInlineSchema",
            "EditorStyleSchema",
            "BlockNoteEditor",
            "CustomSuggestionItem",
            "HeadingBlockProps",
            "InlineContent",
            "InlineTextItem",
            "ContentItem",
            "ClipboardEvent",
            "InputEvent",
            "EventListener",
            "HTMLElement",
            "UrlPropHolder",
            "DocumentHolder",
            "HtmlParser",
            "MarkdownParser",
            "EditorWithProseMirrorView",
            "PMPlugin",
            "BlockWithUrl",
          ]);
          if (blocknoteTypes.has(asType)) return true;
        }
        return false;
      })();
      if (asMatch && !ALIAS_AS_PATTERN.test(line) && !EXPORT_ALIAS_PATTERN.test(line) && !line.includes("EXCEPTION") && !line.includes("as const") && !hasException && !allowedCast) {
        violations.push({ lens: "12", severity: "🟠", file: `${relPath}:${lineNum}`, msg: `Cast "as ${asMatch[1]}". Verificar si es necesario o usar validación Zod` });
      }

      if (line.includes("!==") || line.includes("!=")) continue;
      const nnMatch = line.match(/(\w+)\s*!\s*[;,)}\]]/);
      if (nnMatch) {
        violations.push({ lens: "12", severity: "🟠", file: `${relPath}:${lineNum}`, msg: `Non-null assertion \`${nnMatch[1]}!\` puede causar runtime errors` });
      }

      if (/@ts-(ignore|expect)/.test(line) && !line.includes("EXCEPTION")) {
        violations.push({ lens: "12", severity: "🟡", file: `${relPath}:${lineNum}`, msg: "TypeScript suppression sin documentar. Añadir EXCEPTION/PLAN/TIMELINE" });
      }

      if (/^(export\s+)?interface\s+\w+/.test(trimmed)) {
        violations.push({ lens: "12", severity: "🟠", file: `${relPath}:${lineNum}`, msg: `"interface" usado en vez de "type". Usar "type" siempre: ${line.trim().substring(0, 60)}` });
      }
    }

    // NOTE: Falsos positivos de `unknown` sin validación — genéricos de librerías externas, catch con instanceof, type guards propios.
    const hasTypeGuard = /function\s+is[A-Z]\w*\s*\([^)]*: unknown/.test(content);
    // NOTE: Narrowing runtime con Array.isArray / typeof / instanceof sobre el unknown es validación
    // legítima en adaptadores/serializadores (constitución: "usar unknown con validación").
    const hasRuntimeNarrowing = /Array\.isArray\(|typeof\s+\w+\s*===|instanceof\s+(Error|TypeError|RangeError|SyntaxError|\w+Error)/.test(content);
    const hasUnguardedUnknown = lines.some((line) => {
      if (!/: unknown\b/.test(line)) return false;
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("import")) return false;
      if (/<\w+,\s*unknown>/.test(line)) return false;
      if (/\((?:error|_error): unknown\)/.test(line)) return false;
      // NOTE: Params opcionales (`filters?: unknown`) y variadic (`...args: unknown[]`)
      // en factories de query keys / wrappers de console son deliberados.
      if (/\w+\?\s*:\s*unknown\b/.test(line)) return false;
      if (/\.\.\.\w+\s*:\s*unknown(\[\])?/.test(line)) return false;
      return true;
    });
    if (hasUnguardedUnknown && !hasTypeGuard && !hasRuntimeNarrowing && !content.includes("safeParse") && !hasException && !relPath.endsWith(".types.ts") && !relPath.endsWith(".schema.ts") && !relPath.includes("/internal/")) {
      if (!getModuleOverride(modName, "12", "unknown-delegated-to-util") && !getModuleOverride(modName, "12", "unknown-delegated-to-guard")) {
        violations.push({ lens: "12", severity: "🟠", file: relPath, msg: "Tipo unknown usado sin safeParse en el archivo. unknown debe validarse con Zod antes de usar" });
      }
    }
  }

  // NOTE: En librerías compartidas (common/shared/infrastructure) los context
  // types colocalizados en primitivas UI son cohesión interna legítima
  // (convención shadcn): no son duplicados de schema de dominio.
  const lib = isLibrary(modName);
  for (const f of files) {
    const content = readFileSafe(f);
    const relPath = getRelativePath(f);
    const hasException2 = /\/\/\s*EXCEPTION/.test(content);
    if (hasException2) continue;
    if (!relPath.includes("/ui/")) continue;
    // Los archivos *.types.ts SON la ubicación correcta para types no-Props en UI
    if (/\.types\.(ts|tsx)$/.test(relPath)) continue;
    if (lib) continue;

    const typeDefs = content.match(/(?:export\s+)?type\s+(\w+)\s*=[^;]+/g);
    if (!typeDefs) continue;

    for (const match of typeDefs) {
      const nameMatch = match.match(/type\s+(\w+)\s*=/);
      if (!nameMatch) continue;
      const typeName = nameMatch[1];
      if (/Props/i.test(typeName)) continue;

      const lineIdx = content.split("\n").findIndex((l) => l.includes(`type ${typeName} =`));
      violations.push({
        lens: "12",
        severity: "🟡",
        file: `${relPath}:${lineIdx + 1}`,
        msg: `Type "${typeName}" en archivo de UI. Los types no-Props deben estar en archivo *.types.ts separado`,
      });
    }
  }

  // Detección de Props de componente tipadas inline ({ ... }: { ... }) en vez de type <Name>Props
  for (const f of files) {
    const content = readFileSafe(f);
    const relPath = getRelativePath(f);
    if (!relPath.endsWith(".tsx")) continue;
    if (content.includes("EXCEPTION: inline-props")) continue;

    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;

      const fnComponentMatch = line.match(/(?:export\s+(?:default\s+)?)?(?:function\s+([A-Z]\w*)|(?:const|let)\s+([A-Z]\w*)\s*=\s*(?:React\.)?(?:memo|forwardRef)?\(?(?:async\s*)?)\s*\(\s*(?:\{[^}]*\}|\w+)\s*:\s*\{/);
      if (fnComponentMatch) {
        const compName = fnComponentMatch[1] || fnComponentMatch[2];
        violations.push({
          lens: "12",
          severity: "🟠",
          file: `${relPath}:${lineNum}`,
          msg: `Props del componente "${compName}" tipadas inline con objeto anónimo. Definir "type ${compName}Props = { ... }" nombrado`,
        });
      }
    }

    const fullTextMatches = content.matchAll(/(?:export\s+(?:default\s+)?)?(?:function\s+([A-Z]\w*)|(?:const|let)\s+([A-Z]\w*)\s*=\s*(?:React\.)?(?:memo|forwardRef)?\(?(?:async\s*)?)\s*\(\s*\{[\s\S]*?\}\s*:\s*\{/g);
    for (const match of fullTextMatches) {
      const compName = match[1] || match[2];
      const matchIndex = match.index;
      const lineNum = content.slice(0, matchIndex).split("\n").length;
      const alreadyReported = violations.some((v) => v.file === `${relPath}:${lineNum}` && v.msg.includes(compName));
      if (!alreadyReported) {
        violations.push({
          lens: "12",
          severity: "🟠",
          file: `${relPath}:${lineNum}`,
          msg: `Props del componente "${compName}" tipadas inline con objeto anónimo. Definir "type ${compName}Props = { ... }" nombrado`,
        });
      }
    }
  }

  return violations;
}
