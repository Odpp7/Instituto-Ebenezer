import pdfMake from "pdfmake/build/pdfmake"
import * as pdfFonts from "pdfmake/build/vfs_fonts"
import { TDocumentDefinitions, Content, StyleDictionary, TableCell, ContentImage, ContentStack } from "pdfmake/interfaces"
import { Estudiante } from "../services/estudianteService"
import { ModuloNota } from "../services/notaService"

const fonts = (pdfFonts as any).default ?? pdfFonts;
(pdfMake as any).vfs = fonts.pdfMake?.vfs ?? fonts.vfs

pdfMake.fonts = {
  Roboto: {
    normal: "Roboto-Regular.ttf",
    bold: "Roboto-Medium.ttf",
    italics: "Roboto-Italic.ttf",
    bolditalics: "Roboto-MediumItalic.ttf",
  }
}

// ─── Paleta institucional sobria ───────────────────────────────────────────────
const NAVY = "#1B2B4B"
const NAVY_LIGHT = "#2C3E6B"
const SLATE = "#4A5568"
const SILVER = "#E8ECF0"
const WHITE = "#FFFFFF"
const NEGRO = "#1A202C"
const VERDE = "#276749"
const ROJO = "#9B2335"
const DORADO = "#B8860B"

// ─── Helpers ──────────────────────────────────────────────────────────────────
function hoy(): string {
  return new Date().toLocaleDateString("es-CO", {
    day: "2-digit", month: "long", year: "numeric",
  })
}

function anio(): number {
  return new Date().getFullYear()
}

function estadoAcademico(modulos: ModuloNota[]): { label: string; color: string } {
  const conNota = modulos.filter(m => m.nota !== null)
  if (!conNota.length) return { label: "SIN CALIFICAR", color: SLATE }
  const reprobados = conNota.filter(m => (m.nota ?? 0) < 3)
  if (!reprobados.length) return { label: "NORMAL", color: VERDE }
  if (reprobados.length >= 3) return { label: "EN RIESGO", color: ROJO }
  return { label: "ALERTA", color: DORADO }
}

// ─── Caja de métrica ──────────────────────────────────────────────────────────
function cajaMetrica(label: string, value: string, bgColor = WHITE, textColor = NEGRO): Content {
  const esOscuro = bgColor === NAVY || bgColor === NAVY_LIGHT
  const cell: TableCell = {
    stack: [
      {
        text: label,
        fontSize: 6.5,
        bold: true,
        color: esOscuro ? "#A8B8D0" : SLATE,
        alignment: "center",
        margin: [0, 0, 0, 5],
        characterSpacing: 0.8,
      } as Content,
      {
        text: value,
        fontSize: 20,
        bold: true,
        color: esOscuro ? WHITE : textColor,
        alignment: "center",
      } as Content,
    ],
    fillColor: bgColor,
    margin: [0, 12, 0, 12],
  }

  return {
    table: {
      widths: ["*"],
      body: [[cell]],
    },
    layout: {
      hLineWidth: () => 1,
      vLineWidth: () => 1,
      hLineColor: () => esOscuro ? NAVY_LIGHT : SILVER,
      vLineColor: () => esOscuro ? NAVY_LIGHT : SILVER,
      paddingLeft: () => 12,
      paddingRight: () => 12,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
    width: "*",
  } as Content
}

// ─── Export principal ─────────────────────────────────────────────────────────
export function generarInformePDF(
  estudiante: Estudiante,
  modulos: ModuloNota[],
  fotoBase64: string | null
) {
  const pasados = modulos.filter(m => m.nota !== null && m.nota >= 3)
  const conNota = modulos.filter(m => m.nota !== null)
  const totalCreditos = pasados.reduce((acc, m) => acc + m.creditos, 0)
  const gpa = conNota.length
    ? (conNota.reduce((acc, m) => acc + (m.nota ?? 0), 0) / conNota.length).toFixed(2)
    : "—"
  const estado = estadoAcademico(modulos)

  // ── Filas de la tabla ──────────────────────────────────────────────────────
  const filas: TableCell[][] = modulos.map((m, i) => {
    const aprobado = m.nota !== null && m.nota >= 3
    const reprobado = m.nota !== null && m.nota < 3
    const bg = i % 2 === 0 ? WHITE : "#F5F7FA"
    return [
      { text: m.moduloCodigo, style: "tdMono", fillColor: bg },
      { text: m.moduloNombre, style: "tdNormal", fillColor: bg },
      { text: String(m.creditos), style: "tdCenter", fillColor: bg },
      {
        text: m.nota !== null ? String(m.nota) : "—",
        style: "tdCenter",
        bold: true,
        color: aprobado ? VERDE : reprobado ? ROJO : NEGRO,
        fillColor: bg,
      },
      {
        text: aprobado ? "APROBADO" : reprobado ? "REPROBADO" : "PENDIENTE",
        style: "tdStatus",
        color: aprobado ? VERDE : reprobado ? ROJO : SLATE,
        fillColor: bg,
      },
    ]
  })

  const headerFila: TableCell[] = [
    { text: "CÓDIGO", style: "thCell" },
    { text: "NOMBRE DEL MÓDULO", style: "thCell" },
    { text: "CREDITOS", style: "thCell", alignment: "center" },
    { text: "NOTA FINAL", style: "thCell", alignment: "center" },
    { text: "ESTADO", style: "thCell", alignment: "center" },
  ]

  // ── Bloque de info + foto del estudiante ──────────────────────────────────
  const fotoContent: ContentImage | ContentStack = fotoBase64
    ? {
        image: fotoBase64,
        width: 64,
        height: 64,
      }
    : {
        stack: [
          {
            canvas: [
              { type: "rect", x: 0, y: 0, w: 64, h: 64, color: SILVER },
            ],
          },
        ],
      }

  const cajaEstudiante: Content = {
    table: {
      widths: ["*"],
      body: [[
        {
          columns: [
            {
              stack: [
                {
                  table: {
                    body: [[fotoContent]],
                  },
                  layout: {
                    hLineWidth: () => 1,
                    vLineWidth: () => 1,
                    hLineColor: () => SILVER,
                    vLineColor: () => SILVER,
                    paddingLeft: () => 0,
                    paddingRight: () => 0,
                    paddingTop: () => 0,
                    paddingBottom: () => 0,
                  },
                } as Content,
              ],
              width: "auto",
              margin: [0, 0, 18, 0],
            },
            {
              stack: [
                {
                  text: "INFORMACIÓN DEL ESTUDIANTE",
                  fontSize: 6.5,
                  bold: true,
                  color: NAVY,
                  characterSpacing: 1,
                  margin: [0, 0, 0, 10],
                } as Content,
                {
                  columns: [
                    {
                      stack: [
                        { text: "Nombre Completo", fontSize: 7, color: SLATE, margin: [0, 0, 0, 2] } as Content,
                        { text: estudiante.nombre_completo.toUpperCase(), fontSize: 12, bold: true, color: NEGRO } as Content,
                      ],
                      width: "*",
                    },
                    {
                      stack: [
                        { text: "Documento de Identidad", fontSize: 7, color: SLATE, margin: [0, 0, 0, 2] } as Content,
                        { text: estudiante.cedula, fontSize: 12, bold: true, color: NEGRO } as Content,
                      ],
                      width: "auto",
                    },
                  ],
                  columnGap: 24,
                } as Content,
              ],
              width: "*",
            },
          ],
          columnGap: 0,
          fillColor: "#F8FAFC",
          margin: [16, 14, 16, 14],
        } as TableCell,
      ]],
    },
    layout: {
      hLineWidth: () => 1,
      vLineWidth: () => 1,
      hLineColor: () => SILVER,
      vLineColor: () => SILVER,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
    margin: [0, 0, 0, 22],
  }

  // ─────────────────────────────────────────────────────────────────────────────
  const docDef: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [48, 48, 48, 72],

    footer: (currentPage, pageCount) => ({
      stack: [
        {
          canvas: [
            { type: "line", x1: 0, y1: 0, x2: 499, y2: 0, lineWidth: 0.5, lineColor: SILVER },
          ],
          margin: [48, 0, 48, 4],
        },
        {
          columns: [
            {
              stack: [
                {
                  text: "Instituto Educativo Ebenezer — Documento Académico Confidencial",
                  fontSize: 7,
                  color: SLATE,
                  italics: true,
                },
                {
                  text: "Calle 18 No. 15 - 04 Barrio la Granja  ·  Tel: 5708946  ·  Cel: 316 0929970 / 315 6905567 / 312 6552105",
                  fontSize: 6.5,
                  color: SLATE,
                  margin: [0, 2, 0, 0],
                },
                {
                  text: "instituciónteologicaebenezer@gmail.com",
                  fontSize: 6.5,
                  color: SLATE,
                  margin: [0, 1, 0, 0],
                },
              ],
              width: "*",
            },
            {
              text: `Página ${currentPage} de ${pageCount}`,
              fontSize: 7,
              color: SLATE,
              alignment: "right",
              width: "auto",
            },
          ],
          margin: [48, 0, 48, 0],
        },
      ],
      margin: [0, 10, 0, 0],
    }),

    content: [

      // ── ENCABEZADO INSTITUCIONAL ─────────────────────────────────────────────
      {
        columns: [
          {
            stack: [
              {
                text: "INSTITUTO EDUCATIVO",
                fontSize: 7,
                bold: true,
                color: NAVY,
                characterSpacing: 1.5,
                margin: [0, 0, 0, 2],
              } as Content,
              {
                text: "Instituto Ebenezer",
                fontSize: 22,
                bold: true,
                color: NAVY,
                lineHeight: 1,
              } as Content,
              {
                text: "Formando el futuro con excelencia",
                fontSize: 8,
                color: SLATE,
                italics: true,
                margin: [0, 3, 0, 0],
              } as Content,
            ],
            width: "*",
          },
          {
            stack: [
              {
                text: "REPORTE ACADÉMICO OFICIAL",
                fontSize: 8,
                bold: true,
                color: NAVY,
                alignment: "right",
                characterSpacing: 0.8,
              } as Content,
              {
                text: `Fecha de emisión: ${hoy()}`,
                fontSize: 8,
                color: SLATE,
                alignment: "right",
                margin: [0, 4, 0, 0],
              } as Content,
            ],
            width: "auto",
          },
        ],
        columnGap: 20,
      } as Content,

      // Doble línea divisoria institucional
      {
        canvas: [
          { type: "line", x1: 0, y1: 6, x2: 499, y2: 6, lineWidth: 3, lineColor: NAVY },
          { type: "line", x1: 0, y1: 11, x2: 499, y2: 11, lineWidth: 0.5, lineColor: SILVER },
        ],
        margin: [0, 10, 0, 20],
      } as Content,

      // ── INFO ESTUDIANTE (con foto) ───────────────────────────────────────────
      cajaEstudiante,

      // ── TABLA DE CALIFICACIONES ──────────────────────────────────────────────
      {
        text: "REGISTRO DE CALIFICACIONES",
        fontSize: 8,
        bold: true,
        color: NAVY,
        characterSpacing: 1,
        margin: [0, 0, 0, 8],
      } as Content,
      {
        table: {
          headerRows: 1,
          widths: [58, "*", 44, 56, 76],
          body: [headerFila, ...filas],
        },
        layout: {
          hLineWidth: (i: number) => (i === 0 || i === 1 ? 0 : 0.5),
          vLineWidth: () => 0,
          hLineColor: () => SILVER,
          paddingLeft: () => 9,
          paddingRight: () => 9,
          paddingTop: () => 7,
          paddingBottom: () => 7,
        },
      } as Content,

      // Línea cierre tabla
      {
        canvas: [
          { type: "line", x1: 0, y1: 0, x2: 499, y2: 0, lineWidth: 1.5, lineColor: NAVY },
        ],
        margin: [0, 0, 0, 18],
      } as Content,

      // ── RESUMEN ──────────────────────────────────────────────────────────────
      {
        columns: [
          cajaMetrica("CREDITOS APROBADOS", String(totalCreditos)),
          { width: 10, text: "" },
          cajaMetrica("PROMEDIO GENERAL (GPA)", gpa, NAVY),
          { width: 10, text: "" },
          cajaMetrica("ESTADO ACADÉMICO", estado.label, WHITE, estado.color),
        ],
        margin: [0, 0, 0, 30],
      } as Content,

      // ── FIRMA ────────────────────────────────────────────────────────────────
      {
        columns: [
          {
            stack: [
              {
                canvas: [
                  { type: "line", x1: 0, y1: 0, x2: 170, y2: 0, lineWidth: 0.8, lineColor: NEGRO },
                ],
                margin: [0, 0, 0, 6],
              } as Content,
              { text: "Coordinador Académico", fontSize: 8.5, bold: true, color: NEGRO } as Content,
              { text: "Instituto Educativo Ebenezer", fontSize: 7.5, color: SLATE, margin: [0, 2, 0, 0] } as Content,
            ],
            width: "auto",
          },
          { width: "*", text: "" },
        ],
      } as Content,
    ],

    styles: {
      thCell: {
        fontSize: 7.5,
        bold: true,
        color: WHITE,
        fillColor: NAVY_LIGHT,
        characterSpacing: 0.5,
      },
      tdNormal: { fontSize: 9, color: NEGRO },
      tdMono: { fontSize: 8, color: SLATE },
      tdCenter: { fontSize: 9, color: NEGRO, alignment: "center" },
      tdStatus: { fontSize: 7.5, bold: true, alignment: "center", characterSpacing: 0.3 },
    } as StyleDictionary,

    defaultStyle: { font: "Roboto", fontSize: 9, color: NEGRO },
  }

  const nombre = estudiante.nombre_completo.replace(/\s+/g, "_")
  pdfMake.createPdf(docDef).download(`Informe_Academico_${nombre}_${anio()}.pdf`)
}