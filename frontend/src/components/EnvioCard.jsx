const BADGE_ESTILO = {
  EN_BODEGA:   { backgroundColor: '#56C271', color: '#046A38',          emoji: '🏭' },
  EN_TRANSITO: { backgroundColor: '#009A44', color: '#ffffff',          emoji: '🚚' },
  ENTREGADO:   { backgroundColor: '#046A38', color: '#ffffff',          emoji: '✅' },
  DEVUELTO:    { backgroundColor: '#DF1995', color: '#ffffff',          emoji: '↩️' },
  CLASIFICADO: { backgroundColor: '#97999B', color: '#ffffff',          emoji: '📦' },
  DESPACHADO:  { backgroundColor: 'rgba(0,154,68,0.7)', color: '#fff', emoji: '📤' },
  CANCELADO:   { backgroundColor: '#97999B', color: '#ffffff',          emoji: '❌' },
}

// onSelect  → selecciona en el mapa (mapa en home)
// onNavigate → navega a la vista detalle
export default function EnvioCard({ envio, onSelect, isSelected, onNavigate }) {
  const badgeStyle = BADGE_ESTILO[envio.estado] || { backgroundColor: '#97999B', color: '#ffffff', emoji: '❓' }
  const borderColor = isSelected ? '#046A38' : '#009A44'

  return (
    <div
      className="bg-white rounded-lg p-4 shadow mb-3"
      style={{ borderLeft: `4px solid ${borderColor}`, position: 'relative' }}
    >
      {/* Área clickeable principal → selecciona en mapa */}
      <div
        onClick={onSelect}
        className="cursor-pointer"
        style={{ paddingRight: '5.5rem' }}
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="font-mono font-bold text-sm text-gray-800">{envio.codigo}</p>
            <p className="text-sm mt-1" style={{ color: '#97999B' }}>
              {envio.origen} → {envio.destino}
            </p>
            {envio.cliente && (
              <p className="text-xs mt-0.5" style={{ color: '#bbb' }}>{envio.cliente}</p>
            )}
          </div>
          <span
            className="text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap"
            style={{ backgroundColor: badgeStyle.backgroundColor, color: badgeStyle.color }}
          >
            {badgeStyle.emoji} {envio.estado}
          </span>
        </div>
      </div>

      {/* Botón "Ver detalle" → navega a EnvioDetail */}
      <button
        onClick={(e) => { e.stopPropagation(); onNavigate() }}
        style={{
          position: 'absolute',
          bottom: '0.75rem',
          right: '0.75rem',
          backgroundColor: '#009A44',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          padding: '0.25rem 0.65rem',
          fontSize: '0.72rem',
          fontWeight: '600',
          cursor: 'pointer',
          letterSpacing: '0.3px',
        }}
      >
        Ver detalle →
      </button>
    </div>
  )
}
