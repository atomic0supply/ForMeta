/**
 * Normaliza texto para búsquedas: descompone (NFD), elimina diacríticos,
 * pasa a minúsculas y recorta espacios. Compartido por SearchView,
 * StopModal y CommandPalette para que el matching sea consistente.
 */
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
