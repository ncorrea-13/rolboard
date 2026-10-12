-- notx: recreación de tabla, ver runMigrationWithoutForeignKeys en db.go
-- Worldbuilding narrativo: descripción de PJ, oneshots, lore, objetos y economía,
-- secretos, notas sueltas y líneas de tiempo. Ver docs/PLAN_NARRATIVE.md.

ALTER TABLE player_characters ADD COLUMN description TEXT NOT NULL DEFAULT '';

ALTER TABLE quest_npcs ADD COLUMN role TEXT;

-- Sessions: session_type gana 'oneshot'. El CHECK no se altera en SQLite, hay que recrear la tabla.
CREATE TABLE sessions_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
    arc_id INTEGER REFERENCES arcs(id) ON DELETE RESTRICT,
    session_number INTEGER NOT NULL,
    sub_number INTEGER NOT NULL DEFAULT 0,
    session_type TEXT NOT NULL CHECK (session_type IN ('session', 'interlude', 'planning', 'oneshot')),
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

-- Los oneshots (O1, O2...) tienen numeración propia: no compiten con S1 ni con interludios.
CREATE UNIQUE INDEX sessions_active_number_uq
ON sessions (campaign_id, session_number, sub_number)
WHERE deleted_at IS NULL AND session_type <> 'oneshot';

CREATE UNIQUE INDEX sessions_active_oneshot_number_uq
ON sessions (campaign_id, session_number)
WHERE deleted_at IS NULL AND session_type = 'oneshot';

-- Lore
CREATE TABLE lore_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    label TEXT NOT NULL,
    color TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    UNIQUE (campaign_id, key)
);

CREATE TABLE lore_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
    category_id INTEGER REFERENCES lore_categories(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    arc_id INTEGER REFERENCES arcs(id) ON DELETE RESTRICT,
    location_id INTEGER REFERENCES locations(id) ON DELETE RESTRICT,
    obsidian_path TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    UNIQUE (campaign_id, obsidian_path)
);

-- Objetos y economía
CREATE TABLE currencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL DEFAULT '',
    rate_to_base REAL CHECK (rate_to_base IS NULL OR rate_to_base > 0),
    is_base INTEGER NOT NULL DEFAULT 0 CHECK (is_base IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE UNIQUE INDEX currencies_base_uq
ON currencies (campaign_id)
WHERE is_base = 1 AND deleted_at IS NULL;

CREATE TABLE currency_locations (
    currency_id INTEGER NOT NULL REFERENCES currencies(id) ON DELETE RESTRICT,
    location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    PRIMARY KEY (currency_id, location_id)
);

CREATE TABLE items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    effect TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    rarity TEXT NOT NULL DEFAULT '',
    weight REAL CHECK (weight IS NULL OR weight >= 0),
    image_path TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE TABLE item_prices (
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    currency_id INTEGER NOT NULL REFERENCES currencies(id) ON DELETE RESTRICT,
    amount REAL NOT NULL CHECK (amount >= 0),
    PRIMARY KEY (item_id, currency_id)
);

CREATE TABLE pc_items (
    pc_id INTEGER NOT NULL REFERENCES player_characters(id) ON DELETE RESTRICT,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    notes TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (pc_id, item_id)
);

CREATE TABLE npc_items (
    npc_id INTEGER NOT NULL REFERENCES npcs(id) ON DELETE RESTRICT,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    notes TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (npc_id, item_id)
);

CREATE TABLE location_items (
    location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    notes TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (location_id, item_id)
);

-- Precio propio de un objeto en una locación; sin fila, rige item_prices.
CREATE TABLE location_item_prices (
    location_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    currency_id INTEGER NOT NULL REFERENCES currencies(id) ON DELETE RESTRICT,
    amount REAL NOT NULL CHECK (amount >= 0),
    PRIMARY KEY (location_id, item_id, currency_id),
    FOREIGN KEY (location_id, item_id) REFERENCES location_items(location_id, item_id) ON DELETE RESTRICT
);

-- Secretos y notas sueltas
CREATE TABLE secrets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'hidden' CHECK (status IN ('hidden', 'revealed')),
    revealed_session_id INTEGER REFERENCES sessions(id) ON DELETE RESTRICT,
    npc_id INTEGER REFERENCES npcs(id) ON DELETE RESTRICT,
    location_id INTEGER REFERENCES locations(id) ON DELETE RESTRICT,
    lore_entry_id INTEGER REFERENCES lore_entries(id) ON DELETE RESTRICT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE TABLE secret_npcs (
    secret_id INTEGER NOT NULL REFERENCES secrets(id) ON DELETE RESTRICT,
    npc_id INTEGER NOT NULL REFERENCES npcs(id) ON DELETE RESTRICT,
    PRIMARY KEY (secret_id, npc_id)
);

CREATE TABLE notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    pending INTEGER NOT NULL DEFAULT 1 CHECK (pending IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

-- Líneas de tiempo. Las fechas in-world son texto libre; sort_key es lo único que ordena.
CREATE TABLE timelines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL,
    start_label TEXT,
    end_label TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE TABLE timeline_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
    timeline_id INTEGER NOT NULL REFERENCES timelines(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    date_label TEXT NOT NULL DEFAULT '',
    end_date_label TEXT,
    sort_key REAL NOT NULL DEFAULT 0,
    arc_id INTEGER REFERENCES arcs(id) ON DELETE RESTRICT,
    session_id INTEGER REFERENCES sessions(id) ON DELETE RESTRICT,
    location_id INTEGER REFERENCES locations(id) ON DELETE RESTRICT,
    group_id INTEGER REFERENCES groups(id) ON DELETE RESTRICT,
    lore_entry_id INTEGER REFERENCES lore_entries(id) ON DELETE RESTRICT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);
