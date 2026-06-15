"use client";

import { useState } from "react";

import { DomainsView } from "@/components/DomainsView";
import { ServicesTab } from "@/components/ServicesTab";
import { LicensesTab } from "@/components/LicensesTab";
import { AllApisTab } from "@/components/AllApisTab";
import styles from "@/styles/intranet-servicios.module.css";

type Tab = "dominios" | "servicios" | "licencias" | "api";

const TABS: { key: Tab; label: string }[] = [
  { key: "dominios", label: "Dominios" },
  { key: "servicios", label: "Servicios" },
  { key: "licencias", label: "Licencias" },
  { key: "api", label: "API" },
];

export function ServicesView() {
  const [activeTab, setActiveTab] = useState<Tab>("dominios");

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>Intranet</p>
          <h1 className={styles.title}>Servicios</h1>
        </div>
      </div>

      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "dominios" && <DomainsView />}
      {activeTab === "servicios" && <ServicesTab />}
      {activeTab === "licencias" && <LicensesTab />}
      {activeTab === "api" && <AllApisTab />}
    </div>
  );
}
