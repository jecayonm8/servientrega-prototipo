import { useEffect, useRef } from 'react'
import { getUbicacion, getHistorial } from '../services/api'

// Coordenadas centradas en el Eje Cafetero (Armenia–Pereira)
const CENTER = [4.7236, -75.6886]

// ubicacion: prop opcional pasado desde EnvioDetail para actualizar el
// marcador en tiempo real sin necesidad de que `selected` cambie.
export default function MapView({ selected, ubicacion }) {
  const containerRef = useRef(null)
  const mapRef      = useRef(null)
  const markerRef   = useRef(null)
  const polylineRef = useRef(null)

  // ── Inicializar mapa una sola vez ────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    mapRef.current = window.L.map(containerRef.current).setView(CENTER, 11)
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
    }).addTo(mapRef.current)
  }, [])

  // ── Carga inicial: posición + historial cuando cambia selected ─
  useEffect(() => {
    if (!mapRef.current || !selected) return
    const L = window.L

    Promise.all([getUbicacion(selected), getHistorial(selected)])
      .then(([ubicacionInicial, historial]) => {
        const { lat, lng } = ubicacionInicial

        const serviIcon = L.divIcon({
          className: '',
          html: '<div style="background:#009A44;border-radius:50%;width:16px;height:16px;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
          popupAnchor: [0, -12],
        })

        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng])
        } else {
          markerRef.current = L.marker([lat, lng], { icon: serviIcon })
            .addTo(mapRef.current)
            .bindPopup(selected)
        }
        markerRef.current.openPopup()
        mapRef.current.setView([lat, lng], 13)

        if (polylineRef.current) polylineRef.current.remove()
        if (historial.length > 1) {
          polylineRef.current = L.polyline(
            historial.map((p) => [p.lat, p.lng]),
            { color: '#009A44', weight: 3 }
          ).addTo(mapRef.current)
        }
      })
      .catch(() => {})
  }, [selected])

  // ── Actualizar marcador en tiempo real cuando llega nueva ubicación ─
  // Este efecto responde al polling de EnvioDetail (cada 5s) sin
  // necesitar que `selected` cambie.
  useEffect(() => {
    if (!mapRef.current || !ubicacion) return
    const L = window.L
    const { lat, lng } = ubicacion

    const serviIcon = L.divIcon({
      className: '',
      html: '<div style="background:#009A44;border-radius:50%;width:16px;height:16px;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      popupAnchor: [0, -12],
    })

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
    } else {
      markerRef.current = L.marker([lat, lng], { icon: serviIcon })
        .addTo(mapRef.current)
        .bindPopup(selected || '')
    }
  }, [ubicacion])

  // ── Centrar mapa en la ubicación actual ──────────────────
  const centrarMapa = () => {
    if (!mapRef.current || !ubicacion) return
    const zoom = mapRef.current.getZoom()
    mapRef.current.setView([ubicacion.lat, ubicacion.lng], zoom < 13 ? 13 : zoom, { animate: true })
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden" style={{ position: 'relative' }}>
      <div ref={containerRef} style={{ height: '300px' }} className="w-full" />

      {/* Botón centrar — visible solo cuando hay ubicación */}
      {ubicacion && (
        <button
          onClick={centrarMapa}
          title="Centrar mapa en el envío"
          style={{
            position: 'absolute',
            top: '0.6rem',
            right: '0.6rem',
            zIndex: 1000,
            backgroundColor: '#009A44',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '0.4rem 0.75rem',
            fontSize: '0.78rem',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
          }}
        >
          📍 Centrar
        </button>
      )}

      {!selected && (
        <p className="text-center text-gray-400 text-sm p-2">
          Selecciona un envío para ver su ubicación en el mapa
        </p>
      )}
    </div>
  )
}
