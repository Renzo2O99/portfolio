import { existsSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { BLACKLIST_DIRS, countTsxInDir, findFiles, findUiDirs, getModDir, getModuleOverride, getRelativePath, isLibrary, listSubdirs, MODULES_DIR, REQUIRED_DIRS, REQUIRED_FILES, ROOT, readFileSafe, UI_FILE_COUNT_THRESHOLD, UI_MAX_DEPTH, UI_SEMANTIC_DIRS } from "./shared.mjs";

/**
 * Lens 01 — Topografía (Estructura, Brújula UI, Carpetas prohibidas)
 *
 * Reglas derivadas de:
 *   - 00-role.md §Fase 1 + 02-nomenclature.md (carpetas obligatorias, Brújula UI)
 *   - 04-code.md §Separación de utilidades (lib/ dominio vs *.util.ts puro)
 *   - 13-implementation-methodology.md (separar `ui/forms/` y `ui/parts/`)
 *
 * Filosofía aplicada (sin `.gitkeep`):
 *   1. Las carpetas obligatorias que NO aplican al módulo se documentan como
 *      EXCEPTION en `index.ts` con PLAN + TIMELINE.
 *   2. `ui/` NUNCA tiene archivos `.tsx` directos: siempre bajo `ui/<feature>/`.
 *   3. `ui/<feature>/` con >5 archivos directos → subdividir por feature.
 *   4. `ui/parts/` con >5 archivos → `ui/parts/<subfeature>/`.
 *   5. Profundidad máxima dentro de `ui/`: 2 niveles (feature + sub).
 *   6. `forms/`, `parts/`, `cards/`, etc. son carpetas de Brújula, no features.
 *   7. Un archivo = un componente principal (complemento de lens 29).
 */

export default function lens01(modName) {
  if (getModuleOverride(modName, "01") === true) return [];
  const violations = [];
  const modPath = getModDir(modName);
  const lib = isLibrary(modName);
  const modOverride = getModuleOverride(modName, "01");
  const requiredOverride = modOverride?.required || {};
  const forbiddenOverride = modOverride?.forbidden || {};
  const excluded = [...Object.keys(forbiddenOverride), ...getDocumentedExceptions(modName)];

  // ── FASE 1: Carpetas obligatorias (mod-aware) ──────────────────────────
  if (!lib) {
    const required = new Set([...REQUIRED_DIRS, ...Object.keys(requiredOverride)]);
    for (const dir of required) {
      if (excluded.includes(dir)) continue;
      if (!existsSync(join(modPath, dir))) {
        violations.push({
          lens: "01",
          severity: "🟡",
          file: `${modName}/`,
          msg: `Carpeta obligatoria faltante: ${dir}/. Crear o documentar EXCEPTION en index.ts`,
        });
      }
    }

    // ── FASE 2: Carpetas prohibidas en raíz de módulo ──────────────────
    for (const entry of readdirSync(modPath, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (BLACKLIST_DIRS.includes(entry.name)) {
        violations.push({
          lens: "01",
          severity: "🔴",
          file: `${modName}/${entry.name}/`,
          msg: `Carpeta prohibida en raíz: ${entry.name}. Usar nombres semánticos (lib/, store/, etc.) o eliminar`,
        });
      }
      if (forbiddenOverride[entry.name] === true) {
        violations.push({
          lens: "01",
          severity: "🟠",
          file: `${modName}/${entry.name}/`,
          msg: `Carpeta no permitida en este módulo según override (MOD 01). Eliminar`,
        });
      }
    }
  }

  // ── FASE 3: Archivos de API pública obligatorios ───────────────────────
  if (!lib) {
    for (const file of REQUIRED_FILES) {
      const fileName = file.replace(".ts", "");
      if (excluded.includes(fileName)) continue;
      if (forbiddenOverride[fileName] === true) continue;
      if (!existsSync(join(modPath, file))) {
        violations.push({
          lens: "01",
          severity: "🟡",
          file: `${modName}/`,
          msg: `Falta API pública: ${file}`,
        });
      }
    }
  }

  // ── FASE 4: Barrel files internos prohibidos ───────────────────────────
  for (const entry of readdirSync(modPath, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === "ui") continue;
    const indexPath = join(modPath, entry.name, "index.ts");
    if (existsSync(indexPath) && !lib) {
      violations.push({
        lens: "01",
        severity: "🟡",
        file: `${modName}/${entry.name}/index.ts`,
        msg: "Barrel file interno prohibido. Solo debe haber index.ts en raíz del módulo",
      });
    }
  }

  // ── FASE 5: Stores con sufijo correcto y ubicación correcta ───────────
  if (!lib) {
    const stores = findFiles(join(modPath, "store"), /\.store\.ts$/);
    for (const store of stores) {
      const name = store.split(/[/\\]/).pop();
      if (!name.startsWith("use-")) {
        violations.push({
          lens: "01",
          severity: "🟡",
          file: getRelativePath(store),
          msg: `Store sin prefijo use-: ${name}. Renombrar a use-${name}.store.ts`,
        });
      }
    }

    const storesOutsideDir = findFiles(modPath, /\.store\.ts$/).filter((f) => !f.includes(`${modPath}${sep}store${sep}`));
    for (const store of storesOutsideDir) {
      violations.push({
        lens: "01",
        severity: "🟠",
        file: getRelativePath(store),
        msg: `Store fuera de store/: ${store.split(sep).pop()}. Mover a store/`,
      });
    }

    // ── FASE 6: Archivos de config con sufijo *.config.ts ──────────────
    const configFiles = findFiles(modPath, /(config|setup|client)\.ts$/);
    for (const f of configFiles) {
      const name = f.split(/[/\\]/).pop();
      if (!name.endsWith(".config.ts")) {
        violations.push({
          lens: "01",
          severity: "🟡",
          file: getRelativePath(f),
          msg: `Archivo de config sin sufijo .config.ts: ${name}. Renombrar`,
        });
      }
    }

    // ── FASE 7: Utilidades puras con sufijo *.util.ts ──────────────────
    const utilFiles = findFiles(modPath, /(util|helper|utils)\.ts$/);
    for (const f of utilFiles) {
      const name = f.split(/[/\\]/).pop();
      if (!name.endsWith(".util.ts")) {
        violations.push({
          lens: "01",
          severity: "🟡",
          file: getRelativePath(f),
          msg: `Utilidad sin sufijo .util.ts: ${name}. Renombrar`,
        });
      }
    }
  }

  // ── FASE 7b: Cajón de sastre en lib/ (aplica también a librerías) ─────
  // FASE 7 no corre en libs (!lib): por eso shared/lib/utils.ts pasaba.
  // Un lib/*.ts con basename catch-all mezcla concerns → dividir en *.util.ts.
  {
    const CATCH_ALL = new Set(["utils.ts", "util.ts", "helpers.ts", "helper.ts", "misc.ts", "common.ts", "shared.ts"]);
    const libFiles = findFiles(join(modPath, "lib"), /\.ts$/);
    for (const f of libFiles) {
      const name = f.split(/[/\\]/).pop();
      if (CATCH_ALL.has(name)) {
        violations.push({
          lens: "01",
          severity: "🟠",
          file: getRelativePath(f),
          msg: `Cajón de sastre en lib/: ${name} mezcla concerns (cn, random, fechas…). Dividir en *.util.ts por propósito`,
        });
      }
    }
  }

  // ── FASE 5b: hooks/ solo contiene hooks (y viceversa) ────────────────
  // Aplica a módulos Y librerías: aquí vivían LandingScrollProvider,
  // WorkScrollProvider y menuContext (componentes/contexts en hooks/).
  {
    const allTsFiles = findFiles(modPath, /\.tsx?$/);
    for (const f of allTsFiles) {
      const segments = f.split(/[/\\]/);
      const name = segments.pop();
      const inHooks = segments.includes("hooks");
      const inUi = segments.includes("ui");
      const relPath = getRelativePath(f);
      if (name === "index.ts") continue;

      if (inHooks && !/^use-[a-z0-9-]+\.ts$/.test(name)) {
        const hint = name.endsWith(".tsx")
          ? "es un componente: mover a ui/ o providers/"
          : /context/i.test(name)
            ? "es un context: colocalizar en providers/ junto a su provider"
            : /\.util\.ts$/.test(name)
              ? "es una utilidad: mover a lib/"
              : "no sigue use-kebab-case: renombrar o mover según su rol";
        violations.push({
          lens: "01",
          severity: "🟠",
          file: relPath,
          msg: `No-hook en hooks/: ${name} ${hint}`,
        });
      }

      if (inUi && /^use-[a-z0-9-]+\.tsx?$/.test(name) && !/\.store\.ts$/.test(name) && !segments.includes("internal")) {
        violations.push({
          lens: "01",
          severity: "🟡",
          file: relPath,
          msg: `Hook en ui/: ${name}. Mover a hooks/`,
        });
      }
    }
  }

  // ── FASE 8: Brújula UI — estructura semántica recursiva ───────────────
  if (!lib) {
    const uiDir = join(modPath, "ui");
    const allUiDirs = findUiDirs(modPath);
    for (const uiPath of allUiDirs) {
      checkUiDirectory(uiPath, modPath, modName, violations, 0);
    }
    // uiDir debería estar en allUiDirs, pero por seguridad:
    if (existsSync(uiDir) && !allUiDirs.includes(uiDir)) {
      checkUiDirectory(uiDir, modPath, modName, violations, 0);
    }
  }

  // ── FASE 9: Naming kebab-case en componentes UI ───────────────────────
  // Solo aplica dentro de ui/ (componentes). Los .tsx fuera de ui/
  // (ej: lib/*-texts.constants.tsx) usan kebab-case por constitución 02.
  if (!lib) {
    const uiDirs = findUiDirs(modPath);
    const tsxFiles = uiDirs.flatMap((d) => findFiles(d, /\.tsx$/));
    for (const f of tsxFiles) {
      const name = f.split(/[/\\]/).pop();
      if (!/^[A-Z][A-Za-z0-9]*\.tsx$/.test(name)) {
        violations.push({
          lens: "01",
          severity: "🟡",
          file: getRelativePath(f),
          msg: `Componente con nombre kebab-case: ${name}. Usar PascalCase.tsx (${toPascalCase(name.replace(/\.tsx$/, ""))}.tsx)`,
        });
      }
    }
  }

  // ── FASE 10: Anti-patrones de interface/exports ───────────────────────
  for (const f of findFiles(modPath, /\.(ts|tsx)$/)) {
    const content = readFileSafe(f);
    const codeOnly = content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    if (/interface\s+I[A-Z]/.test(codeOnly)) {
      violations.push({
        lens: "01",
        severity: "🟡",
        file: getRelativePath(f),
        msg: "Interfaz con prefijo I (IUser). Usar nombre sin prefijo I",
      });
    }
    if (/export\s+default\s+/.test(codeOnly) && !lib) {
      violations.push({
        lens: "01",
        severity: "🟡",
        file: getRelativePath(f),
        msg: "export default detectado. Usar export nombrado",
      });
    }
  }

  return violations;
}

/**
 * Verifica Brújula UI en un directorio `ui/<feature>/` o `ui/`.
 * @param uiPath  Ruta absoluta al directorio a verificar
 * @param modPath Ruta absoluta al módulo raíz
 * @param modName Nombre del módulo
 * @param violations Array acumulador
 * @param depth    Profundidad desde `ui/` (0 = ui/, 1 = ui/feature/, 2 = ui/feature/sub/)
 * @param relPrefix Prefijo relativo para mensajes (si no es `ui/`)
 */
function checkUiDirectory(uiPath, modPath, modName, violations, depth) {
  // depth: 0 = ui/, 1 = ui/<feature>/, 2 = ui/<feature>/<bruluja>/, 3 = ui/<feature>/<bruluja>/<feature>/
  const maxDepth = getModuleOverride(modName, "01", "ui-max-depth") ?? UI_MAX_DEPTH;
  if (depth > maxDepth) {
    const rel = relative(modPath, uiPath).replace(/\\/g, "/");
    violations.push({
      lens: "01",
      severity: "🟠",
      file: `${modName}/${rel}/`,
      msg: `Profundidad >${maxDepth} niveles en ui/ (${rel}). Aplanar: máximo ui/<feature>/<bruluja>/`,
    });
    return;
  }

  const directFiles = countTsxInDir(uiPath);
  const subdirs = listSubdirs(uiPath);
  const rel = relative(modPath, uiPath).replace(/\\/g, "/");
  const dirName = uiPath.split(/[/\\]/).pop();
  const isBruluja = UI_SEMANTIC_DIRS.includes(dirName);
  const isRoot = depth === 0;

  // Regla A: archivos .tsx directos solo en `ui/<feature>/<bruluja>/` (depth 2) o más
  if (directFiles > 0) {
    if (isRoot) {
      violations.push({
        lens: "01",
        severity: "🟡",
        file: `${modName}/${rel}/`,
        msg: `${rel}/ tiene ${directFiles} archivo(s) .tsx directos. Mover a ui/<feature>/<bruluja>/ (Brújula UI)`,
      });
    } else if (depth === 1 && !isBruluja) {
      // ui/<feature>/ — los .tsx deben estar en subcarpeta Brújula
      const suggestions = UI_SEMANTIC_DIRS.map((d) => `ui/<feature>/${d}/`).join(", ");
      violations.push({
        lens: "01",
        severity: "🟡",
        file: `${modName}/${rel}/`,
        msg: `${rel}/ tiene ${directFiles} archivo(s) .tsx directos. Mover a subcarpeta Brújula (${suggestions})`,
      });
    }
    // depth 1 + isBruluja (parts, forms, cards...) → OK tener .tsx directos
    // depth 2+ → siempre OK
  }

  // Regla B: >5 archivos en subcarpeta → subdividir
  if (directFiles > UI_FILE_COUNT_THRESHOLD) {
    violations.push({
      lens: "01",
      severity: "🟡",
      file: `${modName}/${rel}/`,
      msg: `${rel}/ con ${directFiles} archivos .tsx (>${UI_FILE_COUNT_THRESHOLD}). Subdividir por subfeature`,
    });
  }

  // Regla C: a profundidad 1, el nombre debe ser feature libre (OK).
  //         A profundidad 2, debe ser Brújula (parts, forms, cards...).
  //         A profundidad 3+, es subfeature libre (OK) pero ya excedió UI_MAX_DEPTH.
  for (const d of subdirs) {
    const fullSub = join(uiPath, d);
    if (depth === 1 && !UI_SEMANTIC_DIRS.includes(d)) {
      // ui/<feature>/<d>/ → d debe ser Brújula (salvo override ui-subfeature)
      const allowSubfeature = getModuleOverride(modName, "01", "ui-subfeature");
      if (!allowSubfeature) {
        violations.push({
          lens: "01",
          severity: "🟠",
          file: `${modName}/${rel}/${d}/`,
          msg: `Subcarpeta "${d}" a profundidad 2 (dentro de feature) debe ser Brújula UI: ${UI_SEMANTIC_DIRS.join("|")}`,
        });
      }
    }
    checkUiDirectory(fullSub, modPath, modName, violations, depth + 1);
  }
}

function toPascalCase(name) {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Lee el bloque EXCEPTION documentado en el index.ts del módulo
 * y extrae las carpetas excluidas (formato: "Carpeta X/").
 */
function getDocumentedExceptions(modName) {
  const indexPath = getModDir(modName, "index.ts");
  if (!existsSync(indexPath)) return [];

  const lines = readFileSafe(indexPath).split("\n");
  const excludedDirs = [];

  for (let i = 0; i < lines.length; i++) {
    if (!/\/\/\s*EXCEPTION\s*:/.test(lines[i])) continue;

    const nextText = lines.slice(i + 1, i + 12).join(" ");
    const hasPlan = /\/\/\s*PLAN\s*:/.test(nextText);
    const hasTimeline = /\/\/\s*TIMELINE\s*:/.test(nextText);
    if (!hasPlan || !hasTimeline) continue;

    const dirMatches = lines[i].match(/\b([a-z][a-z-]+)\/(?=\s|[.,:)]|$)/g) || [];
    for (const dir of dirMatches) {
      const clean = dir.replace(/[/:.,)]/g, "").trim();
      if (REQUIRED_DIRS.includes(clean) && !excludedDirs.includes(clean)) {
        excludedDirs.push(clean);
      }
    }
  }

  return excludedDirs;
}

export function lens01Global() {
  const violations = [];
  const scriptsDir = join(ROOT, "scripts");
  if (!existsSync(scriptsDir)) return violations;

  const entries = readdirSync(scriptsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) continue;
    if (entry.name.endsWith(".ts") && !entry.name.endsWith(".script.ts")) {
      violations.push({
        lens: "01",
        severity: "🟡",
        file: `scripts/${entry.name}`,
        msg: `Script sin sufijo .script.ts: ${entry.name}. Renombrar`,
      });
    }
  }

  // ── 2ª pata FASE 7b: mismo *.util.ts en 2+ sitios → centralizar en shared/lib/
  // src/lib (canónico shadcn, components.json → @/lib/utils) queda exento: es del CLI.
  {
    const byName = new Map();
    const scopes = ["modules", "shared", "common", "app"].map((s) => join(ROOT, "src", s));
    for (const scope of scopes) {
      if (!existsSync(scope)) continue;
      for (const f of findFiles(scope, /\.util\.ts$/)) {
        const name = f.split(/[/\\]/).pop();
        if (!byName.has(name)) byName.set(name, []);
        byName.get(name).push(getRelativePath(f));
      }
    }
    for (const [name, files] of byName) {
      const owners = new Set(files.map((p) => p.split("/").slice(0, 3).join("/")));
      if (owners.size >= 2) {
        violations.push({
          lens: "01",
          severity: "🟡",
          file: files.join(", "),
          msg: `Utilidad duplicada "${name}" en ${owners.size} sitios. Centralizar en src/shared/lib/ y re-exportar o importar de ahí`,
        });
      }
    }
  }

  return violations;
}
