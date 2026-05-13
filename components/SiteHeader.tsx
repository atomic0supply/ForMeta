"use client";

import { useEffect, useState } from "react";

import styles from "@/styles/site-header.module.css";

const sections = [
  { id: "identidad", label: "Identidad" },
  { id: "servicios", label: "Servicios" },
  { id: "iapps", label: "IApps" },
  { id: "contacto", label: "Contacto" },
] as const;

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("identidad");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (!elements.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target.id) {
          setActiveSection(visible.target.id);
        }
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.2, 0.35, 0.5, 0.7],
      },
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={styles.header}
      data-scrolled={scrolled ? "true" : "false"}
    >
      <a className={styles.wordmark} href="#top" aria-label="ForMeta - inicio">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/wordmark-dots.svg"
          alt="ForMeta"
          className={styles.wordmarkImg}
          width={160}
          height={75}
        />
      </a>
      <nav className={styles.nav} aria-label="Principal">
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className={section.id === "contacto" ? styles.cta : undefined}
            data-active={activeSection === section.id ? "true" : "false"}
            aria-current={activeSection === section.id ? "location" : undefined}
          >
            {section.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
