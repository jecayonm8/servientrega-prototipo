const BADGE_ESTILO = {
  EN_BODEGA:   { backgroundColor: '#E8F5EE', color: '#046A38' },
  EN_TRANSITO: { backgroundColor: '#009A44', color: '#ffffff' },
  ENTREGADO:   { backgroundColor: '#046A38', color: '#ffffff' },
  DEVUELTO:    { backgroundColor: '#DF1995', color: '#ffffff' },
  CANCELADO:   { backgroundColor: '#97999B', color: '#ffffff' },
}

export default function EnvioCard({ envio, onSelect, isSelected }) {
  const borderColor = isSelected ? '#046A38' : '#009A44'

  return (
    <div
      onClick={onSelect}
      className="bg-white rounded-lg p-4 shadow cursor-pointer transition-all mb-3"
      style={{ borderLeft: `4px solid ${borderColor}` }}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="font-mono font-bold text-sm text-gray-800">{envio.codigo}</p>
          <p className="text-sm mt-1" style={{ color: '#97999B' }}>{envio.descripcion}</p>
        </div>
        <span
          className="text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap"
          style={BADGE_ESTILO[envio.estado] || { backgroundColor: '#97999B', color: '#ffffff' }}
        >
          {envio.estado}
        </span>
      </div>
    </div>
  )
}
