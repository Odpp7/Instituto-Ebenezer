import { getConnection } from "../database/connection";

export interface Profesor {
  id: number;
  nombre_completo: string;
  cedula: string;
  telefono: string;
  correo?: string | null;
  especialidad?: string | null;
  fecha_registro: string;
  activo: number;
}

export interface FotosProfesor {
  foto_perfil: string | null;
  foto_documento: string | null;
}


export async function obtenerProfesores(): Promise<Profesor[]> {
  const conn = await getConnection();
  return await conn.select<Profesor[]>(
    `SELECT id, nombre_completo, cedula, telefono, correo, especialidad, activo, fecha_registro
     FROM profesores ORDER BY fecha_registro DESC`
  );
}


export async function obtenerFotosProfesor(id: number): Promise<FotosProfesor> {
  const conn = await getConnection();
  const rows = await conn.select<FotosProfesor[]>(
    `SELECT foto_perfil, foto_documento FROM fotos_personas
     WHERE persona_tipo = 'PROFESOR' AND persona_id = ?`,
    [id]
  );
  return rows[0] ?? { foto_perfil: null, foto_documento: null };
}

export async function guardarFotosProfesor(id: number, fotos: Partial<FotosProfesor>) {
  const conn = await getConnection();
  await conn.execute(
    `INSERT INTO fotos_personas (persona_tipo, persona_id, foto_perfil, foto_documento)
     VALUES ('PROFESOR', ?, ?, ?)
     ON CONFLICT(persona_tipo, persona_id) DO UPDATE SET
       foto_perfil    = COALESCE(excluded.foto_perfil, foto_perfil),
       foto_documento = COALESCE(excluded.foto_documento, foto_documento)`,
    [id, fotos.foto_perfil ?? null, fotos.foto_documento ?? null]
  );
}

// Mantener compatibilidad con el nombre anterior — internamente usa guardarFotosProfesor
export async function guardarFotoProfesor(id: number, foto_perfil: string) {
  await guardarFotosProfesor(id, { foto_perfil });
}

export async function crearProfesor(
  prof: Omit<Profesor, "id" | "fecha_registro" | "activo">,
  foto_perfil?: string | null
) {
  const conn = await getConnection();
  const existe = await conn.select<{ id: number }[]>(
    `SELECT id FROM profesores WHERE cedula = ?`, [prof.cedula]
  );
  if (existe.length > 0) throw new Error("CEDULA_DUPLICADA");
  await conn.execute(
    `INSERT INTO profesores (nombre_completo, cedula, telefono, correo, especialidad) VALUES (?, ?, ?, ?, ?)`,
    [prof.nombre_completo, prof.cedula, prof.telefono, prof.correo || null, prof.especialidad || null]
  );
  if (foto_perfil) {
    const rows = await conn.select<{ id: number }[]>(
      `SELECT id FROM profesores WHERE cedula = ?`, [prof.cedula]
    );
    await guardarFotoProfesor(rows[0].id, foto_perfil);
  }
}

export async function actualizarProfesor(id: number, prof: Partial<Omit<Profesor, "id" | "fecha_registro">>) {
  const conn = await getConnection();
  await conn.execute(
    `UPDATE profesores SET nombre_completo = ?, cedula = ?, telefono = ?, correo = ?, especialidad = ? WHERE id = ?`,
    [prof.nombre_completo, prof.cedula, prof.telefono, prof.correo || null, prof.especialidad || null, id]
  );
}

export async function eliminarProfesor(id: number) {
  const conn = await getConnection();
  await conn.execute(`UPDATE profesores SET activo = 0 WHERE id = ?`, [id]);
}