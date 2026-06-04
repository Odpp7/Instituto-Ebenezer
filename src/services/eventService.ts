import { getConnection } from "../database/connection";

export interface Evento {
  id: number;
  nombre: string;
  fecha: string;
  hora?: string | null;
  descripcion?: string | null;
  categoria: string;
  lugar?: string | null;
}

export async function crearEvento(evento: Omit<Evento, "id">) {
  const conn = await getConnection();

  await conn.execute(
    `INSERT INTO eventos (nombre, fecha, hora, descripcion, categoria, lugar)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      evento.nombre,
      evento.fecha,
      evento.hora || null,
      evento.descripcion || null,
      evento.categoria.toLocaleUpperCase(),
      evento.lugar || null
    ]
  );
}


export async function obtenerEventos(): Promise<Evento[]> {
  const conn = await getConnection();

  return await conn.select<Evento[]>(`
    SELECT *
    FROM eventos
    WHERE activo = 1
      AND date(fecha) >= date('now','localtime')
    ORDER BY fecha ASC
    LIMIT 4
  `);   
}



export async function eliminarEvento(id: number) {
  const conn = await getConnection();

  await conn.execute(
    `UPDATE eventos SET activo = 0 WHERE id = ?`,
    [id]
  );
}


export async function obtenerTodosLosEventos(): Promise<Evento[]> {
  const conn = await getConnection();
  return await conn.select<Evento[]>(`
    SELECT *
    FROM eventos
    WHERE activo = 1
    ORDER BY fecha ASC
  `);
}


