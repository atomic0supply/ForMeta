// Canonical intranet module keys used for role-based access control.
// Shared by the sidebar (nav gating), the roles manager (permission checkboxes)
// and useCurrentUser (resolving which modules a user can see).

export type ModuleKey =
  | "dashboard"
  | "flujo"
  | "proyectos"
  | "tickets"
  | "clientes"
  | "propuestas"
  | "comunicaciones"
  | "fiscal"
  | "tiempo"
  | "ideas"
  | "links"
  | "servicios"
  | "equipo"
  | "buscar";

export type ModuleDef = {
  key: ModuleKey;
  label: string;
  href: string;
};

// Order roughly follows the sidebar grouping.
export const MODULES: ModuleDef[] = [
  { key: "dashboard", label: "Dashboard", href: "/intranet" },
  { key: "flujo", label: "Flujo", href: "/intranet/equipo/flujo" },
  { key: "proyectos", label: "Proyectos", href: "/intranet/proyectos" },
  { key: "tickets", label: "Tickets", href: "/intranet/tickets" },
  { key: "clientes", label: "Clientes", href: "/intranet/clientes" },
  { key: "propuestas", label: "Propuestas", href: "/intranet/propuestas" },
  { key: "comunicaciones", label: "Comunicaciones", href: "/intranet/comunicaciones" },
  { key: "fiscal", label: "Fiscal", href: "/intranet/fiscal" },
  { key: "tiempo", label: "Tiempo", href: "/intranet/tiempo" },
  { key: "ideas", label: "Ideas", href: "/intranet/ideas" },
  { key: "links", label: "Links", href: "/intranet/links" },
  { key: "servicios", label: "Servicios", href: "/intranet/servicios" },
  { key: "equipo", label: "Equipo", href: "/intranet/equipo" },
  { key: "buscar", label: "Buscar", href: "/intranet/buscar" },
];

export const ALL_MODULE_KEYS: ModuleKey[] = MODULES.map((m) => m.key);

export const MODULE_LABELS: Record<ModuleKey, string> = MODULES.reduce(
  (acc, m) => {
    acc[m.key] = m.label;
    return acc;
  },
  {} as Record<ModuleKey, string>,
);

// Equipo is always admin-only and is not granted via dynamic roles.
export const ADMIN_ONLY_MODULES: ModuleKey[] = ["equipo"];
