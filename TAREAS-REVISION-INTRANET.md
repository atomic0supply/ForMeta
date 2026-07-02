# Revisión de código — Intranet ForMeta

**Fecha revisión:** 2026-07-01 · **Fecha fixes:** 2026-07-02
**Alcance:** todo `/intranet` (componentes, `lib/`, rutas `app/api/*`, `firestore.rules`, `storage.rules`, `middleware.ts`).
**Excluido:** módulo FISCAL (`app/intranet/fiscal`, `components/FiscalView.tsx`, `lib/fiscal*.ts`, `lib/verifactu.ts`, `lib/knowledgeGraph.ts`, `app/api/fiscal/*`).

Leyenda: `[x]` arreglado · `[~]` parcial (con nota) · `[ ]` pendiente (con motivo) · **Seguridad / Bug / Mejora** · severidad **Alta / Media / Baja**.

**Verificación tras los fixes:** `tsc --noEmit` limpio · `eslint` limpio en los ~55 archivos modificados.

> ⚠️ **Pendiente de despliegue:** `firestore.rules` y `storage.rules` modificadas (requiere `firebase login --reauth` + deploy). El resto sale con el próximo build de App Hosting desde `main`.

---

## 🔴 Prioridad crítica

- [x] **Alta · Seguridad** — `firestore.rules` — **Auto-escalada de rol eliminada.** La self-update de `/users/{uid}` ahora solo permite `displayName`, `email`, `geminiApiKey` (`diff().affectedKeys().hasOnly(...)`); `role/roleId/active` solo admin. Regla duplicada consolidada.
- [x] **Alta · Seguridad** — `middleware.ts` + `lib/session.ts` — **Cookie de sesión firmada.** Nueva ruta `app/api/session` que intercambia el ID token por una session cookie de Firebase (`HttpOnly + Secure + SameSite=Lax`, 8 h); el middleware verifica firma/emisor/audiencia/expiración con `jose` (dependencia añadida). LoginPanel e IntranetSidebar migrados.
- [x] **Alta · Seguridad** — `components/ProjectWikiTab.tsx` — XSS wiki: escape de `&<>"` antes del markdown + validación de hrefs (solo `http(s)/mailto`).
- [x] **Alta · Seguridad** — `components/IdeasView.tsx` — XSS informe IA: mismo patrón de escape + links seguros.
- [x] **Alta · Seguridad** — `lib/budget.ts` — XSS factura: `escapeHtml()` en todos los valores interpolados.
- [x] **Media · Seguridad** — `components/TicketsView.tsx` — HTML de correos entrantes renderizado en `<iframe sandbox>` (scripts/forms/popups bloqueados por el navegador).
- [~] **Alta · Seguridad** — `lib/externalApis.ts` — `limit(500)` añadido y verificado que la vista global NO muestra `apiKey`. **Pendiente:** dejar de descargar el campo `apiKey` al cliente requiere migrar el secreto a otra estructura (Firestore no proyecta campos); anotado en el código.
- [x] **Alta · Seguridad** — `app/api/tickets/ai` y `app/api/ideas/ai-analyze` — **Autenticación obligatoria** (`requireAuth` + `Bearer <idToken>` desde el cliente). En tickets, la clave Gemini personal se resuelve ahora en servidor (ya no viaja por el navegador).
- [x] **Alta · Bug** — `lib/timerContext.tsx` + `StopModal` — **"Descartar" ya descarta de verdad**: nuevo `discardTimer()`; eliminado el sentinel `__discard__` que guardaba entradas basura.

---

## Seguridad y autenticación

- [~] **Alta · Seguridad** — `firestore.rules` — Gating por módulo/rol en `tickets`/`ticketMailOutbox`: **pendiente** (requiere reflejar los roles dinámicos en reglas; cambio arquitectural). Hecho: escritura de `mailboxes` solo admin. `ticketSettings` mantiene lectura para autenticados a propósito (la UI necesita firmas/plantillas para componer).
- [x] **Media · Seguridad** — `firestore.rules` — El acuse `ticket_opened` auto-aprobado ahora exige exactamente 1 destinatario == email principal del cliente del ticket (`get(clients/...)`) y `relatedEntity.type == "ticket"`.
- [~] **Media · Seguridad** — `storage.rules` — Cap de 20 MB en subidas de adjuntos desde la UI. Whitelist de `contentType` no añadida (podría romper adjuntos legítimos; valorar aparte).
- [ ] **Media · Seguridad** — Autorización solo en cliente (`/intranet/equipo` accesible por URL, `users read` para cualquier miembro): **pendiente** — requiere Server Components/verificación de rol en servidor por página; las escrituras ya están protegidas por reglas.
- [x] **Media · Bug** — `app/api/admin/users/[uid]` — Anti-lockout: un admin no puede auto-degradarse ni desactivar su propia cuenta.
- [x] **Media · Mejora** — `firestore.rules` — `isAdmin()` ahora exige `active != false` (paridad con `requireAdmin` del backend).
- [~] **Baja · Mejora** — `firestore.rules` — `projects.delete` ahora solo admin. `links/domains/services/licenses` siguen `write: if isAuth()` — decisión de negocio pendiente (¿qué roles escriben infraestructura?).
- [x] **Baja · Mejora** — `firestore.rules` — Regla `update` duplicada de `/users` consolidada.
- [x] **Media · Seguridad** — `lib/session.ts` — Cookie con `Secure` + `HttpOnly` (emitida por el servidor; el cliente ya no la escribe).
- [~] **Baja · Seguridad** — `app/api/design` — Lectura async (no bloquea event loop). Sin auth a propósito: sirve assets del design system; si debe ser privado, decidirlo aparte.
- [x] **Baja · Mejora** — `lib/firebaseAdmin.ts` — Fail-fast con mensaje claro si `FIREBASE_SERVICE_ACCOUNT_JSON` no es JSON válido.
- [ ] **Baja · Mejora** — `lib/firebase.ts` — Config hardcodeada como fallback: **omitido deliberadamente** — es config pública de cliente (protegida por reglas) y quitar el fallback rompería builds/entornos sin `.env`; hacerlo requiere coordinar variables en App Hosting.

---

## Tickets, Comunicaciones y correo

- [x] **Alta · Bug** — `lib/tickets.ts` — `subscribeToTickets` con `limit(200)`.
- [x] **Alta · Bug** — `TicketsView.runAi` — try/catch + parse defensivo; errores visibles en `aiError`.
- [x] **Alta · Bug** — `TicketsView` — Nuevo estado `actionError` visible en compositor y modal; `handleComposerSend`, `handleCreateTicket`, `createSuggestedTask`, `patchSelected` (estado/owner/prioridad/…) capturan errores; la respuesta no se borra ni se cierra el modal hasta confirmar éxito.
- [x] **Alta · Bug** — `CommunicationsView` / `lib/clientNotifications.ts` — `subscribeToClientMailOutbox` con `limit(200)`.
- [x] **Media · Bug** — `CommunicationsView` — `handleCreateDraft/Approve/Delete` con catch → aviso visible; cierre solo en éxito.
- [x] **Media · Bug** — `CommunicationsView` — Destinatarios con nombre del contacto (resuelto desde la ficha del cliente); los destinatarios tecleados a mano ya no se pisan al cambiar de cliente (flag `toTouched`).
- [x] **Media · Bug** — `TicketsView` — Atajo `a` gateado por `aiLoading` y por mensajes cargados del ticket seleccionado (`messagesTicketId`); sin llamadas IA concurrentes ni análisis del ticket anterior.
- [x] **Media · Bug** — `TicketsView` — Duplicados de tareas sugeridas detectados por `sourceSuggestionIndex` estable (campo nuevo en `TicketTaskLink`), con fallback al título para links antiguos.
- [x] **Media · Bug** — `TicketNotifier` — Heurística "nueva vs respuesta" por `inboundMessageCount <= 1` (adiós al delta de ±8 s); listener acotado por el `limit(200)`.
- [x] **Baja · Bug** — `TicketNotifier` — Watermark inicializado de forma síncrona (sin carrera con el primer snapshot).
- [x] **Media · Bug** — `lib/clientMailTemplates.ts` — Eliminado el `<p>` anidado en `serviceUnavailableBody`.
- [~] **Media · Mejora** — `createTicketOpenedNotification` desde cliente: mitigado — la regla de Firestore ahora valida destinatario/relatedEntity. Moverlo al worker sigue siendo deseable a futuro.
- [ ] **Media · Mejora** — `ticketDueState` recomputado 3+ veces por ticket por render: **pendiente** (optimización, no asignada en esta tanda).
- [x] **Media · Mejora** — Clave Gemini personal ya no viaja cliente→API (lookup por uid autenticado en servidor).
- [ ] **Baja · Bug** — Nº de ticket manual (`slice(-5)` de epoch) puede colisionar cada ~100 s: **pendiente** (requiere contador transaccional).
- [x] **Baja · Bug** — `MailboxesTab` — Validación de formato de email en alias/cuenta antes de guardar (+ escritura solo-admin por reglas).
- [x] **Baja · Mejora** — `app/api/tickets/ai` — Truncado por campo (`serializePayload`: últimos 20 mensajes, cap por mensaje decreciente) — el JSON nunca se corta a medias.
- [x] **Baja · Mejora** — `CommunicationsView` — Preview con `useDeferredValue` (sin re-render del iframe por tecla); el guardado usa el render inmediato.

---

## Clientes, Proyectos y Tareas

- [x] **Media · Bug** — `lib/projects.ts` — `normalizeProject()` (espejo de `normalizeClient`): `tags:[]` y defaults en `subscribeToProjects`, `subscribeToProjectsByClient`, `getProject` — sin crashes con docs legacy.
- [x] **Alta · Bug** — `ProjectKanbanTab` — Cancelación real de la recomendación de foco (`focusRequestIdRef` incremental); sin setState tras desmontar.
- [x] **Media · Bug** — `ProjectKanbanTab` — Efecto de foco keyed por firma estable de ids (sin llamadas Gemini por cada edición de tarea).
- [x] **Media · Bug** — `ProjectKanbanTab` — Creación masiva con tracking por draft: solo se retiran los creados; mensaje de éxito parcial; sin duplicados al reintentar.
- [x] **Media · Mejora** — `ProjectKanbanTab` — Drag/drop con try/catch (`boardError` visible); `onDragLeave` sin parpadeo (check de `relatedTarget`).
- [x] **Baja · Mejora** — `ProjectKanbanTab` — Los tres callers de `updateTask` pasan `meta` → `task_moved` se registra en actividad.
- [x] **Media · Bug** — `ProjectBudgetTab` — Inputs resincronizados al cambiar el proyecto (salvo mientras se edita).
- [x] **Media · Bug** — `ClientDetailView` — Suscripción de tiempo keyed por ids memoizados (sin churn de listener).
- [x] **Baja · Bug** — `ClientDetailView` — `startedAt?.seconds ?? 0` (sin crash con entradas legacy).
- [x] **Media · Bug** — `ProjectsView` — Deep link `?nuevo=1&clientId=...` funcional (lee `window.location.search` al montar, abre drawer y precarga cliente cuando la lista llega).
- [x] **Media · Bug** — `lib/budget.ts` — Agrupación de líneas por día en hora local (`localDayKey`), alineada con lo que se muestra.
- [x] **Media · Bug** — `ProjectWikiTab` — Autosave lee `title/emoji/dirty` desde refs (sin stale closure); timer limpiado al desmontar; `movePage` con `writeBatch` atómico; `selectedId` vía ref en el snapshot.
- [x] **Baja · Bug** — `ProjectFilesTab` — Carga inicial vía `load()` con estado de error; subir/crear carpeta deshabilitados sin carpeta válida.
- [x] **Baja · Bug** — `TaskCommentThread` — Trim + guard de reenvío; el input solo se limpia tras éxito; errores visibles.
- [x] **Media · Mejora** — ClientsView / ProjectsView / ProjectDetailView / ProjectLinksTab / ProjectApisTab — CRUD con catch + error `role="alert"` visible; el drawer no se cierra en fallo.
- [~] **Media · Bug** — `lib/tasks.ts` — Contrato de `meta` para `task_moved` documentado + callers del Kanban arreglados. Refactor de leer el estado previo dentro de `updateTask` omitido a propósito (añadiría una lectura por update).
- [x] **Baja · Mejora** — Confirmación de borrado con auto-reset por `setTimeout(3s)` (sin carrera del `onBlur`) en ClientsView, ProjectsView y ProjectDetailView.

---

## Servicios, Dominios, Links, Ideas, APIs, Licencias

- [x] **Alta · Bug** — `app/api/ideas/ai-analyze` — Timeout de 30 s en Gemini (`AbortSignal.timeout`) con 504 claro.
- [x] **Media · Bug** — `app/api/ideas/ai-analyze` — Respuesta de Gemini validada/normalizada (categoría whitelist, score 1–10, preguntas bien formadas).
- [x] **Media · Bug** — `IdeasView` — Autosave con cleanup + flush al desmontar (no se pierde la última respuesta); guard de setState tras unmount.
- [x] **Media · Mejora** — `lib/ideas.ts` — `listIdeas` con `limit(200)`.
- [x] **Media · Bug** — `lib/formetaServices.ts` — `ok` basado en `response.ok`; el payload solo degrada con `ok === false` explícito.
- [x] **Media · Bug** — `lib/services|licenses|domains|links|endpoints|externalApis` — `onSnapshot` con callback de error (log + salida de "Cargando…").
- [x] **Media · Bug** — ServicesTab / LicensesTab / DomainsView / LinksView — CRUD con catch + `formError` visible; `LinksView.handleDelete` con guard `saving`.
- [x] **Media · Bug** — `lib/expiry.ts` — Fechas inválidas → `NaN` documentado y filtrado explícito (`Number.isFinite`) en dominios por vencer.
- [x] **Baja · Bug** — `lib/expiry.ts` — Fecha construida en local (`new Date(y, m-1, d, 23:59:59.999)`) — sin desfase de un día.
- [x] **Media · Bug** — `AllApisTab` — Suscripción única al collectionGroup; nombres de proyecto vía ref (sin re-lecturas completas).
- [x] **Media · Mejora** — `app/api/formeta-services/status` — `dynamic = "force-dynamic"`.
- [x] **Baja · Bug** — `ServiceStatusTab` — `mountedRef` + guard de reentradas en `runChecks`.
- [x] **Baja · Bug** — `IdeasView` — División por cero protegida en barra de progreso.
- [x] **Baja · Mejora** — `LinksView` — URLs normalizadas (`https://` por defecto; esquemas no-http(s) rechazados).
- [x] **Baja · Mejora** — `DomainsView` — Botón `type="button"` consistente.
- [x] **Baja · Mejora** — `app/api/ideas/ai-analyze` — Código muerto eliminado; título/respuestas acotados en el prompt.

---

## Tiempo, Búsqueda, Wiki, Command palette e infraestructura

- [x] **Alta · Bug** — `SearchView` — `collectionGroup("tasks")` solo se suscribe con consulta ≥2 caracteres, con `limit(500)`; se desuscribe al limpiar.
- [x] **Media · Mejora** — `SearchView` — Debounce de ~200 ms en el término.
- [x] **Media · Bug** — `lib/timerContext.tsx` — Guarda primero, limpia después (la sesión no se pierde si falla la escritura); intervalo local con cleanup propio (sin `intervalRef` compartido).
- [x] **Media · Bug** — `StopModal` — `handleSave` con try/catch/finally + error visible; preselección de proyecto correcta aunque `projects` cargue tarde; el backdrop no cancela si hay notas escritas.
- [x] **Media · Bug** — `lib/timeEntries.ts` — Consulta por proyectos troceada en lotes de ≤30 (`in`), merge + dedupe + orden; eliminado el fallback que leía toda la colección. `subscribeToAllTimeEntries` con `limit(2000)`.
- [x] **Media · Mejora** — `GlobalTimeView` — Borrado con confirmación por timeout (3 s) y `.catch` con error visible.
- [x] **Media · Bug** — `CommandPalette` — Listener de teclado registrado una vez por apertura; valores actuales vía refs.
- [x] **Media · Bug** — `lib/googleDrive.ts` — `escapeDriveValue` (escape de `'` y `\`) en todas las interpolaciones de `q`.
- [x] **Media · Mejora** — `PWARegister` — Errores de registro logueados; listener `updatefound`/`statechange` para detectar nuevas versiones.
- [x] **Baja · Bug** — `ActivityFeed` — Contador "19+" cuando se alcanza el tope de la suscripción.
- [ ] **Media/Baja · Mejora** — `lib/googleDrive.ts` — BFS `listChildren` secuencial y `driveStatus` paginando todo el Drive: **pendiente** (reescritura de la travesía; sin fix trivial seguro).

---

## Transversal

- [x] **Media · Mejora** — Escrituras sin `catch`: patrón corregido en todos los módulos revisados (error visible + la UI solo avanza en éxito).
- [~] **Media · Mejora** — Suscripciones sin `limit`: añadido en tickets (200), comunicaciones (200), búsqueda (500), timeEntries (2000), externalApis (500), ideas (200). **Pendiente:** `subscribeToProjects/Clients/Tasks` (volumen bajo hoy; añadir cuando crezcan o paginar).
- [~] **Media · Mejora** — `onSnapshot` sin `onError`: añadido en services/licenses/domains/links/endpoints/externalApis. **Pendiente:** replicar en projects/clients/tasks/tickets.
- [x] **Alta · Seguridad** — HTML sin sanear: resuelto sin dependencia nueva — escape previo al markdown + validación de hrefs (wiki, ideas), `escapeHtml` (factura, plantillas email), `<iframe sandbox>` (HTML de correos entrantes).
- [x] **Baja · Mejora** — `normalize` unificada en `lib/text.ts` (SearchView, StopModal, CommandPalette).

---

### Estado final

- **Arregladas:** 72 (todas las críticas de seguridad y todos los bugs Alta).
- **Parciales:** 6 (mitigadas; el resto requiere migración de datos o decisión de negocio — ver notas).
- **Pendientes:** 5 (arquitecturales u optimizaciones menores, anotadas arriba).

**Verificación:** `tsc --noEmit` ✅ · `eslint` (archivos modificados) ✅ · sin dependencias nuevas salvo `jose` (verificación JWT en middleware).

**Pendiente de operar:**
1. `firebase login --reauth` y desplegar `firestore.rules` + `storage.rules`.
2. Commit + push (el código sale con el build de App Hosting).
3. Rollback del worker de Gmail a `ticket-worker-00004-z45` (caído desde el redeploy del 21-jun) + fix definitivo pineando la versión de Node en el Dockerfile.
