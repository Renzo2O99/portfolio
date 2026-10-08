import { join } from "node:path";
import { findFiles, getModDir, getRelativePath, MODULES_DIR, readFileSafe } from "./shared.mjs";

/**
 * Actions publicas verificadas: la lens exige `getAuthUser`, pero el caso es legitimo
 * y esta documentado en el TSDoc de la propia accion. No anadir comentarios
 * EXCEPTION en el codigo de produccion para silenciar un detector: la exclusion vive
 * aqui. Registradas en AGENTS.md > Gotchas Comunes > 12.
 *
 * `revoke-note-lock-sessions`: solo expira cookies `note_lock_*` del propio navegador
 * (no toca BD ni datos de terceros) y DEBE ejecutarse con la sesion ya caducada, que es
 * justo cuando `getAuthUser` fallaria.
 */
const PUBLIC_ACTIONS_WITHOUT_AUTH = new Set(["src/modules/auth/actions/revoke-note-lock-sessions.action.ts"]);

export default function lens18(modName) {
  const violations = [];
  const modPath = getModDir(modName);
  const actionFiles = findFiles(modPath, /\.action\.ts$/);
  const errorCodesByModule = {};

  for (const f of actionFiles) {
    const content = readFileSafe(f);
    const relPath = getRelativePath(f);
    const fileName = f.split(/[/\\]/).pop();

    const fnDecl = content.match(/export async function (\w+)/);
    const fnName = fnDecl ? fnDecl[1] : fileName;
    let hasParams = false;
    if (fnDecl) {
      const afterName = content.slice(fnDecl.index + fnDecl[0].length);
      const openP = afterName.indexOf("(");
      if (openP !== -1) {
        let depth = 1;
        let closeP = openP + 1;
        while (depth > 0 && closeP < afterName.length) {
          if (afterName[closeP] === "(") depth++;
          if (afterName[closeP] === ")") depth--;
          closeP++;
        }
        const paramsStr = afterName.slice(openP + 1, closeP - 1).trim();
        hasParams = paramsStr.length > 0;
      }
    }

    const isPublic = /public/i.test(fnName) || PUBLIC_ACTIONS_WITHOUT_AUTH.has(relPath.replace(/\\/g, "/"));
    const isSignOut = /sign-?out/i.test(fnName);
    const hasException = /\/\/\s*EXCEPTION\s*:/.test(content) && /\/\/\s*PLAN\s*:/.test(content) && /\/\/\s*TIMELINE\s*:/.test(content);

    const hasSafeParse = content.includes("safeParse");
    const hasInputSchema = content.includes("inputSchema");
    const isSafeActionPattern = /\.(?:inputSchema|bindArgsSchemas)\(/.test(content) || /(?:safeActionClient|authActionClient|adminActionClient)\.(?:use|useValidated|inputSchema|action)\(/.test(content);
    const hasValidatedAuth = /useValidated\(authActionMiddleware\)/.test(content) && /ctx\.user/.test(content);
    const hasGetAuthUser =
      content.includes("getAuthUser") ||
      content.includes("safeGetAuthUser") ||
      content.includes("requireAdminAuth") ||
      content.includes("requireServerSession") ||
      content.includes("requireSuperAdminAuth") ||
      content.includes("authorizeCartAction") ||
      /(?:authActionClient|adminActionClient)\./.test(content) ||
      hasValidatedAuth;
    const hasReturn = content.includes("return {") || isSafeActionPattern;

    if (!hasSafeParse && !hasInputSchema && hasParams) {
      violations.push({ lens: "18", severity: "🟠", file: relPath, msg: `Action "${fnName}" recibe parámetros pero no tiene validación Zod (safeParse)` });
    }

    if (!hasGetAuthUser && !isPublic && !isSignOut && !hasException) {
      violations.push({ lens: "18", severity: "🔴", file: relPath, msg: `Action "${fnName}" sin autorización (getAuthUser)` });
    }

    if (!hasReturn) {
      violations.push({ lens: "18", severity: "🟠", file: relPath, msg: `Action "${fnName}" sin retorno estructurado { success, data?, error? }` });
    }

    if (hasSafeParse && !content.includes(".safeParse(") && !hasException) {
      violations.push({ lens: "18", severity: "🟡", file: relPath, msg: `Action "${fnName}" safeParse mencionado pero sin llamada (.safeParse())` });
    }

    const paramTypeMatch = content.match(/export async function \w+\(\s*(\w+)\s*:\s*(\w+)\s*\)/);
    if (paramTypeMatch) {
      const paramType = paramTypeMatch[2];
      const ALLOWED_TYPES = ["unknown", "string", "number", "boolean", "File", "FormData"];
      if (!ALLOWED_TYPES.includes(paramType) && !paramType.startsWith("$") && !paramType.endsWith("]")) {
        violations.push({ lens: "18", severity: "🟠", file: relPath, msg: `Parámetro "${paramTypeMatch[1]}" tipado como "${paramType}". Debe ser "unknown" con safeParse` });
      }
    }

    const inlineSchema = content.match(/const\s+\w+Schema\s*=\s*z\./);
    if (inlineSchema) {
      violations.push({ lens: "18", severity: "🟠", file: relPath, msg: `Schema Zod definido inline en la action. Debe estar en models/*.schema.ts e importarse` });
    }

    const errorCodes = [...content.matchAll(/code:\s*["']([A-Z_]+)["']/g)].map((m) => m[1]);
    for (const code of errorCodes) {
      if (!errorCodesByModule[modName]) errorCodesByModule[modName] = new Map();
      if (!errorCodesByModule[modName].has(code)) errorCodesByModule[modName].set(code, []);
      errorCodesByModule[modName].get(code).push({ code, file: relPath });
    }
  }

  if (errorCodesByModule[modName]) {
    const codeGroups = new Map();
    for (const [code, locations] of errorCodesByModule[modName]) {
      if (!codeGroups.has(code)) codeGroups.set(code, []);
      codeGroups.get(code).push(...locations);
    }

    const allCodes = [...codeGroups.entries()];
    const AUTH_CODES = ["UNAUTHENTICATED", "UNAUTHORIZED", "FORBIDDEN", "SESSION_EXPIRED", "TOKEN_INVALID"];

    for (let i = 0; i < allCodes.length; i++) {
      for (let j = i + 1; j < allCodes.length; j++) {
        const [codeA, locsA] = allCodes[i];
        const [codeB, locsB] = allCodes[j];

        const isAuthCodeA = AUTH_CODES.includes(codeA);
        const isAuthCodeB = AUTH_CODES.includes(codeB);

        if (isAuthCodeA && isAuthCodeB && codeA !== codeB) {
          violations.push({
            lens: "18",
            severity: "🟠",
            file: locsA[0].file,
            msg: `Error codes de auth inconsistentes: "${codeA}" vs "${codeB}". Unificar en todas las actions del módulo`,
          });
        }

        const similar = codeA.replace(/_/g, "").toLowerCase() === codeB.replace(/_/g, "").toLowerCase();
        if (similar && codeA !== codeB) {
          violations.push({
            lens: "18",
            severity: "🟠",
            file: locsA[0].file,
            msg: `Error codes inconsistentes: "${codeA}" vs "${codeB}". Unificar naming en todas las actions del módulo`,
          });
        }
      }
    }
  }

  return violations;
}
