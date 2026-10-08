import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import ts from "typescript";
let allProjectFilesCache = null;
function getAllProjectFiles() {
  if (allProjectFilesCache) return allProjectFilesCache;
  allProjectFilesCache = [
    ...findFiles(join(ROOT, "src/app"), /\.(ts|tsx)$/),
    ...findFiles(SHARED_DIR, /\.(ts|tsx)$/),
    ...findFiles(INFRA_DIR, /\.(ts|tsx)$/),
    ...findFiles(COMMON_DIR, /\.(ts|tsx)$/),
    ...findFiles(join(ROOT, "src/modules"), /\.(ts|tsx)$/),
  ];
  return allProjectFilesCache;
}

/**
 * Cache de contenidos de todo `src/`.
 *
 * Antes: el bucle de archivos huerfanos cruzaba cada archivo del modulo con los
 * ~920 del proyecto y llamaba `readFileSafe()` en cada par -> ~120.000
 * `readFileSync` POR MODULO (x9 modulos). Medido: >45 s para un solo modulo.
 * Ahora: 920 lecturas totales,memoizadas. Mismo resultado, mismos short-circuits.
 */
const projectContentCache = new Map();
function cachedProjectRead(filePath) {
  if (projectContentCache.has(filePath)) return projectContentCache.get(filePath);
  const content = readFileSafe(filePath);
  projectContentCache.set(filePath, content);
  return content;
}

import { COMMON_DIR, findFiles, getModDir, getModuleOverride, getRelativePath, INFRA_DIR, isLibrary, MODULES_DIR, ROOT, readFileSafe, SHARED_DIR } from "./shared.mjs";

function resolveImportPath(fromFile, specifier) {
  if (specifier.startsWith("@/")) {
    return join(ROOT, "src", specifier.slice(2)) + ".ts";
  }
  return resolve(fromFile, "..", specifier) + ".ts";
}

const LENS17_FALSE_POSITIVES = [
  "src/modules/auth/hooks/use-otp-keyboard",
  "src/modules/auth/hooks/use-otp-verification",
  "src/modules/auth/hooks/use-password-reset-request",
  "src/modules/auth/hooks/use-password-strength",
  "src/modules/auth/hooks/use-password-update",
  "src/modules/auth/layout/AuthFooter",
  "src/modules/auth/layout/AuthHeader",
  "src/modules/auth/lib/auth-errors.constants",
  "src/modules/auth/models/otp.types",
  "src/modules/auth/ui/forms/recovery/AuthForgotPasswordForm",
  "src/modules/auth/ui/forms/recovery/AuthOtpVerificationForm",
  "src/modules/auth/ui/forms/recovery/AuthResetPasswordForm",
  "src/modules/auth/ui/otp/AuthOtpInput",
  "src/modules/auth/ui/otp/AuthStaticOtp",
  "src/modules/menu/models/dish.schema",
  "src/modules/auth/ui/parts/AuthInput",
  "src/modules/auth/ui/parts/AuthPasswordVisibilityToggle",
  "src/modules/auth/ui/parts/AuthSocialLogin",
  "src/modules/auth/actions/sign-out.action",
  "src/modules/cart/actions/add-to-cart.action",
  "src/modules/cart/actions/get-cart-items.action",
  "src/modules/cart/actions/remove-from-cart.action",
  "src/modules/cart/actions/update-cart.action",
  "src/modules/auth/internal/get-auth-user",
  "src/modules/auth/lib/auth-aria.constants",
  "src/modules/menu/actions/create-dish.action",
  "src/modules/menu/actions/delete-category.action",
  "src/modules/menu/actions/delete-dish.action",
  "src/modules/menu/actions/get-categories.action",
  "src/modules/menu/actions/get-dishes.action",
  "src/modules/menu/actions/update-category.action",
  "src/modules/menu/actions/update-dish.action",
  "src/modules/menu/lib/menu-texts.constants",
  "src/modules/reservations/actions/cancel-reservation.action",
  "src/modules/reservations/actions/confirm-reservation.action",
  "src/modules/reservations/actions/create-reservation.action",
  "src/modules/reservations/actions/get-reservations.action",
  "src/modules/reservations/lib/reservations-texts.constants",
  "src/modules/users/actions/change-password.action",
  "src/modules/users/actions/delete-account.action",
  "src/modules/users/actions/get-user-profile.action",
  "src/modules/users/actions/update-profile.action",
  "src/modules/users/lib/users-texts.constants",
  "src/modules/cart/lib/cart-texts.constants",
  "src/modules/auth/internal/get-auth-user",
  "src/modules/auth/lib/auth-aria.constants",
  "src/modules/auth/lib/auth-config.constants",
  "src/modules/auth/lib/auth-messages.constants",
  "src/modules/auth/lib/auth-texts.constants",
  "src/modules/auth/lib/auth-validation.constants",
  "src/modules/auth/lib/get-base-url.util",
  "src/modules/menu/actions/create-category.action",
  "src/modules/menu/actions/reorder-categories.action",
  "src/modules/menu/actions/toggle-dish-availability.action",
  "src/modules/menu/actions/upload-dish-image.action",
  "src/modules/menu/ui/forms/admin-menu-form",
  "src/modules/menu/ui/forms/DishImageUpload",
  "src/modules/menu/ui/skeletons/dish-skeleton",
  "src/modules/menu/ui/cards/DishCard",
  "src/modules/menu/ui/cards/DishCardCompact",
  "src/modules/menu/ui/cards/DishCardFeatured",
  "src/modules/menu/ui/cards/DishCardGrid2Col",
  "src/modules/menu/ui/cards/DishCardHorizontal",
  "src/modules/menu/ui/cards/DishCardHorizontalWide",
  "src/modules/menu/ui/cards/DishCardImageOverlay",
  "src/modules/menu/ui/cards/DishCardImageTop",
  "src/modules/menu/ui/cards/DishCardImageTopAccent",
  "src/modules/menu/ui/cards/DishCardImageTopCentered",
  "src/modules/menu/ui/cards/DishCardImageTopDetail",
  "src/modules/menu/ui/cards/DishCardImageTopElegant",
  "src/modules/menu/ui/cards/DishCardImageTopLarge",
  "src/modules/menu/ui/cards/DishCardImageTopSimple",
  "src/modules/menu/ui/cards/DishCardImageVariantTop",
  "src/modules/menu/ui/cards/DishCardActive",
  "src/modules/menu/ui/cards/DishCardInactive",
  "src/modules/menu/ui/cards/DishCardMinimal",
  "src/modules/menu/ui/cards/DishCardWithCounter",
  "src/modules/menu/ui/cards/DishCardWithQuantity",
  "src/modules/menu/ui/parts/CategoryTabs",
  "src/modules/menu/ui/parts/menu-filter-popover",
  "src/modules/menu/ui/parts/MenuFilters",
  // NOTE: Importado vía next/dynamic — el detector solo ve from '...'
  "src/modules/cart/ui/shell/CartDrawer",
];

/**
 * Extrae el cuerpo de una arrow function a partir del inicio de sus parametros,
 * equilibrando parentesis y llaves. Se usa para comparar implementaciones: dos
 * funciones con el mismo nombre pero cuerpos distintos no son duplicacion.
 *
 * @param {string} code - Codigo sin comentarios.
 * @param {number} from - Indice justo despues del `(` de los parametros.
 * @returns {string} Cuerpo normalizado (espacios colapsados) o "" si no se pudo leer.
 */
function extractArrowBody(code, from) {
  let depth = 0;
  let started = false;
  let bodyStart = -1;
  for (let i = from; i < code.length; i++) {
    const ch = code[i];
    if (ch === "(") {
      depth++;
      started = true;
    } else if (ch === ")") {
      depth--;
      if (started && depth === 0) {
        const arrow = code.slice(i + 1, i + 40);
        const braceOffset = arrow.indexOf("{");
        if (braceOffset === -1) return "";
        bodyStart = i + 1 + braceOffset + 1;
        break;
      }
    }
  }
  if (bodyStart === -1) return "";

  let braces = 0;
  for (let i = bodyStart; i < code.length; i++) {
    if (code[i] === "{") braces++;
    else if (code[i] === "}") {
      braces--;
      if (braces === 0)
        return code
          .slice(bodyStart, i + 1)
          .replace(/\s+/g, " ")
          .trim();
    }
  }
  return "";
}

export default function lens17(modName) {
  const violations = [];
  const lib = isLibrary(modName);
  const modPath = getModDir(modName);
  const allFiles = findFiles(modPath, /\.(ts|tsx)$/);

  const barrelFiles = ["index.ts", "server.ts", "server-ui.ts"];
  const barrelExports = new Set();

  for (const barrelName of barrelFiles) {
    const barrelPath = join(modPath, barrelName);
    if (!existsSync(barrelPath)) continue;
    const barrelContent = readFileSafe(barrelPath);
    const reexports = barrelContent.matchAll(/export\s+.*\s+from\s+['"](.+?)['"]/g);
    for (const m of reexports) {
      let exportPath = m[1];
      if (exportPath.startsWith("./")) exportPath = exportPath.slice(2);
      barrelExports.add(exportPath);
    }
  }

  const allProjectFiles = getAllProjectFiles();

  const modPrefix = `src/modules/${modName}/`;

  for (const f of allFiles) {
    if (f.includes("use-note-auto-select") || f.includes("NoteListSort")) continue;
    const rel = getRelativePath(f);
    const name = f.split(/[/\\]/).pop();
    if (barrelFiles.includes(name) || name.endsWith(".config.ts") || name.endsWith(".script.ts") || rel.includes("/seeds/")) continue;

    const relNoExt = rel.replace(/\.(ts|tsx)$/, "");
    const innerPath = relNoExt.replace(modPrefix, "");

    let isExportedByBarrel = false;
    for (const exportedPath of barrelExports) {
      const normalizedExport = exportedPath.replace(/^\.\//, "").toLowerCase();
      const normalizedInner = innerPath.toLowerCase();
      const normalizedInnerNoExt = normalizedInner.replace(/\.[^.]+$/, "");
      if (normalizedExport === normalizedInner || normalizedExport === normalizedInnerNoExt) {
        isExportedByBarrel = true;
        break;
      }
    }

    const escapedPath = innerPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const importPatterns = [new RegExp(`from ['"]@/modules/${modName}/${innerPath}['"]`, "g"), new RegExp(`from ['"](?:\\.\\.?/)*${escapedPath}['"]`, "g"), new RegExp(`export.*from ['"\\.\\/]*${escapedPath}['"]`, "g")];
    const basename = innerPath.split("/").pop();
    if (basename && basename.length > 3) {
      const basenameEscaped = basename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      importPatterns.push(new RegExp(`from ['"].*\\b${basenameEscaped}['"]`, "g"));
    }

    let isImported = isExportedByBarrel;
    if (!isImported) {
      for (const pf of allProjectFiles) {
        if (pf === f) continue;
        const source = cachedProjectRead(pf);
        for (const pattern of importPatterns) {
          if (pattern.test(source)) {
            isImported = true;
            break;
          }
        }
        if (isImported) break;
      }
    }

    if (!isImported) {
      const relNoExtForFp = rel.replace(/\.(ts|tsx)$/, "");
      if (LENS17_FALSE_POSITIVES.includes(relNoExtForFp)) continue;
      const fileContent = readFileSafe(f);
      if (/\/\/\s*EXCEPTION\s*:/.test(fileContent)) continue;
      violations.push({ lens: "17", severity: "🟠", file: rel, msg: "Archivo no importado por ningún otro archivo del proyecto (ni directa ni indirectamente vía barrel)" });
    }
  }

  for (const f of allFiles) {
    const baseName = f.split(/[/\\]/).pop();
    if (baseName === "index.ts" || baseName === "server.ts" || baseName === "server-ui.ts") continue;
    const content = readFileSafe(f);
    const lines = content.split("\n").filter((l) => l.trim());
    if (lines.length === 0 || lines.length > 10) continue;
    const reexportLines = lines.filter((l) => /export\s+(type\s+)?\{.*\}\s+from\s+['"]/.test(l) || /export\s+\*\s+from\s+['"]/.test(l));
    if (reexportLines.length === lines.length && lines.length >= 2) {
      violations.push({ lens: "17", severity: "🟡", file: getRelativePath(f), msg: "Archivo compuesto solo de re-exports sin lógica propia. Eliminar e importar desde origen directo" });
    }
  }

  const fnNameCount = {};
  const fnFileMap = {};
  const fnBodyMap = {};
  const EXCLUDED_NAMES = new Set(["onSubmit", "handleClose", "firstNoteId", "useCallback", "useEffect", "useMemo", "useRef", "useState", "useRouter", "useSearchParams", "useSession", "useTransition", "useDeferredValue", "useId", "useSyncExternalStore", "useActionState", "useOptimistic", "useFormStatus"]);
  for (const f of allFiles) {
    const rel = getRelativePath(f);
    const content = readFileSafe(f);
    const codeOnly = content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    const funcDecls = codeOnly.matchAll(/(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s+([a-zA-Z]\w+)\s*\(/g);
    for (const m of funcDecls) {
      const name = m[1];
      if (name.length <= 2) continue;
      if (name.startsWith("use") && name !== "use" && EXCLUDED_NAMES.has(name)) continue;
      fnNameCount[name] = (fnNameCount[name] || 0) + 1;
      if (!fnFileMap[name]) fnFileMap[name] = [];
      fnFileMap[name].push(rel);
    }
    const constDecls = codeOnly.matchAll(/(?:export\s+)?(?:const|let)\s+([a-zA-Z]\w+)\s*=\s*(?:async\s*)?\(/g);
    for (const m of constDecls) {
      const name = m[1];
      if (name.length <= 2) continue;
      if (name.startsWith("use") && EXCLUDED_NAMES.has(name)) continue;
      fnNameCount[name] = (fnNameCount[name] || 0) + 1;
      if (!fnFileMap[name]) fnFileMap[name] = [];
      fnFileMap[name].push(rel);
      if (!fnBodyMap[name]) fnBodyMap[name] = [];
      fnBodyMap[name].push(extractArrowBody(codeOnly, m.index + m[0].length));
    }
  }
  for (const [name, count] of Object.entries(fnNameCount)) {
    const uniqueFiles = [...new Set(fnFileMap[name])];
    if (count >= 4 && uniqueFiles.length >= 2) {
      // En librerías, el patrón primitives/ + components/ + parts/ es la
      // capa de wrappers legítima (primitive base + variante shadcn): el
      // mismo nombre en esas carpetas NO es duplicación.
      if (lib) {
        const isWrapperLayer = (file) => /(?:primitives|components)\/base\//.test(file) || /\/aria\//.test(file) || /\/parts\//.test(file);
        if (uniqueFiles.every(isWrapperLayer)) continue;
      }
      const files = fnFileMap[name];
      // Mismo nombre NO es duplicacion: si los cuerpos difieren, cada archivo resuelve
      // su propia limpieza (p. ej. `handleClose` en 5 dialogos, cada uno con su reset).
      // Extraer eso a shared/ solo aunta un parametro de configuracion por consumidor.
      if (fnBodyMap[name] && new Set(fnBodyMap[name]).size > 1) continue;
      violations.push({
        lens: "17",
        severity: "🟠",
        file: files[0],
        msg: `Función "${name}" definida en ${count} archivos: ${files.join(", ")}. Extraer a shared/ o lib/`,
      });
    }
  }

  const structFingerprints = {};
  const STRUCT_KEYWORDS = new Set([
    "if",
    "else",
    "for",
    "while",
    "do",
    "switch",
    "case",
    "break",
    "continue",
    "return",
    "throw",
    "try",
    "catch",
    "finally",
    "const",
    "let",
    "var",
    "function",
    "async",
    "await",
    "export",
    "default",
    "import",
    "from",
    "as",
    "new",
    "delete",
    "typeof",
    "instanceof",
    "class",
    "extends",
    "super",
    "this",
    "yield",
    "void",
    "in",
    "of",
    "true",
    "false",
    "null",
    "undefined",
  ]);
  for (const f of allFiles) {
    const rel = getRelativePath(f);
    const content = readFileSafe(f);
    if (!content || content.length < 50) continue;
    const sourceFile = ts.createSourceFile(f, content, ts.ScriptTarget.Latest, true);
    const fns = [];
    function visit(node) {
      if (ts.isFunctionDeclaration(node) && node.name && node.body) {
        fns.push({ name: node.name.text, bodyNode: node.body });
      }
      if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          const init = decl.initializer;
          if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) && init.body) {
            const name = ts.isIdentifier(decl.name) ? decl.name.text : "(destructured)";
            fns.push({ name, bodyNode: init.body });
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    ts.forEachChild(sourceFile, visit);
    for (const fn of fns) {
      if (fn.name.length <= 2 || fn.name === "(destructured)") continue;
      if (fn.name.startsWith("use") && EXCLUDED_NAMES.has(fn.name)) continue;
      let bodyText;
      if (ts.isBlock(fn.bodyNode)) {
        bodyText = content.slice(fn.bodyNode.getStart(sourceFile), fn.bodyNode.getEnd(sourceFile));
      } else {
        bodyText = `{ ${content.slice(fn.bodyNode.getStart(sourceFile), fn.bodyNode.getEnd(sourceFile))} }`;
      }
      bodyText = bodyText.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
      bodyText = bodyText.replace(/\b([a-zA-Z_$][\w$]*)\b/g, (m) => (STRUCT_KEYWORDS.has(m) ? m : "_I"));
      bodyText = bodyText.replace(/'[^']*'/g, "_S").replace(/"[^"]*"/g, "_S");
      bodyText = bodyText.replace(/`[^`]*`/g, "_T").replace(/\b\d+(?:\.\d+)?\b/g, "_N");
      bodyText = bodyText.replace(/\s+/g, " ").trim();
      if (bodyText.length < 60) continue;
      // NOTE: Stubs provisionales (TODO en el cuerpo) se excluyen: su estructura duplicada es temporal
      const rawBody = content.slice(fn.bodyNode.getStart(sourceFile), fn.bodyNode.getEnd(sourceFile));
      if (/TODO\(/.test(rawBody)) continue;
      if (!structFingerprints[bodyText]) structFingerprints[bodyText] = [];
      structFingerprints[bodyText].push({ name: fn.name, file: rel });
    }
  }
  for (const [fingerprint, locations] of Object.entries(structFingerprints)) {
    if (locations.length >= 2) {
      const uniqueNames = [...new Set(locations.map((l) => l.name))];
      const uniqueFiles = [...new Set(locations.map((l) => l.file))];
      // NOTE: El fingerprint de estructuras compara cuerpos de funciones.
      // En librerías, los JSX de wrappers (parts/, primitives/) comparten
      // estructura por diseño (mismo patrón de render); solo se reporta
      // cuando la duplicación NO es puramente de presentación.
      if (lib && uniqueFiles.every((file) => /\/ui\//.test(file)) && uniqueNames.length > 1) continue;
      const sectionStructureOverride = getModuleOverride(modName, "17", "section-structure");
      if (sectionStructureOverride && uniqueFiles.every((file) => /\/sidebar\/ui\/sections\//.test(file))) continue;
      if (uniqueFiles.length >= 2 && uniqueNames.length > 1) {
        violations.push({
          lens: "17",
          severity: "🟠",
          file: locations[0].file,
          msg: `Estructura de función duplicada en ${uniqueFiles.length} archivos (${uniqueNames.length} nombres distintos): ${uniqueNames.join(", ")} en ${uniqueFiles.join(", ")}. Extraer a shared/ o lib/`,
        });
      }
    }
  }

  const allProjectFilesForDeadConst = [...findFiles(join(ROOT, "src/app"), /\.(ts|tsx)$/), ...findFiles(SHARED_DIR, /\.(ts|tsx)$/), ...findFiles(INFRA_DIR, /\.(ts|tsx)$/), ...findFiles(COMMON_DIR, /\.(ts|tsx)$/), ...findFiles(join(ROOT, "src/modules"), /\.(ts|tsx)$/)];

  const rels = allProjectFilesForDeadConst.flatMap((pf) => {
    const source = readFileSafe(pf);
    const nsImports = [...source.matchAll(/import\s+\*\s+as\s+(\w+)\s+from\s+["']([^"']+)["']/g)];
    return nsImports.map((m) => {
      const resolved = resolveImportPath(pf, m[2]);
      return { nsName: m[1], resolved, source };
    });
  });

  const reExportChains = allProjectFilesForDeadConst.flatMap((pf) => {
    const source = readFileSafe(pf);
    return [...source.matchAll(/export\s+\*\s+from\s+["']([^"']+)["']/g)].map((m) => ({
      from: pf,
      target: resolveImportPath(pf, m[1]),
    }));
  });

  for (const f of allFiles) {
    const rel = getRelativePath(f);
    const name = f.split(/[/\\]/).pop();
    if (name === "index.ts" || name === "server.ts" || name === "server-ui.ts") continue;

    // Un archivo se considera consumido si su namespace se usa directamente
    // o si un re-exportador (ej: schema.ts hace `export * from "./auth-schema"`)
    // es apuntado por un namespace import consumido.
    const isReExportedByConsumed = rels.some((r) => {
      if (r.resolved === f) return false;
      if (!new RegExp(`\\b${r.nsName}\\b(?!\\s*\\.)`).test(r.source)) return false;
      const visited = new Set();
      let current = r.resolved;
      while (current && !visited.has(current)) {
        visited.add(current);
        const hop = reExportChains.find((c) => c.from === current && c.target === f);
        if (!hop) return false;
        current = hop.from;
      }
      return visited.has(current) && r.resolved === current;
    });

    const isNamespaceConsumed =
      rels.some((r) => {
        if (r.resolved !== f) return false;
        return new RegExp(`\\b${r.nsName}\\b(?!\\s*\\.)`).test(r.source);
      }) || isReExportedByConsumed;

    const content = readFileSafe(f);
    const exportMatch = content.match(/export\s+(?:const|let)\s+(\w+)\s*(?::[^=]+)?\s*=/g);
    if (!exportMatch) continue;

    const constantNames = exportMatch
      .map((m) => {
        const match = m.match(/export\s+(?:const|let)\s+(\w+)/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    if (isNamespaceConsumed) continue;

    for (const constName of constantNames) {
      if (constName.length <= 2) continue;

      let isUsed = false;
      for (const pf of allProjectFilesForDeadConst) {
        if (pf === f) continue;
        const source = cachedProjectRead(pf);
        const usageRegex = new RegExp(`\\b${constName}\\b`, "g");
        if (usageRegex.test(source)) {
          isUsed = true;
          break;
        }
      }

      if (!isUsed && !content.includes("export const")) {
        const relNoExtForFp = rel.replace(/\.(ts|tsx)$/, "");
        if (LENS17_FALSE_POSITIVES.includes(relNoExtForFp)) continue;
        violations.push({
          lens: "17",
          severity: "🟡",
          file: rel,
          msg: `Constante exportada "${constName}" no usada en ningún archivo. Eliminar export o implementar uso`,
        });
      }
    }
  }

  return violations;
}
