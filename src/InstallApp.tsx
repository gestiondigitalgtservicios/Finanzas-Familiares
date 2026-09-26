import { useEffect, useState } from "react";

type InstallEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const media = matchMedia("(display-mode: standalone)");
    const sync = () =>
      setInstalled(
        media.matches ||
          Boolean(
            (navigator as Navigator & { standalone?: boolean }).standalone,
          ),
      );
    const ready = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallEvent);
    };
    const done = () => {
      setInstalled(true);
      setPrompt(null);
    };
    sync();
    media.addEventListener("change", sync);
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", done);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("beforeinstallprompt", ready);
      window.removeEventListener("appinstalled", done);
    };
  }, []);
  if (installed) return null;
  return (
    <details className="install-app">
      <summary>Instalar Entre dos</summary>
      <div>
        <p>
          Ten las cuentas de tu hogar a un toque, desde tu pantalla de inicio.
        </p>
        {prompt ? (
          <button
            className="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await prompt.prompt();
                await prompt.userChoice;
              } finally {
                setPrompt(null);
                setBusy(false);
              }
            }}
          >
            Instalar aplicación
          </button>
        ) : (
          <p>
            En Android o computadora, abre el menú del navegador y busca
            «Instalar aplicación» o «Agregar a pantalla de inicio». En iPhone o
            iPad, abre esta página en Safari y elige Compartir → Agregar a
            pantalla de inicio.
          </p>
        )}
        <small>
          Si no aparece la opción, usa la dirección HTTPS publicada. Para
          sincronizar tus cuentas necesitas internet.
        </small>
      </div>
    </details>
  );
}
