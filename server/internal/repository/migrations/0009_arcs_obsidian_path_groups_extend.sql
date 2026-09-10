ALTER TABLE arcs ADD COLUMN obsidian_path TEXT;
CREATE UNIQUE INDEX idx_arcs_campaign_obsidian_path_unique
    ON arcs (campaign_id, obsidian_path)
    WHERE obsidian_path IS NOT NULL;

ALTER TABLE groups ADD COLUMN alineacion TEXT NOT NULL DEFAULT '';
ALTER TABLE groups ADD COLUMN lider_npc_id INTEGER REFERENCES npcs(id) ON DELETE SET NULL;
