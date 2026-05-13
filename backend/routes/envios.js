// ════════════════════════════════════════════════════════════
// Rutas REST API — Servicio Track & Trace
// ════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const db     = require('../db');
const redis  = require('../redis-client');

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
    // Intentar desde caché Redis primero
    const cached = await redis.get(`gps:${req.params.codigo}`);
    if (cached) {
      return res.json({ ...JSON.parse(cached), fuente: 'cache' });
    }

    // Fallback a PostgreSQL
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
    res.json({ ...result.rows[0], fuente: 'db' });
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

// ─── PUT /envios/:codigo/estado — Cambiar estado ──────────
const ESTADOS_VALIDOS = [
  'EN_BODEGA', 'CLASIFICADO', 'DESPACHADO',
  'EN_TRANSITO', 'ENTREGADO', 'DEVUELTO', 'CANCELADO'
];

router.put('/:codigo/estado', async (req, res) => {
  const { estado } = req.body;
  if (!estado) {
    return res.status(400).json({ error: 'Falta el campo estado' });
  }
  if (!ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({
      error: `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(', ')}`
    });
  }
  try {
    const result = await db.query(
      `UPDATE envios
       SET estado = $1, updated_at = CURRENT_TIMESTAMP
       WHERE codigo = $2
       RETURNING *`,
      [estado, req.params.codigo]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Envío no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /envios/:codigo/ubicacion — Registrar coordenadas ─
router.put('/:codigo/ubicacion', async (req, res) => {
  const { lat, lng, velocidad_kmh, vehiculo } = req.body;
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Faltan campos requeridos: lat, lng' });
  }
  try {
    const envioResult = await db.query(
      'SELECT id, estado FROM envios WHERE codigo = $1',
      [req.params.codigo]
    );
    if (envioResult.rows.length === 0) {
      return res.status(404).json({ error: 'Envío no encontrado' });
    }
    const envio = envioResult.rows[0];

    // Insertar punto de tracking
    await db.query(
      `INSERT INTO tracking (envio_id, lat, lng, velocidad_kmh, vehiculo)
       VALUES ($1, $2, $3, $4, $5)`,
      [envio.id, lat, lng, velocidad_kmh || null, vehiculo || null]
    );

    // Si estaba EN_BODEGA o DESPACHADO, pasar a EN_TRANSITO automáticamente
    if (['EN_BODEGA', 'DESPACHADO'].includes(envio.estado)) {
      await db.query(
        `UPDATE envios SET estado = 'EN_TRANSITO', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [envio.id]
      );
    }

    // Guardar en caché Redis
    await redis.set(
      `gps:${req.params.codigo}`,
      JSON.stringify({ lat, lng, velocidad_kmh: velocidad_kmh || null, vehiculo: vehiculo || null, timestamp: new Date().toISOString() }),
      { EX: 300 }
    );

    const envioActualizado = await db.query(
      'SELECT * FROM envios WHERE id = $1',
      [envio.id]
    );

    res.json({ message: 'Ubicación registrada', envio: envioActualizado.rows[0] });
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
