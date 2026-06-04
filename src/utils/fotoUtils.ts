import { writeFile, mkdir } from "@tauri-apps/plugin-fs";
import { appDataDir, join } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/core";

export async function guardarImagen(
  blob: Blob,
  nombre: string,
  subcarpeta: "estudiantes" | "profesores" = "estudiantes"
): Promise<string> {
  const baseDir = await appDataDir();
  const carpeta = await join(baseDir, "fotos", subcarpeta);

  await mkdir(carpeta, { recursive: true });

  const filePath = await join(carpeta, nombre);
  await writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));

  return nombre;
}

export async function obtenerUrlImagen(
  nombre: string,
  subcarpeta: "estudiantes" | "profesores" = "estudiantes"
): Promise<string> {
  const baseDir = await appDataDir();
  const fullPath = await join(baseDir, "fotos", subcarpeta, nombre);
  return convertFileSrc(fullPath);
}

export async function imagenABase64(nombreArchivo: string): Promise<string> {
  const baseDir = await appDataDir();
  const fullPath = await join(baseDir, "fotos", "estudiantes", nombreArchivo);
  const url = convertFileSrc(fullPath);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo cargar la imagen: ${response.status}`);
  }

  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (!result.startsWith("data:image")) {
        reject(new Error("El archivo no es una imagen válida"));
        return;
      }
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}