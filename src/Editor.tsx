import { useEffect, useRef, useState } from "react";
import { X, Paperclip } from "lucide-react";
import {
  categories,
  incomeCategories,
  labels,
  today,
  monthNow,
  cents,
  uid,
} from "./model";
import type {
  State,
  Entry,
  Owner,
  Kind,
  Account,
  Goal,
  Loan,
  Bill,
  Budget,
} from "./model";
import { ownerName } from "./Dashboard";
export type ModalSpec = {
  type: string;
  kind?: string;
  item?: Entry | Account | Goal | Loan | Bill | Budget;
  goal?: string;
  loan?: string;
  bill?: Bill;
  period?: string;
};
export function Editor({
  spec,
  s,
  busy,
  onClose,
  onSave,
  defaultOwner,
}: {
  spec: ModalSpec;
  s: State;
  busy: boolean;
  defaultOwner: Owner;
  onClose: () => void;
  onSave: (data: Record<string, unknown>, file?: File) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState<string>(
    (spec.item as Entry)?.kind || spec.kind || "expense",
  );
  const [error, setError] = useState("");
  const [goal, setGoal] = useState(
    (spec.item as Entry)?.goal || spec.goal || "",
  );
  const [loan, setLoan] = useState(
    (spec.item as Entry)?.loan || spec.loan || "",
  );
  const item = spec.item as Record<string, any> | undefined;
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  const chosenOwner =
    item?.owner ||
    spec.bill?.owner ||
    s.loans.find((l) => l.id === spec.loan)?.owner ||
    defaultOwner;
  const [chosenAccount, setChosenAccount] = useState(
    item?.account ||
      spec.bill?.account ||
      s.accounts.find((a) => a.owner === chosenOwner)?.id ||
      s.accounts[0]?.id ||
      "",
  );
  const [payer, setPayer] = useState(
    item?.paidBy ||
      s.accounts.find((a) => a.id === chosenAccount)?.owner ||
      defaultOwner,
  );
  const selectOwner = (
    label = "De quién es",
    name = "owner",
    value = chosenOwner,
  ) => (
    <label>
      {label}
      <select
        name={name}
        defaultValue={name === "paidBy" ? undefined : value}
        value={name === "paidBy" ? payer : undefined}
        onChange={
          name === "paidBy" ? (e) => setPayer(e.target.value) : undefined
        }
      >
        <option value="luis">{s.names.luis}</option>
        <option value="pareja">{s.names.pareja}</option>
        <option value="compartido">Compartido</option>
      </select>
    </label>
  );
  const account = (
    name = "account",
    label = "Cuenta",
    value = item?.account || spec.bill?.account,
  ) => (
    <label>
      {label}
      <select
        name={name}
        required
        defaultValue={name === "account" ? undefined : value || ""}
        value={name === "account" ? chosenAccount : undefined}
        onChange={
          name === "account"
            ? (e) => {
                setChosenAccount(e.target.value);
                setPayer(
                  s.accounts.find((a) => a.id === e.target.value)?.owner ||
                    defaultOwner,
                );
              }
            : undefined
        }
      >
        <option value="" disabled>
          Selecciona una cuenta
        </option>
        {s.accounts.map((a) => (
          <option value={a.id} key={a.id}>
            {a.name} · {ownerName(s, a.owner)}
          </option>
        ))}
      </select>
    </label>
  );
  const amount = (
    label = "Monto (Q)",
    name = "amount",
    value = item?.[name] ?? spec.bill?.amount,
    min = "0.01",
  ) => (
    <label>
      {label}
      <input
        name={name}
        type="number"
        min={min}
        max="100000000"
        step="0.01"
        required
        defaultValue={value !== undefined ? value / 100 : undefined}
        placeholder="0.00"
      />
    </label>
  );
  const name = (label = "Nombre", value = item?.name || spec.bill?.name) => (
    <label className="span2">
      {label}
      <input
        name="name"
        maxLength={100}
        defaultValue={value}
        placeholder={
          spec.type === "goal"
            ? "Ej. La llegada de nuestro bebé"
            : spec.type === "account"
              ? "Ej. Mi cuenta de banco"
              : "¿Qué quieres registrar?"
        }
        required
      />
    </label>
  );
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    const str = (k: string) => String(f.get(k) || "");
    let data: Record<string, unknown> = { id: item?.id || uid() };
    if (spec.type === "entry")
      data = {
        ...item,
        ...data,
        kind,
        name: str("name"),
        amount: cents(f.get("amount")),
        date: str("date"),
        owner: str("owner") as Owner,
        account: str("account"),
        to: kind === "transfer" ? str("to") : undefined,
        goal: ["saving", "release", "expense"].includes(kind)
          ? goal || undefined
          : undefined,
        loan: kind.startsWith("loan_") ? loan : undefined,
        interest: ["loan_payment", "loan_recovery"].includes(kind)
          ? cents(f.get("interest"))
          : undefined,
        category: str("category") || labels[kind as Kind],
        note: str("note"),
        bill: spec.bill?.id || item?.bill,
        period: spec.period || item?.period,
        paidBy: str("paidBy") || str("owner"),
      };
    if (spec.type === "account")
      data = {
        ...data,
        name: str("name"),
        owner: str("owner"),
        opening: cents(f.get("opening")),
        type: str("accountType"),
      };
    if (spec.type === "goal")
      data = {
        ...data,
        name: str("name"),
        owner: str("owner"),
        target: cents(f.get("target")),
        date: str("date"),
      };
    if (spec.type === "loan")
      data = {
        ...data,
        name: str("name"),
        owner: str("owner"),
        opening: cents(f.get("opening")),
        installment: cents(f.get("installment")),
        direction: str("direction"),
        due: str("date"),
        note: str("note"),
      };
    if (spec.type === "bill")
      data = {
        ...item,
        ...data,
        name: str("name"),
        owner: str("owner"),
        amount: cents(f.get("amount")),
        day: Number(f.get("day")),
        account: str("account"),
        category: str("category"),
        start: str("start"),
      };
    if (spec.type === "budget")
      data = {
        ...data,
        category: str("category"),
        owner: str("owner"),
        amount: cents(f.get("amount")),
      };
    const file = f.get("photo");
    try {
      await onSave(data, file instanceof File && file.size ? file : undefined);
    } catch (err) {
      setError((err as Error).message);
    }
  }
  const title =
    spec.type === "entry"
      ? item
        ? "Editar movimiento"
        : spec.bill
          ? "Confirmar pago"
          : "Nuevo movimiento"
      : (item
          ? "Editar "
          : ["loan", "bill", "budget"].includes(spec.type)
            ? "Nuevo "
            : "Nueva ") +
        ({
          account: "cuenta",
          goal: "meta",
          loan: "préstamo",
          bill: "pago fijo",
          budget: "presupuesto",
        }[spec.type] || "");
  return (
    <dialog
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      className="modal"
    >
      <div className="modal-heading">
        <div>
          <span className="eyebrow">UN PASO MÁS EN ORDEN</span>
          <h2>{title}</h2>
        </div>
        <button aria-label="Cerrar" disabled={busy} onClick={onClose}>
          <X />
        </button>
      </div>
      <form onSubmit={submit}>
        <div className="form-grid">
          {spec.type === "entry" && (
            <>
              <label className="span2">
                Tipo de movimiento
                <select
                  value={kind}
                  onChange={(e) => {
                    setKind(e.target.value);
                    setGoal("");
                    setLoan("");
                  }}
                  disabled={!!spec.bill || !!item?.bill}
                >
                  {Object.entries(labels).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              {name("Descripción")}
              {amount()}
              <label>
                Fecha
                <input
                  type="date"
                  name="date"
                  required
                  max={today()}
                  defaultValue={item?.date || today()}
                />
              </label>
              {selectOwner(
                kind === "saving"
                  ? "Quién aporta"
                  : kind === "income"
                    ? "Quién recibe"
                    : "De quién es",
              )}
              {account()}
              {kind === "income" && (
                <p className="form-note span2">
                  Este ingreso se sumará a la cuenta{" "}
                  {s.accounts.find((a) => a.id === chosenAccount)?.name ||
                    "seleccionada"}
                  . Regístralo cuando el dinero realmente entre; el sueldo
                  esperado del mes no es saldo disponible.
                </p>
              )}
              {kind === "expense" && selectOwner("Quién pagó", "paidBy", payer)}
              {kind === "transfer" &&
                account("to", "Cuenta de destino", item?.to)}
              {["expense", "income"].includes(kind) && (
                <label>
                  Categoría
                  <select
                    name="category"
                    defaultValue={item?.category || spec.bill?.category}
                  >
                    {(kind === "income" ? incomeCategories : categories).map(
                      (c) => (
                        <option key={c}>{c}</option>
                      ),
                    )}
                  </select>
                </label>
              )}
              {["saving", "release", "expense"].includes(kind) && (
                <label className="span2">
                  {kind === "expense"
                    ? "Usar ahorro de una meta (opcional)"
                    : "Meta"}
                  <select
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    required={kind !== "expense"}
                  >
                    <option value="">
                      {kind === "expense"
                        ? "Sin usar ahorros"
                        : "Selecciona una meta"}
                    </option>
                    {s.goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {kind.startsWith("loan_") && (
                <label className="span2">
                  Préstamo
                  <select
                    value={loan}
                    onChange={(e) => setLoan(e.target.value)}
                    required
                  >
                    <option value="">Selecciona un préstamo</option>
                    {s.loans
                      .filter(
                        (l) =>
                          l.direction ===
                          (["loan_payment", "loan_received"].includes(kind)
                            ? "owe"
                            : "owed"),
                      )
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} · {ownerName(s, l.owner)}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              {["loan_payment", "loan_recovery"].includes(kind) &&
                amount(
                  "Intereses y cargos incluidos (Q)",
                  "interest",
                  item?.interest || 0,
                  "0",
                )}
              <label className="span2">
                Nota (opcional)
                <textarea
                  name="note"
                  rows={2}
                  maxLength={1000}
                  defaultValue={item?.note}
                />
              </label>
              <label className="span2 photo-input">
                <span>
                  <Paperclip size={17} /> Foto opcional · máximo 5 MB
                </span>
                <input
                  name="photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                />
                {item?.photo && (
                  <small>Ya hay una foto. Elegir otra la reemplazará.</small>
                )}
              </label>
              {kind === "saving" && (
                <p className="form-note span2">
                  El dinero permanece en esta cuenta, reservado para la meta.
                  Para cambiarlo de banco, usa primero una transferencia.
                </p>
              )}
              {kind === "release" && (
                <p className="form-note span2">
                  Libera dinero reservado en esta cuenta. No es un ingreso
                  nuevo.
                </p>
              )}
            </>
          )}
          {spec.type === "account" && (
            <>
              {name()}
              {selectOwner()}
              {amount(
                "Dinero real al iniciar (Q)",
                "opening",
                item?.opening || 0,
                "0",
              )}
              <label>
                Tipo
                <select name="accountType" defaultValue={item?.type || "Banco"}>
                  <option>Banco</option>
                  <option>Efectivo</option>
                  <option>Ahorro</option>
                </select>
              </label>
              <p className="form-note span2">
                Es el dinero que ya había en esta cuenta al empezar a usar la
                app. No pongas aquí ingresos mensuales esperados: registra cada
                ingreso cuando lo recibas en Movimientos.
              </p>
            </>
          )}
          {spec.type === "goal" && (
            <>
              {name()}
              {amount("Monto objetivo (Q)", "target")}
              {selectOwner()}
              <label className="span2">
                Fecha deseada (opcional)
                <input name="date" type="date" defaultValue={item?.date} />
              </label>
            </>
          )}
          {spec.type === "loan" && (
            <>
              {name("Nombre del préstamo o persona")}
              {selectOwner()}
              <label>
                Tipo
                <select
                  name="direction"
                  defaultValue={item?.direction || "owe"}
                  disabled={!!item}
                >
                  <option value="owe">Debemos dinero</option>
                  <option value="owed">Nos deben dinero</option>
                </select>
                {item && (
                  <input
                    type="hidden"
                    name="direction"
                    value={item.direction}
                  />
                )}
              </label>
              {amount(
                "Deuda inicial pendiente (Q)",
                "opening",
                item?.opening || 0,
                "0",
              )}
              {amount(
                "Cuota mensual prevista (Q)",
                "installment",
                item?.installment || 0,
                "0",
              )}
              <label className="span2">
                Próximo vencimiento (opcional)
                <input name="date" type="date" defaultValue={item?.due} />
              </label>
              <label className="span2">
                Notas / condiciones
                <textarea
                  name="note"
                  maxLength={1000}
                  defaultValue={item?.note}
                />
              </label>
              <p className="form-note span2">
                Para un préstamo vigente escribe lo que deben hoy. Si es nuevo,
                inicia en Q0 y registra después «Préstamo recibido» o «Dinero
                prestado» para actualizar también la cuenta. Actualiza el
                próximo vencimiento al pagar.
              </p>
            </>
          )}
          {spec.type === "bill" && (
            <>
              {name()}
              {amount()}
              {selectOwner("Responsable")}
              {account()}
              <label>
                Día de pago mensual
                <input
                  name="day"
                  type="number"
                  min="1"
                  max="31"
                  defaultValue={item?.day || 1}
                  required
                />
              </label>
              <label>
                Categoría
                <select name="category" defaultValue={item?.category}>
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Desde el mes
                <input
                  name="start"
                  type="month"
                  defaultValue={item?.start || monthNow()}
                  required
                />
              </label>
              <p className="form-note span2">
                Se repetirá cada mes hasta que lo pauses. Podrás ajustar el
                importe al confirmar cada pago. En meses cortos se usa el último
                día disponible.
              </p>
            </>
          )}
          {spec.type === "budget" && (
            <>
              <label>
                Categoría
                <select name="category" defaultValue={item?.category}>
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              {selectOwner()}
              {amount("Límite mensual (Q)")}
            </>
          )}
        </div>
        {error && (
          <div role="alert" className="error">
            {error}
          </div>
        )}
        <div className="modal-footer">
          <button
            type="button"
            className="secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Guardando…" : spec.bill ? "Confirmar pago" : "Guardar"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
