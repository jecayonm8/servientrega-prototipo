// ════════════════════════════════════════════════════════════
// MQTT Subscriber — Recibe coordenadas GPS del simulador
// y las guarda en PostgreSQL
// ════════════════════════════════════════════════════════════

const mqtt = require('mqtt');
const db = require('./db');
require('dotenv').config();

const BROKER = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
const TOPIC = 'servientrega/flota/gps';

const client = mqtt.connect(BROKER);

client.on('connect', () => {
  console.log('✅ MQTT conectado');
  client.subscribe(TOPIC, (err) => {
    if (!err) {
      console.log(`📡 Suscrito al topic: ${TOPIC}`);
    } else {
      console.error('❌ Error suscripción MQTT:', err.message);
    }
  });
});

client.on('error', (err) => {
  console.error('❌ Error MQTT:', err.message);
});

client.on('message', async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    console.log(
      `📍 GPS │ ${data.envio_codigo} │ ` +
      `lat=${data.lat} lng=${data.lng} │ ${data.velocidad_kmh} km/h`
    );

    // Buscar envío por código
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

    // Cambiar estado a EN_TRANSITO si estaba en bodega
    if (envio.estado === 'EN_BODEGA') {
      await db.query(
        `UPDATE envios
         SET estado = 'EN_TRANSITO', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [envio.id]
      );

      // Generar notificación de salida
      await db.query(
        `INSERT INTO notificaciones (envio_id, tipo, mensaje)
         VALUES ($1, 'SALIDA', $2)`,
        [envio.id, `Tu envío ${data.envio_codigo} ha salido de bodega`]
      );

      console.log(`   ➜ Estado actualizado: EN_TRANSITO`);
    }
  } catch (err) {
    console.error('❌ Error procesando mensaje MQTT:', err.message);
  }
});

module.exports = client;
