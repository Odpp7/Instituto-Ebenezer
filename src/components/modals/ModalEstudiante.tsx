import { useEffect, useRef, useState } from "react";
import { X, User, Fingerprint, Mail, Phone, Save, Camera, FileText } from "lucide-react";
import { crearEstudiante } from "../../services/estudianteService";
import { validarEstudiante } from "../../utils/estudianteValidacion";
import { guardarImagen } from "../../utils/fotoUtils";
import { guardarFotosEstudiante } from "../../services/estudianteService";
import { getConnection } from "../../database/connection";
import "../../styles/modalEstudiante.css";

interface Props {
  onClose: () => void;
  onGuardado: () => void;
}

async function comprimirImagenABlob(file: File, maxSize: number, calidad: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = maxSize;
      canvas.height = maxSize;

      const ctx = canvas.getContext("2d")!;
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;

      ctx.drawImage(img, sx, sy, min, min, 0, 0, maxSize, maxSize);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        if (!blob) return reject("Error al comprimir");
        resolve(blob);
      }, "image/jpeg", calidad);
    };

    img.onerror = reject;
    img.src = url;
  });
}

export default function ModalEstudiante({ onClose, onGuardado }: Props) {
  const [nombre, setNombre]     = useState("");
  const [cedula, setCedula]     = useState("");
  const [correo, setCorreo]     = useState("");
  const [telefono, setTelefono] = useState("");
  const [error, setError]       = useState<string | null>(null);

  // Guardamos el blob en memoria hasta conocer el ID del estudiante
  const [blobPerfil, setBlobPerfil]       = useState<Blob | null>(null);
  const [blobDocumento, setBlobDocumento] = useState<Blob | null>(null);

  // Solo para preview visual
  const [urlPerfil, setUrlPerfil]         = useState<string | null>(null);
  const [urlDocumento, setUrlDocumento]   = useState<string | null>(null);

  const refPerfil    = useRef<HTMLInputElement>(null);
  const refDocumento = useRef<HTMLInputElement>(null);

  // Limpiar object URLs al desmontar para no tener memory leaks
  useEffect(() => {
    return () => {
      if (urlPerfil) URL.revokeObjectURL(urlPerfil);
      if (urlDocumento) URL.revokeObjectURL(urlDocumento);
    };
  }, []);

  async function handleFotoPerfil(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const blob = await comprimirImagenABlob(file, 200, 0.7);
    setBlobPerfil(blob);
    setUrlPerfil(URL.createObjectURL(blob));
    e.target.value = "";
  }

  async function handleFotoDocumento(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const blob = await comprimirImagenABlob(file, 600, 0.75);
    setBlobDocumento(blob);
    setUrlDocumento(URL.createObjectURL(blob));
    e.target.value = "";
  }

  async function handleGuardar() {
    setError(null);
    const err = validarEstudiante({ nombre, cedula, correo, telefono });
    if (err) { setError(err); return; }

    try {
      // 1. Crear el estudiante sin fotos primero
      await crearEstudiante(
        { nombre_completo: nombre, cedula, correo, telefono, activo: 1 },
        undefined // sin fotos todavía
      );

      // 2. Obtener el ID recién asignado por SQLite
      const conn = await getConnection();
      const rows = await conn.select<{ id: number }[]>(
        `SELECT id FROM estudiantes WHERE cedula = ?`, [cedula]
      );
      const estudianteId = rows[0]?.id;

      // 3. Guardar las fotos con nombre fijo por ID
      if (estudianteId) {
        const fotos: { foto_perfil?: string; foto_documento?: string } = {};

        if (blobPerfil) {
          const path = await guardarImagen(blobPerfil, `perfil_${estudianteId}.jpg`);
          fotos.foto_perfil = path;
        }
        if (blobDocumento) {
          const path = await guardarImagen(blobDocumento, `doc_${estudianteId}.jpg`);
          fotos.foto_documento = path;
        }
        if (Object.keys(fotos).length > 0) {
          await guardarFotosEstudiante(estudianteId, fotos);
        }
      }

      onGuardado();
    } catch (e: any) {
      setError(
        e.message === "CEDULA_DUPLICADA"
          ? "La cédula ya está registrada."
          : "Error al guardar."
      );
    }
  }

  return (
    <div className="modal-overlay">
      <form className="modal-box" onSubmit={(e) => { e.preventDefault(); handleGuardar(); }}>

        <div className="modal-header">
          <div>
            <h2 className="modal-header-title">Agregar Nuevo Estudiante</h2>
            <p className="modal-header-sub">Complete la información para registrar al nuevo alumno.</p>
          </div>
          <button className="modal-close" type="button" onClick={onClose}><X size={22} /></button>
        </div>

        <div className="modal-body">

          <div className="fotos-row" style={{ display: "flex", gap: "100px" }}>

            {/* Foto de perfil */}
            <div className="avatar-upload">
              <div className="avatar-preview">
                <div className="avatar-circle-lg">
                  {urlPerfil
                    ? <img src={urlPerfil} alt="perfil" className="avatar-img" />
                    : <User size={36} />
                  }
                </div>
                <button className="avatar-camera-btn" type="button" onClick={() => refPerfil.current?.click()}>
                  <Camera size={13} />
                </button>
              </div>
              <div>
                <p className="avatar-upload-label">Foto de Perfil</p>
                <p className="avatar-upload-hint">PNG, JPG · 200×200</p>
                <button className="btn-upload-link" type="button" onClick={() => refPerfil.current?.click()}>
                  Subir imagen
                </button>
              </div>
              <input ref={refPerfil} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFotoPerfil} />
            </div>

            {/* Foto del documento */}
            <div className="avatar-upload">
              <div className="avatar-preview">
                <div className="avatar-circle-lg avatar-doc">
                  {urlDocumento
                    ? <img src={urlDocumento} alt="documento" className="avatar-img" />
                    : <FileText size={30} />
                  }
                </div>
                <button className="avatar-camera-btn" type="button" onClick={() => refDocumento.current?.click()}>
                  <Camera size={13} />
                </button>
              </div>
              <div>
                <p className="avatar-upload-label">Foto del Documento</p>
                <p className="avatar-upload-hint">PNG, JPG · cédula / ID</p>
                <button className="btn-upload-link" type="button" onClick={() => refDocumento.current?.click()}>
                  Subir imagen
                </button>
              </div>
              <input ref={refDocumento} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFotoDocumento} />
            </div>

          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Nombre Completo</label>
              <div className="form-input-wrap">
                <span className="form-input-icon"><User size={16} /></span>
                <input className="form-input" placeholder="Ej: Juan Pérez" type="text" required
                  value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Número de Identificación</label>
              <div className="form-input-wrap">
                <span className="form-input-icon"><Fingerprint size={16} /></span>
                <input className="form-input" placeholder="Ej: 1065842369" type="text" required
                  value={cedula} onChange={(e) => setCedula(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Correo Electrónico</label>
              <div className="form-input-wrap">
                <span className="form-input-icon"><Mail size={16} /></span>
                <input className="form-input" placeholder="ejemplo@uparsistem.edu.co" type="email" required
                  value={correo} onChange={(e) => setCorreo(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <div className="form-input-wrap">
                <span className="form-input-icon"><Phone size={16} /></span>
                <input className="form-input" placeholder="+57 300 000 0000" type="tel"
                  value={telefono} onChange={(e) => setTelefono(e.target.value)} />
              </div>
            </div>
          </div>

          {error && <p className="mae-error">{error}</p>}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn-save" type="submit"><Save size={16} />Guardar Estudiante</button>
        </div>

      </form>
    </div>
  );
}