import { useCallback, useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  Wallet,
  CalendarDays,
  HandCoins,
  ChartNoAxesCombined,
  Settings,
  Sprout,
  LogOut,
  RefreshCw,
  X,
  CheckCircle,
  Download,
  Menu,
} from "lucide-react";
import { blank, demoData, monthNow, validate, uid, today } from "./model";
import type { State, Entry, Bill } from "./model";
import { Dashboard } from "./Dashboard";
import { Editor } from "./Editor";
import type { ModalSpec } from "./Editor";
import { Views, PageTitle, download, exportCSV } from "./Views";
import {
  supabase,
  fetchState,
  saveState,
  uploadPhoto,
  photoUrl,
} from "./backend";
import type { Session } from "@supabase/supabase-js";
const nav = [
  ["Inicio", LayoutDashboard],
  ["Movimientos", ArrowLeftRight],
  ["Cuentas", Wallet],
  ["Metas", PiggyBank],
  ["Préstamos", HandCoins],
  ["Pagos fijos", CalendarDays],
  ["Reportes", ChartNoAxesCombined],
  ["Ajustes", Settings],
] as const;
const DEMO_KEY = "entre-dos-demo-v1";
function DemoButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="secondary" onClick={onClick}>
      Explorar demostración
    </button>
  );
}
function Login({ onDemo }: { onDemo: () => void }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const { error } = await supabase!.auth.signInWithPassword({
        email: String(f.get("email")).trim(),
        password: String(f.get("password")),
      });
      if (error) throw error;
    } catch {
      setError(
        "No se pudo iniciar sesión. Revisa tu correo, contraseña y conexión.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-shell">
      <section className="login-story">
        <Sprout size={40} />
        <span className="eyebrow">ENTRE DOS</span>
        <h1>
          Las cuentas claras.
          <br />
          Los sueños compartidos.
        </h1>
        <p>Un espacio para cuidar lo de hoy y construir lo que viene.</p>
        <div className="login-benefits">
          <span>
            <Wallet /> Su dinero, en orden
          </span>
          <span>
            <PiggyBank /> Sus metas, más cerca
          </span>
          <span>
            <HandCoins /> Un equipo de dos
          </span>
        </div>
      </section>
      <section className="login-form">
        <div className="login-mark">
          <Sprout /> entre dos
        </div>
        <h2>Bienvenidos a casa</h2>
        <p>Las finanzas de nuestro hogar, en un solo lugar.</p>
        {supabase ? (
          <form onSubmit={login}>
            <label>
              Correo
              <input
                type="email"
                name="email"
                autoComplete="username"
                required
                placeholder="Tu correo"
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                placeholder="Tu contraseña"
              />
            </label>
            {error && (
              <div role="alert" className="error">
                {error}
              </div>
            )}
            <button className="primary" disabled={busy}>
              {busy ? "Entrando…" : "Entrar a nuestro hogar"}
            </button>
          </form>
        ) : (
          <div className="setup-note">
            <b>Tu app está lista para configurar</b>
            <p>
              Por ahora puedes recorrer una demostración. El acceso a su hogar
              se habilitará al conectar Supabase siguiendo el archivo de
              instalación.
            </p>
          </div>
        )}
        <div className="demo-access">
          <DemoButton onClick={onDemo} />
          <small>Datos de ejemplo. Separados de su hogar real.</small>
        </div>
      </section>
    </div>
  );
}
function Confirm({
  text,
  busy,
  onClose,
  onConfirm,
}: {
  text: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      className="modal small-modal"
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <h2>¿Eliminar este registro?</h2>
      <p className="form-note">{text}</p>
      <div className="modal-footer">
        <button className="secondary" disabled={busy} onClick={onClose}>
          Cancelar
        </button>
        <button className="danger" disabled={busy} onClick={onConfirm}>
          {busy ? "Eliminando…" : "Eliminar"}
        </button>
      </div>
    </dialog>
  );
}
function Photo({ src, onClose }: { src: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog className="modal photo-modal" ref={ref} onCancel={onClose}>
      <button
        className="icon-button"
        onClick={onClose}
        aria-label="Cerrar foto"
      >
        <X />
      </button>
      <img src={src} alt="Comprobante del movimiento" />
    </dialog>
  );
}
export default function App() {
  const [s, setS] = useState<State>(blank),
    [version, setVersion] = useState(0),
    [session, setSession] = useState<Session | null>(null),
    [demo, setDemo] = useState(false),
    [ready, setReady] = useState(!supabase),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [page, setPage] = useState("Inicio"),
    [more, setMore] = useState(false),
    [owner, setOwner] = useState("all"),
    [month, setMonth] = useState(monthNow()),
    [modal, setModal] = useState<ModalSpec | null>(null),
    [removing, setRemoving] = useState<{
      collection: keyof State;
      id: string;
    } | null>(null),
    [toast, setToast] = useState(""),
    [error, setError] = useState(""),
    [photo, setPhoto] = useState("");
  const actor =
    session?.user.email?.toLowerCase() === "mjrb11@hotmail.com"
      ? "pareja"
      : "luis";
  const loadEpoch = useRef(0);
  const load = useCallback(async () => {
    const request = ++loadEpoch.current;
    setLoading(true);
    setError("");
    try {
      const result = await fetchState();
      if (request !== loadEpoch.current) return;
      setS(result.data);
      setVersion(result.version);
    } catch (err) {
      if (request === loadEpoch.current) setError((err as Error).message);
    } finally {
      if (request === loadEpoch.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (alive) {
          setSession(data.session);
          setReady(true);
          if (error) setError("No se pudo recuperar la sesión.");
        }
      })
      .catch(() => {
        if (alive) setReady(true);
      });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) {
        setSession(session);
        setReady(true);
      }
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (session && !demo) {
      setS(blank());
      void load();
    }
  }, [session?.user.id, demo, load]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const context = (document as any).modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    try {
      Promise.resolve(
        context.registerTool(
          {
            name: "start_household_entry",
            title: "Abrir nuevo movimiento",
            description:
              "Abre el formulario. No guarda datos. Requiere una sesión o demostración activa.",
            inputSchema: {
              type: "object",
              properties: {
                kind: {
                  type: "string",
                  enum: ["income", "expense", "saving", "transfer"],
                },
              },
              required: ["kind"],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false },
            execute(input: unknown) {
              if (!session && !demo) throw Error("Inicia sesión primero.");
              const kind = (input as any)?.kind;
              if (!["income", "expense", "saving", "transfer"].includes(kind))
                throw Error("Tipo inválido.");
              setModal({ type: "entry", kind });
              return { opened: true, kind };
            },
          },
          { signal: controller.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => controller.abort();
  }, [session, demo]);
  const beginDemo = () => {
    loadEpoch.current++;
    setLoading(false);
    let state = demoData();
    try {
      const data = localStorage.getItem(DEMO_KEY);
      if (data) state = validate(JSON.parse(data));
    } catch {}
    if (state.names.pareja === "Mi esposa") state.names.pareja = "Jaquelín";
    state.accounts = state.accounts.map((a) =>
      a.name === "Banco de mi esposa" ? { ...a, name: "Banco de Jaquelín" } : a,
    );
    setS(state);
    setDemo(true);
    setPage("Inicio");
    setError("");
    setReady(true);
  };
  async function persist(next: State) {
    validate(next);
    if (demo) {
      try {
        localStorage.setItem(DEMO_KEY, JSON.stringify(next));
      } catch {
        throw Error(
          "No hay espacio para guardar esta demostración. Prueba sin la foto o restablece los ejemplos.",
        );
      }
      setS(next);
    } else {
      if (!session) throw Error("Inicia sesión para guardar.");
      const v = await saveState(next, version);
      setS(next);
      setVersion(v);
    }
    setToast("Guardado. Todo en orden.");
  }
  const busyRef = useRef(false);
  async function save(data: Record<string, unknown>, file?: File) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    let uploaded: string | undefined;
    try {
      const next = structuredClone(s);
      const type = modal!.type;
      const col = (
        {
          entry: "entries",
          account: "accounts",
          goal: "goals",
          loan: "loans",
          bill: "bills",
          budget: "budgets",
        } as const
      )[type as "entry"];
      if (!col) throw Error("Formulario desconocido.");
      if (type === "entry") {
        data.createdBy =
          (data.createdBy as string) ||
          (demo ? "Demostración" : s.names[actor]);
        data.updatedAt = new Date().toISOString();
        data.updatedBy = demo ? "Demostración" : session?.user.id;
        if (file) {
          if (
            !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
            file.size > 5 * 1024 * 1024
          )
            throw Error("Usa una foto JPG, PNG o WebP de hasta 5 MB.");
          if (demo) {
            data.photo = await new Promise<string>((resolve, reject) => {
              const r = new FileReader();
              r.onload = () => resolve(String(r.result));
              r.onerror = () => reject(Error("No se pudo leer la foto."));
              r.readAsDataURL(file);
            });
          } else {
            uploaded = await uploadPhoto(file, session!.user.id);
            data.photo = uploaded;
          }
        }
      }
      const list = next[col] as any[];
      const index = list.findIndex((x) => x.id === data.id);
      if (index >= 0) list[index] = data;
      else list.push(data);
      await persist(next);
      setModal(null);
    } catch (err) {
      throw err;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function remove() {
    if (!removing || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const { collection, id } = removing;
      const next = structuredClone(s);
      if (
        collection === "accounts" &&
        (s.entries.some((e) => e.account === id || e.to === id) ||
          s.bills.some((b) => b.account === id))
      )
        throw Error(
          "Esta cuenta tiene movimientos o pagos fijos. No se puede eliminar.",
        );
      if (collection === "goals" && s.entries.some((e) => e.goal === id))
        throw Error(
          "Esta meta tiene historial. Conserva el registro o elimina primero sus movimientos.",
        );
      if (collection === "loans" && s.entries.some((e) => e.loan === id))
        throw Error("Este préstamo tiene movimientos. No se puede eliminar.");
      if (collection === "bills" && s.entries.some((e) => e.bill === id))
        throw Error("Este pago tiene historial. Usa Pausar para conservarlo.");
      (next[collection] as any[]) = (next[collection] as any[]).filter(
        (x) => x.id !== id,
      );
      await persist(next);
      setRemoving(null);
    } catch (err) {
      setError((err as Error).message);
      setRemoving(null);
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  }
  async function toggleBill(id: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const next = structuredClone(s);
      const b = next.bills.find((b) => b.id === id)!;
      if (b.end) {
        delete b.end;
      } else {
        const [y, m] = monthNow().split("-").map(Number);
        b.end = `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, "0")}`;
      }
      await persist(next);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function showPhoto(path: string) {
    try {
      setPhoto(await photoUrl(path));
    } catch (err) {
      setError((err as Error).message);
    }
  }
  async function logout() {
    if (busy) return;
    setError("");
    if (!demo && supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setError("No se pudo cerrar sesión. Inténtalo de nuevo.");
        return;
      }
    }
    loadEpoch.current++;
    setLoading(false);
    setDemo(false);
    setS(blank());
    setSession(null);
    setModal(null);
    setRemoving(null);
    setPhoto("");
  }
  function open(spec: ModalSpec) {
    if (busy || loading) return;
    setError("");
    if (spec.type === "entry" && !s.accounts.length) {
      setPage("Cuentas");
      setToast("Primero agrega una cuenta con su saldo inicial.");
      setModal({ type: "account" });
      return;
    }
    setModal(spec);
  }
  if (!ready)
    return (
      <div className="loading-screen">
        <Sprout /> Preparando su hogar…
      </div>
    );
  if (!session && !demo) return <Login onDemo={beginDemo} />;
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span>
            <Sprout />
          </span>{" "}
          entre dos<b>FINANZAS DEL HOGAR</b>
        </div>
        <div className="home-label">NUESTRO ESPACIO</div>
        <nav>
          {nav.map(([n, I]) => (
            <button
              aria-current={page === n ? "page" : undefined}
              className={
                (page === n ? "active " : "") +
                (["Inicio", "Movimientos", "Metas", "Reportes"].includes(n)
                  ? ""
                  : "desktop-only")
              }
              key={n}
              onClick={() => {
                setPage(n);
                setMore(false);
              }}
            >
              <I size={19} />
              {n === "Metas" ? "Ahorros" : n}
            </button>
          ))}
          <button
            className="mobile-more"
            aria-expanded={more}
            onClick={() => setMore(!more)}
          >
            <Menu size={19} />
            Más
          </button>
        </nav>
        {more && (
          <div className="mobile-menu">
            {nav
              .filter(
                ([n]) =>
                  !["Inicio", "Movimientos", "Metas", "Reportes"].includes(n),
              )
              .map(([n, I]) => (
                <button
                  key={n}
                  onClick={() => {
                    setPage(n);
                    setMore(false);
                  }}
                >
                  <I size={20} />
                  {n === "Metas" ? "Ahorros" : n}
                </button>
              ))}
          </div>
        )}
        <div className="sidebar-bottom">
          <div className="avatars">
            <span>{s.names.luis[0]}</span>
            <span>{s.names.pareja[0]}</span>
          </div>
          <b>Un equipo de dos</b>
          <small>{demo ? "Datos de demostración" : s.names[actor]}</small>
          <button className="text-button" disabled={busy} onClick={logout}>
            <LogOut size={15} /> {demo ? "Salir de la demo" : "Cerrar sesión"}
          </button>
        </div>
      </aside>
      <main data-page={page}>
        <header>
          <span className="breadcrumb">
            Nuestro hogar <span>/</span> {page}
          </span>
          <div className="header-right">
            {demo ? (
              <span className="demo-badge">
                Demo · guardada en este navegador
              </span>
            ) : (
              <button
                className="text-button"
                disabled={busy || loading}
                onClick={load}
              >
                <RefreshCw size={15} /> Actualizar
              </button>
            )}
            <div className="avatar">{s.names[actor][0]}</div>
          </div>
        </header>
        <div className="workspace">
          {error && (
            <div className="error" role="alert">
              {error}
              <button aria-label="Cerrar aviso" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {loading ? (
            <div className="empty">Cargando su hogar…</div>
          ) : (
            <>
              <div className="filters">
                <div className="segmented">
                  {[
                    ["all", "Todo el hogar"],
                    ["luis", s.names.luis],
                    ["pareja", s.names.pareja],
                    ["compartido", "Compartido"],
                  ].map(([v, n]) => (
                    <button
                      key={v}
                      className={owner === v ? "selected" : ""}
                      onClick={() => setOwner(v)}
                    >
                      {n === "Metas" ? "Ahorros" : n}
                    </button>
                  ))}
                </div>
                <input
                  aria-label="Mes"
                  type="month"
                  value={month}
                  required
                  onChange={(e) => {
                    if (e.target.value) setMonth(e.target.value);
                  }}
                />
              </div>
              {page === "Inicio" ? (
                <Dashboard
                  s={s}
                  owner={owner}
                  month={month}
                  onAdd={(kind) => open({ type: "entry", kind })}
                  onGo={setPage}
                />
              ) : page === "Ajustes" ? (
                <>
                  <PageTitle
                    title="A su manera"
                    description="Lo esencial para que este espacio se sienta de ustedes."
                  />
                  <div className="cards-grid">
                    <section className="panel">
                      <h2>Sus nombres</h2>
                      <form
                        className="settings-form"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (busyRef.current) return;
                          const f = new FormData(e.currentTarget);
                          const luis = String(f.get("luis")).trim(),
                            pareja = String(f.get("pareja")).trim();
                          if (!luis || !pareja) return;
                          busyRef.current = true;
                          setBusy(true);
                          try {
                            await persist({ ...s, names: { luis, pareja } });
                          } catch (err) {
                            setError((err as Error).message);
                          } finally {
                            setBusy(false);
                            busyRef.current = false;
                          }
                        }}
                      >
                        <label>
                          luis21aro@gmail.com
                          <input
                            name="luis"
                            defaultValue={s.names.luis}
                            required
                            maxLength={30}
                          />
                        </label>
                        <label>
                          mjrb11@hotmail.com
                          <input
                            name="pareja"
                            defaultValue={s.names.pareja}
                            required
                            maxLength={30}
                          />
                        </label>
                        <button className="primary" disabled={busy}>
                          Guardar nombres
                        </button>
                      </form>
                    </section>
                    <section className="panel">
                      <h2>Su información</h2>
                      <p className="form-note">
                        Moneda: quetzales (GTQ). Fechas del hogar: Guatemala.
                        Ambos pueden consultar y modificar los registros.
                      </p>
                      <div className="settings-actions">
                        <button
                          className="secondary"
                          onClick={() => exportCSV(s, s.entries)}
                        >
                          <Download size={16} /> Exportar todos los movimientos
                        </button>
                        <button
                          className="secondary"
                          onClick={() =>
                            download(
                              new Blob([JSON.stringify(s, null, 2)], {
                                type: "application/json",
                              }),
                              `entre-dos-respaldo-${today()}.json`,
                            )
                          }
                        >
                          <Download size={16} /> Descargar respaldo de datos
                        </button>
                      </div>
                      <small>
                        El respaldo incluye datos y referencias a las fotos. Las
                        imágenes se conservan por separado en Supabase Storage.
                      </small>
                    </section>
                    <section className="panel">
                      <h2>{demo ? "Demostración local" : "Su sesión"}</h2>
                      <p className="form-note">
                        {demo
                          ? "Estos ejemplos se guardan únicamente en este navegador. No se copian a su hogar de Supabase."
                          : "Los cambios se guardan en Supabase. Pulsa Actualizar para ver cambios recientes de tu pareja."}
                      </p>
                      {demo && (
                        <button
                          className="secondary"
                          disabled={busy}
                          onClick={() => {
                            localStorage.removeItem(DEMO_KEY);
                            setS(demoData());
                            setToast("Ejemplos restablecidos.");
                          }}
                        >
                          Restablecer ejemplos
                        </button>
                      )}
                      <button
                        className="secondary spaced"
                        disabled={busy}
                        onClick={logout}
                      >
                        <LogOut size={16} />{" "}
                        {demo ? "Salir de la demostración" : "Cerrar sesión"}
                      </button>
                    </section>
                    <section className="panel">
                      <h2>Cómo se calculan los saldos</h2>
                      <p className="form-note">
                        Los aportes a metas reservan dinero sin moverlo de
                        cuenta. Los retiros lo liberan. Las transferencias y los
                        préstamos recibidos no cuentan como ingresos del hogar.
                        Los pagos de deuda se muestran separados de los gastos
                        cotidianos.
                      </p>
                      <p className="form-note">
                        El filtro de persona se aplica a la propiedad del
                        movimiento o cuenta. En Reportes puedes ver también
                        quién pagó los gastos compartidos.
                      </p>
                    </section>
                  </div>
                </>
              ) : (
                <Views
                  page={page}
                  s={s}
                  owner={owner}
                  month={month}
                  open={open}
                  remove={(collection, id) => setRemoving({ collection, id })}
                  toggleBill={toggleBill}
                  showPhoto={showPhoto}
                />
              )}
            </>
          )}
        </div>
      </main>
      {modal && (
        <Editor
          key={modal.type + (modal.item?.id || "new")}
          spec={modal}
          s={s}
          defaultOwner={
            owner === "all"
              ? actor
              : (owner as "luis" | "pareja" | "compartido")
          }
          busy={busy}
          onClose={() => {
            if (!busy) setModal(null);
          }}
          onSave={save}
        />
      )}{" "}
      {removing && (
        <Confirm
          text="Se recalcularán los saldos. No se eliminará si afecta registros relacionados o deja saldos inválidos."
          busy={busy}
          onClose={() => setRemoving(null)}
          onConfirm={remove}
        />
      )}{" "}
      {photo && <Photo src={photo} onClose={() => setPhoto("")} />}{" "}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle size={18} />
          {toast}
          <button aria-label="Cerrar" onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
