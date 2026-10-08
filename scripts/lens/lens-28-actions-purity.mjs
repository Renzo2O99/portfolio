import { findFiles, getModDir, getModuleOverride, getRelativePath, readFileSafe } from "./shared.mjs";

/**
 * Lens 28 — Pureza de Actions (FSD + SRP)
 *
 * Cada archivo en `actions/*.action.ts` DEBE contener ÚNICAMENTE:
 *   - Directiva "use server"
 *   - Imports (Zod schemas, db, auth, constants, lib pura)
 *   - 1..N Server Actions exportadas (export async function verbNoun)
 *   - Re-exports de tipos derivados si aplica
 *
 * PROHIBIDO en actions:
 *   - Funciones helper locales (function foo / const foo = (...) =>)
 *     aunque sean puras: extraer a `lib/*.util.ts` (puras) o `lib/*.ts` (dominio).
 *   - Constantes de configuración inline que no sean schemas.
 *   - Lógica de negocio que crezca >15 líneas sin extraer.
 *
 * Razón: actions infladas mezclan orquestación (Validar→Autorizar→Ejecutar)
 * con lógica pura, rompen SRP y dificultan testear helpers sin DB.
 * Referencia: constitution/04-code.md §Separación de Utilidades
 */

const ACTION_FILE_RE = /\.action\.ts$/;
const HELPER_FN_RE = /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/gm;
const HELPER_ARROW_RE = /^\s*(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/gm;
const HELPER_CONST_FN_RE = /^\s*const\s+(\w+)\s*=\s*function\s*\(/gm;

function isActionExport(name, content) {
  const exportLine = content.match(new RegExp(`export\\s+(?:async\\s+)?function\\s+${name}\\b`));
  if (!exportLine) return false;
  const idx = content.indexOf(exportLine[0]);
  const before = content.slice(Math.max(0, idx - 500), idx + exportLine[0].length + 200);
  return /safeParse|getAuthUser|safeGetAuthUser|revalidatePath|NextResponse|db\.(query|insert|update|delete)/.test(before) || true;
}

export default function lens28(modName) {
  const violations = [];
  const modPath = getModDir(modName);
  const files = findFiles(modPath, /\.ts$/).filter((f) => ACTION_FILE_RE.test(f));

  for (const f of files) {
    const content = readFileSafe(f);
    if (!content) continue;
    const rel = getRelativePath(f);

    const actions = [...content.matchAll(/^\s*export\s+(?:async\s+)?function\s+(\w+)\s*\(/gm)].map((m) => m[1]);
    const exportedArrows = [...content.matchAll(/^\s*export\s+const\s+(\w+)\s*=\s*(?:async\s*)?\(/gm)].map((m) => m[1]);
    const allActions = new Set([...actions, ...exportedArrows]);

    const candidates = [];

    for (const m of content.matchAll(HELPER_FN_RE)) {
      const name = m[1];
      if (allActions.has(name)) continue;
      if (getModuleOverride(modName, "28", "cache-components-split-helper") && /ForUser$|For$|ForCache$/.test(name)) continue;
      const lineNum = content.slice(0, m.index).split("\n").length;
      const line = content.split("\n")[lineNum - 1] ?? "";
      if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) continue;
      candidates.push({ name, lineNum, kind: "function" });
    }

    for (const m of content.matchAll(HELPER_ARROW_RE)) {
      const name = m[1];
      if (allActions.has(name)) continue;
      if (name.startsWith("use")) continue;
      if (getModuleOverride(modName, "28", "cache-components-split-helper") && /ForUser$|For$|ForCache$/.test(name)) continue;
      const lineNum = content.slice(0, m.index).split("\n").length;
      const line = content.split("\n")[lineNum - 1] ?? "";
      if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) continue;
      if (/^\s*export\s+type\s+/.test(line)) continue;
      candidates.push({ name, lineNum, kind: "arrow" });
    }

    for (const m of content.matchAll(HELPER_CONST_FN_RE)) {
      const name = m[1];
      if (allActions.has(name)) continue;
      if (getModuleOverride(modName, "28", "cache-components-split-helper") && /ForUser$|For$|ForCache$/.test(name)) continue;
      const lineNum = content.slice(0, m.index).split("\n").length;
      candidates.push({ name, lineNum, kind: "const-fn" });
    }

    const seen = new Set();
    for (const c of candidates) {
      if (seen.has(c.name)) continue;
      seen.add(c.name);

      let target;
      let fixHint;
      if (/^(resolve|extract|cleanup|verify|validate|normalize|parse|format|build|create.*Helper)/i.test(c.name)) {
        target = c.name.includes("Cloudinary") || c.name.includes("Pdf") || c.name.includes("Valid") ? "lib/" : "lib/";
        const suffix = /^(resolve|extract|cleanup|verify)/i.test(c.name) ? ".util.ts" : ".ts";
        const kebab = c.name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
        fixHint = `Mover \`${c.name}\` a \`lib/${kebab}${suffix}\` e importar desde allí`;
      } else {
        const kebab = c.name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
        fixHint = `Extraer \`${c.name}\` a \`lib/${kebab}.ts\` (o *.util.ts si es pura)`;
      }

      violations.push({
        lens: "28",
        severity: candidates.length >= 2 ? "🟠" : "🟡",
        file: `${rel}:${c.lineNum}`,
        msg: `Helper local \`${c.name}\` en action file. Actions deben ser puras (solo Validar→Autorizar→Ejecutar). ${fixHint}`,
      });
    }

    const lines = content.split("\n");
    if (lines.length > 150) {
      const helperCount = candidates.length;
      if (helperCount > 0) {
        violations.push({
          lens: "28",
          severity: lines.length > 200 ? "🟠" : "🟡",
          file: rel,
          msg: `Action file con ${lines.length} líneas y ${helperCount} helper(s) local(es). Extraer helpers a lib/ para mantener action <100 líneas (orquestador delgado)`,
        });
      }
    }
  }

  return violations;
}
