# AGENTS.md — portfolio

## Stack
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Lenguaje**: TypeScript 5 (strict, `noUncheckedIndexedAccess`)
- **Runtime**: React 19, Node.js 22+
- **Animaciones**: GSAP 3 + CustomEase, SplitType, Swiper
- **3D / Canvas**: Three.js, @react-three/drei, @react-three/postprocessing, @splinetool/r3f-spline
- **Formularios & Validación**: React Hook Form + Zod
- **Email / API**: Resend
- **Estilos**: Tailwind CSS 3/4 + utilidad `cn()` (clsx + tailwind-merge)
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
pnpm lint:lenses         # Auditoría con el motor de 35 lenses
pnpm audit:exceptions    # Auditoría de excepciones técnicas con timeline
```

---

## Arquitectura y DAG (Grafo Acíclico Dirigido)

### Regla de dependencia estricta:
`app → modules → shared/infrastructure → common`

- **Superior PUEDE importar de inferior.** Inferior NUNCA importa de superior.
- **`common/` NUNCA importa de `modules/`, `shared/` ni `infrastructure/`.**
- **`shared/` NUNCA importa de `modules/`** (excepto tipos/interfaces sin lógica).
- **Módulos NUNCA importan directamente de módulos hermanos** → usar API pública (`index.ts`) o patrones de desacoplamiento (Slot Injection, Prop Injection, hooks en `shared/`).

---

## Estructura Semántica de Módulos

```
src/ (o raíz)
├── modules/<feature>/
│   ├── index.ts              # Frontera pública del módulo (SOLO re-exports)
│   ├── server.ts             # API pública de servidor (si aplica)
│   ├── actions/              # Server Actions (*.action.ts)
│   ├── hooks/                # Custom hooks (use-*.ts)
│   ├── lib/                  # Lógica de dominio del módulo
│   ├── models/               # Tipos, interfaces y schemas Zod
│   └── ui/                   # Subcarpetas semánticas (Brújula UI)
│       ├── forms/            # Smart: gestiona estado, llama hooks, coordina flujo
│       ├── parts/            # Dumb: solo props + eventos, sin lógica de negocio
│       ├── cards/            # Variantes visuales de una entidad
│       ├── sections/         # Server/Client Components para orquestar zonas
│       └── skeletons/        # Loading states de la feature
├── common/
│   └── ui/
│       ├── parts/            # Componentes shadcn auditados (Button, Dialog, Input...)
│       └── shadcn-staging/   # Área temporal de preparación de shadcn
├── infrastructure/           # Configs externas, integraciones, cliente API/mail
└── app/                      # Rutas Next.js (App Router)
```

---

## Workflow shadcn (staging → parts)

**Regla:** shadcn NUNCA instala directamente en `common/ui/parts/`. Siempre pasa por staging.

```bash
# 1. Instalar componente crudo en staging
npx shadcn add <componente>

# 2. Analizar y adaptar en shadcn-staging/
# 3. Mover versión corregida a parts/
mv src/common/ui/shadcn-staging/<componente>.tsx src/common/ui/parts/

# 4. Eliminar residuos de staging
rm src/common/ui/shadcn-staging/*
```

### Reglas de fragmentación y refactorización
1. **NUNCA reemplazar el componente por uno propio:** La fragmentación extrae sub-componentes o separa responsabilidades manteniendo el núcleo de shadcn.
2. **Preservar comportamiento:** Mantener idénticas props públicas, variantes CVA, tipos exportados y accesibilidad ARIA.
3. **Límites de líneas:** UI < 250 líneas, Hooks < 200 líneas, Utilidades < 100 líneas.

---

## Constitución del Auditor: 35 Lenses de Calidad

| Lente | Nombre | Descripción |
|-------|--------|-------------|
| **Lens 01** | Topografía | Estructura de carpetas obligatorias y prohibidas |
| **Lens 02** | Smart/Dumb | Separación limpia entre UI con estado (`forms/`) y presentacional (`parts/`) |
| **Lens 03** | Naming | Convenciones de nombres (`PascalCase.tsx`, `use-*.ts`, etc.) |
| **Lens 04** | Coherencia | Cohesión conceptual de archivos y módulos |
| **Lens 05** | Strings | Extracción y centralización de textos y mensajes |
| **Lens 06** | Environment | Validación de variables de entorno y prevención de fugas |
| **Lens 07** | Dependencias | DAG estricto, detección de dependencias circulares |
| **Lens 08** | Triple Border | Validación de fronteras de API pública (`index.ts`, `server.ts`) |
| **Lens 09** | Module Extraction | Detección de módulos que deben ser extraídos |
| **Lens 10** | Seguridad | Prevención de vulnerabilidades, IDOR y datos sensibles |
| **Lens 11** | Error Handling | Error Boundaries, fallbacks y manejo de errores robusto |
| **Lens 12** | Type Safety | Cero `any`, uso de `unknown` con Zod/type guards |
| **Lens 13** | Histología | Cohesión interna de funciones y hooks |
| **Lens 14** | Performance | Memoización consciente, lazy loading, bundles |
| **Lens 15** | Accesibilidad | ARIA labels, navegación por teclado, contraste |
| **Lens 16** | Comment Hygiene | Comentarios solo con razón técnica, sin ruido |
| **Lens 17** | Dead Code | Detección y eliminación de código muerto/huérfano |
| **Lens 18** | Cross-Module | Prohibición de imports directos entre módulos hermanos |
| **Lens 19** | Fragmentación | División limpia de archivos que superen los umbrales |
| **Lens 20** | New Module | Protocolo para la creación de nuevos módulos |
| **Lens 21** | Cohesion Scatter | Concentración de responsabilidades |
| **Lens 22** | Color Tokens | Uso de variables CSS/design tokens en lugar de hex hardcodeados |
| **Lens 23** | Radius Tokens | Uso de tokens de borde redondeado |
| **Lens 24** | Typography Tokens | Escala tipográfica uniforme |
| **Lens 25** | Spanish Naming | Consistencia idiomática en el naming |
| **Lens 26** | Component Naming | Archivos `PascalCase.tsx` |
| **Lens 27** | ESLint Exception | Control y limpieza de deshabilitaciones de lint |
| **Lens 28** | Actions Purity | Server Actions con validación Zod y manejo de retorno |
| **Lens 29** | Component Purity | Componentes libres de efectos secundarios no controlados |
| **Lens 30** | Motion Props | Propagación controlada de animaciones GSAP/Motion |
| **Lens 31** | Error Boundaries | Boundaries por módulo y rutas críticas |
| **Lens 32** | No Permanent Exception | Toda excepción técnica debe tener timeline |
| **Lens 33** | Imports Top | Imports limpios al inicio del archivo |
| **Lens 34** | Inline Object Cast | Evitar casteos forzados de objetos |
| **Lens 35** | Cache & Hydration | Prevención de FOUC, layout shifts y desajustes de hidratación |

---

## Protocolo de Excepciones Técnicas

Toda excepción a las reglas de lentes debe documentarse estrictamente con el siguiente formato:

```typescript
// EXCEPCIÓN: [Razón técnica explícita]
// PLAN: [Estrategia para resolverla o refactorizarla]
// TIMELINE: [Q1/Q2/Q3/Q4 YYYY]
```

Cualquier excepción sin `TIMELINE` es considerada deuda técnica no gestionada.

---

## Verificación Empírica y Calidad de Código
- **CERO TOLERANCIA a `any`** en TypeScript.
- **`pnpm typecheck`** obligatorio antes de dar por terminada cualquier tarea.
- **Observado ≠ Deducido:** Validar bugs de renderizado, animaciones y layout empíricamente en el viewport real.
