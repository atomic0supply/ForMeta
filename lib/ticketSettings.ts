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

export type TicketMailSettings = {
  supportEmail: string;
  fromName: string;
  publicBaseUrl: string;
  provider: TicketMailProvider;
  gmailUser: string; // buzón Workspace que la cuenta de servicio impersona
  pollSeconds: number;
  maxAttachmentMb: number;
  reopenWindowDays: number;
  sla: Record<TicketSeverity, TicketSlaSetting>;
  templates: Record<TicketTemplateKey, string>;
  updatedAt?: unknown;
};

export const DEFAULT_TICKET_SETTINGS: TicketMailSettings = {
  supportEmail: "help@formeta.es",
  fromName: "Formeta Soporte",
  publicBaseUrl: "https://formeta.es/intranet/tickets",
  provider: "gmail",
  gmailUser: "help@formeta.es",
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
