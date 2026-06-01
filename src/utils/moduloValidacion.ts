export interface ModuloForm {
  codigo: string
  nombre: string
  duracion: string
  horas_aula: number
  horas_independiente: number
  creditos: number
  precio: number
  programa_id: number | null
  ciclo_id: number | null
}

export function validarModulo(data: ModuloForm): string | null {

  const codigoRegex = /^[A-Za-z0-9][A-Za-z0-9_-]{1,14}$/
  const nombreRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s]{3,100}$/

  if (!data.codigo.trim()) {
    return "El código del módulo es obligatorio"
  }

  if (data.codigo.trim().length < 2) {
    return "El código debe tener al menos 2 caracteres"
  }

  if (!codigoRegex.test(data.codigo.trim())) {
    return "Código inválido. Solo letras, números, guion (-) o guion bajo (_). Ej: FM-101, FIM1, EB001"
  }

  if (!data.nombre.trim()) {
    return "El nombre del módulo es obligatorio"
  }

  if (!nombreRegex.test(data.nombre.trim())) {
    return "Nombre del módulo inválido. Solo letras, números y espacios simples"
  }

  if (data.nombre.includes("  ")) {
    return "El nombre del módulo contiene espacios consecutivos"
  }

  if (!data.programa_id) {
    return "Debes seleccionar un programa académico"
  }

  if (!data.ciclo_id) {
    return "Debes seleccionar un ciclo"
  }

  if (!data.creditos || data.creditos <= 0) {
    return "Los créditos son obligatorios y deben ser mayor a 0"
  }

  if (!Number.isInteger(data.creditos)) {
    return "Los créditos deben ser un número entero"
  }

  if (data.creditos > 20) {
    return "El número de créditos es demasiado alto"
  }

  if (data.horas_aula < 0) {
    return "Las horas en aula no pueden ser negativas"
  }

  if (data.horas_aula > 2000) {
    return "Las horas en aula son demasiado altas"
  }

  if (data.horas_independiente < 0) {
    return "Las horas de trabajo independiente no pueden ser negativas"
  }

  if (data.horas_independiente > 2000) {
    return "Las horas de trabajo independiente son demasiado altas"
  }

  if (data.precio <= 0) {
    return "El precio debe ser mayor que 0"
  }

  if (data.precio > 10000000) {
    return "El precio es demasiado alto"
  }

  return null
}