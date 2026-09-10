-- notx: recreación de tabla, ver runMigrationWithoutForeignKeys en db.go
CREATE TABLE npcs_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    npc_kind TEXT NOT NULL CHECK (npc_kind IN ('npc', 'spren', 'entidad-cognitiva', 'referencia')),
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
    UNIQUE (campaign_id, obsidian_path)
);

INSERT INTO npcs_new SELECT * FROM npcs;

DROP TABLE npcs;

ALTER TABLE npcs_new RENAME TO npcs;
