import { getConnection } from "../database/connection"

export interface ModuloNota {
  inscripcionId: number
  moduloId: number
  moduloCodigo: string
  moduloNombre: string
  horas: number
  creditos: number
  fechaInscripcion: string
  nota: number | null
  bloqueada: boolean
  estado: string
  intento: number
}


export async function obtenerModulosEstudiante(estudianteId: number): Promise<ModuloNota[]> {

  const conn = await getConnection()

  const rows = await conn.select<any[]>(`
  SELECT
    i.id AS inscripcion_id,
    m.id AS modulo_id,
    m.codigo AS modulo_codigo,
    m.nombre AS modulo_nombre,
    m.creditos,
    i.intento,

    (m.horas_aula + m.horas_independiente) AS horas,

    i.fecha_inscripcion,
    i.nota,
    i.nota_bloqueada,
    i.estado

  FROM inscripciones i
  JOIN modulos m ON i.modulo_id = m.id
  WHERE i.estudiante_id = ?
  ORDER BY i.fecha_inscripcion ASC
`, [estudianteId])



  return rows.map(r => ({
    inscripcionId: r.inscripcion_id,
    moduloId: r.modulo_id,
    moduloCodigo: r.modulo_codigo,
    moduloNombre: r.modulo_nombre,
    horas: r.horas,
    creditos: r.creditos,
    fechaInscripcion: r.fecha_inscripcion,
    nota: r.nota,
    bloqueada: r.nota_bloqueada === 1,
    intento: r.intento,
    estado: r.estado
  }))
}



export async function guardarNota(inscripcionId: number, nota: number) {
  const conn = await getConnection()

  const fecha = new Date().toISOString().split("T")[0]

  const estado = nota >= 3 ? "APROBADO" : "REPROBADO"

  await conn.execute(`
    UPDATE inscripciones
    SET
      nota = ?,
      fecha_nota = ?,
      nota_bloqueada = 1,
      estado = ?
    WHERE id = ?
  `, [nota, fecha, estado, inscripcionId])

}



export async function recursarModulo(estudianteId: number, moduloId: number) {

  const conn = await getConnection()
  const fecha = new Date().toISOString().split("T")[0]

  const result = await conn.select<any[]>(`
    SELECT MAX(intento) as max_intento
    FROM inscripciones
    WHERE estudiante_id = ? AND modulo_id = ?
  `, [estudianteId, moduloId])

  const intentoActual = result[0]?.max_intento || 0

  await conn.execute(`
    UPDATE inscripciones
    SET estado = 'REPROBADO'
    WHERE estudiante_id = ?
    AND modulo_id = ?
    AND intento = ?
  `, [estudianteId, moduloId, intentoActual])

  const nuevoIntento = intentoActual + 1

  await conn.execute(`
    INSERT INTO inscripciones
    (estudiante_id, modulo_id, intento, fecha_inscripcion, estado)
    VALUES (?, ?, ?, ?, 'ACTIVO')
  `, [estudianteId, moduloId, nuevoIntento, fecha])
}



export async function obtenerFotoEstudiante(estudianteId: number): Promise<string | null> {
  const conn = await getConnection()
  const rows = await conn.select<any[]>(`
    SELECT foto_perfil
    FROM fotos_personas
    WHERE persona_tipo = 'ESTUDIANTE' AND persona_id = ?
  `, [estudianteId])

  return rows[0]?.foto_perfil ?? null
}


