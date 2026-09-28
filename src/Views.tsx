import {
  ExpenseDonut,
  SavingsBanner,
  MovementSummary,
  CategoryIcon,
} from "./Visuals";
import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Download,
  Search,
  Image,
  Wallet,
  PiggyBank,
  HandCoins,
  Check,
  Pause,
  Play,
} from "lucide-react";
import {
  money,
  accountBalance,
  accountEntryEffect,
  reserved,
  loanBalance,
  billsFor,
  labels,
  categories,
  monthNow,
  today,
} from "./model";
import type { State, Entry } from "./model";
import type { ModalSpec } from "./Editor";
import { ownerName } from "./Dashboard";
export function PageTitle({
  title,
  description,
  action,
  label,
}: {
  title: string;
  description: string;
  action?: () => void;
  label?: string;
}) {
  return (
    <div className="welcome">
      <div>
        <h1>
          {title}
          <span>.</span>
        </h1>
        <p>{description}</p>
      </div>
      {action && (
        <button className="primary" onClick={action}>
          <Plus size={18} />
          {label || "Agregar"}
        </button>
      )}
    </div>
  );
}
export function Empty({
  text,
  action,
  label,
}: {
  text: string;
  action?: () => void;
  label?: string;
}) {
  return (
    <div className="empty panel">
      <PiggyBank size={30} />
      <h3>{text}</h3>
      {action && (
        <button className="secondary" onClick={action}>
          {label || "Agregar el primero"}
        </button>
      )}
    </div>
  );
}
export function exportCSV(s: State, entries: Entry[]) {
  const cols = [
    "Fecha",
    "Tipo",
    "Descripción",
    "Monto Q",
    "De quién es",
    "Pagado por",
    "Cuenta",
    "Categoría",
    "Meta",
    "Préstamo",
    "Intereses Q",
    "Nota",
    "Registrado por",
  ];
  const cell = (x: unknown) => {
    let str = String(x ?? "");
    if (/^[=+@\-\t\r]/.test(str)) str = "'" + str;
    return '"' + str.replaceAll('"', '""') + '"';
  };
  const rows = entries.map((e) => [
    e.date,
    labels[e.kind],
    e.name,
    (e.amount / 100).toFixed(2),
    ownerName(s, e.owner),
    ownerName(s, e.paidBy || e.owner),
    s.accounts.find((a) => a.id === e.account)?.name,
    e.category,
    s.goals.find((g) => g.id === e.goal)?.name,
    s.loans.find((l) => l.id === e.loan)?.name,
    ((e.interest || 0) / 100).toFixed(2),
    e.note,
    e.createdBy,
  ]);
  const blob = new Blob(
    ["\ufeff" + [cols, ...rows].map((r) => r.map(cell).join(",")).join("\r\n")],
    { type: "text/csv;charset=utf-8;" },
  );
  download(blob, `entre-dos-${today()}.csv`);
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Views({
  page,
  s,
  owner,
  month,
  open,
  remove,
  toggleBill,
  showPhoto,
}: {
  page: string;
  s: State;
  owner: string;
  month: string;
  open: (m: ModalSpec) => void;
  remove: (collection: keyof State, id: string) => void;
  toggleBill: (id: string) => void;
  showPhoto: (path: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const match = (o: string) => owner === "all" || o === owner;
  const entries = s.entries.filter(
    (e) => match(e.owner) && e.date.startsWith(month),
  );
  const edit = (type: string, item: any) => (
    <button
      title="Editar"
      aria-label={`Editar ${item.name || item.category}`}
      className="icon-button"
      onClick={() => open({ type, item })}
    >
      <Pencil size={16} />
    </button>
  );
  const del = (collection: keyof State, item: any) => (
    <button
      title="Eliminar"
      aria-label={`Eliminar ${item.name || item.category}`}
      className="icon-button"
      onClick={() => remove(collection, item.id)}
    >
      <Trash2 size={16} />
    </button>
  );
  if (page === "Movimientos") {
    const filtered = entries
      .filter(
        (e) =>
          (type === "all" || e.kind === type) &&
          `${e.name} ${e.category} ${e.note}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      )
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          b.updatedAt.localeCompare(a.updatedAt),
      );
    return (
      <>
        <PageTitle
          title="Movimientos"
          description="Ingresos, gastos y aportes, con nombre y apellido."
          action={() => open({ type: "entry" })}
          label="Nuevo movimiento"
        />
        <div className="movement-tabs" aria-label="Filtrar movimientos">
          {[
            ["all", "Todos"],
            ["income", "Ingresos"],
            ["expense", "Gastos"],
          ].map(([value, label]) => (
            <button
              className={type === value ? "selected" : ""}
              key={value}
              onClick={() => setType(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <MovementSummary entries={entries} />
        <div className="toolbar">
          <label className="search">
            <Search size={18} />
            <input
              aria-label="Buscar movimiento"
              placeholder="Buscar descripción o categoría…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            aria-label="Tipo de movimiento"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="all">Todos los movimientos</option>
            {Object.entries(labels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <button className="secondary" onClick={() => exportCSV(s, filtered)}>
            <Download size={16} /> CSV
          </button>
        </div>
        <div className="panel">
          {filtered.map((e) => (
            <div className="entry-card" data-kind={e.kind} key={e.id}>
              <span className="entry-category-icon">
                <CategoryIcon category={e.category} kind={e.kind} />
              </span>
              <div className="entry-top">
                <span className={"person " + e.owner}>
                  {ownerName(s, e.owner)}
                </span>
                <small>
                  {e.date.split("-").reverse().join("/")} · {labels[e.kind]}
                </small>
                <strong
                  className={
                    ["income", "loan_recovery", "loan_received"].includes(
                      e.kind,
                    )
                      ? "positive"
                      : e.kind === "expense"
                        ? "negative"
                        : ""
                  }
                >
                  {e.kind === "income"
                    ? "+ "
                    : e.kind === "expense"
                      ? "− "
                      : ""}
                  {money(e.amount)}
                </strong>
              </div>
              <h3>{e.name}</h3>
              <p>
                {e.category} ·{" "}
                {s.accounts.find((a) => a.id === e.account)?.name}
                {e.to && ` → ${s.accounts.find((a) => a.id === e.to)?.name}`}
                {e.goal && ` · ${s.goals.find((g) => g.id === e.goal)?.name}`}
              </p>
              {e.kind === "expense" && (
                <small>
                  Pagado por{" "}
                  {ownerName(
                    s,
                    e.paidBy ||
                      s.accounts.find((a) => a.id === e.account)?.owner ||
                      e.owner,
                  )}
                </small>
              )}
              {e.note && <p>{e.note}</p>}
              <div className="entry-footer">
                <small>
                  Registrado por {e.createdBy} · actualizado{" "}
                  {new Date(e.updatedAt).toLocaleDateString("es-GT")}
                </small>
                <div>
                  {e.photo && (
                    <button
                      className="icon-button"
                      aria-label="Ver foto"
                      onClick={() => showPhoto(e.photo!)}
                    >
                      <Image size={17} />
                    </button>
                  )}
                  {edit("entry", e)}
                  {del("entries", e)}
                </div>
              </div>
            </div>
          ))}
          {!filtered.length && (
            <Empty
              text="No hay movimientos con estos filtros"
              action={() => open({ type: "entry" })}
            />
          )}
        </div>
      </>
    );
  }
  if (page === "Cuentas")
    return (
      <>
        <PageTitle
          title="El dinero, en su lugar"
          description="Saldos reales y ahorro reservado en cada cuenta."
          action={() => open({ type: "account" })}
          label="Nueva cuenta"
        />
        <div className="cards-grid">
          {s.accounts
            .filter((a) => match(a.owner))
            .map((a) => {
              const activity = s.entries
                .filter((e) => accountEntryEffect(e, a.id) !== 0)
                .sort(
                  (first, second) =>
                    second.date.localeCompare(first.date) ||
                    second.updatedAt.localeCompare(first.updatedAt),
                );
              return (
                <section className="panel account-card" key={a.id}>
                  <div className="section-title">
                    <span className="icon-circle green">
                      <Wallet size={20} />
                    </span>
                    <span className={"person " + a.owner}>
                      {ownerName(s, a.owner)}
                    </span>
                  </div>
                  <h2>{a.name}</h2>
                  <small>{a.type}</small>
                  <strong className="large-number">
                    {money(accountBalance(s, a.id))}
                  </strong>
                  <div className="detail-row">
                    <span>Dinero real al iniciar</span>
                    <b>{money(a.opening)}</b>
                  </div>
                  <div className="detail-row">
                    <span>Movimientos acumulados</span>
                    <b>{money(accountBalance(s, a.id) - a.opening)}</b>
                  </div>
                  <div className="detail-row">
                    <span>Reservado en metas</span>
                    <b>{money(reserved(s, a.id))}</b>
                  </div>
                  <div className="detail-row">
                    <span>Disponible</span>
                    <b>{money(accountBalance(s, a.id) - reserved(s, a.id))}</b>
                  </div>
                  <div className="card-actions">
                    <div className="account-primary-actions">
                      <button
                        className="text-button"
                        onClick={() => open({ type: "account", item: a })}
                      >
                        Corregir saldo inicial
                      </button>
                      <button
                        className="text-button"
                        onClick={() =>
                          open({ type: "entry", kind: "transfer" })
                        }
                      >
                        Transferir
                      </button>
                    </div>
                    <div>
                      {edit("account", a)}
                      {del("accounts", a)}
                    </div>
                  </div>
                  <details className="account-activity">
                    <summary>
                      Actividad de esta cuenta ({activity.length})
                    </summary>
                    <p className="form-note">
                      Incluye movimientos de ambos, aunque filtres por una
                      persona.
                    </p>
                    {activity.map((e) => {
                      const effect = accountEntryEffect(e, a.id);
                      return (
                        <div className="mini-entry" key={e.id}>
                          <div>
                            <b>{e.name}</b>
                            <small>
                              {e.date.split("-").reverse().join("/")} ·{" "}
                              {ownerName(s, e.owner)}
                            </small>
                          </div>
                          <span
                            className={effect > 0 ? "positive" : "negative"}
                          >
                            {effect > 0 ? "+" : "−"} {money(Math.abs(effect))}
                          </span>
                          {edit("entry", e)}
                        </div>
                      );
                    })}
                    {!activity.length && (
                      <p className="form-note">
                        Aún no hay movimientos que cambien este saldo.
                      </p>
                    )}
                  </details>
                </section>
              );
            })}
        </div>
        {!s.accounts.filter((a) => match(a.owner)).length && (
          <Empty
            text="Empiecen con su banco o efectivo"
            action={() => open({ type: "account" })}
            label="Agregar cuenta"
          />
        )}
      </>
    );
  if (page === "Metas")
    return (
      <>
        <PageTitle
          title="Ahorros"
          description="Pequeños aportes que construyen algo grande."
          action={() => open({ type: "goal" })}
          label="Nueva meta"
        />
        <SavingsBanner
          amount={s.accounts
            .filter((a) => match(a.owner))
            .reduce((n, a) => n + reserved(s, a.id), 0)}
        />
        <div className="cards-grid savings-grid">
          {s.goals
            .filter((g) => match(g.owner) || g.owner === "compartido")
            .map((g) => {
              const total = reserved(s, undefined, g.id);
              const remaining = Math.max(0, g.target - total);
              const months = g.date
                ? Math.max(
                    1,
                    (Number(g.date.slice(0, 4)) - Number(today().slice(0, 4))) *
                      12 +
                      Number(g.date.slice(5, 7)) -
                      Number(today().slice(5, 7)),
                  )
                : 0;
              const history = s.entries
                .filter((e) => e.goal === g.id)
                .sort(
                  (a, b) =>
                    b.date.localeCompare(a.date) ||
                    b.updatedAt.localeCompare(a.updatedAt),
                );
              return (
                <section className="panel savings-card" key={g.id}>
                  <div className="section-title">
                    <span className="goal-symbol">
                      <PiggyBank size={30} />
                    </span>
                    <span className={"person " + g.owner}>
                      {ownerName(s, g.owner)}
                    </span>
                  </div>
                  <h2>{g.name}</h2>
                  <div className="goal-amount">
                    <b>{money(total)}</b>
                    <span> de {money(g.target)}</span>
                  </div>
                  <div className="progress">
                    <i
                      style={{
                        width: `${Math.min(100, (total / g.target) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="detail-row">
                    <span>
                      {Math.round((total / g.target) * 100)}% completado
                    </span>
                    <b>Faltan {money(remaining)}</b>
                  </div>
                  {g.date && (
                    <p className="form-note">
                      Meta: {g.date.split("-").reverse().join("/")} ·{" "}
                      {g.date < today()
                        ? "Fecha cumplida"
                        : `Ritmo orientativo: ${money(Math.ceil(remaining / months))}/mes`}
                    </p>
                  )}
                  <div className="contributions">
                    {(["luis", "pareja", "compartido"] as const).map((o) => {
                      const gross = s.entries
                        .filter(
                          (e) =>
                            e.goal === g.id &&
                            e.kind === "saving" &&
                            e.owner === o,
                        )
                        .reduce((n, e) => n + e.amount, 0);
                      return (
                        <div className="detail-row" key={o}>
                          <span>{ownerName(s, o)} · aportes</span>
                          <b>{money(gross)}</b>
                        </div>
                      );
                    })}
                    <small>
                      Los aportes son históricos; retiros y gastos reducen el
                      saldo actual.
                    </small>
                  </div>
                  <div className="card-actions">
                    <button
                      className="primary"
                      onClick={() =>
                        open({ type: "entry", kind: "saving", goal: g.id })
                      }
                    >
                      <Plus size={16} /> Aportar
                    </button>
                    <div>
                      {edit("goal", g)}
                      {del("goals", g)}
                    </div>
                  </div>
                  <details>
                    <summary>
                      Historial de aportes y retiros ({history.length})
                    </summary>
                    {history.map((e) => (
                      <div className="mini-entry" key={e.id}>
                        <span>
                          {e.date} · {ownerName(s, e.owner)}
                          <small>
                            {labels[e.kind]} · {e.name}
                          </small>
                        </span>
                        <b>{money(e.amount)}</b>
                        {e.photo && (
                          <button
                            aria-label="Ver foto"
                            onClick={() => showPhoto(e.photo!)}
                          >
                            <Image size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      className="text-button"
                      onClick={() =>
                        open({ type: "entry", kind: "release", goal: g.id })
                      }
                    >
                      Retirar dinero de la meta
                    </button>
                  </details>
                </section>
              );
            })}
        </div>
        {!s.goals.length && (
          <Empty
            text="¿Para qué quieren ahorrar?"
            action={() => open({ type: "goal" })}
            label="Crear primera meta"
          />
        )}
      </>
    );
  if (page === "Préstamos")
    return (
      <>
        <PageTitle
          title="Deudas bajo control"
          description="Lo que debemos y lo que nos deben, sin perder de vista las cuotas."
          action={() => open({ type: "loan" })}
          label="Agregar préstamo"
        />
        <div className="cards-grid">
          {s.loans
            .filter((l) => match(l.owner))
            .map((l) => {
              const balance = loanBalance(s, l.id);
              const history = s.entries
                .filter((e) => e.loan === l.id)
                .sort((a, b) => b.date.localeCompare(a.date));
              return (
                <section className="panel" key={l.id}>
                  <div className="section-title">
                    <span className="icon-circle lilac">
                      <HandCoins size={20} />
                    </span>
                    <span className={"person " + l.owner}>
                      {ownerName(s, l.owner)}
                    </span>
                  </div>
                  <h2>{l.name}</h2>
                  <small>
                    {l.direction === "owe" ? "Debemos" : "Nos deben"}
                  </small>
                  <strong className="large-number">{money(balance)}</strong>
                  <div className="detail-row">
                    <span>Cuota prevista</span>
                    <b>{money(l.installment)}</b>
                  </div>
                  <div className="detail-row">
                    <span>Próximo vencimiento</span>
                    <b
                      className={
                        l.due && l.due < today() && balance > 0
                          ? "negative"
                          : ""
                      }
                    >
                      {l.due || "Sin fecha"}
                    </b>
                  </div>
                  {l.note && <p className="form-note">{l.note}</p>}
                  <div className="card-actions">
                    <button
                      className="primary"
                      disabled={!balance}
                      onClick={() =>
                        open({
                          type: "entry",
                          kind:
                            l.direction === "owe"
                              ? "loan_payment"
                              : "loan_recovery",
                          loan: l.id,
                        })
                      }
                    >
                      {balance
                        ? l.direction === "owe"
                          ? "Registrar pago"
                          : "Registrar cobro"
                        : "Saldado"}
                    </button>
                    <div>
                      {edit("loan", l)}
                      {del("loans", l)}
                    </div>
                  </div>
                  <details>
                    <summary>Historial ({history.length})</summary>
                    {history.map((e) => (
                      <div className="mini-entry" key={e.id}>
                        <span>
                          {e.date}
                          <small>
                            {e.name} · interés {money(e.interest || 0)}
                          </small>
                        </span>
                        <b>{money(e.amount)}</b>
                      </div>
                    ))}
                  </details>
                </section>
              );
            })}
        </div>
        {!s.loans.filter((l) => match(l.owner)).length && (
          <Empty
            text="Sin préstamos registrados"
            action={() => open({ type: "loan" })}
          />
        )}
      </>
    );
  if (page === "Pagos fijos") {
    const active = billsFor(s, month).filter((b) => match(b.owner));
    return (
      <>
        <PageTitle
          title="Un mes sin olvidos"
          description="Confirma cada pago cuando lo realices. Puedes ajustar el importe."
          action={() => open({ type: "bill" })}
          label="Nuevo pago fijo"
        />
        <div className="panel">
          {active.map((b) => (
            <div className="bill-row full-bill" key={b.id}>
              <div className="date-box">
                <small>DÍA</small>
                <b>{b.date.slice(-2)}</b>
              </div>
              <div className="grow">
                <b>{b.name}</b>
                <small>
                  {ownerName(s, b.owner)} · {b.category} ·{" "}
                  {s.accounts.find((a) => a.id === b.account)?.name}
                </small>
                <small
                  className={!b.paid && b.date < today() ? "negative" : ""}
                >
                  {b.paid
                    ? "Pagado"
                    : b.date < today()
                      ? "Pago pendiente de confirmar"
                      : "Programado"}
                </small>
              </div>
              <b>{money(b.paidAmount ?? b.amount)}</b>
              {b.paid ? (
                <span className="paid-label">
                  <Check size={16} /> Pagado
                </span>
              ) : (
                <button
                  className="secondary"
                  onClick={() =>
                    open({
                      type: "entry",
                      kind: "expense",
                      bill: b,
                      period: month,
                    })
                  }
                >
                  Pagar
                </button>
              )}
              <div>
                {edit("bill", b)}
                <button
                  className="icon-button"
                  aria-label={`Pausar ${b.name}`}
                  onClick={() => toggleBill(b.id)}
                >
                  <Pause size={16} />
                </button>
                {del("bills", b)}
              </div>
            </div>
          ))}
          {!active.length && (
            <Empty
              text="Sin pagos fijos para este mes"
              action={() => open({ type: "bill" })}
            />
          )}
        </div>
        {s.bills.some((b) => b.end) && (
          <section className="panel spaced">
            <h2>Pagos pausados</h2>
            {s.bills
              .filter((b) => b.end && match(b.owner))
              .map((b) => (
                <div className="detail-row" key={b.id}>
                  <span>{b.name}</span>
                  <button
                    className="secondary"
                    onClick={() => toggleBill(b.id)}
                  >
                    <Play size={15} /> Reanudar
                  </button>
                </div>
              ))}
          </section>
        )}
      </>
    );
  }
  if (page === "Reportes") {
    const incoming = entries
        .filter((e) => e.kind === "income")
        .reduce((n, e) => n + e.amount, 0),
      out = entries
        .filter((e) => e.kind === "expense")
        .reduce((n, e) => n + e.amount, 0),
      debt = entries
        .filter((e) => e.kind === "loan_payment")
        .reduce((n, e) => n + e.amount, 0);
    const amounts = categories
      .map((c) => ({
        name: c,
        amount: entries
          .filter((e) => e.kind === "expense" && e.category === c)
          .reduce((n, e) => n + e.amount, 0),
      }))
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
    return (
      <>
        <PageTitle
          title="Reportes"
          description="Para entender cómo van y decidir juntos el siguiente paso."
        />
        <div className="report-stats">
          <div className="panel">
            <small>Ingresos</small>
            <strong>{money(incoming)}</strong>
          </div>
          <div className="panel">
            <small>Gastos</small>
            <strong>{money(out)}</strong>
          </div>
          <div className="panel">
            <small>Pagos de deuda (capital + intereses)</small>
            <strong>{money(debt)}</strong>
          </div>
        </div>
        <div className="dashboard-grid">
          <section className="panel">
            <h2>¿En qué gastamos?</h2>
            <ExpenseDonut entries={entries} />
          </section>
          <section className="panel">
            <h2>Lo que aporta cada uno</h2>
            <p className="hint">Totales del hogar en el mes seleccionado.</p>
            {(["luis", "pareja", "compartido"] as const).map((o) => {
              const es = s.entries.filter((e) => e.date.startsWith(month));
              return (
                <div className="contributions" key={o}>
                  <h3>{ownerName(s, o)}</h3>
                  <div className="detail-row">
                    <span>Ingresos</span>
                    <b>
                      {money(
                        es
                          .filter((e) => e.owner === o && e.kind === "income")
                          .reduce((n, e) => n + e.amount, 0),
                      )}
                    </b>
                  </div>
                  <div className="detail-row">
                    <span>De ellos, ingresos extras</span>
                    <b>
                      {money(
                        es
                          .filter(
                            (e) =>
                              e.owner === o &&
                              e.kind === "income" &&
                              e.category !== "Sueldo",
                          )
                          .reduce((n, e) => n + e.amount, 0),
                      )}
                    </b>
                  </div>
                  <div className="detail-row">
                    <span>Gastos pagados</span>
                    <b>
                      {money(
                        es
                          .filter(
                            (e) =>
                              e.kind === "expense" &&
                              (e.paidBy ||
                                s.accounts.find((a) => a.id === e.account)
                                  ?.owner) === o,
                          )
                          .reduce((n, e) => n + e.amount, 0),
                      )}
                    </b>
                  </div>
                  <div className="detail-row">
                    <span>Aportes a metas</span>
                    <b>
                      {money(
                        es
                          .filter((e) => e.kind === "saving" && e.owner === o)
                          .reduce((n, e) => n + e.amount, 0),
                      )}
                    </b>
                  </div>
                </div>
              );
            })}
          </section>
          <section className="panel wide">
            <div className="section-title">
              <h2>Presupuestos mensuales</h2>
              <button
                className="secondary"
                onClick={() => open({ type: "budget" })}
              >
                <Plus size={16} /> Agregar límite
              </button>
            </div>
            {s.budgets
              .filter((b) => match(b.owner))
              .map((b) => {
                const used = s.entries
                  .filter(
                    (e) =>
                      e.kind === "expense" &&
                      e.date.startsWith(month) &&
                      e.category === b.category &&
                      e.owner === b.owner,
                  )
                  .reduce((n, e) => n + e.amount, 0);
                return (
                  <div className="budget" key={b.id}>
                    <div className="detail-row">
                      <span>
                        {b.category} · {ownerName(s, b.owner)}
                      </span>
                      <b className={used > b.amount ? "negative" : ""}>
                        {money(used)} / {money(b.amount)}
                      </b>
                    </div>
                    <div className="progress">
                      <i
                        style={{
                          width: `${Math.min(100, (used / b.amount) * 100)}%`,
                          background: used > b.amount ? "#c97964" : undefined,
                        }}
                      />
                    </div>
                    <div className="card-actions">
                      <small>
                        {used > b.amount
                          ? "Superado por " + money(used - b.amount)
                          : "Quedan " + money(b.amount - used)}
                      </small>
                      <div>
                        {edit("budget", b)}
                        {del("budgets", b)}
                      </div>
                    </div>
                  </div>
                );
              })}
            {!s.budgets.length && (
              <p className="empty">
                Pongan un límite a las categorías que quieran cuidar.
              </p>
            )}
          </section>
        </div>
        <button
          className="secondary spaced"
          onClick={() => exportCSV(s, entries)}
        >
          <Download size={17} /> Exportar movimientos del mes
        </button>
      </>
    );
  }
  return null;
}
