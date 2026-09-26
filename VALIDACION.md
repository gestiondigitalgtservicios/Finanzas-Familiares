# Validación local

- Compilación de producción completada con TypeScript y Vite.
- 15 pruebas automáticas aprobadas: cálculos de cuentas, reservas, transferencias, uso de metas, capital e intereses, límites de deuda, facturas duplicadas, fechas y SQL.
- El SQL se ejecutó sobre PostgreSQL embebido (PGlite), incluyendo una segunda ejecución para comprobar que conserva el hogar. Se probaron las dos cuentas autorizadas, rechazo de un tercer usuario, RLS, bloqueo de escritura directa, auditoría y conflicto entre versiones.
- La interfaz se probó localmente: registrar un gasto, aportar a una meta, pagar una cuota con intereses y confirmar un pago fijo. Los importes y saldos mostrados se actualizaron correctamente.
- Se revisó el diseño móvil de 390 px y el menú Más; sin desbordamiento horizontal en el inicio.
- Se comprobó la herramienta opcional WebMCP: rechaza abrir un formulario sin sesión/demo y abre el formulario de ingreso con la demo activa.
- Jaquelín queda como nombre inicial en el código y SQL. Los ejemplos antiguos con «Mi esposa» se actualizan al volver a entrar a la demostración.

No se conectó a un Supabase real ni se publicó en GitHub o Vercel. La autenticación de producción, las subidas al Storage real y el despliegue deben comprobarse después de la instalación manual descrita en INSTALACION.md. El SQL de pruebas simula auth/storage; no ejecuta sus servicios HTTP.
