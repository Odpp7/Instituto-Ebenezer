import { getConnection } from "../database/connection";

export interface LineaCarteraGeneral {
  estudianteId: number
  nombreEstudiante: string
  cedula: string
  telefono: string | null
  moduloCodigo: string
  moduloNombre: string
  precio: number
  descuento: number
  precioFinal: number
  totalPagado: number
  saldoPendiente: number
  ultimoPago: string | null
}

export interface ResumenCarteraGeneral {
  lineas: LineaCarteraGeneral[]
  totalCartera: number
  totalEstudiantesConDeuda: number
}

export async function obtenerResumenDashboard(mes: number, anio: number) {
  const conn = await getConnection();

  const mesStr = String(mes).padStart(2, "0");
  const anioStr = String(anio);

  const [totalEstudiantes] = await conn.select<{ total: number }[]>(
    `SELECT COUNT(*) as total FROM estudiantes WHERE activo = 1`
  );

  const [totalPagos] = await conn.select<{ total: number }[]>(
    `SELECT IFNULL(SUM(monto_pagado), 0) as total 
     FROM pagos 
     WHERE estado = 'CONFIRMADO'
       AND strftime('%Y', fecha_pago) = '${anioStr}'
       AND strftime('%m', fecha_pago) = '${mesStr}'`
  );

  const [pendientes] = await conn.select<{ total: number }[]>(
    `SELECT COUNT(*) as total
     FROM inscripciones i
     LEFT JOIN pagos p ON i.id = p.inscripcion_id
     WHERE p.id IS NULL`
  );

  return {
    totalEstudiantes: totalEstudiantes.total,
    totalPagos: totalPagos.total,
    pendientes: pendientes.total,
  };
}

// ✅ Ahora recibe anio para filtrar el gráfico
export async function obtenerPagosPorMes(anio: number) {
  const conn = await getConnection();

  return await conn.select<any[]>(`
    SELECT 
      strftime('%m', fecha_pago) as mes,
      SUM(monto_pagado) as total
    FROM pagos
    WHERE estado = 'CONFIRMADO'
      AND strftime('%Y', fecha_pago) = '${String(anio)}'
    GROUP BY mes
    ORDER BY mes
  `);
}

export async function obtenerNotificaciones() {
  const conn = await getConnection();

  return await conn.select<any[]>(`
    SELECT 
      'pago' as tipo,
      p.fecha_pago as fecha,
      e.nombre_completo as nombre,
      m.nombre as modulo,
      p.monto_pagado as monto
    FROM pagos p
    JOIN inscripciones i ON p.inscripcion_id = i.id
    JOIN estudiantes e ON i.estudiante_id = e.id
    JOIN modulos m ON i.modulo_id = m.id
    ORDER BY p.fecha_pago DESC
    LIMIT 5
  `);
}

export async function obtenerCarteraGeneral(): Promise<ResumenCarteraGeneral> {
  const conn = await getConnection();

  const rows = await conn.select<any[]>(`
    SELECT
      e.id                        AS estudiante_id,
      e.nombre_completo           AS nombre_estudiante,
      e.cedula,
      e.telefono,
      m.codigo                    AS modulo_codigo,
      m.nombre                    AS modulo_nombre,
      m.precio,
      i.descuento,
      COALESCE(SUM(p.monto_pagado), 0) AS pagado,
      MAX(p.fecha_pago)           AS ultimo_pago
    FROM inscripciones i
    JOIN estudiantes e  ON i.estudiante_id = e.id
    JOIN modulos m      ON i.modulo_id     = m.id
    LEFT JOIN pagos p   ON p.inscripcion_id = i.id AND p.estado = 'CONFIRMADO'
    WHERE e.activo = 1
      AND i.intento = (
        SELECT MAX(i2.intento)
        FROM inscripciones i2
        WHERE i2.estudiante_id = i.estudiante_id
          AND i2.modulo_id     = i.modulo_id
      )
    GROUP BY
      e.id, e.nombre_completo, e.cedula, e.telefono,
      m.codigo, m.nombre, m.precio, i.descuento
    HAVING (m.precio - m.precio * (i.descuento / 100.0) - COALESCE(SUM(p.monto_pagado), 0)) > 0
    ORDER BY e.nombre_completo, m.nombre
  `);

  const lineas: LineaCarteraGeneral[] = rows.map(r => {
    const precioFinal = r.precio - r.precio * (r.descuento / 100);
    const saldo = Math.max(0, precioFinal - r.pagado);
    return {
      estudianteId:     r.estudiante_id,
      nombreEstudiante: r.nombre_estudiante,
      cedula:           r.cedula,
      telefono:         r.telefono,
      moduloCodigo:     r.modulo_codigo,
      moduloNombre:     r.modulo_nombre,
      precio:           r.precio,
      descuento:        r.descuento,
      precioFinal,
      totalPagado:      r.pagado,
      saldoPendiente:   saldo,
      ultimoPago:       r.ultimo_pago ?? null,
    };
  });

  const estudiantesConDeuda = new Set(lineas.map(l => l.estudianteId));
  const totalCartera = lineas.reduce((s, l) => s + l.saldoPendiente, 0);

  return {
    lineas,
    totalCartera,
    totalEstudiantesConDeuda: estudiantesConDeuda.size,
  };
}