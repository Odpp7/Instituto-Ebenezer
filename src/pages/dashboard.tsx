import { useEffect, useRef, useState } from "react";
import {
  obtenerResumenDashboard,
  obtenerNotificaciones,
  obtenerPagosPorMes,
  obtenerCarteraGeneral
} from "../services/dashboardService";
import { Users, GraduationCap, BookOpen, Plus, BanknoteArrowUp } from "lucide-react";
import { obtenerEventos } from "../services/eventService";
import { generarCarteraPDF } from "../utils/informeCarteraPDF";
import { Toast } from "primereact/toast";
import ModalAddEvent from "../components/modals/ModalAddEvent";
import ModalVerEventos from "../components/modals/ModalVerEventos";
import '../styles/dashboard.css';

// ✅ Nombres en español para el selector
const NOMBRES_MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// ✅ Abreviaciones para el gráfico de barras
const LABELS_MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
];

export default function Dashboard() {
  const hoy = new Date();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEventosModalOpen, setIsEventosModalOpen] = useState(false);
  const [resumen, setResumen] = useState<any>({});
  const [pagosMes, setPagosMes] = useState<any[]>([]);
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);

  // ✅ Se inicializan en el mes y año actual automáticamente
  const [mesSeleccionado, setMesSeleccionado] = useState(hoy.getMonth() + 1); // 1–12
  const [anioSeleccionado, setAnioSeleccionado] = useState(hoy.getFullYear());

  const toast = useRef<Toast>(null);

  // ✅ Se recarga cada vez que cambia mes o año
  useEffect(() => {
    cargarDatos(mesSeleccionado, anioSeleccionado);
  }, [mesSeleccionado, anioSeleccionado]);

  async function cargarDatos(mes: number, anio: number) {
    const res    = await obtenerResumenDashboard(mes, anio);
    const pagos  = await obtenerPagosPorMes(anio); // gráfico filtrado por año
    const notif  = await obtenerNotificaciones();
    const evs    = await obtenerEventos();

    setResumen(res);
    setPagosMes(pagos);
    setNotificaciones(notif);
    setEventos(evs);
  }

  // ✅ Construye las barras resaltando el mes seleccionado
  const maxTotal = Math.max(...pagosMes.map(p => p.total), 1);
  const bars = pagosMes.map((p) => {
    const numMes = parseInt(p.mes); // 1–12
    return {
      label:      LABELS_MESES[numMes - 1],
      height:     Math.round((p.total / maxTotal) * 100), // ✅ escala relativa al máximo
      total:      p.total,
      esActual:   numMes === mesSeleccionado, // ✅ resalta la barra del mes seleccionado
    };
  });

  const formatoCOP = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  });

  // Años disponibles en el selector: año actual y los 2 anteriores
  const aniosDisponibles = [hoy.getFullYear(), hoy.getFullYear() - 1, hoy.getFullYear() - 2];

  async function handleGenerarCartera() {
    try {
      const reporte = await obtenerCarteraGeneral();

      if (reporte.lineas.length === 0) {
        toast.current?.show({
          severity: "info",
          summary: "Sin deudas",
          detail: "No hay estudiantes con saldo pendiente.",
          life: 3000,
        });
        return;
      }

      generarCarteraPDF(reporte);

      toast.current?.show({
        severity: "success",
        summary: "Reporte generado",
        detail: `Se exportaron ${reporte.totalEstudiantesConDeuda} estudiante(s) con deuda.`,
        life: 3000,
      });
    } catch (error) {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudo generar el reporte de cartera.",
        life: 3000,
      });
    }
  }

  return (
    <>
      <Toast ref={toast} position="top-right" />

      <div className="dash-header">
        <div>
          <p className="dash-title">Dashboard</p>
          <p className="dash-subtitle">Bienvenido de vuelta!!</p>
        </div>

        {/* ✅ Selector de mes y año en el header */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <select
            className="chart-select"
            value={mesSeleccionado}
            onChange={(e) => setMesSeleccionado(Number(e.target.value))}
          >
            {NOMBRES_MESES.map((nombre, i) => (
              <option key={i + 1} value={i + 1}>{nombre}</option>
            ))}
          </select>

          <select
            className="chart-select"
            value={anioSeleccionado}
            onChange={(e) => setAnioSeleccionado(Number(e.target.value))}
          >
            {aniosDisponibles.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Crear Evento
          </button>
        </div>
      </div>

      <div className="stats-grid">

        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Total Estudiantes</span>
            <div className="stat-icon"><Users size={20} /></div>
          </div>
          <p className="stat-value">{resumen.totalEstudiantes}</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            {/* ✅ El label muestra el mes y año seleccionados */}
            <span className="stat-label">
              Ingresos — {NOMBRES_MESES[mesSeleccionado - 1]} {anioSeleccionado}
            </span>
            <div className="stat-icon"><GraduationCap size={20} /></div>
          </div>
          <p className="stat-value">{formatoCOP.format(resumen.totalPagos ?? 0)}</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Estudiantes pendientes de pago</span>
            <div className="stat-icon"><BookOpen size={20} /></div>
          </div>
          <p className="stat-value">{resumen.pendientes}</p>
        </div>

      </div>

      <div className="main-grid">

        <div className="chart-card">
          <div className="chart-card-top">
            <div>
              <p className="chart-title">Resumen Mensual de Ingresos</p>
              {/* ✅ El subtítulo también refleja el año seleccionado */}
              <p className="chart-subtitle">Año {anioSeleccionado}</p>
            </div>
            {/* ✅ El selector del gráfico ya está arriba, este se elimina */}
          </div>
          <div className="bar-chart">
            {bars.map((b) => (
              <div className="bar-col" key={b.label}>
                <div className="bar-wrapper">
                  <span className="bar-tooltip">{formatoCOP.format(b.total)}</span>
                  {/* ✅ La barra del mes seleccionado se resalta con otra clase */}
                  <div
                    className={`bar-fill ${b.esActual ? "bar-fill-active" : ""}`}
                    style={{ height: `${b.height}%` }}
                  />
                </div>
                <span className="bar-label">{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="right-col">
          <div className="events-card">
            <div className="events-card-top">
              <span className="events-title">Proximos Eventos</span>
              <a className="events-link" onClick={(e) => { e.preventDefault(); setIsEventosModalOpen(true); }}>
                Ver Todos
              </a>
            </div>
            <div className="events-list">
              {eventos.length > 0 ? (
                eventos.slice(0, 4).map((e) => {
                  const hoyStr = new Date().toLocaleDateString("en-CA");
                  let estado = "proximo";
                  if (e.fecha === hoyStr) estado = "hoy";
                  else if (e.fecha < hoyStr) estado = "pasado";

                  const [year, month, day] = e.fecha.split("-").map(Number);
                  const fecha = new Date(year, month - 1, day);
                  const mes = fecha.toLocaleString("es-CO", { month: "short" });

                  return (
                    <div className="event-item" key={e.id}>
                      <div className="event-date highlight">
                        <span className="event-month">{mes}</span>
                        <span className="event-day">{day}</span>
                      </div>
                      <div>
                        <p className="event-info-title">{e.nombre}</p>
                        <span className={`event-badge ${estado}`}>
                          {estado === "hoy" && "Hoy"}
                          {estado === "proximo" && "Próximo"}
                          {estado === "pasado" && "Finalizado"}
                        </span>
                        <p className="event-info-sub">
                          {e.hora ? `${e.hora} • ` : ""}
                          {e.lugar || "Sin ubicación"}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p>No hay eventos próximos</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <p className="notif-section-title">Notificaciones Recientes</p>
        <button className="btn-outline-primary" onClick={handleGenerarCartera}>
          Generar Reporte de Cartera
        </button>
      </div>

      <div className="notif-list">
        {notificaciones.length > 0 ? (
          notificaciones.slice(0, 4).map((n, i) => (
            <div className="notif-item" key={i}>
              <div className="notif-icon green"><BanknoteArrowUp size={18} /></div>
              <div>
                <p className="notif-text">{n.nombre} pagó {formatoCOP.format(n.monto)} en {n.modulo}</p>
                <p className="notif-time">{n.fecha}</p>
              </div>
            </div>
          ))
        ) : (
          <p>No hay actividad reciente</p>
        )}
      </div>

      {isModalOpen && <ModalAddEvent onClose={() => setIsModalOpen(false)} onGuardado={() => cargarDatos(mesSeleccionado, anioSeleccionado)} />}
      {isEventosModalOpen && <ModalVerEventos onClose={() => setIsEventosModalOpen(false)} />}
    </>
  );
}