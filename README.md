# 🚚 Servientrega — Prototipo Funcional

**Proyecto Final · Administración de Infraestructura de TI**
Universidad del Quindío · Grupo 01D · Período 2026-1

---

## 📁 Estructura del proyecto

```
servientrega-prototipo/
├── docker-compose.yml          ← Servicios base (Postgres, Redis, MQTT)
├── db/
│   └── init.sql                ← Esquema y datos de prueba
├── mosquitto/
│   └── config/
│       └── mosquitto.conf      ← Config del broker MQTT
├── simulator/
│   ├── gps_simulator.py        ← Simulador GPS (reemplaza hardware físico)
│   └── requirements.txt
└── backend/
    ├── server.js               ← Servidor Express
    ├── db.js                   ← Conexión PostgreSQL
    ├── mqtt-subscriber.js      ← Recibe GPS y guarda en BD
    ├── routes/envios.js        ← Endpoints REST
    ├── package.json
    └── .env
```

---

## ✅ Requisitos previos

| Herramienta | Versión | Para qué |
|---|---|---|
| Docker Desktop | 20+ | Levantar Postgres + Redis + Mosquitto |
| Node.js | 18+ | Correr el backend |
| Python | 3.10+ | Correr el simulador GPS |

---

## 🚀 Cómo levantar todo (en orden)

### Paso 1 — Levantar la infraestructura base

```bash
cd servientrega-prototipo
docker compose up -d
```

Verifica que los 3 contenedores estén corriendo:
```bash
docker ps
```

Debes ver: `servi_postgres`, `servi_redis`, `servi_mosquitto`

### Paso 2 — Arrancar el backend

```bash
cd backend
npm install
npm start
```

Deberías ver:
```
✅ PostgreSQL conectado
✅ MQTT conectado
📡 Suscrito al topic: servientrega/flota/gps
🚀 Servidor Servientrega corriendo en http://localhost:3000
```

### Paso 3 — Probar el API

Abre el navegador en `http://localhost:3000/envios` — debes ver los 3 envíos de prueba.

### Paso 4 — Correr el simulador GPS (en otra terminal)

```bash
cd simulator
pip install -r requirements.txt
python gps_simulator.py
```

Verás cómo el camión "se mueve" entre Armenia y Pereira, y el backend recibe las coordenadas en tiempo real.

### Paso 5 — Verificar la ubicación actualizada

```bash
curl http://localhost:3000/envios/SRV-12345/ubicacion
```

---

## 🎯 Endpoints disponibles

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/envios` | Listar todos los envíos |
| GET | `/envios/:codigo` | Detalle de un envío |
| GET | `/envios/:codigo/ubicacion` | Última ubicación GPS |
| GET | `/envios/:codigo/historial` | Recorrido completo |
| GET | `/envios/:codigo/notificaciones` | Notificaciones generadas |
| POST | `/envios` | Crear nuevo envío |

---

## 🛠 Comandos útiles

```bash
# Ver logs del backend en tiempo real
cd backend && npm start

# Conectarse a la BD
docker exec -it servi_postgres psql -U servi_admin -d servientrega_db

# Ver tracking en BD
docker exec -it servi_postgres psql -U servi_admin -d servientrega_db \
  -c "SELECT * FROM tracking ORDER BY timestamp DESC LIMIT 10;"

# Detener todo
docker compose down

# Detener y borrar datos (reset total)
docker compose down -v
```

---

## 👥 Distribución del equipo

| Integrante | Responsabilidad |
|---|---|
| Samuel Castaño | Backend + BD (carpetas `backend/` y `db/`) |
| Neyder Ruiz | Simulador GPS + Packet Tracer SD-WAN (carpeta `simulator/`) |
| Juan Esteban Cayón | App móvil Flutter + Notificaciones FCM |
| Juan Manuel Flor | TMS/WMS + Integración API + Documentación |

---

## 📝 Notas importantes

- **El dispositivo GPS físico fue reemplazado por un simulador en software**
  por restricciones de tiempo. Los datos llegan al backend de forma idéntica.
- El simulador publica una coordenada cada 5 segundos (configurable en
  `gps_simulator.py`).
- Para que la app móvil se conecte, debe apuntar a la IP local del PC
  donde corre el backend (no `localhost`).
- La red SD-WAN se simula aparte en **Cisco Packet Tracer** para la demo.
