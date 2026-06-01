import { useEffect, useRef, useState } from "react";
import { PlusCircle, UserSearch, Clock, CheckCircle2, Tag, Wallet, FileDown } from "lucide-react";
import { buscarEstudiantes, Estudiante } from "../services/estudianteService";
import { obtenerCarteraEstudiante, CarteraEstudiante, obtenerPagosRecientes, PagoReciente } from "../services/pagoService";
import { obtenerPagosDetallados, PagoDetallado } from "../services/pagoService";
import { generarReciboCarteraPDF } from "../utils/reciboCarteraPDF";
import { Toast } from 'primereact/toast';
import ModalPago from "../components/modals/ModalPagos";
import "../styles/pagos.css";

export default function Pagos() {
  const [modalPago, setModalPago] = useState(false);
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<Estudiante[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [estudiante, setEstudiante] = useState<Estudiante | null>(null);
  const [cartera, setCartera] = useState<CarteraEstudiante | null>(null);
  const [pagosRecientes, setPagosRecientes] = useState<PagoReciente[]>([]);
  const [pagosDetallados, setPagosDetallados] = useState<PagoDetallado[]>([]);
  const toast = useRef<Toast>(null);



  async function searchEstudiante(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);
    if (value.trim().length < 2) {
      setResultados([]);
      setShowDropdown(false);
      return;
    }
    try {
      const data = await buscarEstudiantes(value);
      setResultados(data);
      setShowDropdown(true);
    } catch (error) {
      console.error(error);
      setResultados([]);
    }
  }


  async function seleccionarEstudiante(est: Estudiante) {
    setEstudiante(est);
    setQuery(est.nombre_completo);
    setShowDropdown(false);

    setCartera(null);
    setPagosRecientes([]);

    localStorage.setItem("estudianteSeleccionado", JSON.stringify(est));

    try {
      const pd = await obtenerPagosDetallados(est.id);
      setPagosDetallados(pd);
      const c = await obtenerCarteraEstudiante(est.id);
      setCartera(c);
      await cargarPagosRecientes(est.id);
    } catch (error) {
      console.error("Error cargando cartera:", error);
    }
  }


  async function cargarPagosRecientes(estudianteId: number) {
    try {
      const pagos = await obtenerPagosRecientes(estudianteId);
      setPagosRecientes(pagos);
    } catch (error) {
      console.error("Error cargando pagos recientes:", error);
      setPagosRecientes([]);
    }
  }


  async function handlePagoRegistrado() {
    setModalPago(false);
    if (!estudiante) return;
    const pd = await obtenerPagosDetallados(estudiante.id);
    setPagosDetallados(pd);
    const c = await obtenerCarteraEstudiante(estudiante.id);
    setCartera(c);
    await cargarPagosRecientes(estudiante.id);
  }

  async function handleGenerarRecibo() {
    try {
      await generarReciboCarteraPDF(estudiante!, cartera!, pagosDetallados);

      toast.current?.show({
        severity: "success",
        summary: "Recibo generado",
        detail: "El recibo fue guardado en la carpeta Descargas.",
        life: 3000,
      })

    } catch (error) {
      toast.current?.show({
        severity: "error",
        summary: "Error al generar",
        detail: "No se pudo generar el recibo.",
        life: 3000,
      });
    }
  }


  useEffect(() => {
    const guardado = localStorage.getItem("estudianteSeleccionado");
    if (guardado) {
      const est = JSON.parse(guardado);
      seleccionarEstudiante(est);
    }
  }, []);



  return (
    <>
      <Toast ref={toast} position="top-right" />

      <div className="page-header">
        <div>
          <h1 className="page-title">Cartera y Pagos</h1>
          <p className="page-subtitle">Gestión financiera y seguimiento de pagos de estudiantes</p>
        </div>
        <button className="btn-primary" onClick={() => setModalPago(true)} disabled={!estudiante} >
          <PlusCircle size={18} />
          Registrar Pago
        </button>
      </div>

      <div className="search-big" style={{ position: "relative" }}>
        <span className="search-big-icon"><UserSearch size={22} /></span>
        <input
          className="search-big-input"
          placeholder="Buscar estudiante por nombre o documento..."
          type="text"
          value={query}
          onChange={searchEstudiante}
          onFocus={() => resultados.length > 0 && setShowDropdown(true)}
        />

        {showDropdown && (
          <div className="search-dropdown">
            {resultados.length === 0 && (<p className="dropdown-empty">No se encontraron estudiantes.</p>)}
            {resultados.map((e) => (
              <button key={e.id} className="search-dropdown-item" onClick={() => seleccionarEstudiante(e)}>
                <span className="dropdown-name">{e.nombre_completo}</span>
                <span className="dropdown-meta">Cedula: {e.cedula}</span>
              </button>
            ))}
          </div>
        )}
      </div>


      {!estudiante && (
        <div className="pagos-empty-state">
          <div className="pagos-empty-icon"><UserSearch size={48} /></div>
          <p className="pagos-empty-title">Busca un estudiante para ver su cartera</p>
          <p className="pagos-empty-sub">
            Escribe el nombre o cédula en el campo de búsqueda para ver las tarjetas de saldo,
            transacciones recientes y módulos inscritos.
          </p>
        </div>
      )}

      {estudiante && cartera && (
        <>
          <div className="estudiante-seleccionado">
            <div>
              <p className="est-nombre">{estudiante.nombre_completo}</p>
              <p className="est-meta">Cédula: {estudiante.cedula}{estudiante.correo ? ` • ${estudiante.correo}` : ""}</p>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">Saldo Pendiente</span>
                <span className="stat-icon-wrap stat-icon-red"><Clock size={22} /></span>
              </div>
              <p className="stat-value">${cartera.totalDeuda.toLocaleString("es-CO")}</p>
              <p className="stat-sub">
                {cartera.totalDeuda === 0
                  ? " Estudiante al día"
                  : `${cartera.lineas.filter(l => l.saldoPendiente > 0).length} modulo(s) con saldo`}
              </p>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">Total Pagado</span>
                <span className="stat-icon-wrap stat-icon-green"><CheckCircle2 size={22} /></span>
              </div>
              <p className="stat-value">${cartera.totalPagado.toLocaleString("es-CO")}</p>
              <p className="stat-sub">{pagosRecientes.length} pago(s) registrado(s)</p>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">Descuentos Aplicados</span>
                <span className="stat-icon-wrap stat-icon-amber"><Tag size={22} /></span>
              </div>

              <p className="stat-value">
                ${cartera.lineas
                  .reduce((acc, l) => acc + (l.precio * (l.descuento / 100)), 0)
                  .toLocaleString("es-CO")}
              </p>

              <p className="stat-sub">
                {cartera.lineas.filter(l => l.descuento > 0).length} módulo(s) con descuento
              </p>
            </div>

          </div>


          <div className="main-grid">
            <div>
              <div className="section-header">
                <span className="section-title">Transacciones Recientes</span>
                <button
                  className="btn-outline-primary"
                  onClick={handleGenerarRecibo}
                  disabled={!estudiante || !cartera}
                >
                  <FileDown size={18} /> Generar Recibo
                </button>
              </div>
              <div className="table-container">
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Módulo</th>
                        <th>Método</th>
                        <th>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagosRecientes.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: "center", color: "#94a3b8", padding: "24px" }}>
                            No hay pagos registrados aún.
                          </td>
                        </tr>
                      ) : (
                        pagosRecientes.map((t, i) => (
                          <tr key={i}>
                            <td className="td-date">{t.fecha}</td>
                            <td className="td-concept">{t.concepto}</td>
                            <td>{t.metodo}</td>
                            <td className="td-amount">${t.monto.toLocaleString("es-CO")}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>


            <div>
              <div className="section-header">
                <span className="section-title">Módulos Inscritos</span>
              </div>
              <div className="modules-card">
                {cartera.lineas.length === 0 ? (
                  <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "16px 0" }}>
                    Sin módulos inscritos.
                  </p>
                ) : (
                  cartera.lineas.map((l) => (
                    <div className="module-item" key={l.inscripcionId}>
                      <div className={`module-icon ${l.saldoPendiente === 0 ? "mod-green" : "mod-amber"}`}>
                        <Wallet size={18} />
                      </div>
                      <div className="module-info">
                        <p className="module-name">{l.moduloCodigo} - {l.moduloNombre}</p>
                        <p className="module-sub">
                          Precio: ${l.precio.toLocaleString("es-CO")} •{" "}
                          {l.saldoPendiente === 0
                            ? "Al día"
                            : `Pendiente: $${l.saldoPendiente.toLocaleString("es-CO")}`}
                        </p>
                      </div>
                      <span className={`badge-modulo-estado ${l.saldoPendiente === 0 ? "badge-done" : "badge-pending"}`}>
                        {l.saldoPendiente === 0 ? "Pagado" : "Pendiente"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </>
      )}

      {modalPago && estudiante && (
        <ModalPago
          estudiante={estudiante}
          onClose={() => setModalPago(false)}
          onPagoRegistrado={handlePagoRegistrado}
        />
      )}

    </>
  );
}