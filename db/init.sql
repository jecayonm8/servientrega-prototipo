-- ════════════════════════════════════════════════════════════
-- Servientrega — Esquema de Base de Datos del Prototipo
-- Se ejecuta automáticamente al crear el contenedor PostgreSQL
-- ════════════════════════════════════════════════════════════

-- Tabla principal de envíos
CREATE TABLE IF NOT EXISTS envios (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    origen VARCHAR(100) NOT NULL,
    destino VARCHAR(100) NOT NULL,
    estado VARCHAR(30) DEFAULT 'EN_BODEGA',
    cliente VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de tracking GPS (historial de ubicaciones)
CREATE TABLE IF NOT EXISTS tracking (
    id SERIAL PRIMARY KEY,
    envio_id INTEGER REFERENCES envios(id) ON DELETE CASCADE,
    lat NUMERIC(10, 7) NOT NULL,
    lng NUMERIC(10, 7) NOT NULL,
    velocidad_kmh NUMERIC(5, 2),
    vehiculo VARCHAR(20),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tracking_envio
    ON tracking(envio_id, timestamp DESC);

-- Tabla de bodegas (WMS)
CREATE TABLE IF NOT EXISTS bodegas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    ciudad VARCHAR(50) NOT NULL,
    capacidad_m2 INTEGER
);

-- Tabla de rutas TMS
CREATE TABLE IF NOT EXISTS rutas (
    id SERIAL PRIMARY KEY,
    envio_id INTEGER REFERENCES envios(id) ON DELETE CASCADE,
    vehiculo VARCHAR(20) NOT NULL,
    distancia_km NUMERIC(7, 2),
    tiempo_estimado_min INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
    id SERIAL PRIMARY KEY,
    envio_id INTEGER REFERENCES envios(id) ON DELETE CASCADE,
    tipo VARCHAR(30) NOT NULL,
    mensaje TEXT NOT NULL,
    enviada BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ════════════════════════════════════════════════════════════
-- Datos de prueba para la demo
-- ════════════════════════════════════════════════════════════

INSERT INTO bodegas (nombre, ciudad, capacidad_m2) VALUES
    ('Bodega Central Armenia', 'Armenia', 5000),
    ('Bodega Pereira', 'Pereira', 4500),
    ('Bodega Bogotá Norte', 'Bogotá', 12000)
ON CONFLICT DO NOTHING;

INSERT INTO envios (codigo, origen, destino, estado, cliente) VALUES
    ('SRV-12345', 'Armenia', 'Pereira', 'EN_BODEGA', 'Juan Pérez'),
    ('SRV-12346', 'Armenia', 'Bogotá', 'EN_BODEGA', 'María Gómez'),
    ('SRV-12347', 'Pereira', 'Armenia', 'EN_BODEGA', 'Carlos Ruiz')
ON CONFLICT (codigo) DO NOTHING;
