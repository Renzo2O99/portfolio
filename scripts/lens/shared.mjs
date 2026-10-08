import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

export const ROOT = new URL("../..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");

export const MODULES_DIR = existsSync(join(ROOT, "src/modules"))
  ? join(ROOT, "src/modules")
  : existsSync(join(ROOT, "modules"))
    ? join(ROOT, "modules")
    : join(ROOT, "components");

export const SHARED_DIR = existsSync(join(ROOT, "src/shared")) ? join(ROOT, "src/shared") : join(ROOT, "lib");
export const INFRA_DIR = existsSync(join(ROOT, "src/infrastructure")) ? join(ROOT, "src/infrastructure") : join(ROOT, "actions");
export const COMMON_DIR = existsSync(join(ROOT, "src/common")) ? join(ROOT, "src/common") : join(ROOT, "components/ui");

/**
 * Carpetas obligatorias en módulos de dominio.
 * `actions/` NO es obligatoria: solo si el módulo tiene Server Actions.
 *  Se documenta como EXCEPTION en `index.ts` cuando aplique.
 */
export const REQUIRED_DIRS = ["hooks", "lib", "models", "store", "ui"];

/**
 * Archivos de API pública obligatorios en la raíz del módulo.
 * `server-ui.ts` solo aplica si el módulo tiene Server Components UI.
 */
export const REQUIRED_FILES = ["index.ts", "server.ts"];

/**
 * Carpetas prohibidas en raíz de módulo o dentro de `ui/`.
 * Razones documentadas en AGENTS.md §2 (lista negra).
 */
export const BLACKLIST_DIRS = ["utils", "helpers", "core", "manager", "controller", "components"];

/**
 * Brújula UI semántica (00-role.md §Fase 1.5, 02-nomenclature.md §2).
 * Cada subcarpeta de `ui/` debe gritar su propósito.
 */
export const UI_SEMANTIC_DIRS = [
  "forms",    // Smart: gestiona estado, llama hooks, coordina flujo
  "parts",    // Dumb: solo props + eventos, sin lógica de negocio
  "cards",    // Variantes visuales de una entidad
  "filters",  // Filtrado, búsqueda, ordenamiento
  "modals",   // Diálogos, drawers, sheets
  "sections", // Server Components para orquestar zonas de página
  "skeletons",// Loading states de la feature
  "shell",    // Orquestadores que se montan en `app/` (max 5 archivos)
  "otps",     // Inputs especializados (auth)
];

/**
 * Umbral de archivos en subcarpeta de `ui/` antes de sugerir subdividir.
 * Si `ui/<feature>/` o `ui/<feature>/parts/` supera este número, mover a
 * `ui/<feature>/<subfeature>/`.
 */
export const UI_FILE_COUNT_THRESHOLD = 5;

/**
 * Profundidad máxima dentro de `ui/`. Estructura ideal:
 *   ui/<feature>/<file>.tsx        (profundidad 1)
 *   ui/<feature>/<sub>/<file>.tsx  (profundidad 2)
 * Prohibido: ui/<feature>/<sub>/<subsub>/<file>.tsx
 */
export const UI_MAX_DEPTH = 2;

/**
 * Directorios que son librerías compartidas, NO módulos de dominio.
 * Reglas relajadas: sin server.ts, imports relativos OK, sin actions/store.
 */
export const LIBRARY_DIRS = ["common", "shared", "infrastructure"];

/**
 * Overrides por módulo para casos puntuales.
 * Los `true` significan que la carpeta SÍ debe existir.
 * Los `false` significan que la carpeta NO debe existir (quitar si existe).
 */
export const MODULE_OVERRIDES = {
  // auth: RHF + hooks + actions. Estructura ui/forms/login con subfeatures es intencional
  // EXCEPTION: ui/forms/login/* es feature login dentro de forms - agrupacion por flujo
  // PLAN: Mantener, auth es modulo con flujos separados (login/recovery/register)
  // TIMELINE: Q4 2026
  auth: {
    "01": true,
  },
  // menu: TanStack Table + useState local. Sin hooks ni store propios.
  menu: {
    "01": {
      required: { ui: true, lib: true, models: true },
      forbidden: { hooks: true, store: true, actions: true },
    },
  },
  // theme-customizer: orquesta features en `ui/` con subfeatures invertidas (colors/ui, typography/ui) + store Zustand
  // EXCEPTION: Estructura feature/ui invertida es intencional para aislar tokens por dominio
  // PLAN: Mantener, migracion a ui/feature romperia imports
  // TIMELINE: Q4 2026 - evaluar si se normaliza
  "theme-customizer": {
    "01": true,
  },
  // layout-manager: estado cliente (zustand + localStorage). Sin acciones servidor.
  "layout-manager": {
    "01": {
      required: { hooks: true, lib: true, models: true, store: true, ui: true },
      forbidden: { actions: true, server: true, "server-ui": true },
    },
    "03": { "nav-item-param": true },
    "05": {
      "shape-tokens": true,
      "html-target-rel": true,
      "nav-special-titles": true,
      "sidebar-state-tokens": true,
      "jsx-tag-name": true,
    },
    "12": { "image-shape-cast": true },
    "13": { "state-actions-pattern": true },
    "17": { "section-structure": true },
  },
  // dashboard: vista agregada. Sin estado, sin acciones. Strings de dashboard son UI centralizada en DASHBOARD, State en ErrorBoundary es co-located
  // EXCEPTION: DashboardErrorBoundary State co-located es intencional (1 type), strings restantes son DASHBOARD.*
  // PLAN: Mantener, dashboard es vista simple
  // TIMELINE: Q4 2026
  dashboard: {
    "01": {
      required: { lib: true, models: true, ui: true },
      forbidden: { hooks: true, store: true, actions: true },
    },
    "05": true,
    "12": true,
    "16": true,
    "17": true,
  },
  // infrastructure: drizzleAdapter de Better Auth y drizzle() cliente requieren namespace `schema`
  // EXCEPTION: Drizzle internamente navega `references()` usando metadata del módulo original
  // (no se puede reempaquetar en objeto plano: probado con `export const schema = {...}` causa
  // `TypeError: Cannot read properties of undefined (reading 'referencedTable')` en /api/auth/get-session
  // y /api/auth/sign-in/email). Re-evaluar cuando Drizzle exponga API que acepte tabla referenciada explícita.
  // PLAN: N/A — Drizzle/Better Auth SDK limitation
  // TIMELINE: Q4 2026 (revisar al upgrade de drizzle-orm)
  // email.service.ts: EMAIL_FROM se lee con gate dev (`process.env.NODE_ENV === "production" && process.env.EMAIL_FROM`)
  // — fallback a DEFAULT_FROM en dev evita crash cuando la var no existe. En producción se valida la presencia
  // con el corto-circuito del && antes de usarlo; si falta, fallback a DEFAULT_FROM (no falla). Migrar a
  // requireEnv cuando se garantice la presencia de EMAIL_FROM en todos los .env de producción.
  // PLAN: requireEnv("EMAIL_FROM") en producción
  // TIMELINE: Q2 2027
  infrastructure: {
    "07": { "drizzle-schema-namespace": true, "better-auth-schema-namespace": true },
    "06": { "email-from-dev-fallback": true },
  },
  notebooks: {
    "01": {
      "ui-subfeature": true,
      "ui-max-depth": 3,
    },
    // use-notebook-mutations: unknown del cache se valida via type guards
    // (isNotebookArray / isGetNotebooksResult) y se aplica via utils dedicadas
    // (applyNotebookOptimistic / removeNotebookFromCache). El lens-12 marca el archivo
    // porque no ve narrowing local, pero el narrowing está externalizado correctamente.
    // EXCEPTION: delegación de narrowing a utils del módulo.
    // PLAN: N/A — type safety ya garantizada por las utils.
    // TIMELINE: N/A
    "12": { "unknown-delegated-to-util": true },
    // get-notebook.action.ts: split de auth/caché requerido por Cache Components (Next 16)
    // (cookies()/headers() no pueden estar dentro de 'use cache'). El helper getNotebooksForUser
    // encapsula la query cacheable y recibe userId como argumento.
    // EXCEPTION: patrón canónico de Cache Components.
    // PLAN: N/A.
    // TIMELINE: N/A
    "28": { "cache-components-split-helper": true },
  },
  trash: {
    // get-trashed-items.action.ts: mismo patrón canónico de Cache Components que notebooks.
    // (cookies()/headers() no pueden estar dentro de 'use cache'). El helper getTrashedItemsForUser
    // encapsula la query cacheable y recibe userId como argumento.
    // EXCEPTION: patrón canónico de Cache Components.
    // PLAN: N/A.
    // TIMELINE: N/A
    "28": { "cache-components-split-helper": true },
    // delete-trashed-note.ts y purge-expired-trash.ts: el `content` JSON de la nota se
    // pasa a `extractCloudinaryUrls(blocks: unknown)`, que ES el validador: aplica type
    // guards (`isRecord`) y devuelve `[]` ante cualquier estructura inesperada. Añadir un
    // `safeParse` de Zod seria redundante y solo anadiria una segunda validacion del
    // mismo payload. Registrado en AGENTS.md > Gotchas Comunes > 12.
    "12": { "unknown-delegated-to-util": true },
  },
  notes: {
    "01": {
      "ui-subfeature": true,
      "ui-max-depth": 3,
    },
  },
  editor: {
    // Topografia: ui/blocks y ui/toolbars son subfeatures legitimas, max-depth 3 para mobile/views
    "01": true,
    // Contenido: strings de bloque, hex de paleta de contenido, radius/typo de editor no son tokens UI
    "05": true,
    "22": true,
    "23": true,
    "24": true,
    // Higiene y naming: FIX inline y booleanos bp en BlockNote - documentados, no criticos
    "03": true,
    "04": true,
    "11": true,
    // type guards con `as Record<string, unknown>` (ResizableCodeBlock) externalizan
    // el narrowing vía type guards locales (isCodeBlockRenderProps / isCodeBlockProps).
    // EXCEPTION: delegación de narrowing a type guards locales.
    // PLAN: N/A — type safety garantizada por los type guards.
    // TIMELINE: N/A
    "12": { "unknown-delegated-to-guard": true, "blocknote-typing-cast": true },
    "16": true,
    "17": true,
    "32": true,
  },
  settings: {
    // EXCEPTION: settings/ topography — sin store/ (estado local) + ui/tabs/* agrupación por dominio (Brújula)
    // PLAN: Mantener; extraer a ui/forms/profile/ si >10 archivos
    // TIMELINE: Q3 2027
    "01": true,
    "03": true,
    "04": true,
    // God hooks 11-18 returns y raw <button>/<img>/rounded — deuda histológica, requiere fragmentación Orquestador+Hooks
    // PLAN: Fragmentar use-image-crop/management/avatar + migrar a Button/next/image + tokens --radius Q1 2027
    // TIMELINE: Q1 2027
    "13": true,
    "14": true,
    "15": true,
    "22": true,
    "23": true,
    "24": true,
    // Promises sin .catch — manejadas por try/catch del caller
    "11": true,
    // SettingsTab co-locado — mover a models ya hecho, re-export residual
    "12": true,
    // Comentarios sin keyword — 7 restantes, higiene incremental
    "16": true,
    // Dead code settings-texts — ya importado en ImageManagementModal (uso parcial)
    "17": true,
    // Supresión biome-ignore sin EXCEPTION — ReactCrop <img> nativo requiere nativo
    "27": true,
  },
};

export function isLibrary(modName) {
  return LIBRARY_DIRS.includes(modName) || modName === "ui";
}

/**
 * Resuelve el directorio de un target de auditoría.
 * Librerías (common, shared, infrastructure) viven en src/<lib> o <lib>;
 * los módulos de dominio en src/modules/<mod>, modules/<mod> o components/<mod>.
 */
export function getModDir(modName, ...rest) {
  let base;
  if (isLibrary(modName)) {
    if (existsSync(join(ROOT, "src", modName))) {
      base = join(ROOT, "src", modName);
    } else if (existsSync(join(ROOT, modName))) {
      base = join(ROOT, modName);
    } else if (modName === "ui" && existsSync(join(ROOT, "components/ui"))) {
      base = join(ROOT, "components/ui");
    } else {
      base = join(ROOT, modName);
    }
  } else {
    base = join(MODULES_DIR, modName);
  }
  return rest.length ? join(base, ...rest) : base;
}

export function getModuleOverride(modName, lensId, rule) {
  const section = MODULE_OVERRIDES[modName]?.[lensId];
  if (!section) return undefined;
  return rule ? section[rule] : section;
}

export function getModules() {
  try {
    if (!existsSync(MODULES_DIR)) return [];
    return readdirSync(MODULES_DIR)
      .filter((e) => {
        if (e.startsWith(".") || e === "ui") return false;
        try {
          return statSync(join(MODULES_DIR, e)).isDirectory();
        } catch {
          return false;
        }
      });
  } catch {
    return [];
  }
}

export function findFiles(dir, pattern) {
  const results = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        results.push(...findFiles(fullPath, pattern));
      } else if (entry.isFile() && entry.name.match(pattern)) {
        results.push(fullPath);
      }
    }
  } catch {}
  return results;
}

export function readFileSafe(path) {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return "";
  }
}

export function getRelativePath(absPath) {
  return relative(ROOT, absPath).replace(/\\/g, "/");
}

/**
 * Cuenta archivos `.tsx` en un directorio (no recursivo).
 */
export function countTsxInDir(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith(".tsx")).length;
  } catch {
    return 0;
  }
}

/**
 * Lista subcarpetas inmediatas de un directorio.
 */
export function listSubdirs(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => e.name);
  } catch {
    return [];
  }
}

/**
 * Encuentra todos los directorios `ui/` dentro de un árbol (sin duplicados).
 * Usado por lens 01 para verificar Brújula UI recursiva.
 */
export function findUiDirs(dir, results = []) {
  const seen = new Set(results);
  const out = [];
  const walk = (d) => {
    try {
      const entries = readdirSync(d, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name === "node_modules") continue;
        const full = join(d, entry.name);
        if (entry.name === "ui" && !seen.has(full)) {
          seen.add(full);
          out.push(full);
        }
        walk(full);
      }
    } catch {}
  };
  walk(dir);
  return out;
}
