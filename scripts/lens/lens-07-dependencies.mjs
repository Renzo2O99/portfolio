import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { getModDir, MODULES_DIR, ROOT, findFiles, readFileSafe, getRelativePath, getModules, isLibrary, getModuleOverride } from "./shared.mjs";

const ALLOW_DEEP_INFRA = ["database/schema", "database/tables/note.schema", "media-providers/cloudinary"];

/**
 * Un archivo *.action.ts con directiva "use server" es una frontera RPC oficial
 * de Next.js: importarlo desde cliente genera referencias remotas, no inclusión en bundle.
 */
function isUseServerAction(importSpec, fromFile) {
  const base = importSpec.replace(/\.(ts|tsx|js|jsx)$/, "");
  const candidates = [
    join(dirname(fromFile), base),
    join(ROOT, "src", base.replace(/^@\//, "")),
  ];
  for (const candidate of candidates) {
    for (const ext of ["", ".ts", ".tsx"]) {
      const path = candidate + ext;
      if (existsSync(path)) {
        return /^\s*["']use server["'];?\s*$/m.test(readFileSafe(path) ?? "");
      }
    }
  }
  return false;
}

function lens07AppImports() {
  const violations = [];
  const appDir = join(ROOT, "src/app");
  const files = findFiles(appDir, /\.(ts|tsx)$/);
  const modules = getModules();

  for (const f of files) {
    const content = readFileSafe(f);
    const relPath = getRelativePath(f);
    const hasException = /\/\/\s*EXCEPTION/.test(content);
    if (hasException) continue;

    const moduleImports = content.matchAll(/from ["']@\/modules\/([^"']+)["']/g);
    for (const m of moduleImports) {
      const fullPath = m[1].replace(/\.(ts|tsx)$/, "").replace(/^\.\//, "");
      const parts = fullPath.split("/");
      const modName = parts[0];
      if (!modules.includes(modName)) continue;
      if (parts.length === 1) continue;
      if (parts.length === 2 && ["server", "server-ui"].includes(parts[1])) continue;
      if (relPath.includes("(public)/cards/page")) continue;
      violations.push({ lens: "07", severity: "🟠", file: relPath, msg: `Import directo a ruta interna de módulo "${modName}" (ruta: ${fullPath}). Usar @/${modName} (API pública) o inyectar via Slot/Prop` });
    }

    const layerImports = content.matchAll(/from ["']@\/(common|shared|infrastructure)\/([^"']+)["']/g);
    for (const m of layerImports) {
      const layer = m[1];
      const importPath = m[2];
      if (importPath.startsWith("index")) continue;
      const barrelPath = join(ROOT, "src", layer, "index.ts");
      if (!existsSync(barrelPath)) continue;
      const barrelContent = readFileSafe(barrelPath);
      const targetFile = importPath.replace(/\.(ts|tsx)$/, "").split("/").pop();
      const isInBarrel = barrelContent.includes(targetFile);
      if (isInBarrel) {
        violations.push({ lens: "07", severity: "🟠", file: relPath, msg: `Import directo a ruta interna de ${layer}/ (${importPath}). Usar @/${layer} (barrel)` });
      } else {
        violations.push({ lens: "07", severity: "🟠", file: relPath, msg: `Import directo a ruta interna de ${layer}/ (${importPath}) NO exportada en @/${layer}/index.ts. Añadir export al index o mover a shared/` });
      }
    }
  }

  return violations;
}

export default function lens07(modName) {
  const violations = [];
  const lib = isLibrary(modName);
  const modPath = getModDir(modName);
  const files = findFiles(modPath, /\.(ts|tsx)$/);

  for (const f of files) {
    const content = readFileSafe(f);
    const relPath = getRelativePath(f);
    const segments = relPath.split(/[/\\]/);
    const inHooks = segments.includes("hooks");
    const inLib = segments.includes("lib");
    const inParts = segments.includes("parts");
    const inForms = segments.includes("forms");
    const isClient = content.includes('"use client"');
    const hasException = /\/\/\s*EXCEPTION/.test(content);
    const isServerOnly = content.includes('"server-only"') || content.includes("'server-only'");

    if (hasException || isServerOnly) continue;

    if (!lib) {
      const internalImports = content.matchAll(/from ["']@\/(shared|infrastructure|common)\/(.+?)["']/g);
      for (const m of internalImports) {
        const layer = m[1];
        const importPath = m[2];
        if (layer === "infrastructure" && ALLOW_DEEP_INFRA.some(p => importPath.startsWith(p))) continue;
        // Server Actions deben importar de @/infrastructure/server (barrel server-only) — es frontera RPC válida, no usar cliente barrel
        if (layer === "infrastructure" && (importPath === "server" || importPath.startsWith("server/") || importPath === "server.ts" || importPath === "server-ui" || importPath.startsWith("server-ui/"))) continue;
        const barrelPath = join(ROOT, "src", layer, "index.ts");
        if (!existsSync(barrelPath)) continue;
        if (importPath.startsWith("index")) continue;
        const barrelContent = readFileSafe(barrelPath);
        const targetFile = importPath.replace(/\.(ts|tsx)$/, "").split("/").pop();
        const isInBarrel = barrelContent.includes(targetFile);
        if (isInBarrel) {
          violations.push({ lens: "07", severity: "🟠", file: relPath, msg: `Import directo a ruta interna de ${layer}/. Usar @/${layer} (barrel)` });
        }
      }
    }

    const appImports = content.matchAll(/from ["']@\/app\/(.+?)["']/g);
    for (const m of appImports) {
      violations.push({ lens: "07", severity: "🔴", file: relPath, msg: "Import desde capa superior app/. Violación DAG. Inyectar via Slot/Prop desde capa app/" });
    }

    const crossModuleImports = content.matchAll(/from ["']@\/modules\/([^"']+)["']/g);
    for (const m of crossModuleImports) {
      const fullPath = m[1].replace(/\.(ts|tsx)$/, "").replace(/^\.\//, "");
      const [otherMod, ...rest] = fullPath.split("/");
      if (otherMod !== modName) {
        const isPublicApi = rest.length === 0 || (rest.length === 1 && ["index", "server", "server-ui"].includes(rest[0]));
        if (isPublicApi) continue;
        violations.push({ lens: "07", severity: "🔴", file: relPath, msg: `Import directo a módulo hermano "${otherMod}" (ruta interna ${fullPath}). Viola DAG. Usar API pública (index/server/server-ui) o Slot Injection` });
      }
    }

    if (isClient) {
      const serverImports = [...content.matchAll(/from\s+["']([^"']*\/server(?:-ui)?)["']/g)];
      for (const m of serverImports) {
        const spec = m[1];
        const isServerUi = spec.endsWith("/server-ui");
        if (isServerUi) {
          violations.push({ lens: "07", severity: "🔴", file: relPath, msg: "Fuga de servidor: archivo \"use client\" importa de server-ui — Server Components no pueden ir al bundle" });
          continue;
        }
        // Verificar si `server` es barrel 100% de Server Actions (RPC seguro, no fuga)
        let isSafeBarrel = false;
        const base = spec.replace(/\.(ts|tsx|js|jsx)$/, "");
        const candidates = [join(dirname(f), base), join(ROOT, "src", base.replace(/^@\//, ""))];
        for (const candidate of candidates) {
          for (const ext of ["", ".ts", ".tsx"]) {
            const path = candidate + ext;
            if (existsSync(path)) {
              const serverContent = readFileSafe(path) ?? "";
              const reExports = [...serverContent.matchAll(/from\s+["']([^"']+)["']/g)].map((x) => x[1]);
              if (reExports.length === 0) break;
              isSafeBarrel = reExports.every((inner) => isUseServerAction(inner, path));
              break;
            }
          }
          if (isSafeBarrel) break;
        }
        if (!isSafeBarrel) {
          violations.push({ lens: "07", severity: "🔴", file: relPath, msg: "Fuga de servidor: archivo \"use client\" importa de server — código servidor se filtra al bundle" });
        }
      }
      const actionImport = content.match(/from\s+["']([^"']*\.action(?:\.\w+)?)["']/);
      if (actionImport && !isUseServerAction(actionImport[1], f)) {
        violations.push({ lens: "07", severity: "🔴", file: relPath, msg: "Fuga de servidor: archivo \"use client\" importa Server Action sin \"use server\" — usar hook o prop injection" });
      }
    }

    if ((inHooks || inLib) && !inParts && !inForms) {
      const uiImport = content.match(/from\s+["'](?:\.\.\/)+ui\//);
      if (uiImport) {
        violations.push({ lens: "07", severity: "🟠", file: relPath, msg: "DAG Intra-Módulo: hooks/lib no debe importar de ui/. Mover lógica a lib/ o models/" });
      }
    }

    if (inLib) {
      const redundantLibImport = content.match(/from\s+["']\.\.\/lib\//);
      if (redundantLibImport) {
        violations.push({ lens: "07", severity: "🟡", file: relPath, msg: "Import redundante: archivo dentro de lib/ importa ../lib/ (mismo directorio). Usar ruta relativa ./ " });
      }
    }

    if (inParts) {
      const formsImport = content.match(/from\s+["'](?:\.\.\/)+forms\//);
      if (formsImport) {
        violations.push({ lens: "07", severity: "🟠", file: relPath, msg: "Dependencia inversa: parts/ importa de forms/. parts/ no debe depender de forms/" });
      }
    }

    if (content.match(/import\s+\*\s+as\s+/)) {
      // EXCEPCIÓN documentada: drizzleAdapter y drizzle() cliente requieren namespace `schema`
      // para navegar `references()` (metadata del módulo original, no se puede reempaquetar).
      const importAsMatch = content.match(/import\s+\*\s+as\s+(\w+)\s+from\s+["']([^"']+)["']/);
      if (importAsMatch) {
        const importName = importAsMatch[1];
        const importPath = importAsMatch[2];
        if (importName === "schema" && (importPath.includes("user.schema") || importPath.endsWith("./schema") || importPath.endsWith("/schema"))) {
          const override = getModuleOverride(modName, "07");
          if (override && (override["drizzle-schema-namespace"] || override["better-auth-schema-namespace"])) {
            // Documentado en MODULE_OVERRIDES — skip
          } else {
            violations.push({ lens: "07", severity: "🟡", file: relPath, msg: "import * as schema detectado. Drizzle requiere namespace (ver MODULE_OVERRIDES)" });
          }
        } else {
          violations.push({ lens: "07", severity: "🟡", file: relPath, msg: "import * as X detectado. Usar named imports para tree-shaking" });
        }
      } else {
        violations.push({ lens: "07", severity: "🟡", file: relPath, msg: "import * as X detectado. Usar named imports para tree-shaking" });
      }
    }
  }

  return violations;
}

/**
 * Matriz de aristas módulo×módulo y ciclos bidireccionales.
 *
 * Añadido 2026-10-05 tras la auditoría: los 4 ciclos reales
 * (layout-manager⇄notebooks, layout-manager⇄notes, notebooks⇄trash,
 * notes⇄trash) NO los detectaba ninguna regla previa. Requiere ver todos los
 * módulos a la vez, así que no puede vivir en el export por módulo.
 *
 * Violación de lens-07 spec §4 "Dependencias Circulares".
 */
function lens07CycleGraph() {
  const violations = [];
  const modules = getModules();
  const edges = new Map();

  const addEdge = (from, to, relPath) => {
    if (from === to) return;
    if (!edges.has(from)) edges.set(from, new Map());
    const fromMap = edges.get(from);
    if (!fromMap.has(to)) fromMap.set(to, { files: [], count: 0 });
    const edge = fromMap.get(to);
    edge.count += 1;
    if (edge.files.length < 3 && !edge.files.includes(relPath)) edge.files.push(relPath);
  };

  for (const from of modules) {
    for (const file of findFiles(getModDir(from), /\.(ts|tsx)$/)) {
      const content = readFileSafe(file);
      if (!content) continue;
      const relPath = getRelativePath(file);
      const specifiers = [
        ...[...content.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]),
        ...[...content.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]),
      ];
      for (const spec of specifiers) {
        const target = spec.match(/^@\/modules\/([^/]+)(?:\/|$)/)?.[1];
        if (target) addEdge(from, target, relPath);
      }
    }
  }

  for (const [from, fromMap] of edges) {
    for (const [to, forward] of fromMap) {
      const back = edges.get(to)?.get(from);
      if (!back) continue;
      // El par se reporta una vez, desde el nombre que ordena primero.
      if (from > to) continue;
      violations.push({
        lens: "07",
        severity: "🔴",
        file: `modules/${from}, ${to}`,
        msg:
          `Ciclo de imports entre módulos hermanos (spec §4). ` +
          `${from} → ${to}: ${forward.count} import(s) (ej: ${forward.files[0] ?? "?"}); ` +
          `${to} → ${from}: ${back.count} import(s) (ej: ${back.files[0] ?? "?"}). ` +
          `Romper con Slot Injection desde app/, moviendo la lógica compartida a shared/, o invirtiendo la dependencia.`,
      });
    }
  }

  return violations;
}

/**
 * Import profundo a un símbolo que el barrel del módulo destino NO exporta.
 *
 * Añadido 2026-10-05: `NoteEditor.tsx` importa
 * `@/modules/editor/store/use-drawing-mode-request.store` y ese store no está
 * en ninguno de los 3 barrels del módulo. Es peor que un salto de barrel
 * normal: el símbolo no existe para los consumidores.
 *
 * El `file` se reporta con ambos módulos para que `filterByModule` del runner
 * lo asigne a los dos lados del problema.
 */
function lens07DeepImportNotExported() {
  const violations = [];
  const modules = getModules();

  const barrelContent = new Map();
  for (const target of modules) {
    if (barrelContent.has(target)) continue;
    barrelContent.set(
      target,
      ["index.ts", "server.ts", "server-ui.ts"]
        .map((name) => join(MODULES_DIR, target, name))
        .filter(existsSync)
        .map(readFileSafe)
        .join("\n"),
    );
  }

  for (const from of modules) {
    for (const file of findFiles(getModDir(from), /\.(ts|tsx)$/)) {
      const content = readFileSafe(file);
      if (!content) continue;
      const relPath = getRelativePath(file);
      for (const match of content.matchAll(/from\s+["']([^"']+)["']/g)) {
        const parsed = match[1].match(/^@\/modules\/([^/]+)\/(.+)$/);
        if (!parsed) continue;
        const [, target, rest] = parsed;
        if (target === from) continue;
        if (rest === "index" || rest.endsWith("/index")) continue;
        if (!/^(hooks|ui|lib|store|actions|models|internal|config|services|layout)\//.test(rest)) continue;

        // IMPORT_RE solo captura la clausula `from "..."`, asi que hay que mirar
        // HACIA ATRAS para recuperar el `import { simbolos }` que la precede.
        const clauseStart = content.lastIndexOf("\n", match.index);
        const head = content.slice(Math.max(0, clauseStart + 1), match.index + match[0].length);
        const namedMatch = head.match(/import\s*(?:type\s*)?\{([^}]*)\}/);
        if (!namedMatch) continue;

        const symbols = namedMatch[1]
          .split(",")
          .map((entry) => entry.split(/\s+as\s+/)[0].trim().replace(/^type\s+/, ""))
          .filter(Boolean);
        if (symbols.length === 0) continue;

        const barrel = barrelContent.get(target) ?? "";
        const missing = symbols.filter((symbol) => {
          const escaped = symbol.replace(/[$]/g, "\\$");
          return !new RegExp(`\\b${escaped}\\b`).test(barrel);
        });

        if (missing.length === symbols.length) {
          const lineNum = content.slice(0, match.index).split("\n").length;
          violations.push({
            lens: "07",
            severity: "🔴",
            file: `${from}, ${target}`,
            msg:
              `Import doblemente inválido a \`${match[1]}\` (${relPath}:${lineNum}): salta el barrel de ` +
              `\`${target}/\` Y ninguno de sus símbolos (${missing.join(", ")}) está exportado por ` +
              `index/server/server-ui. Exportarlo en ${target}/index.ts y consumir \`@/modules/${target}\``,
          });
        }
      }
    }
  }

  return violations;
}

/**
 * Guarda de aciclidad de la base del DAG (app → modules → common → shared).
 *
 * `common/` PUEDE importar de `shared/` (singletons estables + utils sin estado).
 * Lo prohibido es que `shared/` —hoja pura— importe hacia arriba: @/common,
 * @/modules (valor) o @/infrastructure. `import type` desde modules/ sí permitido.
 * `common/` → @/modules/* (valor) sigue prohibido: la composición vive en app/.
 * lens07() corre por módulo e ignora libs; esto es global para cubrirlas.
 */
function lens07LibraryImportsModules() {
  const violations = [];
  const checkDirs = [
    { lib: "common", allowModules: false, allowCommon: true },
    { lib: "shared", allowModules: false, allowCommon: false },
  ];
  for (const { lib, allowCommon } of checkDirs) {
    const libDir = join(ROOT, "src", lib);
    for (const f of findFiles(libDir, /\.(ts|tsx)$/)) {
      const content = readFileSafe(f);
      if (!content) continue;
      const relPath = getRelativePath(f);
      if (/\/\/\s*EXCEPTION/.test(content)) continue;
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isTypeOnly = /^\s*import\s+type\b/.test(line);
        if (line.includes("@/modules/") && !isTypeOnly) {
          violations.push({
            lens: "07",
            severity: "🔴",
            file: `${relPath}:${i + 1}`,
            msg: `Fuga DAG: "${lib}/" importa valor de @/modules/*. Solo import type permitido. Mover el consumidor a app/`,
          });
        }
        if (!allowCommon && line.includes("@/common/")) {
          violations.push({
            lens: "07",
            severity: "🔴",
            file: `${relPath}:${i + 1}`,
            msg: `Ciclo potencial: "shared/" importa de @/common/*. shared/ es hoja pura (react/third-party + tipos). Invertir: mover lo compartido a shared/ o el consumidor a common/`,
          });
        }
      }
    }
  }
  return violations;
}

export { lens07AppImports, lens07CycleGraph, lens07DeepImportNotExported, lens07LibraryImportsModules };
