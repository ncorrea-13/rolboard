ALTER TABLE player_characters ADD COLUMN race TEXT NOT NULL DEFAULT '';
ALTER TABLE player_characters ADD COLUMN class TEXT NOT NULL DEFAULT '';
ALTER TABLE player_characters ADD COLUMN status TEXT NOT NULL DEFAULT 'activo'
    CHECK (status IN ('vivo', 'muerto', 'desaparecido', 'activo'));
ALTER TABLE player_characters ADD COLUMN spren_npc_id INTEGER REFERENCES npcs(id) ON DELETE RESTRICT;

CREATE TABLE pc_groups (
    pc_id INTEGER NOT NULL REFERENCES player_characters(id) ON DELETE RESTRICT,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
    role_in_group TEXT,
    PRIMARY KEY (pc_id, group_id)
);
