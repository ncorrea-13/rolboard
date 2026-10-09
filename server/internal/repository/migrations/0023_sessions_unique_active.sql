-- notx: recreación de tabla, ver runMigrationWithoutForeignKeys en db.go
CREATE TABLE sessions_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
    arc_id INTEGER REFERENCES arcs(id) ON DELETE RESTRICT,
    session_number INTEGER NOT NULL,
    sub_number INTEGER NOT NULL DEFAULT 0,
    session_type TEXT NOT NULL CHECK (session_type IN ('session', 'interlude', 'planning')),
    date TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    obsidian_path TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    prep_notes TEXT NOT NULL DEFAULT '',
    UNIQUE (campaign_id, obsidian_path)
);

INSERT INTO sessions_new (id, campaign_id, arc_id, session_number, sub_number, session_type, date, summary, obsidian_path, created_at, updated_at, deleted_at, prep_notes)
SELECT id, campaign_id, arc_id, session_number, sub_number, session_type, date, summary, obsidian_path, created_at, updated_at, deleted_at, prep_notes
FROM sessions;

DROP TABLE sessions;

ALTER TABLE sessions_new RENAME TO sessions;

CREATE UNIQUE INDEX sessions_active_number_uq
ON sessions (campaign_id, session_number, sub_number)
WHERE deleted_at IS NULL;
