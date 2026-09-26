import { createClient } from "@supabase/supabase-js";
import type { State } from "./model";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient(url, key) : null;
export async function fetchState() {
  const { data, error } = await supabase!
    .from("household")
    .select("data,version")
    .eq("id", 1)
    .single();
  if (error)
    throw Error(
      "No se pudo cargar el hogar. Verifica el SQL y el acceso de tu cuenta.",
    );
  return data as { data: State; version: number };
}
export async function saveState(data: State, version: number) {
  const { data: result, error } = await supabase!.rpc("save_household", {
    new_data: data,
    expected_version: version,
  });
  if (error) {
    if (error.message.includes("CONFLICT"))
      throw Error(
        "Otra persona guardó cambios. Cierra este formulario, pulsa Actualizar y vuelve a registrar el cambio.",
      );
    throw Error("No se pudo guardar. Revisa la conexión e inténtalo otra vez.");
  }
  return result as number;
}
export async function uploadPhoto(file: File, userId: string) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 5 * 1024 * 1024
  )
    throw Error("Usa una foto JPG, PNG o WebP de hasta 5 MB.");
  const path = `${userId}/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
  const { error } = await supabase!.storage
    .from("receipts")
    .upload(path, file, { contentType: file.type });
  if (error) throw Error("No se pudo subir la foto. Inténtalo de nuevo.");
  return path;
}
export async function photoUrl(path: string) {
  if (path.startsWith("data:")) return path;
  const { data, error } = await supabase!.storage
    .from("receipts")
    .createSignedUrl(path, 300);
  if (error) throw Error("No se pudo abrir la foto.");
  return data.signedUrl;
}
