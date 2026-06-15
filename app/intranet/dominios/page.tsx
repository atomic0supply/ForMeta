import { redirect } from "next/navigation";

// "Dominios" se ha integrado dentro del módulo "Servicios" como una pestaña.
export default function DomainsPage() {
  redirect("/intranet/servicios");
}
