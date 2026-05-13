import { useState, useEffect } from 'react'
import MapView from './components/MapView'
import EnvioCard from './components/EnvioCard'
import EnvioDetail from './components/EnvioDetail'
import { getEnvios } from './services/api'

// ─── Hash-router simple (sin dependencias externas) ───────
// Rutas soportadas:
//   #/           → Lista de envíos (home)
//   #/envio/SRV-12345  → Detalle del envío

function parseHash() {
  const hash = window.location.hash.replace('#', '') || '/'
  const match = hash.match(/^\/envio\/(.+)$/)
  if (match) return { view: 'detail', codigo: match[1] }
  return { view: 'home' }
}

export default function App() {
  const [route, setRoute]         = useState(parseHash)
  const [envios, setEnvios]       = useState([])
  const [selected, setSelected]   = useState(null)
  const [error, setError]         = useState(null)
  const [loading, setLoading]     = useState(true)

  // ── Escuchar cambios de hash (botón atrás del navegador) ─
  useEffect(() => {
    const onHashChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // ── Cargar lista de envíos ────────────────────────────────
  useEffect(() => {
    getEnvios()
      .then((data) => { setEnvios(data); setLoading(false) })
      .catch(() => {
        setError('No se pudo conectar al backend. ¿Está corriendo en localhost:3000?')
        setLoading(false)
      })
  }, [])

  // ── Navegar a detalle ─────────────────────────────────────
  const goToDetail = (codigo) => {
    window.location.hash = `/envio/${codigo}`
  }

  // ── Volver a la lista ─────────────────────────────────────
  const goHome = () => {
    window.location.hash = '/'
  }

  // ── Vista detalle ─────────────────────────────────────────
  if (route.view === 'detail') {
    return <EnvioDetail codigo={route.codigo} onBack={goHome} />
  }

  // ── Vista home — Lista de envíos ──────────────────────────
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f9fa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
      <header
        className="text-white shadow-lg"
        style={{
          backgroundColor: '#009A44',
          backgroundImage: 'linear-gradient(135deg, #009A44 0%, #007a35 100%)',
          paddingTop: '2.5rem',
          paddingBottom: '2.5rem',
          paddingLeft: '1rem',
          paddingRight: '1rem'
        }}
      >
        <div className="max-w-2xl mx-auto text-center">
          <h1
            className="font-bold tracking-tight"
            style={{
              fontSize: '2rem',
              letterSpacing: '0.5px',
              marginBottom: '0.5rem',
              fontWeight: '700'
            }}
          >
            🚚 Servientrega — Tracking
          </h1>
          <p
            className="font-medium"
            style={{
              fontSize: '0.95rem',
              color: '#56C271',
              letterSpacing: '0.3px',
              fontWeight: '500'
            }}
          >
            Seguimiento en tiempo real
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {error && (
          <div className="p-4 rounded-lg text-sm text-white shadow" style={{ backgroundColor: '#DF1995' }}>
            ❌ {error}
          </div>
        )}

        <MapView selected={selected} />

        <section>
          <h2 className="font-semibold mb-3" style={{ color: '#009A44', fontSize: '1.1rem', letterSpacing: '0.3px' }}>
            Envíos activos
          </h2>

          {loading && (
            <p className="text-sm text-center py-6" style={{ color: '#97999B', fontWeight: '500' }}>Cargando envíos...</p>
          )}

          {!loading && envios.length === 0 && !error && (
            <p className="text-sm text-center py-6" style={{ color: '#97999B', fontWeight: '500' }}>No hay envíos registrados.</p>
          )}

          {envios.map((envio) => (
            <EnvioCard
              key={envio.codigo}
              envio={envio}
              onSelect={() => setSelected(envio.codigo === selected ? null : envio.codigo)}
              isSelected={selected === envio.codigo}
              onNavigate={() => goToDetail(envio.codigo)}
            />
          ))}
        </section>
      </main>

      <footer className="text-center py-6 mt-8" style={{ color: '#97999B', fontSize: '0.875rem', fontWeight: '500' }}>
        Servientrega © {new Date().getFullYear()} — Prototipo Académico
      </footer>
    </div>
  )
}
