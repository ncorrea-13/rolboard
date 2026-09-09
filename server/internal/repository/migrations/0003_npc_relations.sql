CREATE TABLE npc_relations (
    from_npc_id INTEGER NOT NULL REFERENCES npcs(id) ON DELETE RESTRICT,
    to_npc_id INTEGER NOT NULL REFERENCES npcs(id) ON DELETE RESTRICT,
    role TEXT NOT NULL,
    PRIMARY KEY (from_npc_id, to_npc_id, role)
);

ALTER TABLE npcs DROP COLUMN vinculo_con;
