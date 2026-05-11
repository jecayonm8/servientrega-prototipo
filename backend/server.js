// ════════════════════════════════════════════════════════════
// Servientrega Backend — Punto de entrada
// Universidad del Quindío · Adm. Infraestructura TI · 2026-1
// ════════════════════════════════════════════════════════════

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const enviosRoutes = require('./routes/envios');
const tmsRoutes    = require('./routes/tms');
const wmsRoutes    = require('./routes/wms');
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
      crear_envio:       'POST /envios',
      tms_rutas:         'GET  /tms/rutas',
      tms_ruta_envio:    'GET  /tms/rutas/:envio_codigo',
      tms_crear_ruta:    'POST /tms/rutas',
      tms_vehiculos:     'GET  /tms/vehiculos',
      wms_bodegas:       'GET  /wms/bodegas',
      wms_bodega:        'GET  /wms/bodegas/:id',
      wms_ingresar:      'POST /wms/bodegas/:id/ingresar',
      wms_despachar:     'POST /wms/bodegas/:id/despachar'
    }
  });
});

// ─── Rutas ────────────────────────────────────────────────
app.use('/envios', enviosRoutes);
app.use('/tms',    tmsRoutes);
app.use('/wms',    wmsRoutes);

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
