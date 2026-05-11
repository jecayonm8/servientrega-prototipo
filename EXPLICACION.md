# Explicación del Proyecto — Servientrega GPS Track & Trace

> Universidad del Quindío · Administración de Infraestructura TI · Grupo 01D · 2026-1

El proyecto simula el sistema de rastreo GPS de Servientrega. Un paquete sale de Armenia, viaja a Pereira, y en todo momento se puede ver en tiempo real dónde está. Estas son todas las tecnologías que lo hacen funcionar.

---

## 1. Docker y Docker Compose

**Qué es:** Docker es una herramienta que empaqueta programas dentro de "contenedores" — cajas aisladas que tienen todo lo que el programa necesita para correr, sin importar qué computador uses.

**Cómo funciona:** En lugar de instalar PostgreSQL, Redis y Mosquitto directamente en tu PC (con riesgo de conflictos de versiones, configuraciones distintas entre compañeros, etc.), Docker los corre dentro de contenedores idénticos en cualquier máquina.

**Qué hace en el proyecto:** El archivo `docker-compose.yml` levanta los tres servicios de infraestructura con un solo comando:

```bash
docker compose up -d
```

```
Tu PC
├── Contenedor servi_postgres  → la base de datos
├── Contenedor servi_redis     → el caché
└── Contenedor servi_mosquitto → el broker de mensajes
```

Sin Docker, cada integrante del grupo tendría que instalar y configurar estas tres herramientas manualmente — y probablemente con errores distintos en cada PC.

---

## 2. PostgreSQL

**Qué es:** Un sistema de base de datos relacional. Guarda datos en tablas con filas y columnas, como Excel pero mucho más potente y diseñado para aplicaciones reales.

**Cómo funciona:** Recibe consultas escritas en SQL (`SELECT`, `INSERT`, `UPDATE`) y devuelve los datos correspondientes. Garantiza que los datos no se pierdan ni corrompan aunque el programa falle.

**Qué hace en el proyecto:** Es el almacén permanente de toda la información. Tiene cinco tablas:

| Tabla | Qué guarda |
|---|---|
| `envios` | Cada paquete: código, origen, destino, estado, cliente |
| `tracking` | Cada coordenada GPS recibida (historial completo del recorrido) |
| `bodegas` | Las bodegas físicas: Armenia, Pereira, Bogotá |
| `rutas` | El vehículo asignado, distancia y tiempo estimado de cada envío |
| `notificaciones` | Mensajes generados: "salió de bodega", "fue entregado" |

Cuando el simulador GPS manda una coordenada, esa coordenada termina guardada en la tabla `tracking`. Cuando el front de Flutter pide el historial del recorrido, lo lee desde ahí.

---

## 3. Redis

**Qué es:** Una base de datos en memoria (RAM). Es muchísimo más rápida que PostgreSQL porque no escribe en disco, pero los datos son temporales.

**Cómo funciona:** Guarda pares clave→valor, como un diccionario. `redis.set("gps:SRV-12345", "{lat: 4.6, lng: -75.7}")`. Cualquier programa que tenga acceso puede leer ese valor en microsegundos.

**Qué hace en el proyecto:** Cachea la última posición GPS de cada envío. El flujo es:

```
Flutter pregunta: ¿dónde está SRV-12345?
        │
        ▼
¿Está en Redis (caché)?
   ├── SÍ → responde en ~1ms  ✅
   └── NO → consulta PostgreSQL → responde en ~20ms
```

Esto importa porque el app de Flutter consulta la ubicación cada pocos segundos. Sin Redis, cada consulta iría a la base de datos. Con Redis, 9 de cada 10 consultas se responden desde memoria, sin tocar la BD.

La clave expira automáticamente a los 120 segundos sin nuevas coordenadas (TTL), y se elimina manualmente cuando el envío llega a su destino.

---

## 4. Mosquitto y el protocolo MQTT

**Qué es:** MQTT es un protocolo de mensajería diseñado para IoT (Internet de las Cosas) — dispositivos como sensores, cámaras, y en este caso, GPS. Mosquitto es el programa que actúa como broker (intermediario) de ese protocolo.

**Cómo funciona:** Funciona con el patrón publicador/suscriptor:
- El **publicador** envía mensajes a un *topic* (canal con nombre)
- El **suscriptor** se conecta al mismo topic y recibe esos mensajes automáticamente
- El **broker** (Mosquitto) está en el medio, distribuyendo los mensajes

```
Simulador Python          Mosquitto              Backend Node.js
(publicador)    ───────▶  broker          ───▶   (suscriptor)
                          topic:
                          servientrega/
                          flota/gps
```

**Qué hace en el proyecto:** El simulador publica una coordenada GPS cada 5 segundos. El backend está suscrito al mismo topic y la recibe instantáneamente. Es exactamente como funciona un GPS real en un camión de Servientrega: el dispositivo físico publica, y el servidor escucha.

---

## 5. Node.js + Express (el backend)

**Qué es:** Node.js es un entorno para correr JavaScript fuera del navegador, en el servidor. Express es una librería que simplifica crear APIs web sobre Node.js.

**Cómo funciona:** Escucha peticiones HTTP (GET, POST) en un puerto (3000), las procesa, consulta la base de datos si es necesario, y devuelve una respuesta en formato JSON.

**Qué hace en el proyecto:** Es el cerebro central. Tiene tres responsabilidades:

### A — API REST (lo que consume Flutter y Postman)

| Método | Endpoint | Qué hace |
|---|---|---|
| GET | `/envios` | Lista de paquetes |
| GET | `/envios/:codigo` | Detalle del paquete |
| GET | `/envios/:codigo/ubicacion` | Última posición GPS (desde Redis) |
| GET | `/envios/:codigo/historial` | Recorrido completo (desde PostgreSQL) |
| GET | `/envios/:codigo/notificaciones` | Alertas del paquete |
| POST | `/envios` | Crear nuevo paquete |
| GET | `/tms/rutas` | Rutas de transporte |
| GET | `/tms/vehiculos` | Vehículos en tránsito con su GPS |
| POST | `/tms/rutas` | Asignar vehículo a un envío |
| GET | `/wms/bodegas` | Estado de las bodegas |
| GET | `/wms/bodegas/:id` | Detalle de una bodega + envíos almacenados |
| POST | `/wms/bodegas/:id/ingresar` | Ingresar paquete a bodega |
| POST | `/wms/bodegas/:id/despachar` | Despachar paquete de bodega |

### B — MQTT Subscriber (`mqtt-subscriber.js`)

Corre en paralelo con la API, escucha el broker y procesa cada coordenada GPS que llega:

```
Recibe coordenada → guarda en PostgreSQL (tracking)
                  → guarda en Redis (última posición)
                  → si era EN_BODEGA: cambia a EN_TRANSITO
                  → si entregado=true: cambia a ENTREGADO
```

### C — Gestión de estados del envío

```
EN_BODEGA ──(primera coordenada GPS)──▶ EN_TRANSITO ──(llega al destino)──▶ ENTREGADO
```

---

## 6. Python + paho-mqtt (el simulador GPS)

**Qué es:** Un script Python que reemplaza el dispositivo GPS físico que iría dentro del camión. `paho-mqtt` es la librería que le permite conectarse al broker Mosquitto.

**Cómo funciona:** Calcula 30 posiciones interpoladas entre Armenia (4.5339, -75.6811) y Pereira (4.8133, -75.6961), agrega una pequeña variación aleatoria para simular que no es una línea recta perfecta, y publica cada punto cada 5 segundos.

**Qué hace en el proyecto:** Genera el tráfico GPS que activa toda la cadena:

```json
{
  "vehiculo": "TRK-001",
  "envio_codigo": "SRV-12345",
  "lat": 4.6021234,
  "lng": -75.6834521,
  "velocidad_kmh": 67.3,
  "timestamp": 1746980714,
  "entregado": false
}
```

En el paso 30 envía `"entregado": true`, lo que hace que el backend cambie el estado a `ENTREGADO` y genere la notificación final.

---

## 7. Flutter (app móvil)

**Qué es:** Un framework de Google para crear apps móviles con un solo código que compila para Android e iOS.

**Cómo funciona:** La app hace peticiones HTTP a la API del backend y muestra los datos en pantalla. Para el mapa usa el paquete `google_maps_flutter`.

**Qué hace en el proyecto:** Tiene dos pantallas:
- **Pantalla 1:** Lista de envíos → llama `GET /envios`
- **Pantalla 2:** Mapa en tiempo real → llama `GET /envios/SRV-12345/ubicacion` cada pocos segundos y mueve el marcador en el mapa

---

## El flujo completo de la demo

```
1. docker compose up -d        → levanta PostgreSQL + Redis + Mosquitto

2. npm run dev                 → API escuchando en localhost:3000

3. python gps_simulator.py     → empieza a publicar GPS cada 5 segundos

4. mqtt-subscriber recibe      → guarda en tracking (PostgreSQL)
                               → cachea en Redis
                               → cambia estado a EN_TRANSITO

5. Flutter consulta /ubicacion → backend lee Redis (rápido)
                               → mueve el marcador en el mapa

6. Paso 30 del simulador       → backend recibe entregado=true
                               → estado cambia a ENTREGADO
                               → notificación creada
                               → caché de Redis eliminada
```

Toda la arquitectura imita lo que Servientrega debería tener en producción: dispositivos GPS en los camiones publicando coordenadas, un broker MQTT recibiendo miles de mensajes simultáneos, un backend procesando y almacenando, Redis absorbiendo el volumen de consultas, y una app mostrándolo al cliente final.
