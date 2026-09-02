-- Entidades

CREATE TABLE campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    system TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'finished')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE TABLE arcs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE TABLE locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    location_type TEXT NOT NULL CHECK (location_type IN ('planet', 'region', 'city', 'site', 'plane')),
    parent_location_id INTEGER REFERENCES locations(id) ON DELETE RESTRICT,
    description TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    obsidian_path TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    UNIQUE (campaign_id, obsidian_path)
);

CREATE TABLE npcs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    npc_kind TEXT NOT NULL CHECK (npc_kind IN ('npc', 'spren', 'entidad-cognitiva', 'referencia')),
    detail_level TEXT NOT NULL CHECK (detail_level IN ('full', 'minor')),
    status TEXT NOT NULL CHECK (status IN ('vivo', 'muerto', 'desaparecido', 'activo', 'consolidado')),
    location_id INTEGER REFERENCES locations(id) ON DELETE RESTRICT,
    etnia TEXT,
    rol TEXT,
    vinculo_con INTEGER REFERENCES npcs(id) ON DELETE RESTRICT,
    tipo_spren TEXT,
    description TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    obsidian_path TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    UNIQUE (campaign_id, obsidian_path)
);

CREATE TABLE groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    obsidian_path TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    UNIQUE (campaign_id, obsidian_path)
);

CREATE TABLE player_characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
    player_name TEXT NOT NULL,
    character_name TEXT NOT NULL,
    backstory TEXT NOT NULL DEFAULT '',
    progression_notes TEXT NOT NULL DEFAULT '',
    obsidian_path TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    UNIQUE (campaign_id, obsidian_path)
);

CREATE TABLE sessions (
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
    UNIQUE (campaign_id, session_number, sub_number),
    UNIQUE (campaign_id, obsidian_path)
);

CREATE TABLE quests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'failed', 'on_hold')),
    priority INTEGER,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

-- Tablas relacionales

CREATE TABLE npc_groups (
    npc_id INTEGER NOT NULL REFERENCES npcs(id) ON DELETE RESTRICT,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
    role_in_group TEXT,
    PRIMARY KEY (npc_id, group_id)
);

CREATE TABLE quest_npcs (
    quest_id INTEGER NOT NULL REFERENCES quests(id) ON DELETE RESTRICT,
    npc_id INTEGER NOT NULL REFERENCES npcs(id) ON DELETE RESTRICT,
    PRIMARY KEY (quest_id, npc_id)
);

CREATE TABLE session_npcs (
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT,
    npc_id INTEGER NOT NULL REFERENCES npcs(id) ON DELETE RESTRICT,
    PRIMARY KEY (session_id, npc_id)
);

CREATE TABLE session_pcs (
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT,
    pc_id INTEGER NOT NULL REFERENCES player_characters(id) ON DELETE RESTRICT,
    PRIMARY KEY (session_id, pc_id)
);

CREATE TABLE session_quests (
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT,
    quest_id INTEGER NOT NULL REFERENCES quests(id) ON DELETE RESTRICT,
    PRIMARY KEY (session_id, quest_id)
);
