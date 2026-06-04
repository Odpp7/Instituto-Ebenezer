import { useState, useEffect } from "react";
import { Pencil, Trash2, Search, UserPlus, ChevronRight, ChevronLeft } from "lucide-react";
import { eliminarProfesor, obtenerProfesores, Profesor } from "../services/profesorService";
import EditProfesor from "../components/EditComponent/EditProfesor";
import ModalProfesor from "../components/modals/ModalProfesor";
import ModalConfirmar from "../components/modals/ModalConfirmar";
import "../styles/profesores.css";

const PROFESORES_POR_PAGINA = 8;

export default function Profesores() {
  const [busqueda, setBusqueda]                   = useState("");
  const [modalAbierto, setModalAbierto]           = useState(false);
  const [profesores, setProfesores]               = useState<Profesor[]>([]);
  const [profesorEditando, setProfesorEditando]   = useState<Profesor | null>(null);
  const [paginaActual, setPaginaActual]           = useState(1);

  // Modal de confirmación para eliminar
  const [confirmarId, setConfirmarId]             = useState<number | null>(null);
  const [confirmarNombre, setConfirmarNombre]     = useState("");

  async function cargarProfesores() {
    try {
      const data = await obtenerProfesores();
      setProfesores(data);
    } catch (error) {
      console.error("Error fetching professors:", error);
    }
  }

  async function handleEliminar() {
    if (confirmarId === null) return;
    try {
      await eliminarProfesor(confirmarId);
      setConfirmarId(null);
      cargarProfesores();
    } catch (error) {
      console.error("Error al eliminar profesor:", error);
    }
  }

  useEffect(() => { cargarProfesores(); }, []);
  useEffect(() => { setPaginaActual(1); }, [busqueda]);

  function obtenerIniciales(nombre: string): string {
    const partes = nombre.trim().split(" ").filter(Boolean);
    if (partes.length === 1) return partes[0][0].toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  const profesoresFiltrados = profesores.filter((p) =>
    p.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.cedula.includes(busqueda)
  );

  const totalPaginas = Math.ceil(profesoresFiltrados.length / PROFESORES_POR_PAGINA);

  const profesoresPaginados = profesoresFiltrados.slice(
    (paginaActual - 1) * PROFESORES_POR_PAGINA,
    paginaActual * PROFESORES_POR_PAGINA
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Profesores</h1>
          <p className="page-subtitle">Administra el personal docente y sus departamentos.</p>
        </div>
        <button className="btn-primary" onClick={() => setModalAbierto(true)}>
          <UserPlus size={18} />
          Agregar Profesor
        </button>
      </div>

      <div className="search-bar">
        <div className="search-bar-icon"><Search size={18} /></div>
        <input
          className="search-bar-input"
          placeholder="Buscar profesor por nombre, ID..."
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="table-container">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Profesor</th>
                <th>Email</th>
                <th>Especialidad</th>
                <th className="center">Estado</th>
                <th className="right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {profesoresPaginados.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "24px", color: "#94a3b8" }}>
                    No hay profesores registrados.
                  </td>
                </tr>
              )}
              {profesoresPaginados.map((p) => (
                <tr key={p.id}>
                  <td className="td-id">{p.cedula}</td>
                  <td>
                    <div className="teacher-cell">
                      <div className="avatar-circle">{obtenerIniciales(p.nombre_completo)}</div>
                      <span className="teacher-name">{p.nombre_completo}</span>
                    </div>
                  </td>
                  <td>{p.correo}</td>
                  <td>{p.especialidad}</td>
                  <td className="td-center">
                    {p.activo === 1
                      ? <span className="badge badge-active">ACTIVO</span>
                      : <span className="badge badge-inactive">INACTIVO</span>
                    }
                  </td>
                  <td className="td-right">
                    <div className="actions-cell">
                      <button
                        className="btn-action edit"
                        onClick={() => p.activo === 1 && setProfesorEditando(p)}
                        disabled={p.activo === 0}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="btn-action delete"
                        onClick={() => {
                          if (p.activo === 0) return;
                          setConfirmarId(p.id);
                          setConfirmarNombre(p.nombre_completo);
                        }}
                        disabled={p.activo === 0}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <span className="pagination-info">
            <span>{profesoresFiltrados.length}</span> profesores inscritos
          </span>
          <div className="pagination-controls">
            <button
              className="page-prev-next"
              onClick={() => setPaginaActual((p) => Math.max(p - 1, 1))}
              disabled={paginaActual === 1}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="page-indicator">{paginaActual} / {totalPaginas || 1}</span>
            <button
              className="page-prev-next"
              onClick={() => setPaginaActual((p) => Math.min(p + 1, totalPaginas))}
              disabled={paginaActual === totalPaginas || totalPaginas === 0}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {modalAbierto && (
        <ModalProfesor
          onClose={() => setModalAbierto(false)}
          onGuardar={() => { setModalAbierto(false); cargarProfesores(); }}
        />
      )}

      {/* Modal confirmación eliminar */}
      {confirmarId !== null && (
        <ModalConfirmar
          titulo="Desactivar profesor"
          mensaje={`¿Estás seguro de desactivar a ${confirmarNombre}?`}
          labelConfirmar="Desactivar"
          onConfirmar={handleEliminar}
          onCancelar={() => setConfirmarId(null)}
        />
      )}

      <EditProfesor
        profesor={profesorEditando}
        onGuardado={() => { setProfesorEditando(null); cargarProfesores(); }}
        onCancelar={() => setProfesorEditando(null)}
      />
    </>
  );
}