#!/usr/bin/env node

import lens01, { lens01Global } from "./lens-01-topography.mjs";
import lens02 from "./lens-02-smart-dumb.mjs";
import lens03 from "./lens-03-naming.mjs";
import lens04 from "./lens-04-coherence.mjs";
import lens05, { lens05CrossModule } from "./lens-05-strings.mjs";
import lens06 from "./lens-06-environment.mjs";
import lens07, { lens07AppImports, lens07CycleGraph, lens07DeepImportNotExported } from "./lens-07-dependencies.mjs";
import lens08 from "./lens-08-triple-border.mjs";
import lens09 from "./lens-09-module-extraction.mjs";
import lens10 from "./lens-10-security.mjs";
import lens11 from "./lens-11-error-handling.mjs";
import lens12 from "./lens-12-type-safety.mjs";
import lens13 from "./lens-13-histology.mjs";
import lens14 from "./lens-14-performance.mjs";
import lens15 from "./lens-15-accessibility.mjs";
import lens16, { lens16Global } from "./lens-16-comment-hygiene.mjs";
import lens17 from "./lens-17-dead-code.mjs";
import lens27, { lens27Global } from "./lens-27-eslint-exception.mjs";
import lens18 from "./lens-18-cross-module.mjs";
import lens19 from "./lens-19-fragmentation.mjs";
import lens20 from "./lens-20-new-module.mjs";
import lens21 from "./lens-21-cohesion-scatter.mjs";
import { lens22ColorTokensGlobal } from "./lens-22-color-tokens.mjs";
import { lens23RadiusTokensGlobal } from "./lens-23-radius-tokens.mjs";
import { lens24TypographyTokensGlobal } from "./lens-24-typography-tokens.mjs";
import lens25 from "./lens-25-spanish-naming.mjs";
import { lens26ComponentNamingGlobal } from "./lens-26-component-naming.mjs";
import lens28 from "./lens-28-actions-purity.mjs";
import lens29 from "./lens-29-component-purity.mjs";
import lens30 from "./lens-30-motion-props.mjs";
import { lens31ErrorBoundariesGlobal } from "./lens-31-error-boundaries.mjs";
import { lens32NoPermanentExceptionGlobal } from "./lens-32-no-permanent-exception.mjs";
import lens33 from "./lens-33-imports-top.mjs";
import lens34 from "./lens-34-inline-object-cast.mjs";
import { lens35CacheHydrationGlobal } from "./lens-35-cache-hydration.mjs";
import { getModules, isLibrary, getModuleOverride } from "./shared.mjs";

/**
 * Lenses aplicables a librerías compartidas (common, shared, infrastructure).
 * Se excluyen lenses de dominio: 09 (extracción de módulos), 10 (auth/IDOR),
 * 11 (error boundaries de módulos), 18 (consistencia cross-module),
 * 20 (nuevo módulo), 21 (cohesión scatter).
 */
const LIBRARY_APPLICABLE_LENSES = new Set([
  "01", "02", "03", "04", "05", "06", "07", "08",
  "12", "13", "14", "15", "16", "17", "19", "25", "27", "31", "33", "34",
]);

function printReport(modName, violations) {
  const byLens = {};
  for (const v of violations) {
    if (!byLens[v.lens]) byLens[v.lens] = [];
    byLens[v.lens].push(v);
  }

  const total = violations.length;
  const critical = violations.filter((v) => v.severity === "🔴").length;
  const major = violations.filter((v) => v.severity === "🟠").length;
  const minor = violations.filter((v) => v.severity === "🟡").length;

  console.log(`\n# 🔍 Auditoría CLI — Módulo ${modName}`);
  console.log(`\n## 📊 Resumen`);
  console.log(`| Métrica | Valor |`);
  console.log(`|---------|-------|`);
  console.log(`| Total violaciones | ${total} |`);
  console.log(`| Críticas (🔴) | ${critical} |`);
  console.log(`| Mayores (🟠) | ${major} |`);
  console.log(`| Menores (🟡) | ${minor} |`);

  for (const [lens, list] of Object.entries(byLens)) {
    const sevMap = { "🔴": 0, "🟠": 0, "🟡": 0 };
    for (const v of list) sevMap[v.severity]++;

    console.log(`\n### Lens ${lens} (🔴${sevMap["🔴"]} 🟠${sevMap["🟠"]} 🟡${sevMap["🟡"]})`);

    for (const v of list) {
      console.log(`- ${v.severity} \`${v.file}\` — ${v.msg}`);
    }
  }

  console.log(`\n---`);
  console.log(`_Para excluir falsos positivos, añadir al script._\n`);
}

function main() {
  const targetMod = process.argv[2];
  const modules = targetMod ? [targetMod] : getModules();

  if (!targetMod) {
    console.log(`\nAuditando ${modules.length} módulos. Usa "node scripts/lens/runner.mjs [modulo]" para uno específico.\n`);
  }

  const crossModuleViolations = lens05CrossModule();
  const newModuleViolations = lens20();
  const cohesionViolations = lens21();
  const colorTokensViolations = lens22ColorTokensGlobal();
  const radiusTokensViolations = lens23RadiusTokensGlobal();
  const typographyTokensViolations = lens24TypographyTokensGlobal();
  const globalViolations = lens01Global();
  const commentHygieneViolations = lens16Global();
  const appImportsViolations = lens07AppImports();
  const cycleViolations = lens07CycleGraph();
  const deepNotExportedViolations = lens07DeepImportNotExported();
  const componentNamingViolations = lens26ComponentNamingGlobal();
  const eslintExceptionViolations = lens27Global();
  const errorBoundariesViolations = lens31ErrorBoundariesGlobal();
  const noPermanentExceptionViolations = lens32NoPermanentExceptionGlobal();
  const cacheHydrationViolations = lens35CacheHydrationGlobal();

  for (const mod of modules) {
    const isLib = isLibrary(mod);
    const violations = [
      ...lens01(mod),
      ...lens02(mod),
      ...lens03(mod),
      ...lens04(mod),
      ...lens05(mod),
      ...lens06(mod),
      ...lens07(mod),
      ...lens08(mod),
      ...(isLib ? [] : lens09(mod)),
      ...(isLib ? [] : lens10(mod)),
      ...(isLib ? [] : lens11(mod)),
      ...lens12(mod),
      ...lens13(mod),
      ...lens14(mod),
      ...lens15(mod),
      ...(isLib ? [] : lens16(mod)),
      ...lens27(mod),
      ...lens17(mod),
      ...lens28(mod),
      ...lens29(mod),
      ...lens30(mod),
      ...lens33(mod),
      ...lens34(mod),
      ...(isLib ? [] : lens18(mod)),
      ...lens19(mod),
      ...(isLib ? [] : lens25(mod)),
      ...filterByModule(crossModuleViolations, mod, isLib),
      ...filterByModule(newModuleViolations, mod, isLib),
      ...filterByModule(cohesionViolations, mod, isLib),
      ...filterByModule(globalViolations, mod, isLib),
      ...filterByModule(colorTokensViolations, mod, isLib),
      ...filterByModule(radiusTokensViolations, mod, isLib),
      ...filterByModule(typographyTokensViolations, mod, isLib),
      ...filterByModule(commentHygieneViolations, mod, isLib),
      ...filterByModule(eslintExceptionViolations, mod, isLib),
      ...filterByModule(appImportsViolations, mod, isLib),
      ...filterByModule(cycleViolations, mod, isLib),
      ...filterByModule(deepNotExportedViolations, mod, isLib),
      ...filterByModule(componentNamingViolations, mod, isLib),
      ...filterByModule(errorBoundariesViolations, mod, isLib),
      ...filterByModule(noPermanentExceptionViolations, mod, isLib),
      ...filterByModule(cacheHydrationViolations, mod, isLib),
    ].filter((v) => !isLib || LIBRARY_APPLICABLE_LENSES.has(v.lens)).filter((v) => getModuleOverride(mod, v.lens) !== true);

    printReport(mod, violations);
  }

  const allGlobalViolations = [
    ...crossModuleViolations,
    ...newModuleViolations,
    ...cohesionViolations,
    ...globalViolations,
    ...colorTokensViolations,
    ...radiusTokensViolations,
    ...typographyTokensViolations,
    ...commentHygieneViolations,
    ...eslintExceptionViolations,
    ...appImportsViolations,
    ...cycleViolations,
    ...deepNotExportedViolations,
    ...componentNamingViolations,
    ...errorBoundariesViolations,
    ...noPermanentExceptionViolations,
    ...cacheHydrationViolations,
  ];
  const unassigned = allGlobalViolations.filter(
    (v) => !modules.some((mod) => filterByModule([v], mod, isLibrary(mod)).length > 0)
  );
  if (unassigned.length > 0 && !targetMod) {
    printReport("app + common (fuera de módulos)", unassigned);
  }
}

/**
 * Filtra violaciones de lenses globales para que solo incluyan archivos
 * pertenecientes al módulo objetivo.
 *
 * Los `file` de los lenses globales usan formatos variados:
 * - "src/modules/<mod>/..." (rutas largas relativas a ROOT)
 * - "<mod>/..." (rutas cortas relativas a modules/)
 * - "mod1, mod2" (lens05CrossModule: lista de módulos involucrados)
 */
function filterByModule(violations, targetMod, isLib = false) {
  return violations.filter((v) => {
    const file = v.file || "";
    const normalized = file.replace(/\\/g, "/");
    if (normalized === targetMod) return true;
    if (normalized.startsWith(`${targetMod}/`)) return true;
    if (normalized.startsWith(`src/modules/${targetMod}/`)) return true;
    if (isLib && normalized.startsWith(`src/${targetMod}/`)) return true;
    if (normalized.split(",").map((part) => part.trim()).includes(targetMod)) return true;
    const msg = v.msg || "";
    if (msg.includes(`"${targetMod}"`)) return true;
    return false;
  });
}

main();
