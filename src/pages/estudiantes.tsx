import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Search, Plus, Pencil, BookPlus, Trash2 } from "lucide-react";
import { obtenerEstudiantesConModulos, EstudianteConModulo, eliminarEstudiante } from "../services/estudianteService";
import { Estudiante } from "../services/estudianteService";
import EditStudent from "../components/EditComponent/EditStudent";
import ModalEstudiante from "../components/modals/ModalEstudiante";
import ModalAddModulo from "../components/modals/ModalAddModulo";
import "../styles/estudiantes.css";

export default function Estudiantes() {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("all");
  const [paginaActual, setPaginaActual] = useState(1);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalInscripcion, setModalInscripcion] = useState(false);
  const [estudiantes, setEstudiantes] = useState<EstudianteConModulo[]>([]);
  const [estudianteSeleccionado, setEstudiante] = useState<{ id: number; name: string; meta: string } | null>(null);
  const [estudianteEditando, setEstudianteEditando] = useState<Estudiante | null>(null);

  const ESTUDIANTES_POR_PAGINA = 8;

  async function cargarEstudiantes() {
    try {
      const data = await obtenerEstudiantesConModulos();
      setEstudiantes(data);
    } catch (error) {
      console.error("Error Trayendo los estudiantes:", error);
    }
  }

  async function handleEliminar(id: number) {
    if (window.confirm("¿Estás seguro de eliminar este estudiante?")) {
      try {
        await eliminarEstudiante(id);
        cargarEstudiantes();
      } catch (error) {
        console.error("Error al eliminar estudiante:", error);
      }
    }
  }

  useEffect(() => {
    cargarEstudiantes();
  }, []);

  useEffect(() => { setPaginaActual(1); }, [busqueda, filtroEstado]);

  function abrirInscripcion(student: EstudianteConModulo) {
    setEstudiante({
      id: student.id,
      name: student.nombre_completo,
      meta: `ID: ${student.cedula} | ${student.correo || "No email"}`
    });
    setModalInscripcion(true);
  }

  function obtenerIniciales(nombre: string): string {
    const partes = nombre.trim().split(" ").filter(Boolean);

    if (partes.length === 1) return partes[0][0].toUpperCase();

    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  const estudiantesFiltrados = estudiantes.filter((e) => {
    const coincideBusqueda =
      e.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
      e.cedula.includes(busqueda) ||
      (e.modulos && e.modulos.toLowerCase().includes(busqueda.toLowerCase()));

    const coincideEstado = filtroEstado === "all" ||
      (filtroEstado === "active" && e.activo === 1) ||
      (filtroEstado === "inactive" && e.activo === 0);

    return coincideBusqueda && coincideEstado;
  });

  const TotalPaginas = Math.ceil(estudiantesFiltrados.length / ESTUDIANTES_POR_PAGINA);
  const estudiantesPaginados = estudiantesFiltrados.slice(
    (paginaActual - 1) * ESTUDIANTES_POR_PAGINA,
    paginaActual * ESTUDIANTES_POR_PAGINA
  );


  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestion Estudiantes</h1>
          <p className="page-subtitle">Administra estudiantes, sus inscripciones y módulos cursados.</p>
        </div>
        <button className="btn-primary" onClick={() => setModalNuevo(true)}>
          <Plus size={20} />
          Agregar Estudiante
        </button>
      </div>


      <div className="filters-bar">
        <div className="filter-search-wrapper">
          <Search className="filter-search-icon" size={20} />
          <input
            className="filter-search-input"
            placeholder="Busca por Cedula, Nombre o Carrera..."
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <select className="filter-select" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="all">Estado: Todos</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>
      </div>


      <div className="table-container">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Cedula</th>
                <th>Nombre Completo</th>
                <th>Correo</th>
                <th>Modulo Cursado</th>
                <th className="center">Estado</th>
                <th className="right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {estudiantesPaginados.map((s) => (
                <tr key={s.id}>
                  <td className="td-id">{s.cedula}</td>
                  <td>
                    <div className="student-cell">
                      <div className="avatar-circle">{obtenerIniciales(s.nombre_completo)}</div>
                      <span className="student-name">{s.nombre_completo}</span>
                    </div>
                  </td>
                  <td>{s.correo}</td>
                  <td>
                    <div className="career-name">{s.modulos ? s.modulos : "Sin módulo"}</div>
                  </td>
                  <td className="td-center">
                    {s.activo === 1 ? (
                      <span className="badge badge-active">ACTIVO</span>
                    ) : (
                      <span className="badge badge-inactive">INACTIVO</span>
                    )}
                  </td>
                  <td className="td-right">
                    <div className="actions-cell">
                      <button
                        className="btn-action edit"
                        title={s.activo === 0 ? "Estudiante inactivo" : "Editar"}
                        onClick={() => s.activo === 1 && setEstudianteEditando(s)}
                        disabled={s.activo === 0}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="btn-action addModule"
                        title={s.activo === 0 ? "Estudiante inactivo" : "Inscribir módulo"}
                        onClick={() => s.activo === 1 && abrirInscripcion(s)}
                        disabled={s.activo === 0}
                      >
                        <BookPlus size={15} />
                      </button>
                      <button
                        className="btn-action delete"
                        title={s.activo === 0 ? "Ya está inactivo" : "Desactivar"}
                        onClick={() => s.activo === 1 && handleEliminar(s.id)}
                        disabled={s.activo === 0}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>


        <div className="pagination">
          <p className="pagination-info"> <span>{estudiantesFiltrados.length}</span> Estudiantes inscritos </p>
          <div className="pagination-controls">
            <button className="page-btn arrow" onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}>
              <ChevronLeft size={20} />
            </button>
            <button className="page-btn arrow" onClick={() => setPaginaActual((p) => Math.min(TotalPaginas, p + 1))}>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>


      {modalNuevo && <ModalEstudiante
        onClose={() => setModalNuevo(false)}
        onGuardado={() => { setModalNuevo(false); cargarEstudiantes(); }} />
      }


      {modalInscripcion && estudianteSeleccionado && (
        <ModalAddModulo
          onClose={() => setModalInscripcion(false)}
          estudianteId={estudianteSeleccionado.id}
          nombre={estudianteSeleccionado.name}
          studentMeta={estudianteSeleccionado.meta}
        />
      )}

      <EditStudent
        estudiante={estudianteEditando}
        onGuardado={() => { setEstudianteEditando(null); cargarEstudiantes(); }}
        onCancelar={() => setEstudianteEditando(null)}
      />
    </>
  );
}