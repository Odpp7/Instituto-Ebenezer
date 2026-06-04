import { useRef, useState } from "react";
import { X, User, Save, Camera } from "lucide-react";
import { crearProfesor } from "../../services/profesorService";
import { validarProfesor } from "../../utils/profesorValidacion";
import { guardarImagen } from "../../utils/fotoUtils";
import "../../styles/modalProfesor.css";

interface Props {
  onClose: () => void;
  onGuardar: () => void;
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

export default function ModalProfesor({ onClose, onGuardar }: Props) {
  const [nombre, setNombre]             = useState("");
  const [cedula, setCedula]             = useState("");
  const [correo, setCorreo]             = useState("");
  const [telefono, setTelefono]         = useState("");
  const [especialidad, setEspecialidad] = useState("");

  // blob para preview local, path para guardar en BD
  const [fotoBlob, setFotoBlob]         = useState<Blob | null>(null);
  const [fotoPreview, setFotoPreview]   = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const refFile = useRef<HTMLInputElement>(null);

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const blob = await comprimirImagenABlob(file);
    setFotoBlob(blob);
    setFotoPreview(URL.createObjectURL(blob));
    e.target.value = "";
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const err = validarProfesor({ nombre, cedula, correo, telefono, especialidad });
    if (err) { setError(err); return; }

    try {
      // Primero crear el profesor para obtener su ID
      await crearProfesor(
        { nombre_completo: nombre, cedula, correo, telefono, especialidad },
        null // la foto la guardamos después con el ID real
      );

      // Si hay foto, guardarla usando el ID real del profesor recién creado
      if (fotoBlob) {
        const { getConnection } = await import("../../database/connection");
        const conn = await getConnection();
        const rows = await conn.select<{ id: number }[]>(
          `SELECT id FROM profesores WHERE cedula = ?`, [cedula]
        );
        if (rows[0]) {
          const { guardarFotoProfesor } = await import("../../services/profesorService");
          const nombreFinal = `perfil_${rows[0].id}.jpg`;
          await guardarImagen(fotoBlob, nombreFinal, "profesores");
          await guardarFotoProfesor(rows[0].id, nombreFinal);
        }
      }

      onGuardar();
    } catch (err: any) {
      setError(err.message === "CEDULA_DUPLICADA"
        ? "La cédula ya está registrada."
        : "Error al guardar el profesor."
      );
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box">

        <div className="modal-header">
          <div>
            <h2 className="modal-header-title">Agregar Nuevo Profesor</h2>
            <p className="modal-header-sub">Complete la información para registrar un nuevo docente.</p>
          </div>
          <button className="modal-close" onClick={onClose} type="button"><X size={22} /></button>
        </div>

        <form onSubmit={handleGuardar}>
          <div className="modal-body">

            <div className="avatar-upload-area" onClick={() => refFile.current?.click()}>
              <div className="avatar-preview">
                <div className="avatar-circle-lg">
                  {fotoPreview
                    ? <img src={fotoPreview} alt="perfil" className="avatar-img" />
                    : <User size={38} />
                  }
                </div>
                <button className="avatar-camera-btn" type="button"><Camera size={13} /></button>
              </div>
              <div className="avatar-upload-text">
                <p className="avatar-upload-label">Foto de Perfil</p>
                <p className="avatar-upload-hint">Haz clic para subir una imagen (JPG, PNG)</p>
              </div>
              <input
                ref={refFile}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFoto}
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Nombre Completo</label>
                <input className="form-input-profesor" placeholder="Ej: Juan Pérez" type="text"
                  value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Número de Identificación</label>
                <input className="form-input-profesor" placeholder="Documento de identidad" type="text"
                  value={cedula} onChange={(e) => setCedula(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Correo Electrónico</label>
                <input className="form-input-profesor" placeholder="usuario@uparsistem.edu.co" type="email"
                  value={correo} onChange={(e) => setCorreo(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input className="form-input-profesor" placeholder="Ej: +57 300 000 0000" type="tel"
                  value={telefono} onChange={(e) => setTelefono(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Especialidad</label>
                <input className="form-input-profesor" placeholder="Ej: Magíster en Educación" type="text"
                  value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} />
              </div>
            </div>

            {error && <p className="mae-error">{error}</p>}
          </div>

          <div className="modal-footer">
            <button className="btn-cancel" type="button" onClick={onClose}>Cancelar</button>
            <button className="btn-save" type="submit"><Save size={16} />Guardar Profesor</button>
          </div>
        </form>

      </div>
    </div>
  );
}