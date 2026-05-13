// ════════════════════════════════════════════════════════════
// WMS — Warehouse Management System
// Gestión de bodegas e inventario de envíos
// ════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const db = require('../db');

// ─── GET /wms/bodegas — Listar bodegas ────────────────────
router.get('/bodegas', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT b.*,
              COUNT(e.id) AS envios_en_bodega
       FROM bodegas b
       LEFT JOIN envios e
         ON e.origen = b.ciudad AND e.estado = 'EN_BODEGA'
       GROUP BY b.id
       ORDER BY b.nombre`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /wms/bodegas/:id — Detalle + envíos en bodega ────
router.get('/bodegas/:id', async (req, res) => {
  try {
    const bodegaResult = await db.query(
      'SELECT * FROM bodegas WHERE id = $1',
      [req.params.id]
    );
    if (bodegaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bodega no encontrada' });
    }
    const bodega = bodegaResult.rows[0];

    const enviosResult = await db.query(
      `SELECT codigo, destino, cliente, estado, created_at
       FROM envios
       WHERE origen = $1 AND estado = 'EN_BODEGA'
       ORDER BY created_at ASC`,
      [bodega.ciudad]
    );

    res.json({ ...bodega, envios: enviosResult.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /wms/bodegas/:id/ingresar — Ingresar envío ──────
router.post('/bodegas/:id/ingresar', async (req, res) => {
  const { envio_codigo } = req.body;
  if (!envio_codigo) {
    return res.status(400).json({ error: 'Falta envio_codigo' });
  }
  try {
    const bodegaResult = await db.query(
      'SELECT * FROM bodegas WHERE id = $1',
      [req.params.id]
    );
    if (bodegaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bodega no encontrada' });
    }

    const updated = await db.query(
      `UPDATE envios
       SET estado = 'EN_BODEGA', updated_at = CURRENT_TIMESTAMP
       WHERE codigo = $1
       RETURNING *`,
      [envio_codigo]
    );
    if (updated.rows.length === 0) {
      return res.status(404).json({ error: 'Envío no encontrado' });
    }

    await db.query(
      `INSERT INTO notificaciones (envio_id, tipo, mensaje)
       VALUES ($1, 'INGRESO_BODEGA', $2)`,
      [updated.rows[0].id,
       `Envío ${envio_codigo} ingresado a ${bodegaResult.rows[0].nombre}`]
    );

    res.json({ message: 'Envío ingresado a bodega', envio: updated.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /wms/bodegas/:id/despachar — Despachar envío ────
router.post('/bodegas/:id/despachar', async (req, res) => {
  const { envio_codigo } = req.body;
  if (!envio_codigo) {
    return res.status(400).json({ error: 'Falta envio_codigo' });
  }
  try {
    const bodegaResult = await db.query(
      'SELECT * FROM bodegas WHERE id = $1',
      [req.params.id]
    );
    if (bodegaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bodega no encontrada' });
    }

    const updated = await db.query(
      `UPDATE envios
       SET estado = 'DESPACHADO', updated_at = CURRENT_TIMESTAMP
       WHERE codigo = $1 AND estado = 'EN_BODEGA'
       RETURNING *`,
      [envio_codigo]
    );
    if (updated.rows.length === 0) {
      return res.status(404).json({
        error: 'Envío no encontrado o no está en estado EN_BODEGA'
      });
    }

    await db.query(
      `INSERT INTO notificaciones (envio_id, tipo, mensaje)
       VALUES ($1, 'DESPACHO', $2)`,
      [updated.rows[0].id,
       `Envío ${envio_codigo} despachado desde ${bodegaResult.rows[0].nombre}`]
    );

    res.json({ message: 'Envío despachado', envio: updated.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /wms/bodega/entrada — Ingresar envío (flujo simplificado) ──
router.post('/bodega/entrada', async (req, res) => {
  const { envio_codigo, bodega_id } = req.body;
  if (!envio_codigo) {
    return res.status(400).json({ error: 'Falta envio_codigo' });
  }
  try {
    const bodega_id_efectivo = bodega_id || 1;
    const bodegaResult = await db.query(
      'SELECT * FROM bodegas WHERE id = $1',
      [bodega_id_efectivo]
    );
    if (bodegaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bodega no encontrada' });
    }

    const updated = await db.query(
      `UPDATE envios
       SET estado = 'EN_BODEGA', updated_at = CURRENT_TIMESTAMP
       WHERE codigo = $1
       RETURNING *`,
      [envio_codigo]
    );
    if (updated.rows.length === 0) {
      return res.status(404).json({ error: 'Envío no encontrado' });
    }

    await db.query(
      `INSERT INTO notificaciones (envio_id, tipo, mensaje)
       VALUES ($1, 'INGRESO_BODEGA', $2)`,
      [updated.rows[0].id,
       `Envío ${envio_codigo} ingresado a ${bodegaResult.rows[0].nombre}`]
    );

    res.json({ message: 'Envío ingresado a bodega', envio: updated.rows[0], bodega: bodegaResult.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /wms/bodega/salida — Marcar envío como DESPACHADO ─
router.put('/bodega/salida', async (req, res) => {
  const { envio_codigo } = req.body;
  if (!envio_codigo) {
    return res.status(400).json({ error: 'Falta envio_codigo' });
  }
  try {
    const updated = await db.query(
      `UPDATE envios
       SET estado = 'DESPACHADO', updated_at = CURRENT_TIMESTAMP
       WHERE codigo = $1
       RETURNING *`,
      [envio_codigo]
    );
    if (updated.rows.length === 0) {
      return res.status(404).json({ error: 'Envío no encontrado' });
    }

    await db.query(
      `INSERT INTO notificaciones (envio_id, tipo, mensaje)
       VALUES ($1, 'DESPACHO', $2)`,
      [updated.rows[0].id,
       `Envío ${envio_codigo} despachado y listo para tránsito`]
    );

    res.json({ message: 'Envío marcado como DESPACHADO', envio: updated.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /wms/bodega/:envio_codigo/estado — Actualizar estado interno ──
router.put('/bodega/:envio_codigo/estado', async (req, res) => {
  const { estado } = req.body;
  const ESTADOS_WMS = ['EN_BODEGA', 'CLASIFICADO', 'DESPACHADO', 'EN_TRANSITO', 'ENTREGADO', 'DEVUELTO', 'CANCELADO'];
  if (!estado) {
    return res.status(400).json({ error: 'Falta el campo estado' });
  }
  if (!ESTADOS_WMS.includes(estado)) {
    return res.status(400).json({
      error: `Estado inválido. Valores permitidos: ${ESTADOS_WMS.join(', ')}`
    });
  }
  try {
    const updated = await db.query(
      `UPDATE envios
       SET estado = $1, updated_at = CURRENT_TIMESTAMP
       WHERE codigo = $2
       RETURNING *`,
      [estado, req.params.envio_codigo]
    );
    if (updated.rows.length === 0) {
      return res.status(404).json({ error: 'Envío no encontrado' });
    }

    await db.query(
      `INSERT INTO notificaciones (envio_id, tipo, mensaje)
       VALUES ($1, 'CAMBIO_ESTADO', $2)`,
      [updated.rows[0].id,
       `Envío ${req.params.envio_codigo} actualizado a estado ${estado} en bodega`]
    );

    res.json({ message: `Estado actualizado a ${estado}`, envio: updated.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
