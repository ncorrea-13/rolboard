CREATE TABLE npc_player_relations (
    npc_id INTEGER NOT NULL REFERENCES npcs(id) ON DELETE RESTRICT,
    player_character_id INTEGER NOT NULL REFERENCES player_characters(id) ON DELETE RESTRICT,
    role TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'dashboard' CHECK (source IN ('vault', 'dashboard', 'removed')),
    PRIMARY KEY (npc_id, player_character_id)
);

INSERT INTO npc_player_relations (npc_id, player_character_id)
SELECT spren_npc_id, id FROM player_characters WHERE spren_npc_id IS NOT NULL;

ALTER TABLE player_characters DROP COLUMN spren_npc_id;
