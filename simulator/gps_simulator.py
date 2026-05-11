"""
════════════════════════════════════════════════════════════
Servientrega — Simulador GPS de Flota Vehicular
Reemplaza el dispositivo GPS físico.
Publica coordenadas vía MQTT al broker Mosquitto.

Universidad del Quindío · Adm. Infraestructura TI · 2026-1
════════════════════════════════════════════════════════════

Uso:
    pip install paho-mqtt
    python gps_simulator.py
"""

import json
import time
import random
import paho.mqtt.client as mqtt

# ─── Configuración MQTT ───────────────────────────────────
MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_TOPIC = "servientrega/flota/gps"

# ─── Ruta de prueba: Armenia → Pereira ────────────────────
ORIGEN  = {"lat": 4.5339, "lng": -75.6811, "ciudad": "Armenia"}
DESTINO = {"lat": 4.8133, "lng": -75.6961, "ciudad": "Pereira"}

# ─── Parámetros del envío ─────────────────────────────────
VEHICULO       = "TRK-001"
ENVIO_CODIGO   = "SRV-12345"
PASOS_TOTAL    = 30   # Actualizaciones GPS a publicar
INTERVALO_SEG  = 5    # Segundos entre actualizaciones


def calcular_posicion(paso: int, total: int) -> tuple[float, float]:
    """Interpola linealmente la posición entre origen y destino."""
    progreso = paso / total
    lat = ORIGEN["lat"] + (DESTINO["lat"] - ORIGEN["lat"]) * progreso
    lng = ORIGEN["lng"] + (DESTINO["lng"] - ORIGEN["lng"]) * progreso
    # Pequeña variación aleatoria para simular ruta real (no línea recta)
    lat += random.uniform(-0.001, 0.001)
    lng += random.uniform(-0.001, 0.001)
    return round(lat, 7), round(lng, 7)


def main() -> None:
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)

    print(f"📡 Conectando al broker MQTT en {MQTT_BROKER}:{MQTT_PORT}...")
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
    except ConnectionRefusedError:
        print("❌ Error: el broker MQTT no está corriendo.")
        print("   Ejecuta primero: docker compose up -d")
        return

    print(f"✅ Conectado. Topic: {MQTT_TOPIC}")
    print(f"🚚 Vehículo: {VEHICULO}  |  Envío: {ENVIO_CODIGO}")
    print(f"📍 Ruta: {ORIGEN['ciudad']} → {DESTINO['ciudad']}")
    print(f"⏱  Actualización cada {INTERVALO_SEG}s ({PASOS_TOTAL} pasos)\n")

    for paso in range(PASOS_TOTAL + 1):
        lat, lng = calcular_posicion(paso, PASOS_TOTAL)
        velocidad = round(random.uniform(50, 80), 1)

        payload = {
            "vehiculo": VEHICULO,
            "envio_codigo": ENVIO_CODIGO,
            "lat": lat,
            "lng": lng,
            "velocidad_kmh": velocidad,
            "timestamp": int(time.time())
        }

        client.publish(MQTT_TOPIC, json.dumps(payload))

        progreso_pct = (paso / PASOS_TOTAL) * 100
        print(f"[{paso:2d}/{PASOS_TOTAL}] {progreso_pct:5.1f}% │ "
              f"lat={lat:10.7f}  lng={lng:10.7f} │ {velocidad:5.1f} km/h")

        if paso == 0:
            print("   ➜ Estado: SALIO_DE_BODEGA 🚚")
        elif paso == PASOS_TOTAL:
            print("   ➜ Estado: ENTREGADO ✅")

        time.sleep(INTERVALO_SEG)

    client.disconnect()
    print("\n🏁 Simulación finalizada correctamente.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n⛔ Simulación detenida por el usuario.")
