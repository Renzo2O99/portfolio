import { findFiles, getModDir, getRelativePath, readFileSafe } from "./shared.mjs";

/**
 * Lens 34 — Inline Object Cast
 * Detecta `as { ... }`, `as unknown as { ... }` o `satisfies { ... }` con tipo objeto inline.
 * Los casts a objetos literales deben usar type alias nombrado (`type Foo = { ... }`)
 * para gritar dominio y permitir reutilización / validación.
 * Permitido: `as Route`, `as unknown as LucideIconMap`, `as ComponentType`, etc. (tipos nombrados).
 * Prohibido: `as { secure_url: string }`, `as { trashDetailOpen?: boolean } | null`, `satisfies { }`
 * Cubre: as/satisfies en línea o con salto de línea, `as unknown as`, intersecciones/uniones (`&`, `|`), readonly, optional.
 */
const INLINE_CAST_RE = /\b(?:as|satisfies)\s+(?:unknown\s+as\s+)?\{[^}]*\}/gs;

export default function lens34(modName) {
  const violations = [];
  const modPath = getModDir(modName);
  const files = findFiles(modPath, /\.(ts|tsx)$/);

  for (const file of files) {
    const content = readFileSafe(file);
    const relPath = getRelativePath(file);

    // Saltar archivos con EXCEPTION global no tiene sentido, verificar por línea
    // Buscar en contenido completo para capturar multilínea (as \n {)
    let match;
    const re = new RegExp(INLINE_CAST_RE, "gs");
    while ((match = re.exec(content)) !== null) {
      const snippet = match[0];
      // Excluir `as const` (no contiene `{`)
      if (/as\s+const\b/.test(snippet)) continue;
      // Calcular línea del match
      const before = content.slice(0, match.index);
      const lineNum = before.split("\n").length;
      const lineContent = content.split("\n")[lineNum - 1] || "";
      // Ignorar si la línea tiene EXCEPTION documentada o es comentario
      if (lineContent.includes("EXCEPTION:")) continue;
      const trimmed = lineContent.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
      // Ignorar tipo mapeado o utilidad legítima: `as { [K in ...` es mapped type, permitir
      if (/\{\s*\[/.test(snippet)) continue;

      violations.push({
        lens: "34",
        severity: "🟡",
        file: relPath,
        line: lineNum,
        msg: `Cast inline a objeto literal \`${snippet.replace(/\s+/g, " ").slice(0, 50)}...\`. Extraer a \`type\` nombrado con dominio`,
      });
    }
  }

  return violations;
}
