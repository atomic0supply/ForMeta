"use client";

import { useEffect, useMemo, useState } from "react";

import { subscribeToClients, type Client } from "@/lib/clients";
import { subscribeToProjects, type Project } from "@/lib/projects";
import { subscribeToProposals, type Proposal } from "@/lib/proposals";
import { subscribeToClientMailOutbox, type ClientMailOutbox } from "@/lib/clientNotifications";
import { isTicketClosed, subscribeToTickets, type Ticket } from "@/lib/tickets";
import { subscribeInvoices, type Invoice } from "@/lib/fiscal";
import styles from "@/styles/intranet-flujo.module.css";

type StageMetric = { value: number | null; sub: string };

type StageDef = {
  id: string;
  index: string;
  label: string;
  x: number;
  y: number;
};

// Layout serpentina: fila 1 izq→der (1-4), fila 2 der→izq (5-8).
const NODE_W = 200;
const NODE_H = 92;
const ROW1_Y = 48;
const ROW2_Y = 280;

const STAGES: StageDef[] = [
  { id: "cliente", index: "01", label: "Cliente", x: 24, y: ROW1_Y },
  { id: "proyecto", index: "02", label: "Proyecto", x: 298, y: ROW1_Y },
  { id: "propuesta", index: "03", label: "Propuesta", x: 572, y: ROW1_Y },
  { id: "respuesta", index: "04", label: "Respuesta", x: 846, y: ROW1_Y },
  { id: "desarrollo", index: "05", label: "Desarrollo", x: 846, y: ROW2_Y },
  { id: "informar", index: "06", label: "Informar", x: 572, y: ROW2_Y },
  { id: "feedback", index: "07", label: "Feedback", x: 298, y: ROW2_Y },
  { id: "factura", index: "08", label: "Factura", x: 24, y: ROW2_Y },
];

// Aristas (paths) entre etapas consecutivas, en orden del flujo.
const EDGES: string[] = [
  "M224,94 L298,94",
  "M498,94 L572,94",
  "M772,94 L846,94",
  "M946,140 L946,280",
  "M846,326 L772,326",
  "M572,326 L498,326",
  "M298,326 L224,326",
];

export function WorkflowView() {
  const [clients, setClients] = useState<Client[] | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [mails, setMails] = useState<ClientMailOutbox[] | null>(null);
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const unsubs = [
      subscribeToClients(setClients),
      subscribeToProjects(setProjects),
      subscribeToProposals(setProposals),
      subscribeToClientMailOutbox(setMails),
      subscribeToTickets(setTickets),
      subscribeInvoices(setInvoices),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  const metrics = useMemo<Record<string, StageMetric>>(() => {
    const count = <T,>(arr: T[] | null, pred: (x: T) => boolean): number | null =>
      arr ? arr.filter(pred).length : null;

    const leads = count(clients, (c) => c.status === "lead");
    const activos = count(clients, (c) => c.status === "activo");

    return {
      cliente: { value: leads, sub: `${activos ?? "—"} activos` },
      proyecto: {
        value: count(projects, (p) => p.status === "activo"),
        sub: `${projects?.length ?? "—"} en total`,
      },
      propuesta: {
        value: count(proposals, (p) => p.status === "sent"),
        sub: `${count(proposals, (p) => p.status === "draft") ?? "—"} borradores`,
      },
      respuesta: {
        value: count(proposals, (p) => p.status === "accepted"),
        sub: `${count(proposals, (p) => p.status === "rejected") ?? "—"} rechazadas`,
      },
      desarrollo: {
        value: count(projects, (p) => p.status === "activo"),
        sub: "proyectos en curso",
      },
      informar: {
        value: count(mails, (m) => m.status === "sent"),
        sub: `${count(mails, (m) => m.status === "draft" || m.status === "approved") ?? "—"} en cola`,
      },
      feedback: {
        value: count(tickets, (t) => !isTicketClosed(t)),
        sub: `${count(tickets, (t) => t.status === "esperando_cliente") ?? "—"} esp. cliente`,
      },
      factura: {
        value: count(
          invoices,
          (i) => i.status === "issued" && i.paymentStatus === "pending",
        ),
        sub: "pendientes de cobro",
      },
    };
  }, [clients, projects, proposals, mails, tickets, invoices]);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>Intranet</p>
          <h1 className={styles.title}>Flujo de trabajo</h1>
        </div>
        <p className={styles.lede}>
          Del primer contacto a la factura. Cada etapa muestra datos reales en tiempo real.
        </p>
      </div>

      <div className={styles.canvas}>
        <svg className={styles.graph} viewBox="0 0 1094 440" preserveAspectRatio="xMidYMid meet">
          {/* aristas */}
          {EDGES.map((d, i) => (
            <path key={`edge-${i}`} className={styles.edge} d={d} />
          ))}

          {/* pulsos (omitidos con reduced-motion) */}
          {!reduceMotion &&
            EDGES.map((d, i) => (
              <circle key={`pulse-${i}`} className={styles.pulse} r="3.5">
                <animateMotion
                  dur="2.6s"
                  begin={`${i * 0.32}s`}
                  repeatCount="indefinite"
                  path={d}
                />
              </circle>
            ))}

          {/* nodos */}
          {STAGES.map((stage) => {
            const metric = metrics[stage.id];
            const value = metric?.value;
            return (
              <g key={stage.id}>
                <rect
                  className={styles.node}
                  x={stage.x}
                  y={stage.y}
                  width={NODE_W}
                  height={NODE_H}
                  rx="12"
                />
                <text className={styles.nodeIndex} x={stage.x + 18} y={stage.y + 26}>
                  {`// ${stage.index}`}
                </text>
                <text className={styles.nodeLabel} x={stage.x + 18} y={stage.y + 46}>
                  {stage.label}
                </text>
                <text className={styles.nodeValue} x={stage.x + NODE_W - 18} y={stage.y + 50}>
                  {value === null || value === undefined ? "—" : value}
                </text>
                <text className={styles.nodeSub} x={stage.x + 18} y={stage.y + 74}>
                  {metric?.sub ?? ""}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className={styles.legend}>
        <span className={styles.legendItem}>El número grande es el foco de cada etapa.</span>
        <span className={styles.legendItem}>Actualización en vivo desde Clientes, Proyectos, Propuestas, Comunicaciones, Tickets y Fiscal.</span>
      </div>
    </div>
  );
}
