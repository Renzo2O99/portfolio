// NOTE: lens-05-strings.mjs — Audita strings hardcodeados y recomienda centralización en *-texts.constants.ts.
// NOTE: Exclusiones (no son copy UI): hex de tema (los audita Lens 22), selector DOM "body",
// NOTE: config de GSAP CustomEase ("custom", paths M0,0,...). Los *-texts.constants.ts contienen solo textos visibles.
// NOTE: Doc alineada en .opencode/lenses/05-string-audit.md §6.

import { join } from "node:path";
import { getModDir, MODULES_DIR, findFiles, readFileSafe, getRelativePath, getModules, isLibrary, getModuleOverride } from "./shared.mjs";

/**
 * Palabras técnicas en inglés/tailwind que aparecen como valores sueltos
 * (props, estados, variantes) y NUNCA son texto UI en español.
 * Incluye valores de motion (wait/hide/show) que deben permanecer como strings literales.
 */
const NON_UI_WORDS = new Set([
  "mobile", "desktop", "google", "perfil", "suscripciones", "preferencias", "seguridad", "notificaciones", "subir", "editar", "reciente",
  "wait", "hide", "show", "popLayout", "more", "filter", "deselect", "general", "note", "notebook", "position", "numeric", "long", "short", "2-digit",
  "active", "inactive", "disabled", "loading", "success", "warning", "info", "default",
  "checked", "selected", "open", "closed", "empty", "filled", "hover", "focus",
  "ghost", "outline", "link", "primary", "secondary", "destructive",
  "sm", "md", "lg", "xl", "xs", "flex", "grid", "block", "hidden", "relative",
  "absolute", "sticky", "fixed", "static", "inline", "center", "left", "right",
  "top", "bottom", "auto", "none", "normal", "bold", "italic", "cover",
  "contain", "pointer", "scroll", "visible", "invisible", "select", "resize",
  "nowrap", "wrap", "row", "column", "start", "end", "between", "around",
  "even", "odd", "first", "last", "submit", "reset", "button", "icon", "size",
  "variant", "type", "value", "name", "key", "ref", "id", "children",
  "dark", "light", "system", "home", "search", "app", "page", "layout",
  "easeout", "easein", "easeineaseout", "linear", "spring", "tween",
  "opacity", "scale", "rotate", "translate", "transform", "duration",
  "react", "true", "false", "null", "undefined", "number", "string", "boolean",
  "object", "array", "void", "use client", "use server",
  "escape", "keydown", "keyup", "keypress", "click", "change", "create",
  "edit", "delete", "save", "cancel", "zod", "promise", "description",
  "status", "suspended", "categoryid", "maxperorder", "isvegetarian",
  "isspicy", "isglutenfree", "isfeatured", "isvegan", "ishighprotein",
  "iscustomizable", "containsnuts", "isnew",
  "out_of_stock", "sold_out", "published", "draft", "available", "low_stock", "paused", "availability", "publication", "category", "price", "all", "smooth", "toolbar", "sonner",
  "cmdk", "main", "product", "preview", "month", "year", "esc", "otp",
  "password", "function", "text", "alert", "assertive", "polite", "error",
  "role", "status", "page-", "skeleton-",
  "sidebar", "floating", "inset", "offcanvas", "customizer", "theme",
  "dialog", "listbox", "presentation", "random", "presets", "colors", "parent", "typography", "serif", "monospace",
  "hsb", "saturation", "brightness", "hue", "hex", "100dvh",
  "square", "collapsed", "expanded", "noopener", "noreferrer", "div",
  "circle", "16:9", "_blank", "auth pages", "errors", "noopener noreferrer",
  "history", "push", "replace",
]);

function lens05Module(modName) {
  const violations = [];
  const modPath = getModDir(modName);
  const files = findFiles(modPath, /\.(ts|tsx)$/);

  for (const f of files) {
    const content = readFileSafe(f);
    const relPath = getRelativePath(f);
    const errorMatches = content.matchAll(/throw new Error\(["'`]([^"'`]+)["'`]\)/g);
    for (const m of errorMatches) {
      violations.push({ lens: "05", severity: "🟡", file: relPath, msg: `Error literal hardcodeado: "${m[1]}". Centralizar en *-errors.constants.ts` });
    }
    const consoleMatches = content.matchAll(/console\.(error|warn)\(["'`]([^"'`]+)["'`]/g);
    for (const m of consoleMatches) {
      violations.push({ lens: "05", severity: "🟡", file: relPath, msg: `Console.${m[1]} literal hardcodeado: "${m[2]}". Centralizar en *-errors.constants.ts` });
    }

    const numericMatches = content.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*(\d+(?:\.\d+)?)\s*;/g);
    for (const m of numericMatches) {
      const varName = m[1];
      const value = m[2];
      if (value === "0" || value === "1" || value === "2" || value === "100") continue;
      const isConfigFile = /(?:config|constants|settings)\.(?:ts|tsx|js)$/.test(relPath);
      if (isConfigFile) continue;
      const isConfigLike = /(?:rate|threshold|limit|max|min|cost|price|percent|tax|shipping|fee)/i.test(varName);
      if (isConfigLike) {
        violations.push({ lens: "05", severity: "🟠", file: relPath, msg: `Valor numérico hardcodeado: ${varName} = ${value}. Mover a *-config.constants.ts` });
      }
    }

    const currencyMatches = content.matchAll(/\$\d+(?:\.\d+)?/g);
    for (const m of currencyMatches) {
      const lineNum = content.slice(0, m.index).split("\n").length;
      const line = content.split("\n")[lineNum - 1] || "";
      if (line.includes("formatPrice") || line.includes("Intl.NumberFormat")) continue;
      if (line.includes("className") || line.includes("style")) continue;
      violations.push({ lens: "05", severity: "🟠", file: `${relPath}:${lineNum}`, msg: `Valor monetario hardcodeado: "${m[0]}". Usar formatPrice() con constante` });
    }
  }

  return violations;
}

const UI_NON_TEXT_TAGS = new Set([
  "svg", "path", "style", "script", "code", "pre", "template", "slot",
  "textarea", "meta", "link", "head", "use", "defs", "g", "circle", "rect",
  "linearGradient", "stop", "clipPath", "filter", "mask", "title",
]);

/**
 * Elimina comentarios (línea, bloque y JSX) para que sus textos no se
 * confundan con strings UI hardcodeados.
 */
function stripComments(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\/[^\n]*/g, "");
}

function lens05UIStrings(modName) {
  const violations = [];
  const tsxFiles = findFiles(getModDir(modName), /\.tsx$/);
  const seen = new Set();

  const addViolation = (relPath, msg, text) => {
    const key = `${relPath}|${text.trim()}`;
    if (seen.has(key)) return;
    seen.add(key);
    violations.push({ lens: "05", severity: "🟡", file: relPath, msg });
  };

  for (const f of tsxFiles) {
    const rawContent = readFileSafe(f);
    const relPath = getRelativePath(f);
    const content = stripComments(rawContent);
    const toastMatches = content.matchAll(/toast\.(success|error|info|warning)\(\s*["'`][^"'`]{10,}["'`]/g);
    for (const m of toastMatches) {
      addViolation(relPath, `Toast literal hardcodeado: "${m[0]?.substring(0, 60)}". Centralizar en *-texts.constants.ts`, m[0]);
    }

    const tagMatches = content.matchAll(/<([A-Za-z][\w-]*)[^>]*>([^<>{}]{3,})<\/\1>/g);
    for (const m of tagMatches) {
      const tag = m[1];
      const innerText = m[2].trim();
      if (UI_NON_TEXT_TAGS.has(tag)) continue;
      if (innerText.startsWith("${")) continue;
      if (innerText.includes("_TEXTS") || innerText.includes("_MESSAGES") || innerText.includes("_CONFIG") || innerText.includes("_ERRORS")) continue;
      if (!isSpanishText(innerText)) continue;
      addViolation(relPath, `Texto UI hardcodeado en <${tag}>: "${innerText}". Centralizar en *-texts.constants.ts`, innerText);
    }

    // Texto plano entre tags JSX (incluye tags con children anidados, ej: <Button>Proceder al pago <Icon/></Button>)
    const betweenTags = content.matchAll(/>([^<>{}]{3,})</g);
    for (const m of betweenTags) {
      const innerText = m[1].trim();
      if (innerText.startsWith("${")) continue;
      if (innerText.includes("_TEXTS") || innerText.includes("_MESSAGES") || innerText.includes("_CONFIG") || innerText.includes("_ERRORS")) continue;
      if (!isSpanishText(innerText)) continue;
      addViolation(relPath, `Texto UI hardcodeado entre tags: "${innerText}". Centralizar en *-texts.constants.ts`, innerText);
    }

    // Strings literales españoles en expresiones JSX (ternarios, objetos) fuera de imports/props de estilo
    const stringMatches = content.matchAll(/["'`]([^"'`]{2,})["'`]/g);
    for (const m of stringMatches) {
      const str = m[1];
      if (str.includes("${")) continue;
      if (str.includes("<") || str.includes(">")) continue;
      if (str.includes("/") || str.includes("\n") || str.includes("//") || str.includes("/*")) continue;
      if (/^\.[a-z0-9]{2,5}$/i.test(str)) continue;
      // NOTE: hex de tema (#fff, #0e0d0c...) — pertenecen a Lens 22 (color-tokens),
      // no a Lens 05. Centralizarlos en *-texts.constants.ts confundiría
      // valores CSS con copy UI (los *-texts.constants.ts contienen solo textos visibles).
      if (/^#[0-9a-fA-F]{3,8}$/.test(str.trim())) continue;
      // NOTE: selector DOM "body" (gsap.to("body", ...)) — no es texto visible,
      // es un target de animación. No centralizar.
      if (str.trim() === "body") continue;
      // NOTE: config de GSAP CustomEase — el nombre del ease ("custom") y su
      // path ("M0,0,C0,0,1,1,1,1") son API de la librería, no copy traducible.
      if (str.trim() === "custom") continue;
      if (/^M\d[\d,.\sC]*$/.test(str.trim())) continue;
      if (!isSpanishText(str)) continue;
      // Tokens enum/técnicos (shape, sidebar state, html attributes) — no son UI traducible
      if (NON_UI_WORDS.has(str.toLowerCase())) continue;
      // Tipos no se centralizan: useState<"idle" | "saving"> o status: "saved" | "saving" son tipos literales, no runtime
      const lineNum = content.slice(0, m.index).split("\n").length;
      const line = content.split("\n")[lineNum - 1] || "";
      if (/useState\s*<.*["'`]/.test(line) || /:\s*["'`][^"'`]*["'`]\s*\|/.test(line) || /type\s+\w+\s*=.*["'`]/.test(line)) continue;
      // HTML target/rel literals en comparaciones de discriminador de items
      if (NON_UI_WORDS.has(str.toLowerCase())) continue;
      const before = content.slice(Math.max(0, m.index - 80), m.index);
      if (/from\s*["'`]?\s*$/.test(before)) continue;
      if (/\[\s*$/.test(before)) continue;
      if (/(?:className|variant|size|type|orientation|fill|stroke|viewBox|d|color|src|width|height|tabIndex|strokeWidth|strokeLinecap|strokeLinejoin|ref|key|name|id|htmlFor|select|mode)\s*=\s*$/.test(before)) continue;
      // Atributos HTML con valores enumerados fijos: su dominio de valores lo define
      // la spec, no el producto. Centralizarlos en un *-texts.constants.ts seria
      // inventar constantes para algo que no se traduce (p. ej. autoComplete="off").
      if (/(?:autoComplete|autoFocus|inputMode|accept|method|action|encType|role|rel|target|pattern|decoding|loading|colSpan|rowSpan|download|spellCheck)\s*=\s*$/.test(before)) continue;
      // El valor puede venir dentro de un ternario del atributo
      // (`autoComplete={cond ? "off" : "current-password"}`), donde el contexto inmediato
      // es `? ` y no el nombre del atributo. Se resuelve a nivel de linea: si la linea
      // asigna a un atributo enumerado y el literal es un token sin espacios, es un
      // valor de la spec, no copy del producto.
      const ENUMERATED_HTML_ATTRS = /\b(?:autoComplete|autoFocus|inputMode|accept|method|encType|role|rel|pattern|decoding|spellCheck)\s*=/;
      if (ENUMERATED_HTML_ATTRS.test(line) && !/\s/.test(str)) continue;
      if (/(?:title|label|description|heading|placeholder|aria-label|alt|emptyText)\s*=\s*$/.test(before)) continue;
      if (/(?:title|label|description|placeholder|key)\s*:\s*$/.test(before)) continue;
      addViolation(relPath, `String español hardcodeado en expresión JSX: "${str}". Centralizar en *-texts.constants.ts`, str);
    }

    const templateMatches = content.matchAll(/`([^`]*)`/g);
    for (const m of templateMatches) {
      const plainText = m[1].replace(/\$\{[^}]*\}/g, "").trim();
      if (plainText.length < 3) continue;
      if (plainText.includes("_TEXTS") || plainText.includes("_MESSAGES") || plainText.includes("_CONFIG")) continue;
      if (!isSpanishText(plainText)) continue;
      addViolation(relPath, `Template literal con texto hardcodeado: "${plainText}". Centralizar en *-texts.constants.ts`, plainText);
    }

    const propMatches = content.matchAll(/(title|label|description|heading|placeholder|aria-label|alt|emptyText)=["'`]([^"'`]{2,})["'`]/g);
    for (const m of propMatches) {
      if (!isSpanishText(m[2])) continue;
      if (m[2].includes("{")) continue;
      addViolation(relPath, `Prop UI hardcodeada en español: ${m[1]}="${m[2]}". Centralizar en *-texts.constants.ts`, m[2]);
    }

    const objectMatches = content.matchAll(/(title|label|description|placeholder)\s*:\s*["'`]([^"'`]{2,})["'`]/g);
    for (const m of objectMatches) {
      if (!isSpanishText(m[2])) continue;
      addViolation(relPath, `Opción de objeto hardcodeada en español: ${m[1]}: "${m[2]}". Centralizar en *-texts.constants.ts`, m[2]);
    }
  }

  return violations;
}

/**
 * Palabras técnicas en inglés/tailwind que aparecen como valores sueltos
 * (props, estados, variantes) y NUNCA son texto UI en español.
 * Incluye valores de motion (wait/hide/show) que deben permanecer como strings literales.
 */

/**
 * Detecta si un string es texto visible en español vs código/config.
 *
 * Estrategia híbrida:
 * 1. Si tiene acentos españoles (áéíóúñ...) → casi seguro texto visible.
 * 2. Sin acentos → debe tener letras y no matchear patrones de código
 *    (rutas, kebab tailwind, media queries, camelCase, valores técnicos).
 */
function isSpanishText(value) {
  const v = value.trim();
  if (v.length < 3) return false;
  if (/\)\s*return\b/.test(v)) return false;
  if (/[ÁÉÍÓÚÜÑáéíóúüñ]/.test(v)) return true;
  if (!/[a-zñáéíóúü]/i.test(v)) return false;
  if (/[{}\[\]=;<>]/.test(v)) return false;
  if (/:/.test(v)) return false;
  if (/^-|-$/.test(v)) return false;
  if (/\.join\(|\.map\(|\.split\(|\.replace\(|\.filter\(|\.reduce\(|\.test\(|\.match\(/.test(v)) return false;
  if (/--/.test(v)) return false;
  if (/\//.test(v) || /\n/.test(v) || /\/\//.test(v) || /\/\*/.test(v)) return false;
  if (/\|/.test(v)) return false;
  if (/\?/.test(v) && !/¿/.test(v)) return false;
  if (/[\w-]+:\s*[\w(]/.test(v)) return false;
  if (/(?:^|\s)[a-zñáéíóúü]+(?:-[a-z0-9]+)+/i.test(v)) return false;
  if (/[a-z][A-Z]/.test(v)) return false;
  if (/[\d.]+(?:px|vw|vh|%|em|rem|fr)\b/i.test(v)) return false;
  if (/^[\d.,\s$€%+-]+$/.test(v)) return false;
  return !NON_UI_WORDS.has(v.toLowerCase());
}

function lens05CrossModule() {
  const violations = [];
  const allStrings = {};

  for (const mod of getModules()) {
    const files = findFiles(join(MODULES_DIR, mod), /\.(ts|tsx)$/);
    for (const f of files) {
      const content = readFileSafe(f);
      const toastMatches = content.matchAll(/toast\.(success|error|info|warning)\(["'`]([^"'`]+)["'`]/g);
      for (const m of toastMatches) {
        const str = m[2];
        if (!allStrings[str]) allStrings[str] = [];
        allStrings[str].push(getRelativePath(f));
      }
      const ariaMatches = content.matchAll(/aria-label=["'`]([^"'`]+)["'`]/g);
      for (const m of ariaMatches) {
        const str = m[1];
        if (!allStrings[str]) allStrings[str] = [];
        allStrings[str].push(getRelativePath(f));
      }
    }
  }

  for (const [str, sources] of Object.entries(allStrings)) {
    const uniqueModules = [...new Set(sources.map((s) => s.split("/")[2]))];
    if (uniqueModules.length >= 2) {
      violations.push({ lens: "05", severity: "🟠", file: uniqueModules.join(", "), msg: `String duplicado en ≥2 módulos: "${str}". Mover a shared/constants/` });
    }
  }

  return violations;
}

export default function lens05(modName) {
  if (isLibrary(modName)) return [];
  if (getModuleOverride(modName, "05") === true) return [];
  return [...lens05Module(modName), ...lens05UIStrings(modName)];
}

export { lens05CrossModule };
