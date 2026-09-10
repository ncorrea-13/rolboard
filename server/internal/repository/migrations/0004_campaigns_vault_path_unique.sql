CREATE UNIQUE INDEX idx_campaigns_vault_path_unique
    ON campaigns (vault_path)
    WHERE vault_path != '' AND deleted_at IS NULL;
