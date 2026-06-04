import { useState, useEffect, useRef } from "react";
import { Save, X, User, Camera, FileText, Upload } from "lucide-react";
import { guardarImagen, obtenerUrlImagen } from "../../utils/fotoUtils";
import { Estudiante, actualizarEstudiante, obtenerFotosEstudiante, guardarFotosEstudiante } from "../../services/estudianteService";
import "../../styles/editStudent.css";

interface Props {
  estudiante: Estudiante | null;
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
        if (!blob) return reject("Error");
        resolve(blob);
      }, "image/jpeg", 0.7);
    };

    img.onerror = reject;
    img.src = url;
  });
}

export default function EditStudent({ estudiante, onGuardado, onCancelar }: Props) {
  const [nombre, setNombre]         = useState("");
  const [cedula, setCedula]         = useState("");
  const [correo, setCorreo]         = useState("");
  const [telefono, setTelefono]     = useState("");
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null);
  const [fotoDoc, setFotoDoc]       = useState<string | null>(null);
  const [guardando, setGuardando]   = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [modalFoto, setModalFoto]   = useState<"perfil" | "documento" | null>(null);
  const [urlPerfil, setUrlPerfil]   = useState<string | null>(null);
  const [urlDoc, setUrlDoc]         = useState<string | null>(null);
  const [perfilModificado, setPerfilModificado] = useState(false);
  const [docModificado, setDocModificado]       = useState(false);

  const refFilePerfil = useRef<HTMLInputElement>(null);
  const refFileDoc    = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (estudiante) {
      setNombre(estudiante.nombre_completo);
      setCedula(estudiante.cedula);
      setCorreo(estudiante.correo ?? "");
      setTelefono(estudiante.telefono ?? "");
      setError(null);
      setFotoPerfil(null);
      setFotoDoc(null);
      setPerfilModificado(false);
      setDocModificado(false);
      obtenerFotosEstudiante(estudiante.id).then((f) => {
        setFotoPerfil(f.foto_perfil);
        setFotoDoc(f.foto_documento);
      });
    }
  }, [estudiante]);

  useEffect(() => {
    if (fotoPerfil) {
      obtenerUrlImagen(fotoPerfil).then(setUrlPerfil);
    } else {
      setUrlPerfil(null);
    }
  }, [fotoPerfil]);

  useEffect(() => {
    if (fotoDoc) {
      obtenerUrlImagen(fotoDoc).then(setUrlDoc);
    } else {
      setUrlDoc(null);
    }
  }, [fotoDoc]);

  function obtenerIniciales(nombre: string): string {
    const partes = nombre.trim().split(" ").filter(Boolean);
    if (partes.length === 1) return partes[0][0].toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  async function handleFotoPerfil(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !estudiante) return;
    const blob = await comprimirImagenABlob(file);
    // Nombre fijo por ID — sobreescribe el archivo anterior, sin archivos huérfanos
    const path = await guardarImagen(blob, `perfil_${estudiante.id}.jpg`);
    setFotoPerfil(path);
    setUrlPerfil(URL.createObjectURL(blob));
    setPerfilModificado(true);
    e.target.value = "";
  }

  async function handleFotoDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !estudiante) return;
    const blob = await comprimirImagenABlob(file);
    // Nombre fijo por ID — sobreescribe el archivo anterior, sin archivos huérfanos
    const path = await guardarImagen(blob, `doc_${estudiante.id}.jpg`);
    setFotoDoc(path);
    setUrlDoc(URL.createObjectURL(blob));
    setDocModificado(true);
    e.target.value = "";
  }

  async function handleGuardar() {
    if (!estudiante) return;
    if (!nombre.trim() || !cedula.trim()) {
      setError("Nombre y cédula son obligatorios.");
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      await actualizarEstudiante(estudiante.id, {
        nombre_completo: nombre.trim(),
        cedula: cedula.trim(),
        correo: correo.trim() || null,
        telefono: telefono.trim() || null,
      });

      const fotosActualizadas: { foto_perfil?: string; foto_documento?: string } = {};
      if (perfilModificado && fotoPerfil) fotosActualizadas.foto_perfil = fotoPerfil;
      if (docModificado && fotoDoc)       fotosActualizadas.foto_documento = fotoDoc;

      if (Object.keys(fotosActualizadas).length > 0) {
        await guardarFotosEstudiante(estudiante.id, fotosActualizadas);
      }

      onGuardado();
    } catch {
      setError("Error al guardar. Verifica que la cédula no esté duplicada.");
    } finally {
      setGuardando(false);
    }
  }

  if (!estudiante) {
    return (
      <div className="edit-student-panel empty">
        <div className="edit-empty-icon"><User size={40} /></div>
        <p className="edit-empty-title">Selecciona un estudiante</p>
        <p className="edit-empty-sub">
          Haz clic en el botón editar de cualquier estudiante para ver y modificar su información aquí.
        </p>
      </div>
    );
  }

  return (
    <>
      {modalFoto && (
        <div className="foto-visor-overlay" onClick={() => setModalFoto(null)}>
          <div className="foto-visor-box" onClick={(e) => e.stopPropagation()}>
            <button className="foto-visor-close" onClick={() => setModalFoto(null)}>
              <X size={18} />
            </button>
            <p className="foto-visor-titulo">
              {modalFoto === "perfil" ? "Foto de Perfil" : "Copia del Documento"}
            </p>
            {modalFoto === "perfil"
              ? (urlPerfil
                  ? <img src={urlPerfil} className="foto-visor-img" />
                  : <p className="foto-visor-vacio">Sin foto registrada</p>
                )
              : (urlDoc
                  ? <img src={urlDoc} className="foto-visor-img" />
                  : <p className="foto-visor-vacio">Sin foto registrada</p>
                )
            }
          </div>
        </div>
      )}

      <div className="edit-student-panel">
        <div className="edit-panel-header">
          <div className="edit-panel-header-left">
            <span className="edit-panel-label">Editar Estudiante</span>
            <p className="edit-panel-id">ID: {estudiante.cedula}</p>
          </div>
          <button className="edit-panel-close" onClick={onCancelar}><X size={18} /></button>
        </div>

        <div className="edit-avatar-wrap">
          <div className="edit-avatar-photo-wrap">
            <div
              className="edit-avatar"
              onClick={() => urlPerfil && setModalFoto("perfil")}
              style={{ cursor: urlPerfil ? "pointer" : "default" }}
              title={urlPerfil ? "Ver foto" : undefined}
            >
              {urlPerfil
                ? <img src={urlPerfil} alt="foto" className="edit-avatar-img" />
                : obtenerIniciales(nombre || estudiante.nombre_completo)
              }
            </div>
            <button
              className="edit-avatar-cam"
              type="button"
              onClick={() => refFilePerfil.current?.click()}
              title="Cambiar foto de perfil"
            >
              <Camera size={12} />
            </button>
            <input
              ref={refFilePerfil}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFotoPerfil}
            />
          </div>

          <div>
            <p className="edit-avatar-name">{nombre || estudiante.nombre_completo}</p>
            <p className="edit-avatar-since">
              Registrado: {new Date(estudiante.fecha_registro).toLocaleDateString("es-CO")}
            </p>

            <div className="edit-doc-row">
              <button
                className="edit-btn-doc"
                type="button"
                onClick={() => setModalFoto("documento")}
              >
                <FileText size={12} />
                Ver copia del documento
              </button>

              <button
                className={`edit-btn-doc${docModificado ? " edit-btn-doc-upload--done" : ""}`}
                type="button"
                onClick={() => refFileDoc.current?.click()}
                title="Subir nueva fotocopia del documento"
              >
                <Upload size={12} />
                {docModificado ? "Documento listo ✓" : "Subir fotocopia"}
              </button>

              <input
                ref={refFileDoc}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFotoDoc}
              />
            </div>
          </div>
        </div>

        <div className="edit-form">
          <div className="edit-field">
            <label className="edit-label">Nombre Completo</label>
            <input className="edit-input" type="text" value={nombre}
              onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo" />
          </div>
          <div className="edit-field">
            <label className="edit-label">Cédula</label>
            <input className="edit-input" type="text" value={cedula}
              onChange={(e) => setCedula(e.target.value)} placeholder="Número de cédula" />
          </div>
          <div className="edit-field">
            <label className="edit-label">Correo Electrónico</label>
            <input className="edit-input" type="email" value={correo}
              onChange={(e) => setCorreo(e.target.value)} placeholder="correo@ejemplo.com" />
          </div>
          <div className="edit-field">
            <label className="edit-label">Teléfono</label>
            <input className="edit-input" type="tel" value={telefono}
              onChange={(e) => setTelefono(e.target.value)} placeholder="+57 300 000 0000" />
          </div>

          {error && <p className="edit-error">{error}</p>}

          <div className="edit-actions">
            <button className="edit-btn-cancel" onClick={onCancelar}>Cancelar</button>
            <button className="edit-btn-save" onClick={handleGuardar} disabled={guardando}>
              <Save size={15} />
              {guardando ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}