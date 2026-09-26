import { ExpenseDonut, FamilyAvatar, CategoryIcon } from "./Visuals";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Wallet,
  PiggyBank,
  ChevronRight,
  Sparkles,
  House,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { accountBalance, reserved, money, billsFor } from "./model";
import type { State, Owner } from "./model";
export const ownerName = (s: State, o: string) =>
  o === "compartido" ? "Compartido" : s.names[o as "luis" | "pareja"] || o;
export function Dashboard({
  s,
  owner,
  month,
  onAdd,
  onGo,
}: {
  s: State;
  owner: string;
  month: string;
  onAdd: (kind: string) => void;
  onGo: (page: string) => void;
}) {
  const accounts = s.accounts.filter(
    (a) => owner === "all" || a.owner === owner,
  );
  const entries = s.entries.filter(
    (e) => (owner === "all" || e.owner === owner) && e.date.startsWith(month),
  );
  const balance = accounts.reduce((n, a) => n + accountBalance(s, a.id), 0),
    saved = accounts.reduce((n, a) => n + reserved(s, a.id), 0);
  const income = entries
      .filter((e) => e.kind === "income")
      .reduce((n, e) => n + e.amount, 0),
    expense = entries
      .filter((e) => e.kind === "expense")
      .reduce((n, e) => n + e.amount, 0);
  const bills = billsFor(s, month).filter(
      (b) => owner === "all" || b.owner === owner,
    ),
    pending = bills.filter((b) => !b.paid).reduce((n, b) => n + b.amount, 0);
  return (
    <>
      <div className="welcome family-welcome">
        <div>
          <h1>Finanzas familiares</h1>
          <h3>
            Hola, {s.names.luis} y {s.names.pareja}{" "}
            <span aria-hidden="true">👋</span>
          </h3>
          <p>Juntos construimos un mejor futuro.</p>
        </div>
        <FamilyAvatar />
      </div>
      <div className="family-overview">
        <section className="balance-card">
          <div className="balance-content">
            <div className="card-label">
              <Wallet size={20} /> Saldo disponible
            </div>
            <strong>{money(balance - saved)}</strong>
            <p>
              <Sparkles size={17} /> Lo de hoy, en orden. Lo de mañana, más
              cerca.
            </p>
            <div className="balance-foot">
              <span>
                Saldo total <b>{money(balance)}</b>
              </span>
              <span>
                Reservado en metas <b>{money(saved)}</b>
              </span>
            </div>
          </div>
          <span className="home-emblem" aria-hidden="true">
            <House size={90} strokeWidth={1.3} />
          </span>
        </section>
        <div className="stats family-stats">
          <section className="stat-card">
            <span className="icon-circle green">
              <ArrowUp size={21} />
            </span>
            <span>Ingresos del mes</span>
            <strong>{money(income)}</strong>
            <small>Sueldos e ingresos extras</small>
          </section>
          <section className="stat-card">
            <span className="icon-circle peach">
              <ArrowDown size={21} />
            </span>
            <span>Gastos del mes</span>
            <strong>{money(expense)}</strong>
            <small>Cuotas de deuda por separado</small>
          </section>
          <section className="stat-card">
            <span className="icon-circle blue">
              <PiggyBank size={21} />
            </span>
            <span>Ahorro acumulado</span>
            <strong>{money(saved)}</strong>
            <small>Reservado en tus cuentas</small>
          </section>
        </div>
      </div>
      <div className="quick-actions">
        <button onClick={() => onAdd("expense")}>
          <Minus /> Agregar gasto
        </button>
        <button onClick={() => onAdd("income")}>
          <Plus /> Agregar ingreso
        </button>
        <button onClick={() => onAdd("saving")}>
          <PiggyBank /> Ahorro
        </button>
        <button onClick={() => onAdd("transfer")}>
          <Wallet /> Mover dinero
        </button>
      </div>
      <section className="panel expense-panel">
        <div className="section-title">
          <h2>Gastos del mes</h2>
          <button className="text-button" onClick={() => onGo("Reportes")}>
            {money(expense)} <ChevronRight size={18} />
          </button>
        </div>
        <ExpenseDonut entries={entries} />
      </section>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-title">
            <div>
              <span className="eyebrow">NUESTROS PRÓXIMOS PASOS</span>
              <h2>Ahorros con propósito</h2>
            </div>
            <button className="text-button" onClick={() => onGo("Metas")}>
              Ver metas <ChevronRight size={16} />
            </button>
          </div>
          {s.goals
            .filter(
              (g) =>
                owner === "all" ||
                g.owner === owner ||
                g.owner === "compartido",
            )
            .slice(0, 2)
            .map((g, i) => {
              const amount = reserved(s, undefined, g.id);
              return (
                <div
                  className={"goal-preview " + (i === 0 ? "featured" : "")}
                  key={g.id}
                >
                  <div className="goal-heading">
                    <span className="goal-symbol">{i === 0 ? "♡" : "✦"}</span>
                    <div>
                      <h3>{g.name}</h3>
                      <small>{ownerName(s, g.owner)}</small>
                    </div>
                    <span className="percent">
                      {Math.round((amount / g.target) * 100)}%
                    </span>
                  </div>
                  <div className="goal-amount">
                    <b>{money(amount)}</b>
                    <span> de {money(g.target)}</span>
                  </div>
                  <div className="progress">
                    <i
                      style={{
                        width: `${Math.min(100, (amount / g.target) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="goal-bottom">
                    <span>Faltan {money(Math.max(0, g.target - amount))}</span>
                    <button onClick={() => onGo("Metas")}>
                      Ver aportes <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          {!s.goals.length && (
            <div className="empty">
              <PiggyBank />
              <h3>Un primer paso hacia su meta</h3>
              <p>Creen una meta y empiecen con cualquier monto.</p>
              <button className="secondary" onClick={() => onGo("Metas")}>
                Crear una meta
              </button>
            </div>
          )}
        </section>
        <section className="panel">
          <div className="section-title">
            <div>
              <span className="eyebrow">PARA TENERLO PRESENTE</span>
              <h2>Pagos del mes</h2>
            </div>
            <button
              aria-label="Ver pagos fijos"
              className="text-button"
              onClick={() => onGo("Pagos fijos")}
            >
              <ChevronRight />
            </button>
          </div>
          {bills.slice(0, 4).map((b) => (
            <div className="bill-row" key={b.id}>
              <div className="date-box">
                <small>DÍA</small>
                <b>{b.date.slice(-2)}</b>
              </div>
              <div className="grow">
                <b>{b.name}</b>
                <small>{ownerName(s, b.owner)}</small>
              </div>
              <div className="align-right">
                <b>{money(b.paidAmount ?? b.amount)}</b>
                <small className={b.paid ? "positive" : "muted"}>
                  {b.paid ? "Pagado" : "Pendiente"}
                </small>
              </div>
            </div>
          ))}
          {!bills.length && (
            <p className="empty">No hay pagos fijos programados.</p>
          )}
          <div className="upcoming-summary">
            <span>Pendiente del mes</span>
            <b>{money(pending)}</b>
          </div>
          <small className="hint">
            Después de estos pagos: {money(balance - saved - pending)}. Las
            cuotas de préstamos se consultan aparte.
          </small>
        </section>
        <section className="panel wide">
          <div className="section-title">
            <h2>Movimientos recientes</h2>
            <button className="text-button" onClick={() => onGo("Movimientos")}>
              Ver todos <ChevronRight size={16} />
            </button>
          </div>
          {[...entries]
            .sort(
              (a, b) =>
                b.date.localeCompare(a.date) ||
                b.updatedAt.localeCompare(a.updatedAt),
            )
            .slice(0, 5)
            .map((e) => (
              <div className="movement-row" key={e.id}>
                <span
                  className={
                    "icon-circle " +
                    (e.kind === "income"
                      ? "green"
                      : e.kind === "saving"
                        ? "lilac"
                        : "peach")
                  }
                >
                  {e.kind === "saving" ? (
                    <PiggyBank size={18} />
                  ) : e.kind === "income" ? (
                    <ArrowUp size={18} />
                  ) : (
                    <CategoryIcon category={e.category} kind={e.kind} />
                  )}
                </span>
                <div className="grow">
                  <b>{e.name}</b>
                  <small>
                    {e.category} ·{" "}
                    {s.accounts.find((a) => a.id === e.account)?.name}
                  </small>
                </div>
                <span className={"person " + e.owner}>
                  {ownerName(s, e.owner)}
                </span>
                <b
                  className={
                    e.kind === "income"
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
                </b>
              </div>
            ))}
          {!entries.length && (
            <p className="empty">
              Sus movimientos aparecerán aquí. Agreguen el primero.
            </p>
          )}
        </section>
      </div>
      <div className="footer-note">
        <Sparkles size={15} /> Cada pequeño aporte cuenta.
      </div>
    </>
  );
}
