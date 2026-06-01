import { useEffect, useRef, useState } from "react";
import {
    UserSearch, TrendingUp, BarChart2, BadgeCheck, BookMarked, CheckCircle, XCircle, RefreshCw, Download, ArrowLeft,
    Info, AlertTriangle, Save, Lock
} from "lucide-react";
import { buscarEstudiantes, Estudiante } from "../services/estudianteService";
import { obtenerModulosEstudiante, guardarNota, ModuloNota, recursarModulo, obtenerFotoEstudiante } from "../services/notaService";
import { validarNota } from "../utils/notaValidacion";
import { generarInformePDF } from "../utils/notaPDF";
import { Toast } from "primereact/toast";
import { imagenABase64 } from "../utils/fotoUtils";
import "../styles/notas.css";

function initials(name: string) {
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function Notas() {

    const [query, setQuery] = useState("");
    const [dropdown, setDropdown] = useState(false);
    const [resultados, setResultados] = useState<Estudiante[]>([]);
    const [estudiante, setEstudiante] = useState<Estudiante | null>(null);
    const [modulos, setModulos] = useState<ModuloNota[]>([]);
    const [drafts, setDrafts] = useState<Record<number, string>>({});
    const [recursados, setRecursados] = useState<Set<number>>(new Set());
    const toast = useRef<Toast>(null);


    const pasados = modulos.filter(m => m.nota !== null && m.nota >= 3)
    const reprobados = modulos.filter(m => m.nota !== null && m.nota < 3)
    const totalCreditos = pasados.reduce((acc, m) => acc + m.creditos, 0)

    const gpa = modulos.length ? (modulos.reduce((acc, m) => acc + (m.nota ?? 0), 0) / modulos.length).toFixed(2) : "—"


    async function searchEstudiantes(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value
        setQuery(value)

        if (value.trim().length < 2) {
            setResultados([])
            setDropdown(false)
            return
        }

        try {
            const data = await buscarEstudiantes(value)
            setResultados(data)
            setDropdown(true)
        } catch (error) {
            console.error(error)
            setResultados([])
        }
    }


    async function seleccionar(s: Estudiante) {
        setEstudiante(s)
        setQuery(s.nombre_completo)
        setDropdown(false)

        localStorage.setItem("estudianteSeleccionado", JSON.stringify(s))

        try {
            const data = await obtenerModulosEstudiante(s.id)
            setModulos(data)
        } catch (error) {
            console.error(error)
            setModulos([])
        }
        setDrafts({})
    }


    function limpiar() {
        setEstudiante(null)
        setQuery("")
        setResultados([])
        setModulos([])
        setDrafts({})
    }

    useEffect(() => {
        const guardado = localStorage.getItem("estudianteSeleccionado");
        if (guardado) {
            const est = JSON.parse(guardado);
            seleccionar(est);
        }
    }, []);


    async function saveNota(inscripcionId: number) {
        const valor = drafts[inscripcionId]
        const nota = parseFloat(valor)

        const modulo = modulos.find(m => m.inscripcionId === inscripcionId)

        if (!modulo) return

        const error = validarNota({
            nota,
            notaActual: modulo.nota,
            bloqueada: modulo.bloqueada,
            estado: modulo.estado
        })

        if (error) {
            alert(error)
            return
        }

        try {
            await guardarNota(inscripcionId, nota)
            const nuevosModulos = modulos.map(m => {
                if (m.inscripcionId === inscripcionId) {
                    return { ...m, nota: nota, bloqueada: true }
                }
                return m
            })
            setModulos(nuevosModulos)
            const nuevosDrafts = { ...drafts }
            delete nuevosDrafts[inscripcionId]
            setDrafts(nuevosDrafts)
        } catch (error) {
            console.error("Error guardando nota", error)
        }
    }


    async function handleRecursar(moduloId: number) {
        if (!estudiante) return;
        try {
            await recursarModulo(estudiante.id, moduloId);
            const data = await obtenerModulosEstudiante(estudiante.id);
            setModulos(data);
            setRecursados(prev => new Set(prev).add(moduloId));
        } catch (error) {
            console.error("Error recursando módulo", error);
        }
    }

    async function handleGenerarInforme() {
    try {
        const nombreFoto = await obtenerFotoEstudiante(estudiante!.id);
        let fotoBase64: string | null = null;

        if (nombreFoto) {
        try {
            fotoBase64 = await imagenABase64(nombreFoto); // ← nombre, no ruta
        } catch (e) {
            console.warn("No se pudo cargar la foto, se omitirá:", e);
            // fotoBase64 queda null → el PDF se genera sin foto
        }
        }

        await generarInformePDF(estudiante!, modulos, fotoBase64);
        toast.current?.show({ severity: "success", summary: "Informe generado en la carpeta Descargas", life: 3000 });

    } catch (error) {
        console.error(error);
        toast.current?.show({ severity: "error", summary: "Error al generar", life: 3000 });
    }
    }


    return (
        <>
            <Toast ref={toast} />

            <div className="page-header">
                <div>
                    <h1 className="page-title">Historial Académico</h1>
                    <p className="page-subtitle">Consulta y registra calificaciones de los estudiantes.</p>
                </div>

                {estudiante && (
                    <button className="btn-outline-primary" onClick={handleGenerarInforme} >
                        <Download size={16} /> Descargar Informe
                    </button>
                )}
            </div>


            <div className="search-big">
                <span className="search-big-icon"> <UserSearch size={22} /> </span>
                <input
                    className="search-big-input"
                    placeholder="Buscar estudiante por nombre o cédula..."
                    value={query}
                    onChange={searchEstudiantes}
                    onFocus={() => resultados.length > 0 && setDropdown(true)}
                />
                {dropdown && (
                    <div className="search-dropdown">
                        {resultados.length === 0
                            ? <p className="dropdown-empty">No se encontraron estudiantes.</p>
                            : resultados.map(s => (
                                <button
                                    key={s.id}
                                    className="search-dropdown-item"
                                    onClick={() => seleccionar(s)}
                                >
                                    <span className="dropdown-name">{s.nombre_completo}</span>
                                    <span className="dropdown-meta">Cédula: {s.cedula}</span>
                                </button>
                            ))
                        }
                    </div>
                )}
            </div>

            {!estudiante && (
                <div className="historial-empty-state">
                    <div className="historial-empty-icon"> <UserSearch size={48} /> </div>
                    <p className="historial-empty-title">
                        Busca un estudiante para ver su historial
                    </p>
                    <p className="historial-empty-sub">
                        Escribe el nombre o cédula en el buscador para consultar
                        y registrar calificaciones por módulo.
                    </p>
                </div>
            )}


            {estudiante && (
                <>
                    <div className="student-info-card">
                        <div className="student-info-avatar"> {initials(estudiante.nombre_completo)} </div>
                        <div>
                            <p className="student-info-name">
                                {estudiante.nombre_completo}
                            </p>
                            <p className="student-info-meta">
                                ID: {estudiante.cedula}
                            </p>
                        </div>
                        <button className="student-info-back" onClick={limpiar} >
                            <ArrowLeft size={14} /> Cambiar estudiante
                        </button>
                    </div>

                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-card-top">
                                <span className="stat-label">Promedio</span>
                                <span className="stat-icon"><BarChart2 size={22} /></span>
                            </div>
                            <p className="stat-value"> {gpa} </p>
                            <span className="stat-trend-up">
                                <TrendingUp size={13} /> Promedio acumulado
                            </span>
                        </div>

                        <div className="stat-card">
                            <div className="stat-card-top">
                                <span className="stat-label">Creditos Obtenidos</span>
                                <span className="stat-icon"><BadgeCheck size={22} /></span>
                            </div>
                            <p className="stat-value"> {totalCreditos} </p>
                        </div>

                        <div className="stat-card">
                            <div className="stat-card-top">
                                <span className="stat-label">Módulos Aprobados</span>
                                <span className="stat-icon"><BookMarked size={22} /></span>
                            </div>
                            <p className="stat-value"> {pasados.length} / {modulos.length} </p>
                        </div>
                    </div>


                    <div className="table-card">
                        <div className="table-card-header">
                            <span className="table-card-title"> Registro de Calificaciones </span>
                            <span className="table-legend">
                                <Lock size={13} /> Nota guardada no se puede modificar
                            </span>
                        </div>

                        <div className="table-scroll">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Nombre del Módulo</th>
                                        <th>Fecha</th>
                                        <th>Calificación</th>
                                        <th>Estado</th>
                                        <th className="right">Acción</th>
                                    </tr>
                                </thead>
                                    <tbody>
                                        {modulos.map((m) => {
                                            const passed = m.nota !== null && m.nota >= 3
                                            const failed = m.nota !== null && m.nota < 3
                                            const draft = drafts[m.inscripcionId] ?? ""

                                            const maxIntento = Math.max(
                                                ...modulos
                                                    .filter(x => x.moduloId === m.moduloId)
                                                    .map(x => x.intento)
                                            )
                                            const esUltimoIntento = m.intento === maxIntento

                                            return (
                                                <tr key={m.inscripcionId} className={failed ? "row-failed" : ""}>

                                                    <td>
                                                        <p className="td-module-name">{m.moduloNombre}</p>
                                                        <p className="td-module-code">{m.creditos} Créditos • Intento {m.intento}</p>
                                                    </td>

                                                    <td className="td-date"> {m.fechaInscripcion} </td>

                                                    <td>
                                                        {m.bloqueada ? (
                                                            <div className="score-locked-wrap">
                                                                <span className={`score-badge ${passed ? "score-pass" : "score-fail"}`}>
                                                                    {m.nota}
                                                                </span>
                                                                <span className="score-max">/ 5</span>
                                                                <Lock size={12} className="score-lock-icon" />
                                                            </div>
                                                        ) : (
                                                            <div className="score-input-wrap">
                                                                <input
                                                                    className="score-input"
                                                                    type="number"
                                                                    min={1}
                                                                    max={5}
                                                                    step={0.1}
                                                                    placeholder="1.0–5.0"
                                                                    value={draft}
                                                                    onChange={e =>
                                                                        setDrafts(prev => ({
                                                                            ...prev,
                                                                            [m.inscripcionId]: e.target.value
                                                                        }))
                                                                    }
                                                                />
                                                                <span className="score-max">/ 5</span>
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td>
                                                        {passed &&
                                                            <span className="status-pass">
                                                                <CheckCircle size={15} /> Aprobado
                                                            </span>
                                                        }
                                                        {failed &&
                                                            <span className="status-fail">
                                                                <XCircle size={15} /> Reprobado
                                                            </span>
                                                        }
                                                        {m.nota === null &&
                                                            <span className="status-pending">
                                                                Sin nota
                                                            </span>
                                                        }
                                                    </td>

                                                    <td className="td-right">
                                                        {m.bloqueada ? (
                                                            failed && esUltimoIntento
                                                                ? (
                                                                    <button
                                                                        className="btn-retake"
                                                                        disabled={recursados.has(m.moduloId)}
                                                                        onClick={() => handleRecursar(m.moduloId)}
                                                                    >
                                                                        <RefreshCw size={13} /> Recursar
                                                                    </button>
                                                                )
                                                                : <span className="td-dash">—</span>
                                                        ) : (
                                                            <button
                                                                className="btn-save-score"
                                                                disabled={draft.trim() === ""}
                                                                onClick={() => saveNota(m.inscripcionId)}
                                                            >
                                                                <Save size={13} /> Guardar nota
                                                            </button>
                                                        )}
                                                    </td>

                                                </tr>
                                            )
                                        })}
                                    </tbody>
                            </table>
                        </div>
                    </div>


                    <div className="notices-grid">
                        <div className="notice-card info">
                            <div className="notice-icon blue">
                                <Info size={22} />
                            </div>
                            <div>
                                <p className="notice-title">
                                    Notas definitivas
                                </p>
                                <p className="notice-text">
                                    Una vez guardada, la calificación queda registrada
                                    de forma permanente y no puede ser modificada.
                                </p>
                            </div>
                        </div>

                        {reprobados.length > 0 && (
                            <div className="notice-card warning">
                                <div className="notice-icon amber">
                                    <AlertTriangle size={22} />
                                </div>
                                <div>
                                    <p className="notice-title">
                                        Módulos Reprobados
                                    </p>
                                    <p className="notice-text">
                                        El estudiante tiene {reprobados.length} módulo reprobado.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </>
    )
}
