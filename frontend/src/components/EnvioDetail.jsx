// ════════════════════════════════════════════════════════════
// EnvioDetail — Vista detalle de un envío con mapa en tiempo real
// Servientrega · Prototipo Adm. Infraestructura TI · 2026-1
// ════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react'
import { getEnvio, getUbicacion, getNotificaciones } from '../services/api'
import MapView from './MapView'

// ─── Colores oficiales Servientrega ───────────────────────
const BADGE = {
  EN_BODEGA:   { backgroundColor: '#56C271', color: '#046A38', emoji: '🏭' },
  EN_TRANSITO: { backgroundColor: '#009A44', color: '#ffffff', emoji: '🚚' },
  ENTREGADO:   { backgroundColor: '#046A38', color: '#ffffff', emoji: '✅' },
  DEVUELTO:    { backgroundColor: '#DF1995', color: '#ffffff', emoji: '↩️' },
  CLASIFICADO: { backgroundColor: '#97999B', color: '#ffffff', emoji: '📦' },
  DESPACHADO:  { backgroundColor: 'rgba(0,154,68,0.7)', color: '#ffffff', emoji: '📤' },
  CANCELADO:   { backgroundColor: '#97999B', color: '#ffffff', emoji: '❌' },
}

// ─── Componente principal ─────────────────────────────────
// Recibe `codigo` como prop (gestionado por el hash-router en App.jsx)
export default function EnvioDetail({ codigo, onBack }) {
  const [envio, setEnvio]               = useState(null)
  const [ubicacion, setUbicacion]       = useState(null)
  const [notificaciones, setNotifs]     = useState([])
  const [loadingEnvio, setLoadingEnvio] = useState(true)
  const [error, setError]               = useState(null)
  const intervalRef                     = useRef(null)

  // ── Carga inicial del envío y notificaciones ─────────────
  useEffect(() => {
    if (!codigo) return
    setLoadingEnvio(true)
    setError(null)

    getEnvio(codigo)
      .then((data) => { setEnvio(data); setLoadingEnvio(false) })
      .catch(() => { setError('No se encontró el envío.'); setLoadingEnvio(false) })

    getNotificaciones(codigo)
      .then(setNotifs)
      .catch(() => setNotifs([]))
  }, [codigo])

  // ── Polling cada 5s: refresca ubicación Y estado del envío ──
  // Necesario para que el marcador se mueva en el mapa (ubicacion)
  // y el badge de estado cambie sin recargar (envio.estado).
  useEffect(() => {
    if (!codigo) return

    const poll = () => {
      getUbicacion(codigo)
        .then(setUbicacion)
        .catch(() => setUbicacion(null))

      getEnvio(codigo)
        .then(setEnvio)
        .catch(() => {})
    }

    poll()
    intervalRef.current = setInterval(poll, 5000)

    // Cleanup al desmontar
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [codigo])

  // ── Badge de estado ──────────────────────────────────────
  const badge = envio ? (BADGE[envio.estado] || { backgroundColor: '#97999B', color: '#fff', emoji: '❓' }) : null

  // ── Render ───────────────────────────────────────────────
  if (loadingEnvio) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f8f9fa' }}>
        <p style={{ color: '#97999B', fontWeight: '500' }}>Cargando envío...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: '#f8f9fa' }}>
        <p style={{ color: '#DF1995', fontWeight: '600' }}>{error}</p>
        <button
          onClick={onBack}
          style={{ backgroundColor: '#009A44', color: '#fff', padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600' }}
        >
          ← Volver
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f9fa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>

      {/* ── Cabecera ──────────────────────────────────────── */}
      <header
        style={{
          backgroundColor: '#009A44',
          backgroundImage: 'linear-gradient(135deg, #009A44 0%, #007a35 100%)',
          color: '#fff',
          padding: '1.5rem 1rem',
        }}
      >
        <div className="max-w-2xl mx-auto">
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', color: '#56C271', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem', padding: 0 }}
          >
            ← Volver a la lista
          </button>
          <div className="flex justify-between items-start flex-wrap gap-2">
            <div>
              <p style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '1.4rem', letterSpacing: '1px' }}>
                {envio.codigo}
              </p>
              <p style={{ color: '#56C271', fontSize: '0.85rem', fontWeight: '500', marginTop: '0.25rem' }}>
                {envio.origen} → {envio.destino}
              </p>
              {envio.cliente && (
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                  Cliente: {envio.cliente}
                </p>
              )}
            </div>
            {badge && (
              <span
                style={{
                  ...badge,
                  padding: '0.35rem 0.85rem',
                  borderRadius: '9999px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  whiteSpace: 'nowrap',
                }}
              >
                {badge.emoji} {envio.estado}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">

        {/* ── Mapa ──────────────────────────────────────────── */}
        <section className="bg-white rounded-lg shadow overflow-hidden">
          {ubicacion ? (
            <>
              <MapView selected={codigo} ubicacion={ubicacion} />
              <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #f0f0f0' }}>
                <div className="flex flex-wrap gap-4" style={{ fontSize: '0.8rem', color: '#97999B' }}>
                  <span>
                    <strong style={{ color: '#046A38' }}>Lat:</strong>{' '}
                    {Number(ubicacion.lat).toFixed(5)}
                  </span>
                  <span>
                    <strong style={{ color: '#046A38' }}>Lng:</strong>{' '}
                    {Number(ubicacion.lng).toFixed(5)}
                  </span>
                  {ubicacion.velocidad_kmh != null && (
                    <span>
                      <strong style={{ color: '#046A38' }}>Velocidad:</strong>{' '}
                      {ubicacion.velocidad_kmh} km/h
                    </span>
                  )}
                  {ubicacion.vehiculo && (
                    <span>
                      <strong style={{ color: '#046A38' }}>Vehículo:</strong>{' '}
                      {ubicacion.vehiculo}
                    </span>
                  )}
                  {ubicacion.fuente && (
                    <span style={{ color: '#bbb' }}>fuente: {ubicacion.fuente}</span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div style={{ height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '2.5rem' }}>🏭</span>
              <p style={{ color: '#97999B', fontSize: '0.9rem', fontWeight: '500' }}>
                El envío aún está en bodega
              </p>
              <p style={{ color: '#bbb', fontSize: '0.75rem' }}>
                El mapa se activará cuando el camión salga en tránsito
              </p>
            </div>
          )}
        </section>

        {/* ── Info adicional del envío ──────────────────────── */}
        <section className="bg-white rounded-lg shadow p-4">
          <h2 style={{ color: '#009A44', fontWeight: '700', fontSize: '1rem', marginBottom: '0.75rem' }}>
            Información del envío
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: '#97999B' }}>Origen</span>
              <p style={{ color: '#333', fontWeight: '600' }}>{envio.origen}</p>
            </div>
            <div>
              <span style={{ color: '#97999B' }}>Destino</span>
              <p style={{ color: '#333', fontWeight: '600' }}>{envio.destino}</p>
            </div>
            {envio.cliente && (
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: '#97999B' }}>Cliente</span>
                <p style={{ color: '#333', fontWeight: '600' }}>{envio.cliente}</p>
              </div>
            )}
            <div>
              <span style={{ color: '#97999B' }}>Estado</span>
              <p style={{ fontWeight: '700', color: badge ? badge.backgroundColor : '#333' }}>
                {badge?.emoji} {envio.estado}
              </p>
            </div>
            <div>
              <span style={{ color: '#97999B' }}>Registrado</span>
              <p style={{ color: '#333', fontWeight: '500' }}>
                {envio.created_at ? new Date(envio.created_at).toLocaleDateString('es-CO') : '—'}
              </p>
            </div>
          </div>
        </section>

        {/* ── Notificaciones ────────────────────────────────── */}
        <section
          className="bg-white rounded-lg shadow p-4"
          style={{ borderTop: `3px solid #DF1995` }}
        >
          <h2 style={{ color: '#DF1995', fontWeight: '700', fontSize: '1rem', marginBottom: '0.75rem' }}>
            Notificaciones
          </h2>
          {notificaciones.length === 0 ? (
            <p style={{ color: '#97999B', fontSize: '0.85rem' }}>Sin notificaciones para este envío.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {notificaciones.map((n, i) => (
                <li
                  key={i}
                  style={{
                    padding: '0.6rem 0.75rem',
                    borderRadius: '6px',
                    backgroundColor: '#fdf0f7',
                    borderLeft: '3px solid #DF1995',
                    fontSize: '0.82rem',
                  }}
                >
                  <span style={{ fontWeight: '700', color: '#DF1995' }}>{n.tipo}</span>
                  <span style={{ color: '#555', marginLeft: '0.5rem' }}>{n.mensaje}</span>
                  <span style={{ display: 'block', color: '#bbb', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                    {n.created_at ? new Date(n.created_at).toLocaleString('es-CO') : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

      </main>

      <footer className="text-center py-6 mt-4" style={{ color: '#97999B', fontSize: '0.875rem', fontWeight: '500' }}>
        Servientrega © {new Date().getFullYear()} — Prototipo Académico
      </footer>
    </div>
  )
}
