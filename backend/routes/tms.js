// ════════════════════════════════════════════════════════════
// TMS — Transportation Management System
// Gestión de rutas y despacho vehicular
// ════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const db = require('../db');

// ─── GET /tms/rutas — Listar todas las rutas ──────────────
router.get('/rutas', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.id, e.codigo AS envio_codigo, e.origen, e.destino,
              e.estado, r.vehiculo, r.distancia_km,
              r.tiempo_estimado_min, r.created_at
       FROM rutas r
       JOIN envios e ON e.id = r.envio_id
       ORDER BY r.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /tms/rutas/:envio_codigo — Ruta de un envío ──────
router.get('/rutas/:envio_codigo', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.id, e.codigo AS envio_codigo, e.origen, e.destino,
              e.estado, r.vehiculo, r.distancia_km,
              r.tiempo_estimado_min, r.created_at
       FROM rutas r
       JOIN envios e ON e.id = r.envio_id
       WHERE e.codigo = $1
       ORDER BY r.created_at DESC`,
      [req.params.envio_codigo]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ruta no encontrada para ese envío' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /tms/rutas — Crear ruta para un envío ───────────
router.post('/rutas', async (req, res) => {
  const { envio_codigo, vehiculo, distancia_km, tiempo_estimado_min } = req.body;
  if (!envio_codigo || !vehiculo) {
    return res.status(400).json({ error: 'Faltan campos requeridos: envio_codigo, vehiculo' });
  }
  try {
    const envioResult = await db.query(
      'SELECT id FROM envios WHERE codigo = $1',
      [envio_codigo]
    );
    if (envioResult.rows.length === 0) {
      return res.status(404).json({ error: 'Envío no encontrado' });
    }
    const envioId = envioResult.rows[0].id;

    const result = await db.query(
      `INSERT INTO rutas (envio_id, vehiculo, distancia_km, tiempo_estimado_min)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [envioId, vehiculo, distancia_km || null, tiempo_estimado_min || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /tms/vehiculos — Vehículos activos en tránsito ───
router.get('/vehiculos', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT DISTINCT r.vehiculo,
              e.codigo AS envio_codigo, e.origen, e.destino, e.estado,
              t.lat, t.lng, t.velocidad_kmh, t.timestamp AS ultima_posicion
       FROM rutas r
       JOIN envios e ON e.id = r.envio_id
       LEFT JOIN LATERAL (
         SELECT lat, lng, velocidad_kmh, timestamp
         FROM tracking
         WHERE envio_id = e.id
         ORDER BY timestamp DESC
         LIMIT 1
       ) t ON true
       WHERE e.estado = 'EN_TRANSITO'`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
