// ════════════════════════════════════════════════════════════
// Rutas REST API — Servicio Track & Trace
// ════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const db = require('../db');

// ─── GET /envios — Listar todos ───────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM envios ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /envios/:codigo — Detalle ────────────────────────
router.get('/:codigo', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM envios WHERE codigo = $1',
      [req.params.codigo]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Envío no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /envios/:codigo/ubicacion — Última ubicación ─────
router.get('/:codigo/ubicacion', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT t.lat, t.lng, t.velocidad_kmh, t.vehiculo, t.timestamp
       FROM tracking t
       JOIN envios e ON e.id = t.envio_id
       WHERE e.codigo = $1
       ORDER BY t.timestamp DESC
       LIMIT 1`,
      [req.params.codigo]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sin tracking disponible' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /envios/:codigo/historial — Recorrido completo ───
router.get('/:codigo/historial', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT t.lat, t.lng, t.velocidad_kmh, t.timestamp
       FROM tracking t
       JOIN envios e ON e.id = t.envio_id
       WHERE e.codigo = $1
       ORDER BY t.timestamp ASC`,
      [req.params.codigo]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /envios — Crear nuevo envío ─────────────────────
router.post('/', async (req, res) => {
  const { codigo, origen, destino, cliente } = req.body;
  if (!codigo || !origen || !destino) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }
  try {
    const result = await db.query(
      `INSERT INTO envios (codigo, origen, destino, cliente)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [codigo, origen, destino, cliente]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /envios/:codigo/notificaciones ───────────────────
router.get('/:codigo/notificaciones', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT n.tipo, n.mensaje, n.enviada, n.created_at
       FROM notificaciones n
       JOIN envios e ON e.id = n.envio_id
       WHERE e.codigo = $1
       ORDER BY n.created_at DESC`,
      [req.params.codigo]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
