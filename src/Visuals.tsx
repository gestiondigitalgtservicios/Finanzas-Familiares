import {
  ShoppingCart,
  Home,
  Car,
  HeartPulse,
  GraduationCap,
  Baby,
  ShoppingBag,
  Utensils,
  Zap,
  CircleEllipsis,
  PiggyBank,
  ArrowUp,
  ArrowDown,
  Wallet,
  UsersRound,
} from "lucide-react";
import type { Entry } from "./model";
import { categories, money } from "./model";
const colors = [
  "#1eb9a4",
  "#399ef7",
  "#ffd25b",
  "#ff914e",
  "#aa79f9",
  "#ef69bf",
  "#65c6ed",
  "#48c78e",
  "#889af0",
  "#90a9b8",
];
export function CategoryIcon({
  category,
  kind,
}: {
  category: string;
  kind?: string;
}) {
  const Icon =
    kind === "income"
      ? ArrowUp
      : kind === "saving" || kind === "release"
        ? PiggyBank
        : (
            {
              Alimentación: ShoppingCart,
              Vivienda: Home,
              Servicios: Zap,
              Transporte: Car,
              Salud: HeartPulse,
              Bebé: Baby,
              Compras: ShoppingBag,
              Ocio: Utensils,
              Educación: GraduationCap,
            } as Record<string, typeof Home>
          )[category] || CircleEllipsis;
  return <Icon size={22} strokeWidth={2.3} />;
}
export function ExpenseDonut({ entries }: { entries: Entry[] }) {
  const amounts = categories
    .map((category, index) => ({
      category,
      color: colors[index],
      amount: entries
        .filter((e) => e.kind === "expense" && e.category === category)
        .reduce((n, e) => n + e.amount, 0),
    }))
    .filter((c) => c.amount > 0);
  const total = amounts.reduce((n, c) => n + c.amount, 0);
  let offset = 0;
  const stops = amounts
    .map((c) => {
      const start = offset;
      offset += (c.amount / total) * 100;
      return `${c.color} ${start}% ${offset}%`;
    })
    .join(",");
  return (
    <div className="expense-visual">
      <div
        className="donut"
        role="img"
        aria-label={`Gastos por categoría. Total ${money(total)}`}
        style={{ background: total ? `conic-gradient(${stops})` : "#e2edf4" }}
      >
        <div>
          <b>{money(total)}</b>
          <span>Total</span>
        </div>
      </div>
      <div className="donut-legend">
        {amounts.map((c) => (
          <div className="legend-row" key={c.category}>
            <span
              className="legend-icon"
              style={{ color: c.color, background: `${c.color}18` }}
            >
              <CategoryIcon category={c.category} />
            </span>
            <span>{c.category}</span>
            <small>{Math.round((c.amount / total) * 100)}%</small>
            <b>{money(c.amount)}</b>
          </div>
        ))}
        {!total && (
          <p className="hint">
            Tus gastos aparecerán aquí al registrar el primero.
          </p>
        )}
      </div>
    </div>
  );
}
export function FamilyAvatar() {
  return (
    <div className="family-avatar" aria-label="Nuestro hogar">
      <UsersRound size={34} />
    </div>
  );
}
export function SavingsBanner({ amount }: { amount: number }) {
  return (
    <div className="savings-banner">
      <div>
        <span>Ahorro total reservado</span>
        <strong>{money(amount)}</strong>
        <p>Cada pequeño aporte cuenta.</p>
      </div>
      <span className="banner-icon">
        <PiggyBank size={88} strokeWidth={1.35} />
      </span>
    </div>
  );
}
export function MovementSummary({ entries }: { entries: Entry[] }) {
  return (
    <div className="movement-summary">
      <div className="income-summary">
        <span className="icon-circle">
          <ArrowUp />
        </span>
        <div>
          <span>Total de ingresos</span>
          <strong>
            {money(
              entries
                .filter((e) => e.kind === "income")
                .reduce((n, e) => n + e.amount, 0),
            )}
          </strong>
        </div>
      </div>
      <div className="expense-summary">
        <span className="icon-circle">
          <ArrowDown />
        </span>
        <div>
          <span>Total de gastos</span>
          <strong>
            {money(
              entries
                .filter((e) => e.kind === "expense")
                .reduce((n, e) => n + e.amount, 0),
            )}
          </strong>
        </div>
      </div>
    </div>
  );
}
