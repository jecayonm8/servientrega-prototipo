# 📐 STANDARDS.md — Convenciones del Equipo

**Proyecto Final · Administración de Infraestructura de TI**
Universidad del Quindío · Grupo 01D · Período 2026-1

> Este documento define las reglas que TODOS seguimos para que el código,
> los datos y la comunicación sean consistentes. Sigue estas convenciones
> al pie de la letra para evitar que el prototipo se rompa en la integración.

---

## 1. Stack tecnológico oficial

Estas son las herramientas y versiones acordadas. **No introducir alternativas sin acuerdo del equipo.**

| Capa | Tecnología | Versión |
|---|---|---|
| Backend | Node.js + Express | Node 18+ |
| Base de datos | PostgreSQL | 16 |
| Caché | Redis | 7 |
| Mensajería IoT | Mosquitto MQTT | 2.0 |
| Simulador GPS | Python | 3.10+ |
| Frontend PWA | React + Vite | Vite 5+ |
| Mapa | Leaflet + OpenStreetMap | Leaflet 1.9+ |
| Estilos | Tailwind CSS via CDN | v3 |
| PWA | manifest.json + service-worker.js | — |
| Hosting demo | Netlify drop | — |
| Red simulada | Cisco Packet Tracer | 8.2+ |
| Contenedores | Docker + Docker Compose | Docker Desktop |
| Repo | GitHub | — |

---

## 2. Estructura de carpetas

**No mover ni renombrar las carpetas raíz** del proyecto. Si necesitas agregar algo nuevo, abre un canal de comunicación y se acuerda.

```
servientrega-prototipo/
├── docker-compose.yml      ← NO modificar sin avisar
├── db/                     ← Solo Samuel
├── mosquitto/              ← NO modificar
├── simulator/              ← Solo Neyder
├── backend/                ← Solo Samuel y Juan Manuel
└── frontend/               ← Solo Juan Esteban (PWA)
```

---

## 3. Convenciones de Git

### 3.1 Ramas

| Tipo | Patrón | Ejemplo |
|---|---|---|
| Rama principal | `main` | — |
| Rama de integración | `develop` | — |
| Feature | `feature/<nombre-corto>` | `feature/api-envios` |
| Bugfix | `fix/<nombre-corto>` | `fix/mqtt-reconnect` |

**Nadie hace push directo a `main`.** Todo va por Pull Request a `develop`.

### 3.2 Mensajes de commit

Formato obligatorio en español, en imperativo:

```
<tipo>: <descripción corta>

Tipos válidos:
  feat   → nueva funcionalidad
  fix    → corrección de bug
  docs   → documentación
  refactor → refactorización sin cambio funcional
  chore  → tareas de mantenimiento (deps, config)
```

**Ejemplos correctos:**
```
feat: agregar endpoint de historial de tracking
fix: corregir desconexión MQTT al perder red
docs: actualizar README con instrucciones de Docker
chore: actualizar dependencias de Express
```

**Ejemplos incorrectos:**
```
❌ "cambios"
❌ "wip"
❌ "fixed bug"
❌ "actualizando código"
```

### 3.3 Frecuencia de commits

- Commit mínimo **cada 2 horas de trabajo** o al terminar una sub-tarea.
- Push al final de cada día sin excepción.
- Si algo no compila, NO se hace push a `develop`.

---

## 4. Convenciones de código

### 4.1 Idioma

- **Código (variables, funciones, clases):** inglés
- **Comentarios, logs, mensajes de error visibles al usuario:** español
- **Documentación:** español

### 4.2 Nombres de variables

| Tipo | Estilo | Ejemplo |
|---|---|---|
| Variables y funciones | `camelCase` | `envioId`, `getUltimaUbicacion()` |
| Constantes | `UPPER_SNAKE_CASE` | `MQTT_TOPIC`, `MAX_RETRIES` |
| Clases | `PascalCase` | `EnvioService` |
| Archivos JS/TS | `kebab-case` o `camelCase` | `mqtt-subscriber.js` |
| Archivos Python | `snake_case` | `gps_simulator.py` |

### 4.3 Indentación

- **JavaScript:** 2 espacios
- **Python:** 4 espacios
- **SQL:** 4 espacios
- **YAML/JSON:** 2 espacios

### 4.4 Comentarios

Comentarios solo cuando agregan valor. **No comentar lo obvio.**

```js
// ❌ Mal — comentario inútil
const total = a + b; // suma a y b

// ✅ Bien — explica el porqué, no el qué
// Usamos Redis como caché porque PostgreSQL es lento para queries de tracking
// que se ejecutan cada 5 segundos
const cached = await redis.get(key);
```

---

## 5. Convenciones de API REST

### 5.1 Estructura de endpoints

```
GET    /envios                          ← Listar
GET    /envios/:codigo                  ← Detalle
GET    /envios/:codigo/ubicacion        ← Sub-recurso
POST   /envios                          ← Crear
PUT    /envios/:codigo                  ← Actualizar completo
PATCH  /envios/:codigo                  ← Actualizar parcial
DELETE /envios/:codigo                  ← Eliminar
```

### 5.2 Códigos de estado HTTP

| Código | Cuándo |
|---|---|
| `200 OK` | GET, PUT, PATCH exitosos |
| `201 Created` | POST exitoso |
| `204 No Content` | DELETE exitoso |
| `400 Bad Request` | Datos enviados inválidos |
| `404 Not Found` | Recurso no existe |
| `500 Internal Server Error` | Error del servidor |

### 5.3 Estructura de respuestas

**Respuesta exitosa con datos:**
```json
{
  "codigo": "SRV-12345",
  "estado": "EN_TRANSITO",
  "lat": 4.7236,
  "lng": -75.6886
}
```

**Respuesta de error:**
```json
{
  "error": "Envío no encontrado",
  "codigo": "SRV-99999"
}
```

---

## 6. Convenciones de base de datos

### 6.1 Nombres

| Elemento | Estilo | Ejemplo |
|---|---|---|
| Tablas | `snake_case` plural | `envios`, `tracking` |
| Columnas | `snake_case` singular | `envio_id`, `created_at` |
| Foreign keys | `<tabla>_id` | `envio_id` |
| Índices | `idx_<tabla>_<columnas>` | `idx_tracking_envio` |

### 6.2 Campos obligatorios en toda tabla nueva

```sql
id SERIAL PRIMARY KEY,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

Si la tabla se actualiza:
```sql
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### 6.3 Estados de envíos (enum string)

Usar **siempre** estos valores exactos:

```
EN_BODEGA       ← Estado inicial
EN_TRANSITO     ← GPS empieza a publicar
ENTREGADO       ← Llegó a destino
DEVUELTO        ← Falló entrega
CANCELADO       ← Anulado
```

---

## 7. Convenciones MQTT

### 7.1 Topics

Patrón: `servientrega/<dominio>/<accion>`

| Topic | Quién publica | Quién consume |
|---|---|---|
| `servientrega/flota/gps` | Simulador (Neyder) | Backend (Samuel) |
| `servientrega/envios/eventos` | Backend | PWA (frontend) |
| `servientrega/notificaciones` | Backend | PWA (service-worker) |

### 7.2 Payload

Siempre JSON. Siempre con `timestamp` en formato Unix epoch (segundos).

```json
{
  "vehiculo": "TRK-001",
  "envio_codigo": "SRV-12345",
  "lat": 4.7236,
  "lng": -75.6886,
  "velocidad_kmh": 65.4,
  "timestamp": 1747008000
}
```

---

## 8. Logs y mensajes en consola

Usar prefijos con emojis para identificar rápido qué pasa:

| Prefijo | Significado |
|---|---|
| `✅` | Operación exitosa |
| `❌` | Error |
| `⚠️` | Advertencia |
| `📡` | Evento MQTT |
| `📍` | Coordenada GPS recibida |
| `🚚` | Cambio de estado de envío |
| `🚀` | Arranque del servidor |

**Ejemplo:**
```js
console.log(`✅ PostgreSQL conectado`);
console.log(`📍 GPS │ SRV-12345 │ lat=4.7236 lng=-75.6886`);
console.error(`❌ Error MQTT: ${err.message}`);
```

---

## 9. Variables de entorno

- **Nunca** hardcodear credenciales en el código.
- **Nunca** subir el archivo `.env` real al repo (solo `.env.example`).
- Si agregas una variable nueva al `.env`, actualizar también `.env.example`.

Formato:
```bash
# Una variable por línea
# Sin espacios alrededor del =
DB_HOST=localhost
DB_PORT=5432
```

---

## 10. Comunicación del equipo

### 10.1 Canales

| Canal | Para qué |
|---|---|
| WhatsApp/Discord | Conversación rápida diaria |
| Llamada Meet/Discord | Decisiones, dudas técnicas (15 min máx) |
| GitHub Issues | Bugs encontrados |
| GitHub PR Reviews | Revisar código de otros |

### 10.2 Reuniones obligatorias

| Reunión | Cuándo | Duración |
|---|---|---|
| Daily standup | 9:00 PM cada día | 10 min máx |
| Demo de integración | Fin del Día 3 | 30 min |
| Ensayo sustentación | Día 4 | 1 hora |

### 10.3 Formato del daily

Cada uno responde en el chat 3 preguntas:
1. ¿Qué terminé hoy?
2. ¿Qué voy a hacer mañana?
3. ¿Estoy bloqueado en algo?

---

## 11. Definition of Done — Cuándo una tarea está terminada

Una tarea NO está terminada hasta que cumple TODOS estos puntos:

- [ ] El código corre sin errores en la máquina del autor
- [ ] Se hizo commit con mensaje siguiendo convención
- [ ] Se hizo push a una rama feature
- [ ] Se abrió Pull Request a `develop`
- [ ] Al menos otro integrante revisó el PR
- [ ] El PR fue mergeado a `develop`
- [ ] Se actualizó el README si cambió el comportamiento
- [ ] Se avisó al equipo en el chat

---

## 12. Reglas inquebrantables

🚫 **No** subir archivos `.env` reales al repo
🚫 **No** subir `node_modules/` ni `__pycache__/` (revisa el `.gitignore`)
🚫 **No** hacer commits gigantes ("feat: todo el backend") — divide en commits pequeños
🚫 **No** dejar `console.log("aqui")` o `print("test")` en código que se mergea
🚫 **No** subir credenciales, tokens, API keys, contraseñas en NINGÚN lado
🚫 **No** hacer fuerza push (`git push --force`) a ramas compartidas
🚫 **No** mergear PRs sin que alguien los revise

---

## 13. Plantilla de Pull Request

Cuando abras un PR, usa esta plantilla:

```markdown
## ¿Qué cambia?
Breve descripción de qué hace este PR.

## ¿Por qué?
Razón del cambio (problema que resuelve o feature que agrega).

## ¿Cómo probarlo?
Pasos para que el revisor pueda verificar que funciona.

## Checklist
- [ ] El código corre localmente
- [ ] Se actualizó documentación si aplica
- [ ] No deja logs de debug
- [ ] Cumple las convenciones del STANDARDS.md
```

---

## 14. Responsables por área

Si tienes una duda sobre algún área, contacta al responsable directamente:

| Área | Responsable principal |
|---|---|
| Backend Node.js + BD | Samuel Castaño |
| Simulador GPS + Red SD-WAN | Neyder Ruiz |
| PWA Frontend + Notificaciones push | Juan Esteban Cayón |
| TMS/WMS + Documentación + Postman | Juan Manuel Flor |

---

## 📌 Última actualización

Este documento es vivo. Si proponemos un cambio:
1. Se discute en el grupo
2. Si se aprueba, se actualiza este archivo
3. Se notifica al equipo en el chat principal
