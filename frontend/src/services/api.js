const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export async function getEnvios() {
  const res = await fetch(`${BASE_URL}/envios`)
  if (!res.ok) throw new Error('Error al obtener envíos')
  return res.json()
}

export async function getEnvio(codigo) {
  const res = await fetch(`${BASE_URL}/envios/${codigo}`)
  if (!res.ok) throw new Error('Envío no encontrado')
  return res.json()
}

export async function getUbicacion(codigo) {
  const res = await fetch(`${BASE_URL}/envios/${codigo}/ubicacion`)
  if (!res.ok) throw new Error('Ubicación no disponible')
  return res.json()
}

export async function getHistorial(codigo) {
  const res = await fetch(`${BASE_URL}/envios/${codigo}/historial`)
  if (!res.ok) throw new Error('Historial no disponible')
  return res.json()
}

export async function getNotificaciones(codigo) {
  const res = await fetch(`${BASE_URL}/envios/${codigo}/notificaciones`)
  if (!res.ok) throw new Error('Notificaciones no disponibles')
  return res.json()
}
