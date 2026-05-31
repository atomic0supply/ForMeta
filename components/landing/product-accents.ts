/**
 * Paleta de accents por producto.
 * Cada producto recibe un color de la paleta ForMeta que lo identifica
 * sin romper la cohesión visual. Vive fuera de ProductLayoutShell
 * (que es "use client") para que también puedan importarlo Server
 * Components como ProductosSection.
 */
export const PRODUCT_ACCENTS = {
  axon:  { color: "#b8896a", rgb: "184, 137, 106", strong: "#8d6448" }, // terra · sistema nervioso
  lumen: { color: "#d9a35a", rgb: "217, 163, 90",  strong: "#b07a0a" }, // ámbar · luz, calle
  core:  { color: "#7a9aaa", rgb: "122, 154, 170", strong: "#4d7185" }, // sea · estructural, plataforma
  nest:  { color: "#8fa892", rgb: "143, 168, 146", strong: "#5a8a5e" }, // sage · nido, hogar
  field: { color: "#8d6448", rgb: "141, 100, 72",  strong: "#6f4a36" }, // terra deep · tierra, campo
} as const;

export type ProductSlug = keyof typeof PRODUCT_ACCENTS;
