// NOTE: lens-35-cache-hydration.mjs — Detecta escrituras raw a keys de TanStack
// cuya forma está contratada, fuera del módulo dueño.
// NOTE: Origen: notes/page.tsx hidrataba notebookQueryKeys.list() con el array
// plano mientras useNotebooks espera el wrapper GetNotebooksResult. El select
// lo descartaba como [] y al volver atrás se mostraba "biblioteca vacía".
// NOTE: Solo flag keys con dualidad conocida; noteQueryKeys.list() acepta el
// array mapeado (hook y pages coinciden), así que no se incluye.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const APP_DIR = join(ROOT, "src", "app");

// NOTE: key -> helper obligatorio (importado desde el server.ts del módulo dueño).
const OWNED_KEYS = [{ key: "notebookQueryKeys", helper: "hydrateNotebookListCache", from: "@/modules/notebooks/server" }];

function scanFile(filePath, violations) {
  const relPath = relative(ROOT, filePath).replace(/\\/g, "/");
  let content = "";
  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    return;
  }
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*\/\//.test(line)) continue;
    for (const owned of OWNED_KEYS) {
      if (line.includes("setQueryData") && line.includes(owned.key)) {
        violations.push({
          lens: "35",
          severity: "🟠",
          file: `${relPath}:${i + 1}`,
          msg: `Escritura raw a ${owned.key} fuera del módulo dueño (envenena la key si la forma difiere). Usar ${owned.helper} desde ${owned.from}`,
        });
      }
    }
  }
}

function scanDir(dir, violations) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(full, violations);
    } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
      scanFile(full, violations);
    }
  }
}

export function lens35CacheHydrationGlobal() {
  const violations = [];
  scanDir(APP_DIR, violations);
  return violations;
}

export default function lens35() {
  return [];
}
