package service

import (
	"context"
	"database/sql"
	"os"
	"path/filepath"

	"github.com/ncorrea-13/rolboard/server/internal/repository"
	"github.com/ncorrea-13/rolboard/server/internal/vault"
)

type AdminService struct {
	db           *sql.DB
	campaignRepo *repository.CampaignRepository
	vaultsRoot   string
}

func NewAdminService(db *sql.DB, campaignRepo *repository.CampaignRepository, vaultsRoot string) *AdminService {
	return &AdminService{db: db, campaignRepo: campaignRepo, vaultsRoot: vaultsRoot}
}

func (s *AdminService) Reindex(ctx context.Context, campaignID int64) (*vault.Result, error) {
	campaign, err := s.campaignRepo.GetByID(ctx, campaignID)
	if err != nil {
		return nil, err
	}
	root := filepath.Join(s.vaultsRoot, campaign.VaultPath)
	indexer := vault.NewIndexer(root, campaignID, s.db)
	return indexer.Reindex(ctx)
}

func (s *AdminService) ListVaultDirs(ctx context.Context) ([]string, error) {
	entries, err := os.ReadDir(s.vaultsRoot)
	if err != nil {
		return nil, err
	}

	rows, err := s.db.QueryContext(ctx, `SELECT vault_path FROM campaigns WHERE vault_path != '' AND deleted_at IS NULL`)
	if err != nil {
		return nil, err
	}
	defer func() {
		if err := rows.Close(); err != nil {
			return
		}
	}()
	used := map[string]bool{}
	for rows.Next() {
		var vaultPath string
		if err := rows.Scan(&vaultPath); err != nil {
			return nil, err
		}
		used[vaultPath] = true
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	dirs := []string{}
	for _, e := range entries {
		if e.IsDir() && !used[e.Name()] {
			dirs = append(dirs, e.Name())
		}
	}
	return dirs, nil
}
