ALTER TABLE npcs ADD COLUMN attributes TEXT NOT NULL DEFAULT '{}';
ALTER TABLE npcs ADD COLUMN skills TEXT NOT NULL DEFAULT '{}';

ALTER TABLE player_characters ADD COLUMN attributes TEXT NOT NULL DEFAULT '{}';
ALTER TABLE player_characters ADD COLUMN skills TEXT NOT NULL DEFAULT '{}';

CREATE TABLE encounters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
  session_id INTEGER REFERENCES sessions(id) ON DELETE RESTRICT,
  round INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo','cerrado')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE TABLE encounter_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  encounter_id INTEGER NOT NULL REFERENCES encounters(id) ON DELETE RESTRICT,
  pc_id INTEGER REFERENCES player_characters(id) ON DELETE RESTRICT,
  npc_id INTEGER REFERENCES npcs(id) ON DELETE RESTRICT,
  display_name TEXT,
  current_hp INTEGER,
  max_hp INTEGER,
  initiative_value INTEGER,
  turn_type TEXT CHECK (turn_type IN ('rapido','lento')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);
