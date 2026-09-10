CREATE TABLE vault_file_state (
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
    path TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    indexed_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (campaign_id, path)
);
