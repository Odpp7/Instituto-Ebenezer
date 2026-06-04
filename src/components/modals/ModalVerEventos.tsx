import { useState, useEffect } from "react";
import { X, CalendarDays, Clock, MapPin } from "lucide-react";
import { Evento, obtenerTodosLosEventos  } from "../../services/eventService";
import "../../styles/modalVerEventos.css";

interface Props {
  onClose: () => void;
}

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
];

const DIAS = ["DOM","LUN","MAR","MIÉ","JUE","VIE","SÁB"];

function badgeCategoria(cat: string) {
  if (cat === "ACADEMICO")      return "mve-badge blue";
  if (cat === "ADMINISTRATIVO") return "mve-badge gray";
  if (cat === "SOCIAL")         return "mve-badge teal";
  return "mve-badge blue";
}

function labelCategoria(cat: string) {
  if (cat === "ACADEMICO")      return "Académico";
  if (cat === "ADMINISTRATIVO") return "Administrativo";
  if (cat === "SOCIAL")         return "Social";
  return cat;
}

function formatHora(hora: string | null | undefined): string {
  if (!hora) return "";
  const [h, m] = hora.split(":");
  const hNum = parseInt(h);
  const ampm = hNum >= 12 ? "PM" : "AM";
  const h12  = hNum % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export default function ModalVerEventos({ onClose }: Props) {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);
  const anioActual = new Date().getFullYear();


  useEffect(() => {
    async function cargar() {
      try {
        const data = await obtenerTodosLosEventos(); 
        setEventos(data);
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);


  const porMes = MESES.map((_, mesIdx) =>
    eventos.filter((e) => {
      const f = new Date(e.fecha + "T00:00:00");
      return f.getMonth() === mesIdx && f.getFullYear() === anioActual;
    })
  );

  return (
    <div className="mve-overlay">
      <div className="mve-box">

        <header className="mve-header">
          <div className="mve-header-left">
            <div className="mve-header-icon">
              <CalendarDays size={20} />
            </div>
            <div>
              <h1 className="mve-title">Calendario de Eventos</h1>
            </div>
          </div>
          <button className="mve-close" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="mve-body">
          {cargando ? (
            <p className="mve-loading">Cargando eventos...</p>
          ) : (
            MESES.map((mes, mesIdx) => (
              <section className="mve-month" key={mes}>

                <div className="mve-month-header">
                  <h2 className="mve-month-name">{mes}</h2>
                  <span className="mve-month-year">{anioActual}</span>
                </div>

                {porMes[mesIdx].length === 0 ? (
                  <div className="mve-empty">
                    <p>No hay eventos programados para este mes</p>
                  </div>
                ) : (
                  <div className="mve-cards-grid">
                    {porMes[mesIdx].map((e) => {
                      const fecha = new Date(e.fecha + "T00:00:00");
                      const dia   = fecha.getDate();
                      const dow   = DIAS[fecha.getDay()];
                      return (
                        <div className="mve-card" key={e.id}>
                          <div className="mve-card-date">
                            <span className="mve-day-num">{dia}</span>
                            <span className="mve-day-name">{dow}</span>
                          </div>
                          <div className="mve-card-info">
                            <span className={badgeCategoria(e.categoria)}>
                              {labelCategoria(e.categoria)}
                            </span>
                            <p className="mve-card-nombre">{e.nombre}</p>
                            {e.hora && (
                              <div className="mve-card-meta">
                                <Clock size={13} />
                                <span>{formatHora(e.hora)}</span>
                              </div>
                            )}
                            {e.lugar && (
                              <div className="mve-card-meta">
                                <MapPin size={13} />
                                <span>{e.lugar}</span>
                              </div>
                            )}
                            {e.descripcion && (
                              <p className="mve-card-desc">{e.descripcion}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            ))
          )}
        </div>

        <footer className="mve-footer">
          <span className="mve-footer-copy">© {anioActual} Uparsistem Indigo Scholar</span>
          <button className="mve-btn-ok" onClick={onClose}>Entendido</button>
        </footer>

      </div>
    </div>
  );
}