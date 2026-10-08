import { join } from "node:path";
import { findFiles, getModDir, getRelativePath, MODULES_DIR, readFileSafe } from "./shared.mjs";

/**
 * Lens 25 — Naming con español (namespacing mixto)
 *
 * Detecta identificadores (componentes, funciones, variables, tipos) que mezclan
 * inglés con español: p. ej. `NutricionContent`, `DescripcionContent`,
 * `CategoriaSelect`, `handlePedido`.
 *
 * Regla: TODO identificador debe ser íntegramente en inglés.
 *
 * Estrategia:
 * 1. Tokeniza nombres PascalCase/camelCase en segmentos.
 * 2. Marca segmentos con tildes/ñ (señal inequívoca de español).
 * 3. Compara segmentos lowercase contra un diccionario de raíces españolas
 *    del dominio restaurante que NO son palabras inglesas válidas
 *    (se excluyen préstamos ambiguos: menu, pasta, pizza, chef, total...).
 */

const SPANISH_STEMS = [
  "descripcion",
  "ingrediente",
  "ingredientes",
  "nutricion",
  "categoria",
  "categorias",
  "pedido",
  "pedidos",
  "envio",
  "envios",
  "precio",
  "precios",
  "resena",
  "resenas",
  "eliminar",
  "anadir",
  "anade",
  "disponible",
  "vegetariano",
  "vegetariana",
  "picante",
  "caloria",
  "calorias",
  "proteina",
  "proteinas",
  "carbohidrato",
  "carbohidratos",
  "grasas",
  "fibra",
  "sodio",
  "plato",
  "platos",
  "bebida",
  "bebidas",
  "postre",
  "postres",
  "entrada",
  "entradas",
  "ensalada",
  "ensaladas",
  "busqueda",
  "buscar",
  "filtro",
  "filtros",
  "orden",
  "ordenar",
  "ordenado",
  "compartir",
  "compartido",
  "favorito",
  "favoritos",
  "favorita",
  "horario",
  "horarios",
  "abierto",
  "cerrado",
  "cliente",
  "clientes",
  "mesa",
  "mesas",
  "reservar",
  "reservacion",
  "cancelar",
  "cancelacion",
  "seleccion",
  "seleccionar",
  "mostrar",
  "ocultar",
  "cargando",
  "titulo",
  "subtitulo",
  "cantidad",
  "cantidades",
  "impuesto",
  "impuestos",
  "descuento",
  "cupon",
  "cupones",
  "direccion",
  "telefono",
  "correo",
  "usuario",
  "usuarios",
  "contrasena",
  "sesion",
  "cuenta",
  "cuentas",
  "registro",
  "registrar",
  "iniciar",
  "recuperar",
  "verificar",
  "confirmar",
  "confirmacion",
  "crear",
  "editar",
  "guardar",
  "guardado",
  "nuevo",
  "nueva",
  "existente",
  "personalizado",
  "personalizada",
  "configuracion",
  "opciones",
  "seleccionado",
  "disponibilidad",
  "preparacion",
  "tiempo",
  "minutos",
  "porcion",
  "porciones",
  "guarnicion",
  "adicionales",
  "tamano",
  "pequeno",
  "grande",
  "mediana",
  "complemento",
  "complementos",
  "cambio",
  "cambios",
  "producto",
  "productos",
  "navegacion",
  "seccion",
  "secciones",
  "contenido",
  "encabezado",
  "principal",
  "secundario",
  "alternativo",
  "carrito",
  "comprar",
  "compra",
  "compras",
  "pago",
  "pagos",
  "pagina",
  "paginas",
  "inicio",
  "acerca",
  "contacto",
  "politica",
  "terminos",
  "privacidad",
  "ayuda",
  "preguntas",
  "frecuentes",
  "respuesta",
  "respuestas",
  "notificacion",
  "notificaciones",
  "sugerencia",
  "sugerencias",
  "destacado",
  "destacados",
  "recomendado",
  "recomendados",
  "recientes",
  "populares",
  "valoracion",
  "valoraciones",
  "cerrar",
  "quitar",
  "agregar",
  "listo",
  "seguro",
  "cambiar",
  "configurar",
];

const TILDE_PATTERN = /[áéíóúüñ]/i;

function tokenize(name) {
  const words = name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[\s_]+/);
  return words.map((w) => w.toLowerCase()).filter(Boolean);
}

export default function lens25(modName) {
  const violations = [];
  const modPath = getModDir(modName);
  const files = findFiles(modPath, /\.(ts|tsx)$/);

  for (const f of files) {
    const content = readFileSafe(f);
    const relPath = getRelativePath(f);
    const lines = content.split("\n");

    const namePatterns = [
      /export\s+(?:default\s+)?(?:async\s+)?function\s+(\w+)/g,
      /(?:^|\s)function\s+(\w+)/g,
      /export\s+(?:const|let|var)\s+(\w+)/g,
      /(?:^|[\s;,])(?:const|let|var)\s+(\w+)\s*=/g,
      /export\s+type\s+(\w+)/g,
      /export\s+interface\s+(\w+)/g,
      /(?:^|\s)type\s+(\w+)\s*=/g,
      /(?:^|\s)interface\s+(\w+)\s*[{\s]/g,
    ];

    for (const pattern of namePatterns) {
      for (const m of content.matchAll(pattern)) {
        const name = m[1];
        if (!name || name.length <= 2) continue;
        if (/^(id|db|e|a|b|ctx|env|fs)$/i.test(name)) continue;

        const tokens = tokenize(name);
        const spanishToken = tokens.find((t) => SPANISH_STEMS.includes(t));
        const tildeToken = tokens.find((t) => TILDE_PATTERN.test(t));

        if (tildeToken) {
          violations.push({
            lens: "25",
            severity: "🟠",
            file: relPath,
            msg: `Identificador "${name}" contiene "${tildeToken}" con tilde/ñ (español). Renombrar a inglés (p. ej. "${name.replace(new RegExp(tildeToken, "i"), "X")}")`,
          });
        } else if (spanishToken) {
          violations.push({
            lens: "25",
            severity: "🟡",
            file: relPath,
            msg: `Identificador "${name}" usa token español "${spanishToken}". Debe ser íntegramente en inglés (p. ej. "${spanishToken === "descripcion" ? name.replace(/descripcion/gi, "description") : name}")`,
          });
        }
      }
    }
  }

  return violations;
}
