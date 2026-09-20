-- notx: recreación de tabla, ver runMigrationWithoutForeignKeys en db.go
-- Los tipos de NPC pasan a ser por campaña (npc_types). npcs.npc_kind guarda la key del tipo
-- (la misma que `tipo` en el vault) y deja de tener CHECK; 'referencia' queda reservado por el sistema.
CREATE TABLE npc_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    label TEXT NOT NULL,
    color TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    UNIQUE (campaign_id, key)
);

INSERT INTO npc_types (campaign_id, key, label, color, position)
SELECT c.id, d.key, d.label, d.color, d.position
FROM campaigns c
CROSS JOIN (
    SELECT 'npc' AS key, 'Humano' AS label, '#c79a55' AS color, 0 AS position
    UNION ALL SELECT 'spren', 'Spren', '#6fa98c', 1
    UNION ALL SELECT 'entidad-cognitiva', 'Ent. cognitiva', '#a87c9b', 2
) d;

CREATE TABLE npcs_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    npc_kind TEXT NOT NULL,
    detail_level TEXT NOT NULL CHECK (detail_level IN ('full', 'minor')),
    status TEXT NOT NULL CHECK (status IN ('vivo', 'muerto', 'desaparecido', 'activo', 'consolidado', 'paused')),
    location_id INTEGER REFERENCES locations(id) ON DELETE RESTRICT,
    etnia TEXT,
    rol TEXT,
    tipo_spren TEXT,
    description TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    obsidian_path TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    attributes TEXT NOT NULL DEFAULT '{}',
    skills TEXT NOT NULL DEFAULT '{}',
    image_path TEXT,
    UNIQUE (campaign_id, obsidian_path)
);

INSERT INTO npcs_new SELECT * FROM npcs;

DROP TABLE npcs;

ALTER TABLE npcs_new RENAME TO npcs;
