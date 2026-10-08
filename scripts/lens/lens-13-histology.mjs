import { join } from "node:path";
import { isCircleLegit } from "./lens-23-radius-tokens.mjs";
import { findFiles, getModDir, getModuleOverride, getRelativePath, isLibrary, MODULES_DIR, readFileSafe } from "./shared.mjs";

const RAW_HTML_TAGS = [
  { tag: "button", component: "Button" },
  { tag: "input", component: "Input" },
  { tag: "select", component: "Select" },
  { tag: "textarea", component: "Textarea" },
  { tag: "label", component: "Label o FormLabel" },
];

// shadcn Field API (2025) — la unica vigente segun los docs oficiales de RHF:
// https://ui.shadcn.com/docs/forms/react-hook-form
// El patron es <form onSubmit={form.handleSubmit(...)}> + <Controller> + <Field>.
// `Field` puede vivir en un subcomponente: `Controller` devuelve un subarbol, asi que
// exigirlo en el MISMO archivo produce falsos positivos en componentes correctamente
// extraidos ( constitution: "Un componente = un archivo" ).
const MODERN_FIELD_PRIMITIVES = ["Field", "FieldLabel", "FieldError", "FieldGroup", "FieldSet", "FieldLegend", "FieldContent", "FieldTitle", "FieldSeparator", "FieldDescription"];

// Primitives legacy (FormProvider). Los docs las movieron a /docs/legacy: no deben
// usarse en codigo nuevo. Se reportan como deuda de migracion, no como مطلacion.
const LEGACY_FORM_PRIMITIVES = ["Form", "FormField", "FormItem", "FormControl", "FormMessage", "FormLabel", "FormDescription"];

/** El archivo usa el patron documentado: `Controller` de RHF o un primitive `Field`. */
function usesModernFormPattern(content) {
  const hasField = MODERN_FIELD_PRIMITIVES.some((p) => new RegExp(`\\b${p}\\b`).test(content) && /from\s+["']@\/common["']/.test(content));
  const hasController = /\bController\b/.test(content) && /from\s+["']react-hook-form["']/.test(content);
  return hasField || hasController;
}

/** El archivo usa FormProvider y sus primitivas legacy. */
function usesLegacyFormPattern(content) {
  return LEGACY_FORM_PRIMITIVES.some((p) => new RegExp(`<${p}\\b`).test(content)) && /from\s+["']@\/common["']/.test(content);
}

/**
 * Devuelve el set de lineas del archivo que tienen un EXCEPTION adyacente
 * (en las 5 lineas previas) o son parte del bloque EXCEPTION/PLAN/TIMELINE.
 * Antes: el archivo entero se saltaba si tenia CUALQUIER EXCEPTION — demasiado laxo.
 */
function buildExceptionLineSet(content, lines) {
  const exceptionLines = new Set();
  let inJsxBlock = false;
  let jsxBlockStart = -1;
  let jsxBlockText = "";
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*\/\/.*(EXCEPTION|PLAN|TIMELINE)\s*:/.test(lines[i])) {
      // Marca esta linea y las 5 siguientes como exentas.
      for (let j = Math.max(0, i - 1); j <= Math.min(lines.length - 1, i + 5); j++) {
        exceptionLines.add(j);
      }
    }
    // Bloques {/* EXCEPTION ... */} en JSX (`//` ahí se renderizaría como texto).
    if (/\{\/\*/.test(lines[i])) {
      inJsxBlock = true;
      jsxBlockStart = i;
      jsxBlockText = "";
    }
    if (inJsxBlock) jsxBlockText += ` ${lines[i]}`;
    if (/\*\//.test(lines[i]) && inJsxBlock) {
      inJsxBlock = false;
      if (/(EXCEPTION|PLAN|TIMELINE)\s*:/.test(jsxBlockText)) {
        for (let j = Math.max(0, jsxBlockStart - 1); j <= Math.min(lines.length - 1, i + 5); j++) {
          exceptionLines.add(j);
        }
      }
    }
  }
  return exceptionLines;
}

function countHookReturnProps(content) {
  const returnIdx = content.indexOf("return {");
  if (returnIdx === -1) return 0;

  let depth = 0;
  let i = returnIdx + "return {".length - 1;
  for (; i < content.length; i++) {
    if (content[i] === "{") depth++;
    if (content[i] === "}") {
      depth--;
      if (depth === 0) break;
    }
  }
  const block = content.slice(returnIdx + "return {".length, i);

  let count = 0;
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === "}," || trimmed === "}" || trimmed === "};") continue;
    if (trimmed.startsWith("//")) continue;
    const inlineProps = trimmed.matchAll(/(\w+)(?=\s*[,}])/g);
    let lineCount = 0;
    for (const m of inlineProps) {
      if (m[1] === "return") continue;
      lineCount++;
    }
    count += Math.max(lineCount, 1);
  }
  return count;
}

export default function lens13(modName) {
  const violations = [];
  const lib = isLibrary(modName);
  const modPath = getModDir(modName);
  const files = findFiles(modPath, /\.(ts|tsx)$/);

  for (const f of files) {
    const content = readFileSafe(f);
    const lines = content.split("\n");
    const exceptionLines = buildExceptionLineSet(content, lines);
    const usesModernForm = usesModernFormPattern(content);

    if (f.endsWith(".tsx") && !lib) {
      for (const { tag, component } of RAW_HTML_TAGS) {
        // <label> junto a <Field> es el patron documentado: Field ya aporta su label.
        if (tag === "label" && usesModernForm) continue;
        const tagRegex = new RegExp(`<${tag}\\b`);
        const hitLines = [];
        for (let i = 0; i < lines.length; i++) {
          if (exceptionLines.has(i)) continue;
          const line = lines[i];
          if (/^\s*\/\//.test(line) || /\{\/\*/.test(line) || /^\s*\*/.test(line) || /^\s*\/\*\*/.test(line)) continue;
          if (!tagRegex.test(line)) continue;
          if (tag === "input" && /\bgetInputProps\b/.test(line)) continue;
          let isRange = false;
          if (tag === "input") {
            let j = i;
            while (j < lines.length && j < i + 15 && !lines[j].includes(">")) {
              if (/type="range"/.test(lines[j])) isRange = true;
              j++;
            }
          }
          hitLines.push({ num: i + 1, isRange });
        }
        if (hitLines.length > 0) {
          const suggestion = hitLines.some((h) => h.isRange) ? "Slider" : component;
          const nums = hitLines.map((h) => `L${h.num}`).join(", ");
          violations.push({ lens: "13", severity: "🟠", file: `${getRelativePath(f)}:${nums}`, msg: `Etiqueta HTML raw <${tag}> x${hitLines.length}. Usar componente shadcn <${suggestion}> de @/common` });
        }
      }
    }

    // Deteccion 2: useForm sin el patron documentado. `<form onSubmit={form.handleSubmit()}>`
    // es correcto (docs shadcn RHF); lo que no lo es es enchufar los valores a mano
    // sin `Controller` ni `Field`. Se aceptan ambos marcadores porque `Controller`
    // puede renderizar un subcomponente que ya aporta el `Field`.
    if (f.endsWith(".tsx") && !lib) {
      const usesRHF = /from\s+["']react-hook-form["']/.test(content) && /\buseForm\s*[(<]/.test(content);
      const hasFormTag = /<form\b/.test(content);
      if (usesRHF && hasFormTag && !usesModernForm) {
        const useFormLine = lines.findIndex((l) => /\buseForm\s*[(<]/.test(l)) + 1;
        violations.push({
          lens: "13",
          severity: "🟠",
          file: `${getRelativePath(f)}:L${useFormLine}`,
          msg: `useForm sin <Controller> ni <Field> de @/common. Patron shadcn vigente: <form onSubmit={form.handleSubmit(onSubmit)}> + <Controller> + <Field>/<FieldError>.`,
        });
      }
    }

    // Deteccion 2b: FormProvider y sus primitivas son legacy (docs /docs/legacy).
    // Se reportan para migrar a Controller + Field, no como forma recomendada.
    if (f.endsWith(".tsx") && !lib) {
      if (usesLegacyFormPattern(content)) {
        const legacyUsed = LEGACY_FORM_PRIMITIVES.filter((p) => new RegExp(`<${p}\\b`).test(content));
        const lineNum = lines.findIndex((l) => new RegExp(`<${legacyUsed[0]}\\b`).test(l)) + 1;
        if (!exceptionLines.has(lineNum - 1)) {
          violations.push({
            lens: "13",
            severity: "🟠",
            file: `${getRelativePath(f)}:L${lineNum}`,
            msg: `Primitivas Form legacy (${legacyUsed.join(", ")}) — los docs de shadcn las movieron a /docs/legacy. Migrar a <Controller> + <Field>/<FieldLabel>/<FieldError> de @/common.`,
          });
        }
      }
    }

    // Deteccion 3: error={form.formState.errors.X?.message} pasado a mano, sintoma
    // de no usar <FieldError errors={[fieldState.error]} />.
    if (f.endsWith(".tsx") && !lib) {
      const manualErrorProp = /error\s*=\s*\{[^}]*formState\.errors\[/m;
      const manualErrorPropAlt = /error=\{form\.formState\.errors\./m;
      if (manualErrorProp.test(content) || manualErrorPropAlt.test(content)) {
        const lineNum = lines.findIndex((l) => manualErrorProp.test(l) || manualErrorPropAlt.test(l)) + 1;
        if (!exceptionLines.has(lineNum - 1)) {
          violations.push({
            lens: "13",
            severity: "🟡",
            file: `${getRelativePath(f)}:L${lineNum}`,
            msg: `error={form.formState.errors.X?.message} manual. Usar <FieldError errors={[fieldState.error]} /> dentro del <Field data-invalid>.`,
          });
        }
      }
    }

    if (f.includes("hooks/") || f.includes("hooks\\")) {
      const useEffectCount = (content.match(/useEffect\(/g) || []).length;
      const useRefCount = (content.match(/useRef\(/g) || []).length;
      const functionCount = (content.match(/(?:function\s+\w+|(?:const|let)\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)/g) || []).length;

      if (useEffectCount > 3) {
        violations.push({ lens: "13", severity: "🟠", file: getRelativePath(f), msg: `God Hook: ${useEffectCount} useEffect (límite: 3). Fragmentar con patrón Orquestador` });
      }
      if (useRefCount > 3) {
        violations.push({ lens: "13", severity: "🟠", file: getRelativePath(f), msg: `God Hook: ${useRefCount} useRef (límite: 3). Evaluar responsabilidades` });
      }
      if (functionCount > 8) {
        violations.push({ lens: "13", severity: "🟠", file: getRelativePath(f), msg: `God Hook: ${functionCount} funciones internas (límite: 8). Fragmentar` });
      }

      // False positive: use-initial-notes has inner map return, not hook return
      if (f.includes("use-initial-notes")) continue;
      const returnProps = countHookReturnProps(content);
      const stateActionsOverride = getModuleOverride(modName, "13", "state-actions-pattern");
      if (returnProps > 10 && !stateActionsOverride) {
        violations.push({
          lens: "13",
          severity: "🟠",
          file: getRelativePath(f),
          msg: `Hook retorna ${returnProps} valores (límite: 10). Fragmentar con patrón Orquestador + Hooks Especializados (03-fragmentation.md). Agrupar en objetos NO resuelve el problema`,
        });
      }
    }

    const storeDestructMatches = content.matchAll(/const\s*\{[^}]+\}\s*=\s*use\w+Store\(\)/g);
    for (const m of storeDestructMatches) {
      const lineNum = lines.findIndex((l) => l.includes(m[0])) + 1;
      violations.push({ lens: "13", severity: "🟠", file: `${getRelativePath(f)}:${lineNum}`, msg: "Desestructuración de store completo. Usar selectores atómicos" });
    }

    const templateLiteralClasses = content.matchAll(/className\s*=\s*\{?\s*`[^`]*\$\{/g);
    for (const m of templateLiteralClasses) {
      const lineNum = content.slice(0, m.index).split("\n").length;
      const line = lines[lineNum - 1];
      if (/^\s*\*/.test(line) || /\/\//.test(line)) continue;
      violations.push({ lens: "13", severity: "🟡", file: `${getRelativePath(f)}:L${lineNum}`, msg: "Template literal en className. Usar cn() para clases condicionales" });
    }

    if (f.endsWith(".tsx")) {
      const isShowcase = f.includes("\\ui\\cards\\") || f.includes("/ui/cards/");
      const isCircular = f.includes("MenuFilterPopover") || f.includes("CategoryTabs") || f.includes("CartCategoryDropdown") || f.includes("CartFreeShippingBanner") || f.includes("ColorPickerFlyout") || f.includes("LayoutHeaderShortcutsPanel") || f.includes("ResizeHandle");
      if (!isShowcase && !isCircular) {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (/^\s*\/\//.test(line)) continue;
          if (/rounded-full/.test(line) && !/rounded-\(--radius\)/.test(line) && !isCircleLegit(line)) {
            violations.push({ lens: "13", severity: "🟡", file: `${getRelativePath(f)}:L${i + 1}`, msg: "rounded-full hardcoded. Usar rounded-xl o rounded-(--radius) para respetar design tokens" });
          }
        }
      }
    }
  }

  return violations;
}
