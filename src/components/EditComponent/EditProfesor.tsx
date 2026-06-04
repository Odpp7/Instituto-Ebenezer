import { useState, useEffect, useRef } from "react";
import { Save, X, User, Camera } from "lucide-react";
import { Profesor, actualizarProfesor, obtenerFotosProfesor, guardarFotoProfesor } from "../../services/profesorService";
import { guardarImagen } from "../../utils/fotoUtils";
import { convertFileSrc } from "@tauri-apps/api/core";
import { appDataDir, join } from "@tauri-apps/api/path";
import "../../styles/editProfesor.css";

interface Props {
  profesor: Profesor | null;
  onGuardado: () => void;
  onCancelar: () => void;
}

async function comprimirImagenABlob(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext("2d")!;
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, 200, 200);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) return reject("Error al comprimir");
        resolve(blob);
      }, "image/jpeg", 0.7);
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Detecta si el valor guardado es base64 legacy o un nombre de archivo nuevo
function esBase64(valor: string): boolean {
  return valor.startsWith("data:image") || valor.length > 260;
}

// Resuelve la URL de visualización sin importar el formato almacenado
async function resolverUrlFoto(fotoPerfil: string): Promise<string> {
  if (esBase64(fotoPerfil)) {
    // Foto legacy: ya es un dataURL, se usa directo
    return fotoPerfil;
  }
  // Foto nueva: es un nombre de archivo, construir la URL con Tauri
  const baseDir = await appDataDir();
  const fullPath = await join(baseDir, "fotos", "profesores", fotoPerfil);
  return convertFileSrc(fullPath);
}

export default function EditProfesor({ profesor, onGuardado, onCancelar }: Props) {
  const [nombre, setNombre]             = useState("");
  const [cedula, setCedula]             = useState("");
  const [correo, setCorreo]             = useState("");
  const [telefono, setTelefono]         = useState("");
  const [especialidad, setEspecialidad] = useState("");

  // fotoPerfil: lo que está guardado en BD (base64 legacy o nombre de archivo)
  const [fotoPerfil, setFotoPerfil]     = useState<string | null>(null);
  // urlVisualizacion: la URL real para mostrar en el <img>
  const [urlVisualizacion, setUrlVisualizacion] = useState<string | null>(null);
  // fotoModificada: true solo si el usuario cambió la foto en esta sesión
  const [fotoModificada, setFotoModificada] = useState(false);

  const [verFoto, setVerFoto]           = useState(false);
  const [guardando, setGuardando]       = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const refFile = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profesor) {
      setNombre(profesor.nombre_completo);
      setCedula(profesor.cedula);
      setCorreo(profesor.correo ?? "");
      setTelefono(profesor.telefono ?? "");
      setEspecialidad(profesor.especialidad ?? "");
      setError(null);
      setFotoPerfil(null);
      setUrlVisualizacion(null);
      setFotoModificada(false);

      obtenerFotosProfesor(profesor.id).then(async (f) => {
        if (f.foto_perfil) {
          setFotoPerfil(f.foto_perfil);
          const url = await resolverUrlFoto(f.foto_perfil);
          setUrlVisualizacion(url);
        }
      });
    }
  }, [profesor]);

  function obtenerIniciales(nombre: string): string {
    const partes = nombre.trim().split(" ").filter(Boolean);
    if (partes.length === 1) return partes[0][0].toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const blob = await comprimirImagenABlob(file);
    // Guardar en la carpeta de profesores
    const nombreArchivo = `perfil_${profesor!.id}.jpg`;
    const path = await guardarImagen(blob, nombreArchivo, "profesores");

    setFotoPerfil(path);
    // Preview inmediato usando object URL
    setUrlVisualizacion(URL.createObjectURL(blob));
    setFotoModificada(true);
    e.target.value = "";
  }

  async function handleGuardar() {
    if (!profesor) return;
    if (!nombre.trim() || !cedula.trim()) {
      setError("Nombre y cédula son obligatorios.");
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      await actualizarProfesor(profesor.id, {
        nombre_completo: nombre.trim(),
        cedula: cedula.trim(),
        correo: correo.trim() || null,
        telefono: telefono.trim(),
        especialidad: especialidad.trim() || null,
      });

      // Solo guardar la foto si fue modificada en esta sesión
      if (fotoModificada && fotoPerfil) {
        await guardarFotoProfesor(profesor.id, fotoPerfil);
      }

      onGuardado();
    } catch {
      setError("Error al guardar. Verifica que la cédula no esté duplicada.");
    } finally {
      setGuardando(false);
    }
  }

  if (!profesor) {
    return (
      <div className="edit-prof-panel empty">
        <div className="edit-prof-empty-icon"><User size={40} /></div>
        <p className="edit-prof-empty-title">Selecciona un profesor</p>
        <p className="edit-prof-empty-sub">
          Haz clic en el botón editar de cualquier profesor para ver y modificar su información aquí.
        </p>
      </div>
    );
  }

  return (
    <>
      {verFoto && (
        <div className="foto-visor-overlay" onClick={() => setVerFoto(false)}>
          <div className="foto-visor-box" onClick={(e) => e.stopPropagation()}>
            <button className="foto-visor-close" onClick={() => setVerFoto(false)}>
              <X size={18} />
            </button>
            <p className="foto-visor-titulo">Foto de Perfil</p>
            {urlVisualizacion
              ? <img src={urlVisualizacion} alt="foto" className="foto-visor-img" />
              : <p className="foto-visor-vacio">Sin foto registrada</p>
            }
          </div>
        </div>
      )}

      <div className="edit-prof-panel">
        <div className="edit-prof-header">
          <div>
            <span className="edit-prof-label">Editar Profesor</span>
            <p className="edit-prof-id">ID: {profesor.cedula}</p>
          </div>
          <button className="edit-prof-close" onClick={onCancelar}><X size={18} /></button>
        </div>

        <div className="edit-prof-avatar-wrap">
          <div className="edit-prof-avatar-photo-wrap">
            <div
              className="edit-prof-avatar"
              onClick={() => urlVisualizacion && setVerFoto(true)}
              style={{ cursor: urlVisualizacion ? "pointer" : "default" }}
              title={urlVisualizacion ? "Ver foto" : undefined}
            >
              {urlVisualizacion
                ? <img src={urlVisualizacion} alt="foto" className="edit-prof-avatar-img" />
                : obtenerIniciales(nombre || profesor.nombre_completo)
              }
            </div>
            <button
              className="edit-prof-avatar-cam"
              type="button"
              onClick={() => refFile.current?.click()}
              title="Cambiar foto de perfil"
            >
              <Camera size={12} />
            </button>
            <input
              ref={refFile}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFoto}
            />
          </div>
          <div>
            <p className="edit-prof-avatar-name">{nombre || profesor.nombre_completo}</p>
            <p className="edit-prof-avatar-since">
              Registrado: {new Date(profesor.fecha_registro).toLocaleDateString("es-CO")}
            </p>
          </div>
        </div>

        <div className="edit-prof-form">
          <div className="edit-prof-field">
            <label className="edit-prof-field-label">Nombre Completo</label>
            <input className="edit-prof-input" type="text" value={nombre}
              onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo" />
          </div>
          <div className="edit-prof-field">
            <label className="edit-prof-field-label">Cédula</label>
            <input className="edit-prof-input" type="text" value={cedula}
              onChange={(e) => setCedula(e.target.value)} placeholder="Número de cédula" />
          </div>
          <div className="edit-prof-field">
            <label className="edit-prof-field-label">Correo Electrónico</label>
            <input className="edit-prof-input" type="email" value={correo}
              onChange={(e) => setCorreo(e.target.value)} placeholder="correo@ejemplo.com" />
          </div>
          <div className="edit-prof-field">
            <label className="edit-prof-field-label">Teléfono</label>
            <input className="edit-prof-input" type="tel" value={telefono}
              onChange={(e) => setTelefono(e.target.value)} placeholder="+57 300 000 0000" />
          </div>
          <div className="edit-prof-field" style={{ gridColumn: "1 / -1" }}>
            <label className="edit-prof-field-label">Especialidad</label>
            <input className="edit-prof-input" type="text" value={especialidad}
              onChange={(e) => setEspecialidad(e.target.value)} placeholder="Ej: Magíster en Educación" />
          </div>

          {error && <p className="edit-prof-error">{error}</p>}

          <div className="edit-prof-actions">
            <button className="edit-prof-btn-cancel" onClick={onCancelar}>Cancelar</button>
            <button className="edit-prof-btn-save" onClick={handleGuardar} disabled={guardando}>
              <Save size={15} />
              {guardando ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}