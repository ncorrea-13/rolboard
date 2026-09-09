package service

import (
	"context"
	"database/sql"
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
