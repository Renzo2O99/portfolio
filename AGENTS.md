# AGENTS.md — portfolio

## Stack
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Lenguaje**: TypeScript 5 (strict, `noUncheckedIndexedAccess`)
- **Runtime**: React 19, Node.js 22+
- **Animaciones**: GSAP 3 + CustomEase, SplitType, Swiper
- **3D / Canvas**: Three.js, @react-three/fiber, @react-three/drei, @react-three/postprocessing, @splinetool/r3f-spline
- **Formularios & Validación**: React Hook Form + Zod
- **Email / API**: Resend
- **Estilos**: Tailwind CSS + utilidad `cn()` (clsx + tailwind-merge)
- **UI**: Componentes shadcn (Base UI / Radix primitives adaptados)
- **Gestor de paquetes**: pnpm

---

## Comandos Clave
```bash
# Desarrollo
pnpm dev                 # Next.js con Turbopack
pnpm build               # Build de producción
pnpm start               # Servidor de producción

# Verificación de tipos y calidad
pnpm typecheck           # tsc --noEmit
pnpm lint:lenses         # Auditoría con el motor de lenses
pnpm audit:exceptions    # Auditoría de excepciones técnicas con timeline
```

---

## Workflow shadcn (staging → parts)

**Regla:** shadcn NUNCA instala directamente en `common/ui/parts/`. Siempre pasa por staging.

### Flujo
```bash
# 1. Instalar componente crudo en staging
npx shadcn add <componente>

# 2. Analizar y adaptar en staging/
# 3. Mover versión corregida a parts/
mv src/common/ui/shadcn-staging/<componente>.tsx src/common/ui/parts/

# 4. Eliminar residuos de staging
rm src/common/ui/shadcn-staging/*
```

### Reglas de fragmentación y refactorización (obligatorias)
1. **NUNCA reemplazar el componente por uno propio:** La fragmentación extrae sub-componentes o separa responsabilidades manteniendo el núcleo de shadcn.
2. **NUNCA plagiar de otras fuentes:** No copiar implementaciones de terceros salvo que shadcn lo use.
3. **Preservar comportamiento:** Mantener idénticas props públicas, variantes CVA, tipos exportados y accesibilidad ARIA.
4. **Límites de líneas:** UI < 250 líneas, Hooks < 200 líneas, Utilidades < 100 líneas.
5. **Método de lectura (obligatorio):** Leer un solo archivo a la vez para no saturar el contexto.

---

## Documentación de Next.js para Agentes IA

### Regla de oro
**Este NO es el Next.js de datos de entrenamiento.** Puede tener breaking changes. Leer SIEMPRE la guía relevante en `node_modules/next/dist/docs/` antes de escribir cualquier código.

### Docs empaquetadas (versionadas)
Next.js 16 empaqueta su documentación en `node_modules/next/dist/docs/`. Los agentes tienen acceso a documentación fiel a la versión instalada sin requerir red.

### 🚨 Alerta de actualización de Next.js (OBLIGATORIA)
Si el proyecto NO está en **Next.js 16.3 o superior**, el agente DEBE:
1. Enviar una alerta de actualización al usuario indicando versión actual, requerida y motivo.
2. **NUNCA actualizar manualmente** sin autorización explícita del usuario.
3. Esperar la decisión del usuario.

---

## Arquitectura (Screaming Architecture + DAG)

```
app/ → modules/ → common/ → shared/ (+ infrastructure/ al margen)
```

### Reglas de Dependencia (estrictas)
- ✅ Superior → Inferior
- ❌ Inferior → Superior
- ❌ Módulo ↔ Módulo (usar API pública: `index.ts`, `server.ts`, `server-ui.ts`)
- ❌ `common/` importa de `modules/` e `infrastructure/`
- ✅ `common/` PUEDE importar de `shared/` (singletons estables + utils sin estado)
- ❌ `shared/` importa de `common/`, `modules/` (valor) e `infrastructure/` — es hoja pura (solo react/third-party + tipos de `modules/`). La aciclidad se garantiza por lens 07 §10, no por diagrama.

### Estructura de Módulo (cada módulo en `src/modules/<dominio>/`)
```
actions/          # *.action.ts (server actions)
hooks/            # use-*.ts (hooks cliente, kebab-case)
lib/              # kebab-case.ts (lógica de dominio)
models/           # *.schema.ts (schemas Zod) / *.types.ts (tipos TypeScript)
store/            # use-*.store.ts (Zustand, debe empezar con use-)
ui/
  forms/          # Componentes Smart (gestión de estado, hooks)
  parts/          # Componentes Dumb (props + eventos)
  cards/          # Variantes visuales de entidad
  sections/       # Server/Client Components para orquestar zonas
  skeletons/      # Loading states
```

### Triple Frontera (API Pública por módulo)
| Archivo | Exporta | Prohíbe |
|---------|---------|---------|
| `index.ts` | API cliente (componentes UI, hooks, tipos) | Código servidor, Server Components, secrets |
| `server.ts` | Server Actions y funciones de backend | Componentes cliente, hooks |
| `server-ui.ts` | Server Components para capas superiores | Componentes cliente con estado, Server Actions |

---

## Convenciones de Nombrado (estrictas)

| Tipo | Patrón | Ejemplo |
|------|--------|---------|
| Componente | `PascalCase.tsx` | `ProjectCard.tsx` |
| Hook | `use-kebab-case.ts` | `use-fullpage-nav.ts` |
| Action | `verb-noun.action.ts` | `send-email.action.ts` |
| Store | `use-dominio.store.ts` | `use-portfolio.store.ts` |
| Config | `*.config.ts` | `site.config.ts` |
| Util (pura) | `*.util.ts` | `format-date.util.ts` |
| Schema (Zod) | `*.schema.ts` | `contact.schema.ts` |
| Types (TS) | `*.types.ts` | `work.types.ts` |

**Carpetas prohibidas**: `core/`, `helpers/`, `manager/`, `controller/`, `utils/` (plural), `components/` dentro de `ui/`. Usar `internal/` para lógica privada del módulo.

### Idioma de Constantes (obligatorio)
| Elemento | Idioma | Ejemplo |
|----------|--------|---------|
| Keys de constantes (`*_TEXTS`, `*_MESSAGES`) | **Inglés** `SCREAMING_SNAKE_CASE` | `BUTTON_SUBMIT`, `ERROR_REQUIRED_FIELD` |
| Valores de textos de UI | Español / Inglés según i18n | `"Enviar Mensaje"`, `"Let's talk"` |

---

## Reglas Críticas de Código

### Cero Tolerancia
- ❌ `any` (explícito o implícito) — usar tipos concretos o `unknown` con validación Zod/type guards
- ❌ `as Type` casts que enmascaren problemas de tipo sin guard previo
- ❌ Non-null `!` assertions sin guards de validación
- ❌ `@ts-ignore` / `@ts-expect-error` sin bloque `EXCEPTION/PLAN/TIMELINE`
- ❌ Barrel files internos (`index.ts` dentro de subdirectorios de módulo)
- ❌ Imports directos a rutas internas de otros módulos o capas

### Server Actions
- Patrón obligatorio: **Validar (Zod) → Autorizar (si aplica) → Ejecutar → Retornar `{ success, data?, error? }`**.
- Input validado mediante `schema.safeParse()`.

### Imports
- Entre módulos: absoluto `@/modules/...`
- Capas globales: `@/common`, `@/shared`
- Dentro del mismo módulo: relativo `./`, `../`

### Clasificación UI (Brújula)
| Pregunta | `forms/` | `parts/` |
|----------|----------|----------|
| ¿Tiene lógica de negocio? | Sí | No |
| ¿Llama hooks/actions? | Sí | No (solo props) |
| Consumidores | Feature local | >2 contextos |

---

## Límites de Archivo
| Tipo | Líneas | Responsabilidades |
|------|--------|-------------------|
| Componente UI | 250 | 1 principal |
| Server Action | 150 | 1 operación de dominio |
| Hook | 200 | 1 preocupación |
| Utilidad pura | 100 | 1 propósito |
| Store | 300 | 1 dominio |

---

## Convención de Botones y Formularios
- **Botones en Diálogos**: Cancelar IZQUIERDA (`outline`/`ghost`), acción primaria DERECHA (`default`/`destructive`).
- **Checkboxes**: El área clickeable es TODO el contenedor — envolver `Checkbox` + texto en `<label htmlFor>` con `cursor-pointer` y `hover:bg-accent/30`.

---

## Metodología de Implementación (9 Fases Obligatorias)

```
PLANIFICAR → LEER → REFINAR → IMPLEMENTAR → VERIFICAR → REVISAR → CORREGIR → PROBAR → DOCUMENTAR
```

---

## Metodología de Corrección (Lotes Pequeños) — OBLIGATORIA

Al corregir advertencias de lenses (`pnpm lint:lenses`):
1. **NO leer el contexto completo** de golpe.
2. **Seleccionar 3-5 violaciones** del mismo archivo o patrón.
3. **Leer únicamente el contexto necesario**.
4. **Aplicar los fixes** del lote.
5. **Verificar**: `pnpm typecheck`.
6. **Re-ejecutar el lens** del módulo para confirmar la reducción.
7. **Repetir** con el siguiente lote.

---

## Verificación Empírica y Honestidad del Agente

### Honestidad: observado ≠ deducido (obligatorio)
1. **Etiquetar cada afirmación con su fuente:**
   - `[observado]` — capturado en navegador real (`agent-browser`) o logs reales
   - `[reproducido]` — confirmado con reproducción simulada (tsx + mocks)
   - `[deducido]` — hipótesis por análisis estático. NUNCA presentarla como hecho.
2. **NUNCA afirmar evidencia de navegador sin haberla capturado.**
3. **Pitfall de serialización (`.toString()` en scripts inline):** funciones inyectadas en `<head>` que referencien variables no serializadas producen `ReferenceError` en runtime. Validar siempre scripts inline.

---

## Protocolo de Excepciones Técnicas

Toda excepción a las reglas debe documentarse con el siguiente formato:

```typescript
// EXCEPCIÓN: [Razón técnica explícita]
// PLAN: [Estrategia para resolverla o refactorizarla]
// TIMELINE: [Q1/Q2/Q3/Q4 YYYY]
```

Toda excepción sin `TIMELINE` se considera deuda técnica no gestionada.

---

## Referencias de la Constitución y Lentes
- Reglas completas en `.opencode/constitution/` (`00-role.md` a `14-skills.md`).
- Lentes de auditoría en `.opencode/lenses/` (`01-topography.md` a `32-no-permanent-exception.md`).
- Workflows operacionales en `.opencode/workflows/`.
