# Entre dos · Finanzas del hogar

Aplicación personal para dos personas. React + TypeScript + Tailwind CSS + Vite. Backend preparado para Supabase Auth, PostgreSQL y Storage. Publicación en Vercel.

## Probar en tu computadora

Requiere Node.js 22.18 o posterior (se desarrolló con Node 24).

```bash
npm install
npm run dev
```

Abre la dirección que muestre Vite. Sin configurar Supabase aparece **Explorar demostración**. Los ejemplos son ficticios y sus cambios se guardan exclusivamente en este navegador. La demo no se importa al hogar real. En Ajustes puedes restablecer los ejemplos.

Para preparar los archivos de producción:

```bash
npm run build
```

Para ejecutar las pruebas locales de cálculos y SQL:

```bash
npm test
```

La prueba SQL usa PostgreSQL embebido (PGlite), con los esquemas de autenticación y almacenamiento simulados. No se conecta a servicios ni utiliza credenciales. No sustituye la comprobación final de Auth y Storage en tu proyecto Supabase.

## Instalación real

Sigue **INSTALACION.md**. Incluye el orden de los SQL, las variables de entorno y la configuración de Vercel.

## Incluido

- Dos cuentas con acceso al mismo hogar: `luis21aro@gmail.com` y `mjrb11@hotmail.com`.
- Nombres visibles editables; filtros del hogar, personales y compartidos.
- Cuentas bancarias, efectivo y ahorro con saldos iniciales.
- Ingresos regulares y extras, gastos, categorías y transferencias.
- Separación entre dueño del movimiento, persona que pagó y persona que lo registró.
- Metas con objetivo, fecha opcional, aportes de cada persona, retiros e historial.
- Fotos opcionales en movimientos y aportes: JPG, PNG y WebP, máximo 5 MB.
- Préstamos recibidos y otorgados, saldos iniciales, desembolsos, pagos, capital e intereses.
- Pagos fijos mensuales: pendientes, confirmados, pausados y reanudados.
- Presupuestos por categoría y persona, reportes mensuales y exportación CSV.
- Respaldo JSON de los datos y auditoría de cambios en PostgreSQL.
- Diseño adaptable a teléfono, tableta y escritorio.

## Uso cotidiano

1. **Una sola vez:** crea las cuentas con el dinero que tienen al iniciar; registra las deudas que ya existen y los pagos mensuales.
2. **Cada día:** desde Inicio, pulsa Registrar gasto o Agregar ingreso. La fecha y una cuenta aparecen seleccionadas; completa descripción y monto, y ajusta la persona o categoría si hace falta.
3. **Para ahorrar:** entra a Metas, crea el objetivo y pulsa Aportar. Indica quién aporta y en qué cuenta se conserva el dinero.
4. **Al pagar una factura:** entra a Pagos fijos, pulsa Pagar, ajusta el importe real y confirma. No se descuenta dinero por el simple paso del tiempo.
5. **Al pagar un préstamo:** pulsa Registrar pago, escribe el total y los intereses incluidos. Revisa el próximo vencimiento en Editar préstamo.
6. **Si tu pareja hizo cambios:** pulsa Actualizar. Si guardan simultáneamente, el sistema pide actualizar antes de repetir el cambio para evitar sobrescribir información.

## Reglas de dinero

Todos los montos se guardan como enteros en **centavos**, nunca como valores monetarios de punto flotante.

- Saldo de cuenta = saldo inicial + ingresos + préstamos recibidos + cobros + transferencias recibidas − gastos − pagos de préstamos − dinero prestado − transferencias enviadas.
- Un aporte a una meta reserva dinero en la cuenta seleccionada, sin cambiar su saldo.
- Retirar de una meta libera la reserva; no genera un ingreso.
- Un gasto vinculado a una meta reduce a la vez la cuenta y la reserva de esa misma cuenta.
- Transferir dinero entre cuentas no genera un ingreso ni un gasto.
- Para mover ahorro reservado a otro banco: retíralo de la meta, transfiérelo y vuelve a reservarlo. El historial conservará ambos aportes; el saldo actual sigue siendo correcto.
- Recibir un préstamo aumenta efectivo y deuda, pero no los ingresos del mes.
- En un pago de préstamo, solo el capital reduce la deuda. Los intereses se incluyen dentro del total pagado y se muestran en su historial.
- Los gastos cotidianos no incluyen pagos de préstamos. Reportes presenta las cuotas por separado para no confundir el consumo con el pago de capital.
- Los aportes por persona son **históricos brutos**. Retiros y gastos reducen el saldo de la meta, no borran quién hizo un aporte.
- Los saldos de cuentas y metas son actuales. El selector mensual filtra los movimientos, ingresos, gastos, presupuestos y pagos fijos, no reconstruye saldos históricos.
- El filtro personal se aplica a la propiedad. Un gasto del hogar pagado por Luis aparece en Compartido; Reportes lo cuenta además como pagado por Luis.
- La previsión «Después de estos pagos» descuenta los pagos fijos pendientes; las cuotas de deuda se consultan en Préstamos y no están incluidas en esa cifra.

## Alcance deliberadamente sencillo

No se conecta a bancos, no ejecuta pagos reales y no envía notificaciones. Los ingresos se registran al recibirlos. Los gastos fijos se repiten mensualmente; otras frecuencias pueden registrarse manualmente. No calcula amortizaciones bancarias ni intereses automáticamente: se introduce el desglose real del recibo. El vencimiento del préstamo se actualiza manualmente para no adelantarse por error cuando un pago es parcial.

No hay registro público, recuperación de contraseña dentro de la app ni acceso sin conexión al hogar real. Las contraseñas se administran en Supabase. La demostración local sí funciona sin configurar backend.

## Estructura

```text
src/
  App.tsx          Sesión, navegación, guardado y ajustes
  Dashboard.tsx    Resumen del hogar
  Views.tsx        Movimientos, cuentas, metas, préstamos y reportes
  Editor.tsx       Formularios
  model.ts         Tipos, cálculos y validación
  backend.ts       Cliente de Supabase
  styles.css       Diseño y adaptación a pantallas
supabase/
  01_schema.sql    Tablas, reglas, guardado atómico y Storage
  02_members.sql   Autoriza las dos cuentas existentes
  03_checks.sql    Consultas de verificación
 tests/
  model.test.ts    Casos de dinero
  sql.test.ts      Integración local de PostgreSQL y permisos
```

El hogar se guarda como un documento JSONB versionado en una fila. Es una estructura intencionalmente pequeña para este hogar de dos personas: permite guardar cuentas, movimientos y referencias de forma atómica. El servidor valida el contenido y registra cada diferencia en `household_audit`. El límite por documento es 4 MB; las fotos van aparte en Storage. Para un volumen mucho mayor, convendría migrar a tablas independientes y consultas paginadas.

Las fotos antiguas se conservan al editar o borrar movimientos, porque pueden estar referenciadas en la auditoría. Una carga que no termine de guardarse también puede dejar un archivo sin usar. La limpieza de esos archivos es manual; no se borran automáticamente para evitar perder comprobantes.

El respaldo JSON contiene referencias a las fotos; descarga el bucket por separado para respaldar también las imágenes. La restauración es manual: revisar el archivo y ejecutarlo mediante `save_household` con una sesión autorizada y la versión vigente. No pegar contraseñas o claves secretas dentro de un respaldo.
