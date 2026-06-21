import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { TicketSeverity } from "@/lib/ticketAi";

export type TicketTemplateKey =
  | "acknowledgement"
  | "requestMoreInfo"
  | "receivedIncident"
  | "workaround"
  | "close"
  | "reopen";

export type TicketSlaSetting = {
  firstResponseHours: number;
  resolutionHours: number;
};

export type TicketMailProvider = "gmail";

// Firmas configurables por buzón.
//  - support: texto plano, se precarga al final de las respuestas de tickets.
//  - client: HTML (contenido interior del pie) de las notificaciones a clientes.
export type MailSignatures = {
  support: string;
  client: string;
};

export type TicketMailSettings = {
  supportEmail: string;
  fromName: string;
  publicBaseUrl: string;
  provider: TicketMailProvider;
  gmailUser: string; // buzón Workspace que la cuenta de servicio impersona
  supportAlias: string; // solo se crean tickets de correos dirigidos a este alias
  clientFromEmail: string; // remitente de las notificaciones a clientes (alias send-as)
  clientFromName: string;
  pollSeconds: number;
  maxAttachmentMb: number;
  reopenWindowDays: number;
  sla: Record<TicketSeverity, TicketSlaSetting>;
  templates: Record<TicketTemplateKey, string>;
  signatures: MailSignatures;
  updatedAt?: unknown;
};

// Firma por defecto de support@ (texto plano). El delimitador estándar «-- » lo
// añade el compositor; aquí solo va el contenido del bloque.
export const DEFAULT_SUPPORT_SIGNATURE =
  "Equipo de Soporte · Formeta\nsupport@formeta.es · formeta.es";

// Firma/pie por defecto de info@ (HTML del contenido interior del pie). Reproduce
// el markup que estaba fijo en clientMailTemplates.ts para que el render sea
// idéntico hasta que se edite. Espejo deliberado de DEFAULT_CLIENT_FOOTER_HTML.
export const DEFAULT_CLIENT_SIGNATURE =
  '<strong style="color:#2c2c28;font-family:Georgia,\'Times New Roman\',serif;font-size:14px;">Formeta</strong><br>' +
  '<a href="mailto:info@formeta.es" style="color:#b8896a;text-decoration:none;">info@formeta.es</a> · ' +
  '<a href="https://formeta.es" style="color:#b8896a;text-decoration:none;">formeta.es</a>';

export const DEFAULT_TICKET_SETTINGS: TicketMailSettings = {
  supportEmail: "support@formeta.es",
  fromName: "Formeta Soporte",
  publicBaseUrl: "https://formeta.es/intranet/tickets",
  provider: "gmail",
  gmailUser: "formeta@formeta.es",
  supportAlias: "support@formeta.es",
  clientFromEmail: "info@formeta.es",
  clientFromName: "Formeta",
  pollSeconds: 60,
  maxAttachmentMb: 20,
  reopenWindowDays: 14,
  sla: {
    low: { firstResponseHours: 24, resolutionHours: 240 },
    medium: { firstResponseHours: 8, resolutionHours: 120 },
    high: { firstResponseHours: 4, resolutionHours: 72 },
    critical: { firstResponseHours: 2, resolutionHours: 24 },
  },
  templates: {
    acknowledgement:
      "Hola {{name}},\n\nHemos recibido tu mensaje y hemos creado el ticket {{ticketNumber}}.\nEl equipo de Formeta lo revisara y respondera en este mismo hilo.\n\nGracias,\nFormeta",
    requestMoreInfo:
      "Hola {{name}},\n\nGracias por avisarnos. Para poder revisar {{ticketNumber}}, necesitamos estos datos:\n\n{{missingInfo}}\n\nGracias,\nFormeta",
    receivedIncident:
      "Hola {{name}},\n\nHemos revisado {{ticketNumber}} y estamos trabajando en ello. Te avisaremos en cuanto tengamos una actualizacion.\n\nGracias,\nFormeta",
    workaround:
      "Hola {{name}},\n\nMientras resolvemos {{ticketNumber}}, puedes probar esta solucion temporal:\n\n{{workaround}}\n\nGracias,\nFormeta",
    close:
      "Hola {{name}},\n\nDamos por resuelto el ticket {{ticketNumber}}. Si vuelve a ocurrir, responde a este correo y lo reabrimos.\n\nGracias,\nFormeta",
    reopen:
      "Hola {{name}},\n\nHemos reabierto el ticket {{ticketNumber}} y lo revisamos de nuevo.\n\nGracias,\nFormeta",
  },
  signatures: {
    support: DEFAULT_SUPPORT_SIGNATURE,
    client: DEFAULT_CLIENT_SIGNATURE,
  },
};

function mergeSettings(raw: Partial<TicketMailSettings> | undefined): TicketMailSettings {
  return {
    ...DEFAULT_TICKET_SETTINGS,
    ...raw,
    sla: {
      ...DEFAULT_TICKET_SETTINGS.sla,
      ...(raw?.sla ?? {}),
    },
    templates: {
      ...DEFAULT_TICKET_SETTINGS.templates,
      ...(raw?.templates ?? {}),
    },
    signatures: {
      ...DEFAULT_TICKET_SETTINGS.signatures,
      ...(raw?.signatures ?? {}),
    },
  };
}

export function subscribeToTicketSettings(
  callback: (settings: TicketMailSettings) => void,
): Unsubscribe {
  if (!db) return () => {};
  return onSnapshot(doc(db, "ticketSettings", "system"), (snap) => {
    callback(mergeSettings(snap.data() as Partial<TicketMailSettings> | undefined));
  });
}

export async function saveTicketSettings(
  settings: TicketMailSettings,
): Promise<void> {
  if (!db) throw new Error("Firebase no disponible");
  await setDoc(
    doc(db, "ticketSettings", "system"),
    {
      ...settings,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
