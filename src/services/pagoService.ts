import { getConnection } from "../database/connection";

export interface LineaCartera {
  inscripcionId: number
  moduloNombre: string
  moduloCodigo: string
  precio: number
  descuento: number
  precioFinal: number
  totalPagado: number
  saldoPendiente: number
  intento: number
  estado: string
}

export interface CarteraEstudiante {
  lineas: LineaCartera[]
  totalDeuda: number
  totalPagado: number
}

export interface PagoReciente {
  fecha: string
  concepto: string
  monto: number
  metodo: string
}

export interface PagoDetallado {
  fecha: string
  moduloNombre: string
  moduloCodigo: string
  precio: number
  descuento: number
  precioFinal: number
  montoPagado: number
  saldoActual: number
  saldoPagado: number
  metodo: string
  intento: number
  alDia: boolean
}


export async function obtenerCarteraEstudiante(estudianteId: number): Promise<CarteraEstudiante> {

  const conn = await getConnection()

const rows = await conn.select<any[]>(`
  SELECT
    i.id AS inscripcion_id,
    m.nombre AS modulo_nombre,
    m.codigo AS modulo_codigo,
    m.precio,
    i.descuento,
    i.intento,
    i.estado,
    COALESCE(SUM(p.monto_pagado),0) AS pagado
  FROM inscripciones i
  JOIN modulos m ON i.modulo_id = m.id
  LEFT JOIN pagos p ON p.inscripcion_id = i.id AND p.estado = 'CONFIRMADO'
  WHERE i.estudiante_id = ?
  AND i.intento = (
    SELECT MAX(i2.intento)
    FROM inscripciones i2
    WHERE i2.estudiante_id = i.estudiante_id
    AND i2.modulo_id = i.modulo_id
  )
  GROUP BY 
    i.id,
    m.nombre,
    m.codigo,
    m.precio,
    i.descuento,
    i.intento,
    i.estado
`, [estudianteId])




  const lineas: LineaCartera[] = rows.map(r => {

    const descuentoValor = r.precio * (r.descuento / 100)
    const precioFinal = r.precio - descuentoValor
    const saldo = Math.max(0, precioFinal - r.pagado)

    return {
      inscripcionId: r.inscripcion_id,
      moduloNombre: r.modulo_nombre,
      moduloCodigo: r.modulo_codigo,
      precio: r.precio,
      descuento: r.descuento,
      precioFinal,
      totalPagado: r.pagado,
      saldoPendiente: saldo,
      intento: r.intento,
      estado: r.estado
    }
  })


  const totalDeuda = lineas.reduce((s, l) => s + l.saldoPendiente, 0)
  const totalPagado = lineas.reduce((s, l) => s + l.totalPagado, 0)

  return { lineas, totalDeuda, totalPagado }
}



export async function registrarPagoModulo(
  inscripcionId: number,
  monto: number,
  metodoPago: string,
  observaciones?: string
) {

  const conn = await getConnection()

  const fecha = new Date().toISOString().split("T")[0]

  await conn.execute(`
    INSERT INTO pagos
    (inscripcion_id, monto_pagado, metodo_pago, fecha_pago, observaciones)
    VALUES (?, ?, ?, ?, ?)
  `, [inscripcionId, monto, metodoPago, fecha, observaciones ?? ""])
}



export async function actualizarDescuento(
  inscripcionId: number,
  descuento: number
) {

  const conn = await getConnection()

  await conn.execute(`
    UPDATE inscripciones
    SET descuento = ?
    WHERE id = ?
  `, [descuento, inscripcionId])

}



export async function obtenerPagosRecientes(estudianteId: number): Promise<PagoReciente[]> {

  const conn = await getConnection()

  const rows = await conn.select<any[]>(`
  SELECT 
    p.fecha_pago,
    m.nombre AS modulo_nombre,
    i.intento,
    p.monto_pagado,
    p.metodo_pago
    FROM pagos p
    JOIN inscripciones i ON p.inscripcion_id = i.id
    JOIN modulos m ON i.modulo_id = m.id
    WHERE i.estudiante_id = ?
    ORDER BY p.fecha_pago DESC
    LIMIT 10
  `, [estudianteId])

  return rows.map(r => ({
    fecha: r.fecha_pago,
    concepto: `${r.modulo_nombre} (Intento ${r.intento})`,
    monto: r.monto_pagado,
    metodo: r.metodo_pago
  }))

}


export async function obtenerPagosDetallados(estudianteId: number): Promise<PagoDetallado[]> {
  const conn = await getConnection()
  const rows = await conn.select<any[]>(`
    SELECT
      p.fecha_pago,
      p.monto_pagado,
      p.metodo_pago,
      m.nombre AS modulo_nombre,
      m.codigo AS modulo_codigo,
      m.precio,
      i.descuento,
      i.intento,
      COALESCE((
        SELECT SUM(p2.monto_pagado)
        FROM pagos p2
        WHERE p2.inscripcion_id = i.id AND p2.estado = 'CONFIRMADO'
      ), 0) AS total_pagado_modulo
    FROM pagos p
    JOIN inscripciones i ON p.inscripcion_id = i.id
    JOIN modulos m ON i.modulo_id = m.id
    WHERE i.estudiante_id = ?
    AND p.estado = 'CONFIRMADO'
    ORDER BY p.fecha_pago ASC, p.id ASC
  `, [estudianteId])

  return rows.map(r => {
    const precioFinal = r.precio - (r.precio * r.descuento / 100)
    const saldoActual = Math.max(0, precioFinal - r.total_pagado_modulo)
    const alDia = saldoActual === 0
    return {
      fecha: r.fecha_pago,
      moduloNombre: r.modulo_nombre,
      moduloCodigo: r.modulo_codigo,
      precio: r.precio,
      descuento: r.descuento,
      precioFinal,
      montoPagado: r.monto_pagado,
      saldoActual,
      saldoPagado: r.total_pagado_modulo,
      metodo: r.metodo_pago,
      intento: r.intento,
      alDia,
    }
  })
}
