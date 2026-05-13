import Link from "next/link";

import { BrandWordmark } from "@/components/BrandWordmark";
import styles from "@/styles/footer-access.module.css";

export function FooterAccess() {
  return (
    <footer className={styles.footer}>
      <p className={styles.kicker}>© 2025 ForMeta · Mallorca, Illes Balears</p>
      <span className={styles.brandWrap}>
        <BrandWordmark variant="sand" size="sm" />
      </span>
      <p className={styles.note}>
        Software &amp; AI · formeta.es ·{" "}
        <Link href="/login" className={styles.access}>
          FM/INT
        </Link>
      </p>
    </footer>
  );
}
