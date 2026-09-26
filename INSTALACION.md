# Instalación manual · Entre dos

Todo está preparado localmente. No se ha creado ningún proyecto, repositorio ni publicación en servicios externos.

## 1. Preparar Supabase

Crea un proyecto nuevo. Necesitarás su URL y su **Publishable key** (también funciona la clave pública `anon` de proyectos con claves anteriores).

En **SQL Editor**, ejecuta todo el contenido de:

1. `supabase/01_schema.sql`

Crea el hogar vacío, la lista de miembros, auditoría, funciones de validación y el bucket privado `receipts`. Es seguro volver a ejecutarlo sobre este esquema: no reemplaza los datos existentes. Usa un proyecto dedicado para no mezclarlo con políticas de otra aplicación.

## 2. Crear las dos cuentas

En **Authentication → Users → Add user → Create new user**, crea estas cuentas:

- `luis21aro@gmail.com`
- `mjrb11@hotmail.com`

Escribe las contraseñas que elegiste directamente en Supabase. **No se incluyen en ningún archivo del proyecto.** Marca el correo como confirmado al crearlas si aparece la opción de confirmación automática.

En la configuración de Authentication:

- Mantén habilitado el proveedor Email / inicio de sesión con contraseña.
- Desactiva **Allow new users to sign up** (registro público).
- No hace falta habilitar Google, enlaces mágicos ni otros proveedores.

Después, ejecuta:

2. `supabase/02_members.sql`

Debe mostrar exactamente los dos correos y sus identificadores `luis` y `pareja`. Si falta una cuenta, el script se detiene sin autorizar parcialmente el hogar. Aunque exista otro usuario autenticado en el proyecto, no podrá leer ni escribir este hogar ni sus fotos.

Puedes ejecutar `supabase/03_checks.sql` para consultar la configuración y, posteriormente, los últimos cambios. No modifica datos.

## 3. Conectar la app local

Copia `.env.example` a `.env.local` y completa:

```dotenv
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICABLE
```

No uses `service_role`, una secret key, la contraseña de PostgreSQL ni las contraseñas de sus cuentas en estas variables. Las variables con prefijo `VITE_` forman parte del código que recibe el navegador. La protección real la realizan Auth, los miembros autorizados y las políticas SQL.

Si el servidor ya estaba abierto, reinícialo para leer las variables:

```bash
npm install
npm run dev
```

Aparecerá el formulario de acceso. Inicia sesión con una de las dos cuentas. El hogar empieza vacío, independientemente de los cambios que hayas hecho en la demostración.

## 4. Subir a GitHub

Sube el contenido de la carpeta `hogar` a tu repositorio privado, incluidos `package-lock.json`, `supabase`, `src` y estas guías.

No subas `node_modules`, `dist` ni `.env.local`. El archivo `.gitignore` ya los excluye. Si GitHub contiene directamente estos archivos en su raíz, no necesitas crear otra subcarpeta llamada hogar.

## 5. Publicar en Vercel

Importa el repositorio y configura:

| Opción           | Valor                                                                            |
| ---------------- | -------------------------------------------------------------------------------- |
| Framework preset | Vite                                                                             |
| Root Directory   | La carpeta que contiene `package.json`; `.` si subiste el contenido directamente |
| Install Command  | `npm ci`                                                                         |
| Build Command    | `npm run build`                                                                  |
| Output Directory | `dist`                                                                           |
| Node.js          | 24.x (o 22.x >= 22.18)                                                           |

Agrega a las variables de entorno de Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Actívalas para Production; también para Preview si quieres que esos despliegues se conecten al mismo hogar. Todas las vistas previas que usen las mismas variables compartirán los mismos datos reales. No necesitas variables de servidor ni claves secretas.

Publica. Si agregas o cambias las variables después del primer despliegue, vuelve a desplegar: Vite las incorpora al compilar. `vercel.json` ya contiene la configuración de compilación y las rutas de la app.

En Supabase, configura **Authentication → URL Configuration → Site URL** con tu dominio de Vercel. Si más adelante usas recuperación por correo, sus direcciones de retorno también tendrán que autorizarse. El acceso actual usa correo y contraseña y no requiere un servicio de correo personalizado para las cuentas creadas y confirmadas manualmente.

## 6. Primera puesta en marcha

1. En Ajustes, cambia los nombres visibles si deseas.
2. En Cuentas, crea su efectivo y sus bancos. Usa los saldos al comenzar el control.
3. En Préstamos, registra las deudas actuales. Ese saldo inicial no ingresa dinero al banco, porque representa una deuda que ya existe.
4. Si un préstamo acaba de desembolsarse, créalo en Q0 y agrega un movimiento «Préstamo recibido» a la cuenta correspondiente.
5. Crea los pagos fijos mensuales y sus responsables.
6. Crea su meta «Parto» con monto objetivo y fecha opcional.
7. Registra los ahorros que ya tengan como aportes a la meta desde las cuentas que realmente contienen ese dinero. El saldo inicial de esas cuentas debe incluirlo.

## Comprobación después de publicar

- Inicia sesión con cada cuenta y confirma que ambas ven el mismo hogar.
- Crea una cuenta y un movimiento pequeño de comprobación; comprueba el saldo.
- Aporta a una meta y confirma que el saldo del banco no cambia, pero sí el disponible.
- Adjunta una foto JPG pequeña y comprueba que se puede abrir con la otra cuenta.
- Abre dos sesiones, guarda desde una y luego intenta guardar desde la otra sin actualizar. La segunda debe pedirte actualizar, no sobrescribir el cambio anterior.
- Cierra sesión y comprueba que vuelve a aparecer el acceso.

## Si algo no funciona

| Síntoma                           | Qué revisar                                                                                        |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| Solo aparece la demostración      | Faltan variables, están vacías o no se recompiló después de agregarlas.                            |
| No permite iniciar sesión         | Correo, contraseña, proveedor Email y confirmación del correo.                                     |
| Entra pero no carga el hogar      | Que se ejecutaran ambos SQL en orden y que el usuario figure en `household_members`.               |
| No permite subir fotos            | Bucket `receipts`, políticas del SQL, JPG/PNG/WebP y tamaño máximo 5 MB.                           |
| Cambios simultáneos               | Cierra el formulario, pulsa Actualizar y repite el registro.                                       |
| No permite gastar                 | Revisa saldo inicial y reservas en metas de la cuenta elegida.                                     |
| Transferencia de ahorro rechazada | Retira primero el monto de la meta en la cuenta de origen; transfiérelo y resérvalo en el destino. |
| La demo no guarda una foto        | El almacenamiento del navegador está lleno; usa una imagen menor o restablece los ejemplos.        |

No hay procesos programados, servicios adicionales, migraciones automáticas ni facturación bancaria conectada. Los pagos se registran manualmente.
