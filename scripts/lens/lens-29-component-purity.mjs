import { findFiles, getModDir, getModuleOverride, getRelativePath, readFileSafe, UI_SEMANTIC_DIRS } from "./shared.mjs";

/**
 * Lens 29 — Pureza de Componentes (SRP + Brújula UI correcta)
 *
 * Reglas:
 *   1. Un archivo `.tsx` exporta UN componente principal.
 *   2. Sub-componentes locales (function/const auxiliar) deben vivir en
 *      `ui/<feature>/parts/<SubComponente>.tsx` (no re-exports).
 *   3. Si el archivo está en `ui/parts/`, su nombre DEBE ser un componente
 *      Dumb puro (props + eventos, sin hooks de negocio).
 *   4. Si está en `ui/forms/`, DEBE llamar al menos un hook de negocio
 *      (validación, mutación) o Server Action.
 *
 * Sugerencias de extracción respetan Brújula UI:
 *   - `parts/` → Dumb, extraer a `ui/<feature>/parts/<Name>.tsx`
 *   - `forms/` → Smart, extraer a `ui/<feature>/forms/<Name>.tsx`
 *   - `cards/`, `modals/`, `sections/` → según el nombre del helper
 */

const COMPONENT_DEF_RE = [
  /^\s*export\s+(?:default\s+)?function\s+([A-Z][A-Za-z0-9]*)\s*\(/gm,
  /^\s*export\s+const\s+([A-Z][A-Za-z0-9]*)\s*=\s*(?:memo\s*\(|forwardRef\s*\(|React\.memo\s*\(|React\.forwardRef\s*\()/gm,
  /^\s*const\s+([A-Z][A-Za-z0-9]*)\s*=\s*(?:\(.*?\)\s*=>|function\s*\()/gm,
  /^\s*function\s+([A-Z][A-Za-z0-9]*)\s*\(/gm,
  /^\s*export\s+const\s+([A-Z][A-Za-z0-9]*)\s*:\s*(?:React\.)?FC/gm,
];

function collectComponents(content) {
  const names = new Map();
  for (const re of COMPONENT_DEF_RE) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(content)) !== null) {
      const name = m[1];
      if (!name || name === "Component") continue;
      if (!names.has(name)) names.set(name, []);
      const lineNum = content.slice(0, m.index).split("\n").length;
      names.get(name).push(lineNum);
    }
  }
  return names;
}

/**
 * Detecta si el componente está en `ui/parts/` (debería ser Dumb)
 * o en `ui/forms/` (debería ser Smart con hooks/Server Actions).
 */
function detectBrulujaExpectation(rel) {
  const norm = rel.replace(/\\/g, "/");
  for (const dir of UI_SEMANTIC_DIRS) {
    if (norm.includes(`/${dir}/`) || norm.endsWith(`/${dir}`)) {
      return dir;
    }
  }
  return null;
}

/**
 * Sugiere carpeta Brújula según el nombre del helper.
 */
function suggestBrulujaForHelper(helperName) {
  const lower = helperName.toLowerCase();
  if (/(dialog|modal|sheet|drawer|popover)/i.test(helperName)) return "ui/modals/";
  if (/(card|item|content|spine|shadow|overlay|base|compact|regular|tile)/i.test(helperName)) return "ui/cards/";
  if (/(filter|pill|search|sort|toggle|chip)/i.test(helperName)) return "ui/filters/";
  if (/(section|preview|empty|grid|view|panel|grid)/i.test(helperName)) return "ui/sections/";
  if (/(shell|toolbar|header|footer|context|menu|sider)/i.test(helperName)) return "ui/shell/";
  if (/(form|input|field|step)/i.test(helperName)) return "ui/forms/";
  return "ui/parts/";
}

export default function lens29(modName) {
  const violations = [];
  const modPath = getModDir(modName);
  const files = findFiles(modPath, /\.tsx$/).filter((f) => {
    const norm = f.replace(/\\/g, "/");
    return norm.includes("/ui/");
  });

  for (const f of files) {
    const content = readFileSafe(f);
    if (!content) continue;
    const rel = getRelativePath(f);
    if (/\.stories\.tsx$|\.test\.tsx$|\.spec\.tsx$/.test(f)) continue;

    const components = collectComponents(content);
    if (components.size <= 1) continue;

    // `const X = memo(Component)` / `forwardRef(Component)` envuelve UNA funcion: el
    // nombre "Component" no es un segundo componente del archivo, es el argumento del
    //Higher-order component. Se excluye para no reportar el patron idiomatico de memo.
    const hofArg = new Set([...content.matchAll(/(?:memo|forwardRef)\s*\(\s*([A-Z][A-Za-z0-9]*)/g)].map((m) => m[1]));
    const entries = [...components.entries()].filter(([name]) => !hofArg.has(name));
    if (entries.length <= 1) continue;

    const primary = entries[0][0];
    const fileBase = f
      .replace(/\\/g, "/")
      .split("/")
      .pop()
      .replace(/\.tsx$/, "");
    const helpers = entries.slice(1);
    const helperCount = helpers.length;
    const helperNames = helpers.map(([n]) => n).join(", ");
    const linesInfo = helpers.map(([name, lines]) => `${name}:${lines[0]}`).join(", ");

    const brulujaDir = detectBrulujaExpectation(rel);
    const severity = helperCount >= 3 || content.split("\n").length > 250 ? "🟠" : "🟡";

    // Construir sugerencias de extracción basadas en Brújula
    const suggestions = new Set();
    for (const [name] of helpers) {
      suggestions.add(suggestBrulujaForHelper(name));
    }
    const suggestion = [...suggestions].slice(0, 2).join("` y `");

    const fileLabel = fileBase === primary ? rel : `${rel} (primario: ${primary}${brulujaDir ? `, carpeta ${brulujaDir}` : ""})`;

    violations.push({
      lens: "29",
      severity,
      file: fileLabel,
      msg: `Archivo con ${components.size} componentes (${primary} + ${helperNames}). ${brulujaDir ? `En \`ui/${brulujaDir}/\` solo debe vivir el componente principal; los helpers inflan el archivo y rompen la regla "un componente = un archivo".` : "Cada componente local infla el anfitrión y oculta dependencias."} Extraer a \`${suggestion}${helperNames}\` (PascalCase.tsx)`,
    });
  }

  return violations;
}
