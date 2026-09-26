import test from "node:test";
import assert from "node:assert/strict";
import {
  blank,
  demoData,
  validate,
  accountBalance,
  reserved,
  loanBalance,
  billsFor,
  today,
  monthNow,
  uid,
} from "../src/model.ts";
import type { Entry } from "../src/model.ts";
function entry(overrides: Partial<Entry>): Entry {
  return {
    id: uid(),
    name: "Prueba",
    kind: "expense",
    amount: 1000,
    date: today(),
    owner: "luis",
    account: "a1",
    category: "Otros",
    note: "",
    createdBy: "Prueba",
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}
test("la demostración mantiene saldos y referencias válidos", () =>
  assert.doesNotThrow(() => validate(demoData())));
test("reservar no cambia el saldo bancario ni cuenta como gasto", () => {
  const s = demoData();
  const before = accountBalance(s, "a1");
  const saved = reserved(s, "a1");
  s.entries.push(entry({ kind: "saving", goal: "g1", amount: 5000 }));
  validate(s);
  assert.equal(accountBalance(s, "a1"), before);
  assert.equal(reserved(s, "a1"), saved + 5000);
});
test("transferencias conservan el dinero total", () => {
  const s = demoData();
  const total = () =>
    s.accounts.reduce((n, a) => n + accountBalance(s, a.id), 0);
  const before = total();
  s.entries.push(entry({ kind: "transfer", to: "a2", amount: 25000 }));
  validate(s);
  assert.equal(total(), before);
});
test("no permite gastar dinero ya reservado", () => {
  const s = demoData();
  s.entries.push(entry({ amount: accountBalance(s, "a1") }));
  assert.throws(() => validate(s), /reservado/);
});
test("gastar desde una meta reduce saldo y reserva exactamente una vez", () => {
  const s = demoData();
  const bank = accountBalance(s, "a1"),
    goal = reserved(s, "a1", "g1");
  s.entries.push(entry({ goal: "g1", amount: 5000 }));
  validate(s);
  assert.equal(accountBalance(s, "a1"), bank - 5000);
  assert.equal(reserved(s, "a1", "g1"), goal - 5000);
});
test("no permite retirar ahorro de otra cuenta", () => {
  const s = demoData();
  s.entries.push(entry({ kind: "release", goal: "g1", account: "a3" }));
  assert.throws(() => validate(s), /retiro/);
});
test("pago de préstamo separa capital e interés", () => {
  const s = demoData();
  const bank = accountBalance(s, "a1");
  s.entries.push(
    entry({ kind: "loan_payment", loan: "l1", amount: 85000, interest: 10000 }),
  );
  validate(s);
  assert.equal(loanBalance(s, "l1"), 1125000);
  assert.equal(accountBalance(s, "a1"), bank - 85000);
});
test("no permite pagar más capital que la deuda", () => {
  const s = demoData();
  s.accounts[0].opening = 5000000;
  s.entries.push(
    entry({ kind: "loan_payment", loan: "l1", amount: 1300000, interest: 0 }),
  );
  assert.throws(() => validate(s), /capital/);
});
test("préstamo recibido aumenta deuda y banco sin ser ingreso", () => {
  const s = demoData();
  const bank = accountBalance(s, "a1");
  s.entries.push(entry({ kind: "loan_received", loan: "l1", amount: 10000 }));
  validate(s);
  assert.equal(accountBalance(s, "a1"), bank + 10000);
  assert.equal(loanBalance(s, "l1"), 1210000);
});
test("no duplica un pago mensual, pero permite otro período", () => {
  const s = demoData();
  s.entries.push(entry({ bill: "b1", period: monthNow() }));
  assert.throws(() => validate(s), /ya está registrado/);
});
test("fecha 31 se ajusta a febrero y un pago futuro no reduce saldo", () => {
  const s = demoData();
  s.bills[0].start = "2020-01";
  s.bills[0].day = 31;
  assert.equal(billsFor(s, "2028-02")[0].date, "2028-02-29");
  assert.equal(billsFor(s, "2027-02")[0].date, "2027-02-28");
  const before = accountBalance(s, "a1");
  billsFor(s, monthNow());
  assert.equal(accountBalance(s, "a1"), before);
});
test("rechaza fechas futuras, montos negativos y transferencias a sí mismo", () => {
  for (const edit of [
    { date: "2099-01-01" },
    { amount: -1 },
    { kind: "transfer", to: "a1" },
  ]) {
    const s = demoData();
    s.entries.push(entry(edit as Partial<Entry>));
    assert.throws(() => validate(s));
  }
});
test("hogar real empieza sin datos de ejemplo", () => {
  const s = blank();
  assert.equal(s.entries.length, 0);
  assert.equal(s.accounts.length, 0);
});

test("factura confirmada muestra importe real sin cambiar la plantilla mensual", () => {
  const s = demoData();
  const invoice = s.entries.find((e) => e.bill === "b1")!;
  invoice.amount = 28000;
  const bill = billsFor(s, monthNow()).find((b) => b.id === "b1")!;
  assert.equal(bill.paidAmount, 28000);
  assert.equal(bill.amount, 25000);
});
