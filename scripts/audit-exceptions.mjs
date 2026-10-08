#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const EXT = /\.(ts|tsx)$/;
const IGNORE_DIRS = /^\.(?!\.)|node_modules|dist|build|\.git/;

function findFiles(dir) {
  const result = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.test(entry.name)) result.push(...findFiles(full));
      } else if (EXT.test(entry.name)) {
        result.push(full);
      }
    }
  } catch {}
  return result;
}

function extractBlocks(content) {
  const blocks = [];
  const lines = content.split("\n");
  let cur = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t.startsWith("//")) {
      cur.push({ n: i + 1, text: t, raw: lines[i] });
    } else {
      if (cur.length && cur.some((l) => l.text.includes("EXCEPTION"))) blocks.push(cur);
      cur = [];
    }
  }
  if (cur.length && cur.some((l) => l.text.includes("EXCEPTION"))) blocks.push(cur);
  return blocks;
}

function validate(block, file) {
  const r = { file, line: block[0].n, exception: null, plan: null, timeline: null, violations: [] };
  for (const l of block) {
    if (/^\/\/\s*EXCEPTION\s*:/.test(l.text)) r.exception = l.text.replace(/^\/\/\s*EXCEPTION\s*:\s*/, "").trim();
    else if (/^\/\/\s*PLAN\s*:/.test(l.text)) r.plan = l.text.replace(/^\/\/\s*PLAN\s*:\s*/, "").trim();
    else if (/^\/\/\s*TIMELINE\s*:/.test(l.text)) r.timeline = l.text.replace(/^\/\/\s*TIMELINE\s*:\s*/, "").trim();
  }

  if (!r.exception) r.violations.push("EXCEPTION ausente");
  if (!r.plan) r.violations.push("PLAN ausente");
  if (!r.timeline) r.violations.push("TIMELINE ausente");
  else if (!/^(Q[1-4]\s+\d{4}|N\/A)/i.test(r.timeline.trim())) r.violations.push(`TIMELINE con formato inválido: "${r.timeline}". Debe ser "Q1-Q4 YYYY" o "N/A"`);

  // NOTE: check order — EXCEPTION before PLAN before TIMELINE
  const order = block
    .filter((l) => /^\s*\/\/\s*(EXCEPTION|PLAN|TIMELINE)\s*:/.test(l.text))
    .map((l) => {
      if (/EXCEPTION/.test(l.text)) return "E";
      if (/PLAN/.test(l.text)) return "P";
      return "T";
    });
  const expected = order.filter((x) => x === "E" || x === "P" || x === "T");
  const correctOrder = ["E", "P", "T"];
  let idx = 0;
  for (const o of expected) {
    if (o === correctOrder[idx]) idx++;
  }
  if (idx !== correctOrder.filter((x) => expected.includes(x)).length && r.exception && r.plan && r.timeline) {
    r.violations.push("Orden incorrecto: debe ser EXCEPTION → PLAN → TIMELINE");
  }

  return r;
}

// NOTE: main
const files = findFiles(SRC);
const correct = [];
const violations = [];

for (const f of files) {
  const blocks = extractBlocks(readFileSync(f, "utf-8"));
  for (const b of blocks) {
    const r = validate(b, relative(ROOT, f));
    (r.violations.length ? violations : correct).push(r);
  }
}

console.log("# 🔍 Auditoría de EXCEPTION Comments\n");

console.log("## 📊 Resumen\n");
console.log("| Métrica | Valor |");
console.log("|---------|-------|");
console.log(`| Total EXCEPTION blocks | ${correct.length + violations.length} |`);
console.log(`| Correctas | ${correct.length} ✅ |`);
console.log(`| Violaciones | ${violations.length} ❌ |\n`);

if (violations.length) {
  console.log("## ❌ Violaciones\n");
  for (const v of violations) {
    console.log(`### ${v.file} (L${v.line})`);
    console.log("| Campo | Detalle |");
    console.log("|-------|--------|");
    console.log(`| EXCEPTION | ${v.exception || "❌ Ausente"} |`);
    console.log(`| PLAN | ${v.plan || "❌ Ausente"} |`);
    console.log(`| TIMELINE | ${v.timeline || "❌ Ausente"} |`);
    console.log(`| Problemas | ${v.violations.join("; ")} |\n`);
  }
}

if (correct.length) {
  console.log("## ✅ Excepciones Correctas\n");
  for (const c of correct) {
    console.log(`- \`${c.file}:${c.line}\` — ${c.exception}`);
  }
  console.log();
}
