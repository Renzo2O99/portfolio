#!/usr/bin/env node

import { getModules } from "./audit-lenses/helpers.mjs";
import lens01 from "./audit-lenses/lens01.mjs";
import lens02 from "./audit-lenses/lens02.mjs";
import { lens05CrossModule, lens05Module } from "./audit-lenses/lens05.mjs";
import lens06 from "./audit-lenses/lens06.mjs";
import lens09 from "./audit-lenses/lens09.mjs";
import lens10 from "./audit-lenses/lens10.mjs";
import lens12 from "./audit-lenses/lens12.mjs";
import lens14 from "./audit-lenses/lens14.mjs";
import { lens16, lens17, lens18 } from "./audit-lenses/lens16.mjs";

const targetMod = process.argv[2];

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

  console.log(`\n# Auditoria CLI — Modulo ${modName}`);
  console.log(`\n## Resumen`);
  console.log(`| Metrica | Valor |`);
  console.log(`|---------|-------|`);
  console.log(`| Total violaciones | ${total} |`);
  console.log(`| Criticas | ${critical} |`);
  console.log(`| Mayores | ${major} |`);
  console.log(`| Menores | ${minor} |`);

  for (const [lens, list] of Object.entries(byLens)) {
    const sevMap = { "🔴": 0, "🟠": 0, "🟡": 0 };
    for (const v of list) sevMap[v.severity]++;
    console.log(`\n### Lens ${lens} (${sevMap["🔴"]}c ${sevMap["🟠"]}m ${sevMap["🟡"]}l)`);
    for (const v of list) {
      console.log(`- ${v.severity} \`${v.file}\` — ${v.msg}`);
    }
  }
  console.log(`\n---\n`);
}

const modules = targetMod ? [targetMod] : getModules();

if (!targetMod) {
  console.log(`\nAuditando ${modules.length} modulos. Usa "node scripts/audit-lenses.mjs [modulo]" para uno especifico.\n`);
}

const crossModuleViolations = lens05CrossModule();

for (const mod of modules) {
  const violations = [...lens01(mod), ...lens02(mod), ...lens05Module(mod), ...lens06(mod), ...lens09(mod), ...lens10(mod), ...lens12(mod), ...lens14(mod), ...lens16(mod), ...lens17(mod), ...lens18(mod)];

  printReport(mod, violations);
}

if (!targetMod && crossModuleViolations.length > 0) {
  console.log(`\n# Strings duplicados entre modulos`);
  console.log(`| Modulos | String |`);
  console.log(`|---------|--------|`);
  for (const v of crossModuleViolations) {
    console.log(`| ${v.file} | "${v.msg}" |`);
  }
}
