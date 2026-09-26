export type Owner = "luis" | "pareja" | "compartido";
export type Kind =
  | "income"
  | "expense"
  | "transfer"
  | "saving"
  | "release"
  | "loan_payment"
  | "loan_received"
  | "loan_given"
  | "loan_recovery";
export type Account = {
  id: string;
  name: string;
  owner: Owner;
  opening: number;
  type: string;
};
export type Goal = {
  id: string;
  name: string;
  target: number;
  date: string;
  owner: Owner;
};
export type Loan = {
  id: string;
  name: string;
  owner: Owner;
  direction: "owe" | "owed";
  opening: number;
  installment: number;
  due: string;
  note: string;
};
export type Bill = {
  id: string;
  name: string;
  owner: Owner;
  amount: number;
  day: number;
  category: string;
  account: string;
  start: string;
  end?: string;
};
export type Entry = {
  id: string;
  kind: Kind;
  name: string;
  amount: number;
  date: string;
  owner: Owner;
  account: string;
  to?: string;
  goal?: string;
  loan?: string;
  interest?: number;
  category: string;
  note: string;
  photo?: string;
  bill?: string;
  period?: string;
  createdBy: string;
  updatedAt: string;
  paidBy?: Owner;
};
export type Budget = {
  id: string;
  category: string;
  owner: Owner;
  amount: number;
};
export type State = {
  accounts: Account[];
  goals: Goal[];
  loans: Loan[];
  bills: Bill[];
  entries: Entry[];
  budgets: Budget[];
  names: { luis: string; pareja: string };
};
export const categories = [
  "Alimentación",
  "Vivienda",
  "Servicios",
  "Transporte",
  "Salud",
  "Bebé",
  "Compras",
  "Ocio",
  "Educación",
  "Otros",
];
export const incomeCategories = [
  "Sueldo",
  "Trabajo extra",
  "Bono",
  "Venta",
  "Regalo",
  "Otros",
];
export const labels: Record<Kind, string> = {
  income: "Ingreso",
  expense: "Gasto",
  transfer: "Transferencia",
  saving: "Aporte a meta",
  release: "Retiro de meta",
  loan_payment: "Pago de préstamo",
  loan_received: "Préstamo recibido",
  loan_given: "Dinero prestado",
  loan_recovery: "Cobro de préstamo",
};
export const uid = () => crypto.randomUUID();
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guatemala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const monthNow = () => today().slice(0, 7);
export const money = (cents: number) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(cents / 100);
export const cents = (value: FormDataEntryValue | null) =>
  Math.round(Number(value || 0) * 100);
export const blank = (): State => ({
  accounts: [],
  goals: [],
  loans: [],
  bills: [],
  entries: [],
  budgets: [],
  names: { luis: "Luis", pareja: "Jaquelín" },
});
export function accountBalance(s: State, id: string) {
  let balance = s.accounts.find((a) => a.id === id)?.opening || 0;
  for (const e of s.entries) {
    if (e.account === id) {
      if (["income", "loan_received", "loan_recovery"].includes(e.kind))
        balance += e.amount;
      if (
        ["expense", "transfer", "loan_payment", "loan_given"].includes(e.kind)
      )
        balance -= e.amount;
    }
    if (e.kind === "transfer" && e.to === id) balance += e.amount;
  }
  return balance;
}
export function reserved(
  s: State,
  account?: string,
  goal?: string,
  owner?: string,
) {
  return s.entries
    .filter(
      (e) =>
        (!account || e.account === account) &&
        (!goal || e.goal === goal) &&
        (!owner || e.owner === owner),
    )
    .reduce(
      (n, e) =>
        n +
        (e.kind === "saving"
          ? e.amount
          : e.kind === "release" || (e.kind === "expense" && e.goal)
            ? -e.amount
            : 0),
      0,
    );
}
export function loanBalance(s: State, id: string) {
  const l = s.loans.find((l) => l.id === id);
  if (!l) return 0;
  return (
    l.opening +
    s.entries
      .filter((e) => e.loan === id)
      .reduce(
        (n, e) =>
          n +
          (["loan_received", "loan_given"].includes(e.kind)
            ? e.amount
            : -(e.amount - (e.interest || 0))),
        0,
      )
  );
}
export function dueDate(b: Bill, month: string) {
  const [y, m] = month.split("-").map(Number);
  return `${month}-${String(Math.min(b.day, new Date(y, m, 0).getDate())).padStart(2, "0")}`;
}
export function billsFor(s: State, month: string) {
  return s.bills
    .filter((b) => b.start <= month && (!b.end || b.end >= month))
    .map((b) => ({
      ...b,
      date: dueDate(b, month),
      paid: s.entries.some((e) => e.bill === b.id && e.period === month),
      paidAmount: s.entries.find((e) => e.bill === b.id && e.period === month)
        ?.amount,
    }));
}
export function validate(s: State) {
  if (!s.names.luis.trim() || !s.names.pareja.trim())
    throw Error("Escribe los nombres de ambos.");
  const ids = new Set<string>();
  for (const group of [
    s.accounts,
    s.goals,
    s.loans,
    s.bills,
    s.entries,
    s.budgets,
  ])
    for (const x of group) {
      if (ids.has(x.id)) throw Error("Hay un registro duplicado.");
      ids.add(x.id);
      if (!["luis", "pareja", "compartido"].includes(x.owner))
        throw Error("Selecciona una persona válida.");
      if ("name" in x && !x.name.trim())
        throw Error("Escribe un nombre o descripción.");
    }
  const validAmount = (n: number) =>
    Number.isSafeInteger(n) && n >= 0 && n <= 1e12;
  for (const a of s.accounts) {
    if (!validAmount(a.opening)) throw Error("Revisa el saldo inicial.");
  }
  for (const e of s.entries) {
    if (!(e.kind in labels)) throw Error("Tipo de movimiento inválido.");
    if (e.loan && !e.kind.startsWith("loan_"))
      throw Error("El préstamo no corresponde al tipo de movimiento.");
    if (e.goal && !["saving", "release", "expense"].includes(e.kind))
      throw Error("La meta no corresponde al tipo de movimiento.");
    if (
      e.bill &&
      (!s.bills.some((b) => b.id === e.bill) ||
        e.kind !== "expense" ||
        !/^\d{4}-\d{2}$/.test(e.period || ""))
    )
      throw Error("El pago fijo no es válido.");
    if (!validAmount(e.amount) || e.amount === 0)
      throw Error("El monto debe ser mayor que cero.");
    if (!s.accounts.some((a) => a.id === e.account))
      throw Error("Selecciona una cuenta válida.");
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(e.date) ||
      new Date(e.date + "T12:00:00Z").toISOString().slice(0, 10) !== e.date ||
      e.date > today()
    )
      throw Error("Registra solo movimientos realizados hasta hoy.");
    if (
      e.kind === "transfer" &&
      (!s.accounts.some((a) => a.id === e.to) || e.to === e.account)
    )
      throw Error("Selecciona una cuenta de destino diferente.");
    if (["saving", "release"].includes(e.kind) && !e.goal)
      throw Error("Selecciona una meta.");
    if (e.goal && !s.goals.some((g) => g.id === e.goal))
      throw Error("La meta no existe.");
    if (e.kind.startsWith("loan_")) {
      const l = s.loans.find((l) => l.id === e.loan);
      if (!l) throw Error("Selecciona un préstamo.");
      if (
        (["loan_payment", "loan_received"].includes(e.kind)
          ? "owe"
          : "owed") !== l.direction
      )
        throw Error("El tipo de movimiento no corresponde al préstamo.");
    }
    if (
      e.interest !== undefined &&
      (!validAmount(e.interest) || e.interest > e.amount)
    )
      throw Error("Los intereses no pueden superar el pago.");
  }
  for (const a of s.accounts) {
    if (accountBalance(s, a.id) < 0)
      throw Error(
        `Saldo insuficiente en ${a.name}. Revisa el saldo inicial o registra el ingreso.`,
      );
    if (reserved(s, a.id) > accountBalance(s, a.id))
      throw Error(
        `Parte del dinero de ${a.name} está reservado. Retíralo de su meta antes de usarlo.`,
      );
    for (const g of s.goals) {
      if (reserved(s, a.id, g.id) < 0)
        throw Error(`El retiro supera el ahorro de ${g.name} en ${a.name}.`);
    }
  }
  for (const l of s.loans) {
    if (
      !validAmount(l.opening) ||
      !validAmount(l.installment) ||
      loanBalance(s, l.id) < 0
    )
      throw Error("El abono a capital supera la deuda pendiente.");
  }
  for (const g of s.goals)
    if (!validAmount(g.target) || g.target === 0)
      throw Error("La meta debe tener un monto mayor que cero.");
  const paid = new Set<string>();
  for (const e of s.entries)
    if (e.bill) {
      const key = e.bill + e.period;
      if (paid.has(key)) throw Error("Este pago mensual ya está registrado.");
      paid.add(key);
    }
  for (const b of s.bills)
    if (
      !validAmount(b.amount) ||
      b.amount === 0 ||
      b.day < 1 ||
      b.day > 31 ||
      !Number.isInteger(b.day) ||
      !s.accounts.some((a) => a.id === b.account)
    )
      throw Error("Revisa el monto y día de pago.");
  for (const b of s.budgets)
    if (!validAmount(b.amount) || b.amount === 0)
      throw Error("El presupuesto debe ser mayor que cero.");
  return s;
}
export function demoData(): State {
  const s = blank();
  const m = monthNow();
  const date = `${m}-01`;
  s.accounts = [
    {
      id: "a1",
      name: "Banco de Luis",
      owner: "luis",
      opening: 620000,
      type: "Banco",
    },
    {
      id: "a2",
      name: "Banco de Jaquelín",
      owner: "pareja",
      opening: 480000,
      type: "Banco",
    },
    {
      id: "a3",
      name: "Efectivo del hogar",
      owner: "compartido",
      opening: 95000,
      type: "Efectivo",
    },
  ];
  s.goals = [
    {
      id: "g1",
      name: "La llegada de nuestro bebé",
      target: 2000000,
      date: `${Number(m.slice(0, 4)) + 1}-03-01`,
      owner: "compartido",
    },
    {
      id: "g2",
      name: "Nuestro fondo de emergencia",
      target: 1000000,
      date: "",
      owner: "compartido",
    },
  ];
  s.loans = [
    {
      id: "l1",
      name: "Préstamo personal",
      owner: "luis",
      direction: "owe",
      opening: 1200000,
      installment: 85000,
      due: today(),
      note: "Ejemplo de préstamo vigente",
    },
  ];
  const base = {
    date,
    note: "",
    createdBy: "Demostración",
    updatedAt: new Date().toISOString(),
  };
  s.entries = [
    {
      ...base,
      id: "e1",
      kind: "income",
      name: "Sueldo de septiembre",
      amount: 650000,
      owner: "luis",
      account: "a1",
      category: "Sueldo",
    },
    {
      ...base,
      id: "e2",
      kind: "income",
      name: "Sueldo del mes",
      amount: 540000,
      owner: "pareja",
      account: "a2",
      category: "Sueldo",
    },
    {
      ...base,
      id: "e3",
      kind: "expense",
      name: "Compras del supermercado",
      amount: 68550,
      owner: "compartido",
      account: "a1",
      category: "Alimentación",
    },
    {
      ...base,
      id: "e4",
      kind: "income",
      name: "Un proyecto extra",
      amount: 120000,
      owner: "pareja",
      account: "a2",
      category: "Trabajo extra",
    },
    {
      ...base,
      id: "e5",
      kind: "saving",
      name: "Primer aporte para el bebé",
      amount: 230000,
      owner: "luis",
      account: "a1",
      goal: "g1",
      category: "Ahorro",
    },
    {
      ...base,
      id: "e6",
      kind: "saving",
      name: "Un poquito más para el bebé",
      amount: 170000,
      owner: "pareja",
      account: "a2",
      goal: "g1",
      category: "Ahorro",
    },
    {
      ...base,
      id: "e7",
      kind: "saving",
      name: "Para estar tranquilos",
      amount: 100000,
      owner: "luis",
      account: "a1",
      goal: "g2",
      category: "Ahorro",
    },
    {
      ...base,
      id: "e8",
      kind: "expense",
      name: "Internet de casa",
      amount: 25000,
      owner: "compartido",
      account: "a2",
      category: "Servicios",
      bill: "b1",
      period: m,
    },
  ];
  s.bills = [
    {
      id: "b1",
      name: "Internet de casa",
      amount: 25000,
      owner: "compartido",
      day: 10,
      category: "Servicios",
      account: "a2",
      start: m,
    },
    {
      id: "b2",
      name: "Alquiler",
      amount: 250000,
      owner: "compartido",
      day: 28,
      category: "Vivienda",
      account: "a1",
      start: m,
    },
    {
      id: "b3",
      name: "Energía eléctrica",
      amount: 32000,
      owner: "compartido",
      day: 30,
      category: "Servicios",
      account: "a2",
      start: m,
    },
  ];
  s.budgets = [
    { id: "p1", category: "Alimentación", owner: "compartido", amount: 200000 },
    { id: "p2", category: "Servicios", owner: "compartido", amount: 80000 },
    { id: "p3", category: "Transporte", owner: "luis", amount: 100000 },
  ];
  return s;
}
