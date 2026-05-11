// ════════════════════════════════════════════════════════════
// Servientrega Backend — Punto de entrada
// Universidad del Quindío · Adm. Infraestructura TI · 2026-1
// ════════════════════════════════════════════════════════════

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const enviosRoutes = require('./routes/envios');
require('./mqtt-subscriber'); // Inicia el subscriber MQTT

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ─── Endpoint raíz ────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    message: '🚚 Servientrega API — Prototipo Adm. Infraestructura TI',
    version: '1.0.0',
    universidad: 'Universidad del Quindío',
    grupo: '01D · Período 2026-1',
    endpoints: {
      listar_envios:     'GET  /envios',
      detalle_envio:     'GET  /envios/:codigo',
      ubicacion_actual:  'GET  /envios/:codigo/ubicacion',
      historial:         'GET  /envios/:codigo/historial',
      notificaciones:    'GET  /envios/:codigo/notificaciones',
      crear_envio:       'POST /envios'
    }
  });
});

// ─── Rutas de envíos ──────────────────────────────────────
app.use('/envios', enviosRoutes);

// ─── Manejo de errores ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error servidor:', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ─── Arranque del servidor ────────────────────────────────
app.listen(PORT, () => {
  console.log('═'.repeat(60));
  console.log(`🚀 Servidor Servientrega corriendo en http://localhost:${PORT}`);
  console.log('═'.repeat(60));
});
