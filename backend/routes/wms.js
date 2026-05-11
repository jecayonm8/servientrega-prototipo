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

module.exports = router;
