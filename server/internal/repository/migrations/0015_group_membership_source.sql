ALTER TABLE npc_groups ADD COLUMN source TEXT NOT NULL DEFAULT 'dashboard' CHECK (source IN ('vault', 'dashboard', 'removed'));
ALTER TABLE pc_groups ADD COLUMN source TEXT NOT NULL DEFAULT 'dashboard' CHECK (source IN ('vault', 'dashboard', 'removed'));
