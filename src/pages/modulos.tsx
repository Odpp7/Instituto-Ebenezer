import { useState, useEffect, useRef } from "react";
import { Pencil, Trash, Plus, ChevronLeft, ChevronRight, Search, ClipboardList } from "lucide-react";
import { obtenerModulos, ModuloConProfesor, eliminarModulo } from "../services/moduloService";
import { Toast } from "primereact/toast";
import ModalAsistencia from "../components/modals/ModalAsistencia";
import EditModulo from "../components/EditComponent/EditModal";
import ModalModulo from "../components/modals/ModalModulo";
import ModalConfirmar from "../components/modals/ModalConfirmar";
import "../styles/modulos.css";

export default function Modulos() {
  const [modalAbierto, setModalAbierto]       = useState(false);
  const [modulos, setModulos]                 = useState<ModuloConProfesor[]>([]);
  const [moduloEditando, setModuloEditando]   = useState<ModuloConProfesor | null>(null);
  const [busqueda, setBusqueda]               = useState("");
  const [paginaActual, setPaginaActual]       = useState(1);
  const [moduloAsistencia, setModuloAsistencia] = useState<ModuloConProfesor | null>(null);

  // Modal de confirmación para eliminar
  const [confirmarId, setConfirmarId]         = useState<number | null>(null);
  const [confirmarNombre, setConfirmarNombre] = useState("");

  const toast = useRef<Toast>(null);
  const MODULOS_POR_PAGINA = 6;

  async function cargarModulos() {
    try {
      const data = await obtenerModulos();
      setModulos(data);
    } catch (error) {
      console.error("Error fetching modules:", error);
    }
  }

  async function handleEliminar() {
    if (confirmarId === null) return;
    try {
      await eliminarModulo(confirmarId);
      setConfirmarId(null);
      cargarModulos();
    } catch (error) {
      console.error("Error al eliminar módulo:", error);
    }
  }

  useEffect(() => { cargarModulos(); }, []);
  useEffect(() => { setPaginaActual(1); }, [busqueda]);

  const modulosFiltrados = modulos.filter((m) =>
    m.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    m.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
    (m.programa_nombre ?? "").toLowerCase().includes(busqueda.toLowerCase())
  );

  const totalPaginas = Math.ceil(modulosFiltrados.length / MODULOS_POR_PAGINA);
  const modulosPaginados = modulosFiltrados.slice(
    (paginaActual - 1) * MODULOS_POR_PAGINA,
    paginaActual * MODULOS_POR_PAGINA
  );

  return (
    <>
      <Toast ref={toast} position="top-right" />

      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Módulos</h1>
          <p className="page-subtitle">
            Administre los créditos, instructores y estados de los módulos educativos.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setModalAbierto(true)}>
          <Plus size={20} /> Nuevo Módulo
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-bar-icon"><Search size={18} /></div>
        <input
          type="text"
          className="search-bar-input"
          placeholder="Buscar por nombre, código o programa..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="table-container">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Programa</th>
                <th>Ciclo</th>
                <th>Créditos</th>
                <th>Instructor</th>
                <th>Precio</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {modulosPaginados.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "24px", color: "#94a3b8" }}>
                    No hay módulos registrados.
                  </td>
                </tr>
              )}
              {modulosPaginados.map((m) => (
                <tr key={m.id}>
                  <td className="td-code">{m.codigo}</td>
                  <td className="td-name">{m.nombre}</td>
                  <td className="badge-programa">{m.programa_nombre}</td>
                  <td style={{ fontSize: 13, color: "#64748b" }}>{m.ciclo_nombre ?? "—"}</td>
                  <td className="td-center">
                    <span className="badge-creditos">{m.creditos}</span>
                  </td>
                  <td>{m.profesor_nombre || "Sin asignar"}</td>
                  <td style={{ width: "115px" }}>$ {m.precio.toLocaleString("es-CO")}</td>
                  <td>
                    {m.activo === 1
                      ? <span className="badge badge-active">ACTIVO</span>
                      : <span className="badge badge-inactive">INACTIVO</span>
                    }
                  </td>
                  <td className="td-right">
                    <div className="actions-cell">
                      <button
                        className="btn-action edit"
                        onClick={() => m.activo === 1 && setModuloEditando(m)}
                        disabled={m.activo === 0}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="btn-action delete"
                        onClick={() => {
                          if (m.activo === 0 || m.id === undefined) return;
                          setConfirmarId(m.id);
                          setConfirmarNombre(m.nombre);
                        }}
                        disabled={m.activo === 0 || m.id === undefined}
                      >
                        <Trash size={16} />
                      </button>
                      <button
                        className="btn-action"
                        title="Generar Planilla de Asistencia"
                        onClick={() => m.activo === 1 && setModuloAsistencia(m)}
                        disabled={m.activo === 0}
                        style={{ color: "#1B2B4B" }}
                      >
                        <ClipboardList size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <p className="pagination-info">
            <span>{modulos.length}</span> módulos registrados
          </p>
          <div className="pagination-controls">
            <button
              className="page-prev-next"
              onClick={() => setPaginaActual((p) => Math.max(p - 1, 1))}
              disabled={paginaActual === 1}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="page-indicator">{paginaActual} / {totalPaginas || 1}</span>
            <button
              className="page-prev-next"
              onClick={() => setPaginaActual((p) => Math.min(p + 1, totalPaginas))}
              disabled={paginaActual === totalPaginas || totalPaginas === 0}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {modalAbierto && (
        <ModalModulo
          onClose={() => setModalAbierto(false)}
          onGuardar={() => { setModalAbierto(false); cargarModulos(); }}
        />
      )}

      {moduloAsistencia && (
        <ModalAsistencia
          modulo={moduloAsistencia}
          onClose={() => setModuloAsistencia(null)}
          toast={toast}
        />
      )}

      {/* Modal confirmación eliminar */}
      {confirmarId !== null && (
        <ModalConfirmar
          titulo="Desactivar módulo"
          mensaje={`¿Estás seguro de desactivar "${confirmarNombre}"? El módulo dejará de estar disponible para inscripciones.`}
          labelConfirmar="Desactivar"
          onConfirmar={handleEliminar}
          onCancelar={() => setConfirmarId(null)}
        />
      )}

      <EditModulo
        modulo={moduloEditando}
        onCancelar={() => setModuloEditando(null)}
        onGuardado={() => { setModuloEditando(null); cargarModulos(); }}
      />
    </>
  );
}