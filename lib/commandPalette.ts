/**
 * Mini event bus para abrir/cerrar el Command Palette desde cualquier sitio.
 * El componente <CommandPalette /> escucha estos eventos a nivel ventana.
 */

const OPEN_EVENT = "roqueta-command-palette-open";

export function openCommandPalette(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

export function subscribeToCommandPalette(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(OPEN_EVENT, handler);
  return () => window.removeEventListener(OPEN_EVENT, handler);
}
