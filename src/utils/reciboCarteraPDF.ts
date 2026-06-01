import pdfMake from "pdfmake/build/pdfmake"
import * as pdfFonts from "pdfmake/build/vfs_fonts"
import { TDocumentDefinitions, Content, StyleDictionary, TableCell } from "pdfmake/interfaces"
import { Estudiante } from "../services/estudianteService"
import { CarteraEstudiante, PagoDetallado } from "../services/pagoService"

const fonts = (pdfFonts as any).default ?? pdfFonts;
(pdfMake as any).vfs = fonts.pdfMake?.vfs ?? fonts.vfs

pdfMake.fonts = {
  Roboto: {
    normal:      "Roboto-Regular.ttf",
    bold:        "Roboto-Medium.ttf",
    italics:     "Roboto-Italic.ttf",
    bolditalics: "Roboto-MediumItalic.ttf",
  },
}

const NAVY       = "#1B2B4B"
const NAVY_LIGHT = "#2C3E6B"
const SLATE      = "#4A5568"
const SILVER     = "#E8ECF0"
const WHITE      = "#FFFFFF"
const NEGRO      = "#1A202C"
const VERDE      = "#276749"
const ROJO       = "#9B2335"
const AMBER      = "#B45309"

function hoy(): string {
  return new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })
}
function anio(): number { return new Date().getFullYear() }
function numeroRecibo(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `REC-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}
function fmt(n: number): string { return "$" + n.toLocaleString("es-CO") }

function cajaMetrica(label: string, value: string, bgColor = WHITE, textColor = NEGRO): Content {
  const esOscuro = bgColor === NAVY || bgColor === NAVY_LIGHT
  const cell: TableCell = {
    stack: [
      { text: label, fontSize: 6.5, bold: true, color: esOscuro ? "#A8B8D0" : SLATE, alignment: "center", margin: [0, 0, 0, 5], characterSpacing: 0.8 } as Content,
      { text: value, fontSize: 18, bold: true, color: esOscuro ? WHITE : textColor, alignment: "center" } as Content,
    ],
    fillColor: bgColor, margin: [0, 12, 0, 12],
  }
  return {
    table: { widths: ["*"], body: [[cell]] },
    layout: {
      hLineWidth: () => 1, vLineWidth: () => 1,
      hLineColor: () => esOscuro ? NAVY_LIGHT : SILVER,
      vLineColor: () => esOscuro ? NAVY_LIGHT : SILVER,
      paddingLeft: () => 12, paddingRight: () => 12,
      paddingTop: () => 0, paddingBottom: () => 0,
    },
    width: "*",
  } as Content
}

export function generarReciboCarteraPDF(
  estudiante: Estudiante,
  cartera: CarteraEstudiante,
  pagosDetallados: PagoDetallado[]
) {
  const recibo = numeroRecibo()
  const totalDescuentos = cartera.lineas.reduce((acc, l) => acc + l.precio * (l.descuento / 100), 0)
  const totalPrecioBase = cartera.lineas.reduce((acc, l) => acc + l.precio, 0)

  // ── Info estudiante ────────────────────────────────────────────────────────
  const cajaEstudiante: Content = {
    table: {
      widths: ["*"],
      body: [[{
        columns: [
          {
            stack: [
              { text: "INFORMACIÓN DEL ESTUDIANTE", fontSize: 6.5, bold: true, color: NAVY, characterSpacing: 1, margin: [0, 0, 0, 10] } as Content,
              {
                columns: [
                  { stack: [{ text: "Nombre Completo", fontSize: 7, color: SLATE, margin: [0,0,0,2] } as Content, { text: estudiante.nombre_completo.toUpperCase(), fontSize: 13, bold: true, color: NEGRO } as Content], width: "*" },
                  { stack: [{ text: "Cédula", fontSize: 7, color: SLATE, margin: [0,0,0,2] } as Content, { text: estudiante.cedula, fontSize: 13, bold: true, color: NEGRO } as Content], width: "auto" },
                  ...(estudiante.correo ? [{ stack: [{ text: "Correo", fontSize: 7, color: SLATE, margin: [0,0,0,2] } as Content, { text: estudiante.correo, fontSize: 10, color: NEGRO } as Content], width: "auto", margin: [24,0,0,0] }] : []),
                ], columnGap: 24,
              } as Content,
            ], width: "*",
          },
          {
            stack: [
              { text: "N° RECIBO", fontSize: 6.5, bold: true, color: SLATE, characterSpacing: 0.8, alignment: "right" } as Content,
              { text: recibo, fontSize: 9, bold: true, color: NAVY, alignment: "right", margin: [0,3,0,0] } as Content,
            ], width: "auto",
          },
        ],
        columnGap: 0, fillColor: "#F8FAFC", margin: [16, 14, 16, 14],
      } as TableCell]],
    },
    layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => SILVER, vLineColor: () => SILVER, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
    margin: [0, 0, 0, 22],
  }

  // ── Tabla principal: una fila por transacción ──────────────────────────────
  const headerFila: TableCell[] = [
    { text: "FECHA",        style: "thCell" },
    { text: "MÓDULO",       style: "thCell" },
    { text: "MÉTODO",       style: "thCell", alignment: "center" },
    { text: "PRECIO BASE",  style: "thCell", alignment: "center" },
    { text: "DESC. %",      style: "thCell", alignment: "center" },
    { text: "PRECIO FINAL", style: "thCell", alignment: "center" },
    { text: "PAGADO",       style: "thCell", alignment: "center" },
    { text: "SALDO",        style: "thCell", alignment: "center" },
    { text: "ESTADO",       style: "thCell", alignment: "center" },
  ]

  const filas: TableCell[][] = pagosDetallados.length === 0
    ? [[{ text: "No hay transacciones registradas.", colSpan: 9, fontSize: 8, color: SLATE, italics: true, alignment: "center", fillColor: WHITE } as TableCell,
        ...Array(8).fill({} as TableCell)]]
    : pagosDetallados.map((p, i) => {
        const bg = i % 2 === 0 ? WHITE : "#F5F7FA"
        return [
          { text: p.fecha,       fontSize: 8, color: SLATE,  fillColor: bg },
          {
            stack: [
              { text: p.moduloNombre, fontSize: 9, color: NEGRO },
              { text: p.intento === 1 ? "Primer intento" : `Intento ${p.intento} · Recursado`, fontSize: 7, color: SLATE, italics: true },
            ], fillColor: bg,
          } as unknown as TableCell,
          { text: p.metodo,      style: "tdCenter", fillColor: bg },
          { text: fmt(p.precio), style: "tdCenter", fillColor: bg },
          { text: p.descuento > 0 ? `${p.descuento}%` : "—", style: "tdCenter", color: p.descuento > 0 ? AMBER : SLATE, bold: p.descuento > 0, fillColor: bg },
          { text: fmt(p.precioFinal),  style: "tdCenter", fillColor: bg },
          { text: fmt(p.montoPagado),  style: "tdCenter", color: VERDE, bold: true, fillColor: bg },
          { text: p.alDia ? "Al día" : fmt(p.saldoActual), style: "tdCenter", bold: !p.alDia, color: p.alDia ? VERDE : ROJO, fillColor: bg },
          { text: p.alDia ? "PAGADO" : "PENDIENTE", style: "tdStatus", color: p.alDia ? VERDE : ROJO, fillColor: bg },
        ]
      })

  const filaTotales: TableCell[] = [
    { text: `Total: ${pagosDetallados.length} transacción(es)`, colSpan: 3, fontSize: 7.5, bold: true, color: NAVY, fillColor: SILVER, border: [false, true, false, false] } as TableCell,
    {} as TableCell, {} as TableCell,
    { text: fmt(totalPrecioBase),                style: "tdCenter", bold: true, color: NEGRO, fillColor: SILVER, border: [false, true, false, false] },
    { text: fmt(totalDescuentos),                style: "tdCenter", bold: true, color: AMBER, fillColor: SILVER, border: [false, true, false, false] },
    { text: fmt(totalPrecioBase - totalDescuentos), style: "tdCenter", bold: true, color: NEGRO, fillColor: SILVER, border: [false, true, false, false] },
    { text: fmt(cartera.totalPagado),            style: "tdCenter", bold: true, color: VERDE, fillColor: SILVER, border: [false, true, false, false] },
    { text: fmt(cartera.totalDeuda),             style: "tdCenter", bold: true, color: cartera.totalDeuda === 0 ? VERDE : ROJO, fillColor: SILVER, border: [false, true, false, false] },
    { text: cartera.totalDeuda === 0 ? "AL DÍA" : "CON DEUDA", style: "tdStatus", bold: true, color: cartera.totalDeuda === 0 ? VERDE : ROJO, fillColor: SILVER, border: [false, true, false, false] },
  ]

  const docDef: TDocumentDefinitions = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [40, 48, 40, 80],

    footer: (currentPage, pageCount) => ({
      stack: [
        { canvas: [{ type: "line", x1: 40, y1: 0, x2: 802, y2: 0, lineWidth: 0.5, lineColor: SILVER }], margin: [0, 0, 0, 6] },
        {
          columns: [
            { stack: [{ text: "MEDIOS DE PAGO", fontSize: 6.5, bold: true, color: NAVY, characterSpacing: 0.8, margin: [0,0,0,2] }, { text: "Bancolombia Cuenta de Ahorro No. 524-171768-02", fontSize: 6.5, color: SLATE }, { text: "A nombre de Iglesia Comunidad Evangélica Ebenezer  ·  Nit. 892300787-1", fontSize: 6.5, color: SLATE }, { text: "Enviar soporte de pago al correo: instituciónteologicaebenezer@gmail.com", fontSize: 6.5, color: SLATE, italics: true }], width: "*" },
            { canvas: [{ type: "line", x1: 0, y1: 0, x2: 0, y2: 38, lineWidth: 0.5, lineColor: SILVER }], width: 1, margin: [6, 0, 6, 0] },
            { stack: [{ text: "MAYOR INFORMACIÓN", fontSize: 6.5, bold: true, color: NAVY, characterSpacing: 0.8, margin: [0,0,0,2] }, { text: "Calle 18 No. 15-04 Barrio la Granja  ·  Teléfono: 5708946", fontSize: 6.5, color: SLATE }, { text: "Celular: 316 0929970  /  315 6905567  /  312 6552105", fontSize: 6.5, color: SLATE }, { text: "Correo: instituciónteologicaebenezer@gmail.com", fontSize: 6.5, color: SLATE, italics: true }], width: "*" },
            { text: `Página ${currentPage} de ${pageCount}`, fontSize: 7, color: SLATE, alignment: "right", margin: [0, 16, 0, 0], width: "auto" },
          ], columnGap: 10,
        },
      ],
      margin: [40, 8, 40, 0],
    }),

    content: [
      // Encabezado
      {
        columns: [
          { stack: [{ text: "INSTITUTO EDUCATIVO", fontSize: 7, bold: true, color: NAVY, characterSpacing: 1.5, margin: [0,0,0,2] } as Content, { text: "Instituto Ebenezer", fontSize: 22, bold: true, color: NAVY, lineHeight: 1 } as Content, { text: "Formando el futuro con excelencia", fontSize: 8, color: SLATE, italics: true, margin: [0,3,0,0] } as Content], width: "*" },
          { stack: [{ text: "REPORTE DE CARTERA", fontSize: 10, bold: true, color: NAVY, alignment: "right", characterSpacing: 0.8 } as Content, { text: `Fecha de emisión: ${hoy()}`, fontSize: 8, color: SLATE, alignment: "right", margin: [0,4,0,0] } as Content], width: "auto" },
        ], columnGap: 20,
      } as Content,

      { canvas: [{ type: "line", x1: 0, y1: 6, x2: 762, y2: 6, lineWidth: 3, lineColor: NAVY }, { type: "line", x1: 0, y1: 11, x2: 762, y2: 11, lineWidth: 0.5, lineColor: SILVER }], margin: [0, 10, 0, 20] } as Content,

      cajaEstudiante,

      // Tabla única con todas las transacciones
      { text: "DETALLE DE TRANSACCIONES", fontSize: 8, bold: true, color: NAVY, characterSpacing: 1, margin: [0, 0, 0, 8] } as Content,
      {
        table: {
          headerRows: 1,
          widths: [54, "*", 54, 62, 40, 62, 58, 58, 54],
          body: [headerFila, ...filas, filaTotales],
        },
        layout: {
          hLineWidth: (i: number) => (i === 0 || i === 1 ? 0 : 0.5),
          vLineWidth: () => 0,
          hLineColor: () => SILVER,
          paddingLeft: () => 8, paddingRight: () => 8,
          paddingTop: () => 7, paddingBottom: () => 7,
        },
      } as Content,

      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 762, y2: 0, lineWidth: 1.5, lineColor: NAVY }], margin: [0, 0, 0, 20] } as Content,

      // Métricas resumen
      {
        columns: [
          cajaMetrica("PRECIO BASE TOTAL",    fmt(totalPrecioBase)),
          { width: 10, text: "" },
          cajaMetrica("DESCUENTOS APLICADOS", fmt(totalDescuentos), WHITE, AMBER),
          { width: 10, text: "" },
          cajaMetrica("TOTAL PAGADO",         fmt(cartera.totalPagado), NAVY),
          { width: 10, text: "" },
          cajaMetrica("SALDO PENDIENTE",      fmt(cartera.totalDeuda), WHITE, cartera.totalDeuda === 0 ? VERDE : ROJO),
        ], margin: [0, 0, 0, 30],
      } as Content,

      // Firma
      {
        columns: [
          { stack: [{ canvas: [{ type: "line", x1: 0, y1: 0, x2: 170, y2: 0, lineWidth: 0.8, lineColor: NEGRO }], margin: [0,0,0,6] } as Content, { text: "Coordinador Administrativo", fontSize: 8.5, bold: true, color: NEGRO } as Content, { text: "Instituto Educativo Ebenezer", fontSize: 7.5, color: SLATE, margin: [0,2,0,0] } as Content], width: "auto" },
          { width: "*", text: "" },
          { stack: [{ text: "Este documento es un reporte informativo de cartera generado automáticamente\npor el sistema académico del Instituto Educativo Ebenezer.", fontSize: 7, color: SLATE, italics: true, alignment: "right" } as Content], width: "auto" },
        ],
      } as Content,
    ],

    styles: {
      thCell:   { fontSize: 7.5, bold: true, color: WHITE, fillColor: NAVY_LIGHT, characterSpacing: 0.5 },
      tdNormal: { fontSize: 9, color: NEGRO },
      tdMono:   { fontSize: 8, color: SLATE },
      tdCenter: { fontSize: 9, color: NEGRO, alignment: "center" },
      tdStatus: { fontSize: 7, bold: true, alignment: "center", characterSpacing: 0.3 },
    } as StyleDictionary,

    defaultStyle: { font: "Roboto", fontSize: 9, color: NEGRO },
  }

  const nombre = estudiante.nombre_completo.replace(/\s+/g, "_")
  pdfMake.createPdf(docDef).download(`Cartera_${nombre}_${anio()}.pdf`)
}