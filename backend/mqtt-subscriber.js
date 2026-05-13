// ════════════════════════════════════════════════════════════
// MQTT Subscriber — Recibe coordenadas GPS del simulador
// y las guarda en PostgreSQL + cachea última posición en Redis
// ════════════════════════════════════════════════════════════

const mqtt   = require('mqtt');
const db     = require('./db');
const redis  = require('./redis-client');
require('dotenv').config();

const BROKER = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
const TOPIC  = 'servientrega/flota/gps';
const GPS_TTL_SEG = 120; // La caché expira si no llegan más mensajes

const client = mqtt.connect(BROKER);

client.on('connect', () => {
  console.log('✅ MQTT conectado');
  client.subscribe(TOPIC, (err) => {
    if (!err) console.log(`📡 Suscrito al topic: ${TOPIC}`);
    else console.error('❌ Error suscripción MQTT:', err.message);
  });
});

client.on('error', (err) => console.error('❌ Error MQTT:', err.message));

client.on('message', async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    console.log(
      `📍 GPS │ ${data.envio_codigo} │ ` +
      `lat=${data.lat} lng=${data.lng} │ ${data.velocidad_kmh} km/h` +
      (data.entregado ? ' │ ✅ ENTREGADO' : '')
    );

    const envioResult = await db.query(
      'SELECT id, estado FROM envios WHERE codigo = $1',
      [data.envio_codigo]
    );
    if (envioResult.rows.length === 0) {
      console.warn(`⚠️  Envío ${data.envio_codigo} no encontrado en BD`);
      return;
    }
    const envio = envioResult.rows[0];

    // Insertar registro de tracking
    await db.query(
      `INSERT INTO tracking (envio_id, lat, lng, velocidad_kmh, vehiculo)
       VALUES ($1, $2, $3, $4, $5)`,
      [envio.id, data.lat, data.lng, data.velocidad_kmh, data.vehiculo]
    );

    // ── Cambio de estado EN_BODEGA o DESPACHADO → EN_TRANSITO ─
    if (['EN_BODEGA', 'DESPACHADO'].includes(envio.estado)) {
      await db.query(
        `UPDATE envios SET estado = 'EN_TRANSITO', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [envio.id]
      );
      await db.query(
        `INSERT INTO notificaciones (envio_id, tipo, mensaje) VALUES ($1, 'SALIDA', $2)`,
        [envio.id, `Tu envío ${data.envio_codigo} ha salido de bodega`]
      );
      console.log('   ➜ Estado: EN_TRANSITO');
    }

    // ── Cambio de estado EN_TRANSITO → ENTREGADO ──────────
    if (data.entregado && envio.estado !== 'ENTREGADO') {
      await db.query(
        `UPDATE envios SET estado = 'ENTREGADO', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [envio.id]
      );
      await db.query(
        `INSERT INTO notificaciones (envio_id, tipo, mensaje) VALUES ($1, 'ENTREGA', $2)`,
        [envio.id, `Tu envío ${data.envio_codigo} fue entregado exitosamente`]
      );
      // Eliminar caché — ya no hay posición "en movimiento"
      await redis.del(`gps:${data.envio_codigo}`);
      console.log('   ➜ Estado: ENTREGADO ✅');
      return;
    }

    // ── Cachear última posición en Redis ──────────────────
    const cachePayload = JSON.stringify({
      lat:           data.lat,
      lng:           data.lng,
      velocidad_kmh: data.velocidad_kmh,
      vehiculo:      data.vehiculo,
      timestamp:     new Date().toISOString(),
    });
    await redis.set(`gps:${data.envio_codigo}`, cachePayload, { EX: GPS_TTL_SEG });

  } catch (err) {
    console.error('❌ Error procesando mensaje MQTT:', err.message);
  }
});

module.exports = client;
