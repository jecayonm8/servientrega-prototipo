# 🚚 Servientrega — Prototipo Funcional

**Proyecto Final · Administración de Infraestructura de TI**
Universidad del Quindío · Grupo 01D · Período 2026-1

---

## 📁 Estructura del proyecto

```
servientrega-prototipo/
├── docker-compose.yml          ← Servicios base (Postgres, Redis, MQTT)
├── db/
│   └── init.sql                ← Esquema y datos de prueba (se ejecuta automático)
├── mosquitto/
│   └── config/
│       └── mosquitto.conf      ← Configuración del broker MQTT
├── simulator/
│   ├── gps_simulator.py        ← Simulador GPS (reemplaza hardware físico)
│   └── requirements.txt        ← Dependencia: paho-mqtt
├── backend/
│   ├── server.js               ← Servidor Express (punto de entrada)
│   ├── db.js                   ← Conexión a PostgreSQL
│   ├── redis-client.js         ← Conexión a Redis
│   ├── mqtt-subscriber.js      ← Recibe GPS vía MQTT y guarda en BD
│   ├── routes/
│   │   ├── envios.js           ← Endpoints Track & Trace
│   │   ├── tms.js              ← Endpoints TMS (rutas y vehículos)
│   │   └── wms.js              ← Endpoints WMS (bodegas)
│   ├── package.json
│   └── .env                    ← Variables de entorno (BD, Redis, MQTT)
├── frontend/
│   ├── index.html              ← HTML base (Tailwind + Leaflet CDN)
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── App.jsx             ← Hash-router + vista home
│       ├── services/api.js     ← Funciones fetch al backend
│       └── components/
│           ├── EnvioCard.jsx   ← Tarjeta de envío con botón "Ver detalle"
│           ├── EnvioDetail.jsx ← Vista detalle: mapa + badge + notificaciones
│           └── MapView.jsx     ← Mapa Leaflet con botón "Centrar"
└── postman/
    └── servientrega-prototipo.postman_collection.json
```

---

## ✅ Requisitos previos

Instala estas herramientas antes de empezar:

| Herramienta | Versión mínima | Descarga |
|---|---|---|
| Docker Desktop | 20+ | https://www.docker.com/products/docker-desktop |
| Node.js | 18+ | https://nodejs.org |
| Python | 3.10+ | https://www.python.org |
| Postman (desktop) | cualquiera | https://www.postman.com/downloads |

> **Importante:** Instala la app de escritorio de Postman, NO uses la versión web.
> La versión web no puede hacer peticiones a `localhost`.

---

## 🚀 Configuración desde cero en un PC nuevo

Sigue estos pasos en orden exacto.

---

### PASO 1 — Clonar o copiar el proyecto

Si recibes el proyecto como carpeta comprimida, descomprímela en una ubicación sin espacios en la ruta, por ejemplo:
```
C:\Users\tuusuario\Documents\servientrega-prototipo\
```

---

### PASO 2 — Configurar las variables de entorno del backend

Entra a la carpeta `backend/` y verifica que exista el archivo `.env`.
Si no existe, créalo con este contenido:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USER=servi_admin
DB_PASSWORD=servi_pass_2026
DB_NAME=servientrega_db

REDIS_HOST=localhost
REDIS_PORT=6379

MQTT_BROKER=mqtt://localhost:1883
```

> **Si estás en Windows y tienes PostgreSQL instalado localmente** (conflicto de puertos),
> lee la sección **⚠️ Solución de problemas** al final de este archivo.

---

### PASO 3 — Levantar los servicios Docker

1. Abre Docker Desktop y espera a que el ícono de la ballena esté en verde (**Running**)
2. Abre una terminal en la carpeta raíz del proyecto
3. Ejecuta:

```bash
docker compose up -d
```

Este comando levanta los 3 servicios al mismo tiempo:
- **PostgreSQL** — base de datos (puerto 5432)
- **Redis** — caché de coordenadas GPS (puerto 6379)
- **Mosquitto** — broker MQTT para recibir el GPS (puerto 1883)

La primera vez descarga las imágenes (puede tardar unos minutos según la conexión).
Las siguientes veces arranca en segundos.

Verifica que quedaron corriendo:
```bash
docker compose ps
```

Debes ver los 3 contenedores con estado `running`. El de postgres además dice `(healthy)`.

---

### PASO 4 — Instalar dependencias y arrancar el backend

Abre una **nueva terminal** (Terminal 1):

```bash
cd backend
npm install
npm run dev
```

Deberías ver exactamente esto (sin errores):
```
════════════════════════════════════════════════════
🚀 Servidor Servientrega corriendo en http://localhost:3000
════════════════════════════════════════════════════
✅ Redis conectado
✅ PostgreSQL conectado
✅ MQTT conectado
📡 Suscrito al topic: servientrega/flota/gps
```

Verifica que funciona abriendo en el navegador:
```
http://localhost:3000/envios
```
Debe mostrar los 3 envíos de prueba (`SRV-12345`, `SRV-12346`, `SRV-12347`).

---

### PASO 5 — Instalar dependencias y arrancar el frontend

Abre una **nueva terminal** (Terminal 2):

```bash
cd frontend
npm install
npm run dev
```

Deberías ver:
```
  VITE v5.x.x  ready in XXX ms
  ➜  Local:   http://localhost:5173/
```

Abre en el navegador:
```
http://localhost:5173
```

Debes ver la app con el header verde de Servientrega y las 3 tarjetas de envíos.

---

### PASO 6 — Importar la colección en Postman

1. Abre la app de escritorio de Postman
2. Clic en **Import** (esquina superior izquierda o `Ctrl+O`)
3. Selecciona el archivo: `postman/servientrega-prototipo.postman_collection.json`
4. La colección aparece en el panel izquierdo

**Configurar la variable `base_url`:**
1. En el panel izquierdo, clic en **Environments**
2. Clic en **+** para crear un entorno nuevo
3. Nombre: `Servientrega Local`
4. Agrega la variable:
   - Variable: `base_url` — Current Value: `http://localhost:3000`
5. Clic en **Save**
6. En la esquina superior derecha de Postman, donde dice **"No Environment"**, selecciona `Servientrega Local`

---

### PASO 7 — Instalar dependencia del simulador GPS

Solo necesitas hacer esto una vez:

```bash
cd simulator
pip install -r requirements.txt
```

El simulador se corre manualmente cuando quieres demostrar el flujo GPS (ver sección siguiente).

---

## 🎯 Flujo completo de la demo

Con backend y frontend corriendo, sigue esta secuencia para demostrar el caso de uso completo.

### Resetear el estado inicial (antes de cada demo)

```bash
curl -X PUT http://localhost:3000/envios/SRV-12345/estado ^
  -H "Content-Type: application/json" ^
  -d "{\"estado\": \"EN_BODEGA\"}"
```

### Ejecutar los pasos en Postman

Abre la carpeta **"Flujo completo — Caso de uso demo"** y ejecuta en orden:

| Paso | Request en Postman | Resultado esperado |
|---|---|---|
| 1 | PASO 1 — Crear envío SRV-12345 | Si ya existe, **omítelo** y sigue al 2 |
| 2 | PASO 2 — Ingresar paquete a bodega Armenia | `"message": "Envío ingresado a bodega"` |
| 3 | PASO 3 — Clasificar paquete en bodega | Estado → `CLASIFICADO` |
| 4 | PASO 4 — Juan Manuel crea ruta en TMS | Ruta TRK-001 creada |
| 5 | PASO 5 — WMS despacha el paquete | Estado → `DESPACHADO` |

### Abrir la vista de seguimiento en el navegador

```
http://localhost:5173/#/envio/SRV-12345
```

Debe mostrar el badge **📤 DESPACHADO** y el mensaje "El envío aún está en bodega" en el mapa.

### Correr el simulador GPS (Terminal 3)

```bash
cd simulator
python gps_simulator.py
```

El simulador publica 30 coordenadas GPS cada 5 segundos, simulando el recorrido Armenia → Pereira.

**Lo que verás en tiempo real:**
- **Terminal 1 (backend):** imprime cada coordenada GPS recibida por MQTT
- **Terminal 3 (simulador):** muestra el progreso del recorrido
- **Navegador:** el badge cambia a 🚚 `EN_TRANSITO`, el marcador verde aparece en el mapa. Usa el botón **📍 Centrar** si el marcador queda fuera del área visible
- Al finalizar los 30 pasos: badge cambia a ✅ `ENTREGADO`

---

## 🌐 Endpoints disponibles

### Track & Trace — Envíos

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/envios` | Listar todos los envíos |
| GET | `/envios/:codigo` | Detalle de un envío |
| GET | `/envios/:codigo/ubicacion` | Última ubicación GPS (Redis → PostgreSQL) |
| GET | `/envios/:codigo/historial` | Recorrido GPS completo |
| GET | `/envios/:codigo/notificaciones` | Notificaciones del envío |
| POST | `/envios` | Crear nuevo envío |
| PUT | `/envios/:codigo/estado` | Cambiar estado manualmente |
| PUT | `/envios/:codigo/ubicacion` | Registrar coordenada GPS manual |

**Estados válidos:** `EN_BODEGA` · `CLASIFICADO` · `DESPACHADO` · `EN_TRANSITO` · `ENTREGADO` · `DEVUELTO` · `CANCELADO`

### TMS — Transportation Management

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/tms/rutas` | Listar todas las rutas |
| GET | `/tms/rutas/:envio_codigo` | Ruta de un envío específico |
| POST | `/tms/rutas` | Crear ruta y asignar vehículo |
| GET | `/tms/vehiculos` | Vehículos en tránsito con última posición |

### WMS — Warehouse Management

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/wms/bodegas` | Listar bodegas con conteo de envíos |
| GET | `/wms/bodegas/:id` | Detalle de bodega + envíos dentro |
| POST | `/wms/bodega/entrada` | Registrar ingreso de paquete a bodega |
| PUT | `/wms/bodega/:envio_codigo/estado` | Cambiar estado en bodega (ej: CLASIFICADO) |
| PUT | `/wms/bodega/salida` | Despachar paquete (→ DESPACHADO) |

---

## 🛠 Comandos útiles

```bash
# Verificar contenedores Docker
docker compose ps

# Ver logs de un contenedor específico
docker compose logs postgres
docker compose logs redis

# Conectarse a la base de datos directamente
docker exec -it servi_postgres psql -U servi_admin -d servientrega_db

# Ver los últimos 10 puntos de tracking GPS
docker exec -it servi_postgres psql -U servi_admin -d servientrega_db \
  -c "SELECT codigo, lat, lng, velocidad_kmh, timestamp FROM tracking t JOIN envios e ON e.id = t.envio_id ORDER BY timestamp DESC LIMIT 10;"

# Ver estado actual de todos los envíos
docker exec -it servi_postgres psql -U servi_admin -d servientrega_db \
  -c "SELECT codigo, estado, updated_at FROM envios ORDER BY updated_at DESC;"

# Resetear el estado de SRV-12345 para volver a demostrar el flujo
curl -X PUT http://localhost:3000/envios/SRV-12345/estado \
  -H "Content-Type: application/json" \
  -d "{\"estado\": \"EN_BODEGA\"}"

# Borrar tracking anterior (limpiar historial GPS para demo fresca)
docker exec -it servi_postgres psql -U servi_admin -d servientrega_db \
  -c "DELETE FROM tracking WHERE envio_id = (SELECT id FROM envios WHERE codigo = 'SRV-12345');"

# Detener los contenedores (conserva los datos)
docker compose down

# Detener y borrar todos los datos (reset total de BD)
docker compose down -v
```

---

## ⚠️ Solución de problemas

### El backend no conecta a PostgreSQL en Windows

**Síntoma:** El backend arranca pero aparece `password authentication failed` o `connect ECONNREFUSED`.

**Causa:** Windows puede tener un PostgreSQL local instalado que escucha en `localhost:5432` con prioridad sobre el contenedor Docker. El backend llega al postgres local (que no tiene el usuario `servi_admin`) y falla.

**Diagnóstico** — ejecuta en PowerShell:
```powershell
netstat -ano | Select-String ":5432"
```
Si ves **dos procesos distintos** en el puerto 5432, hay conflicto.

**Solución:**

1. Obtén la IP del subsistema WSL2 (donde viven los contenedores Docker):
```powershell
wsl hostname -I
```
Copia el primer valor, por ejemplo `172.31.233.211`.

2. Edita `backend/.env` y cambia:
```env
DB_HOST=172.31.233.211
```

3. Reinicia el backend. El mensaje `✅ PostgreSQL conectado` debe aparecer.

> **Nota:** esta IP puede cambiar si reinicias Docker Desktop o WSL2.
> Si el problema vuelve, repite el paso 1 y actualiza el `.env`.

---

### Postman no envía las peticiones (queda cargando)

**Causa A:** Estás usando la versión web de Postman (`web.postman.co`). La versión web no puede alcanzar `localhost`. Instala y usa la **app de escritorio**.

**Causa B:** La variable `{{base_url}}` no está resuelta. Verifica que en la esquina superior derecha de Postman esté seleccionado el entorno `Servientrega Local` (no "No Environment").

---

### El simulador GPS falla al conectar

**Síntoma:** `❌ Error: el broker MQTT no está corriendo.`

**Causa:** El contenedor `servi_mosquitto` no está corriendo o no es accesible.

**Solución:**
```bash
docker compose ps          # verifica que servi_mosquitto esté running
docker compose up -d       # si no está, levántalo
```

---

### El mapa no muestra el marcador durante la simulación

**Síntoma:** El badge cambia a EN_TRANSITO pero el mapa parece vacío.

**Solución:** Usa el botón **📍 Centrar** que aparece en la esquina superior derecha del mapa. El marcador sí está en el mapa pero puede estar fuera del área visible si el mapa quedó en la vista por defecto.

---

## 👥 Distribución del equipo

| Integrante | Responsabilidad |
|---|---|
| Samuel Castaño | Backend + Base de datos (`backend/`, `db/`) |
| Neyder Ruiz | Simulador GPS + Packet Tracer SD-WAN (`simulator/`) |
| Juan Esteban Cayón | PWA — React + Vite + Leaflet + Tailwind (`frontend/`) |
| Juan Manuel Flor | TMS/WMS + Integración API + Documentación |

---

## 📝 Notas del prototipo

- El dispositivo GPS físico fue reemplazado por un simulador en Python por restricciones de tiempo y costo. Los datos llegan al backend de forma idéntica a un GPS real.
- El simulador publica una coordenada cada 5 segundos sobre el recorrido Armenia → Pereira (~48 km).
- La red SD-WAN se simula en **Cisco Packet Tracer** de forma independiente para la demo.
- El frontend usa un hash-router propio (`#/envio/SRV-12345`) sin dependencias adicionales, ya que React Router no está incluido en el proyecto.
- La ubicación GPS se cachea en Redis con TTL de 120 segundos para reducir consultas a PostgreSQL.
