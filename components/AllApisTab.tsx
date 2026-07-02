"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { subscribeToProjects, type Project } from "@/lib/projects";
import {
  subscribeToAllExternalApis,
  type ApiEnvironment,
  type ExternalApiWithProject,
} from "@/lib/externalApis";
import { expiryLabel, expiryStatus } from "@/lib/expiry";
import styles from "@/styles/intranet-servicios.module.css";

const ENV_LABELS: Record<ApiEnvironment, string> = {
  prod: "Producción",
  test: "Test",
  dev: "Dev",
};

export function AllApisTab() {
  const [apis, setApis] = useState<ExternalApiWithProject[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Nombres de proyecto en un Map; se guarda también en un ref para que la
  // suscripción collectionGroup no se rehaga cada vez que cambia su identidad.
  const projectNames = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [projects]);

  const projectNamesRef = useRef(projectNames);
  useEffect(() => {
    projectNamesRef.current = projectNames;
  }, [projectNames]);

  useEffect(() => {
    const unsub = subscribeToProjects(setProjects);
    return unsub;
  }, []);

  useEffect(() => {
    // Suscripción única: los nombres se resuelven a través del ref.
    const unsub = subscribeToAllExternalApis(
      (data) => {
        setApis(data);
        setLoading(false);
      },
      (projectId) => projectNamesRef.current.get(projectId) ?? null,
    );
    return unsub;
  }, []);

  const sorted = useMemo(() => {
    // APIs with an expiry first (soonest first), then the rest.
    return [...apis].sort((a, b) => {
      if (a.expiresAt && b.expiresAt) return a.expiresAt.localeCompare(b.expiresAt);
      if (a.expiresAt) return -1;
      if (b.expiresAt) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [apis]);

  return (
    <div>
      <div className={styles.topBar}>
        <span className={styles.cellMuted}>{apis.length} APIs en todos los proyectos</span>
      </div>

      {loading ? (
        <p className={styles.empty}>Cargando…</p>
      ) : apis.length === 0 ? (
        <p className={styles.empty}>
          No hay APIs registradas en ningún proyecto.<br />
          Añádelas desde la pestaña “APIs” de cada proyecto.
        </p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>API</th>
                <th className={styles.th}>Proveedor</th>
                <th className={styles.th}>Entorno</th>
                <th className={styles.th}>Proyecto</th>
                <th className={styles.th}>Caduca</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((api) => {
                const status = expiryStatus(api.expiresAt ?? "");
                return (
                  <tr key={`${api.projectId}-${api.id}`} className={styles.tr} data-status={status}>
                    <td className={`${styles.td} ${styles.cellName}`}>{api.name}</td>
                    <td className={styles.td}>{api.provider || <span className={styles.cellEmpty}>—</span>}</td>
                    <td className={styles.td}>
                      <span className={styles.envBadge} data-env={api.environment ?? "prod"}>
                        {ENV_LABELS[api.environment ?? "prod"]}
                      </span>
                    </td>
                    <td className={styles.td}>
                      {api.projectId ? (
                        <Link href={`/intranet/proyectos/${api.projectId}`} className={styles.projectLink}>
                          {/* Resolución en render: cubre el caso de que los proyectos lleguen después de las APIs. */}
                          {projectNames.get(api.projectId) ?? api.projectName ?? api.projectId}
                        </Link>
                      ) : (
                        <span className={styles.cellEmpty}>—</span>
                      )}
                    </td>
                    <td className={styles.td}>
                      <span className={styles.expiryCell}>
                        <span className={styles.expiryDot} data-status={status} />
                        <span className={styles.expiryText} data-status={status}>{expiryLabel(api.expiresAt ?? "")}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
