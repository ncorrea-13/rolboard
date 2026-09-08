package service

import (
	"context"

	"github.com/ncorrea-13/rolboard/server/internal/vault"
)

type AdminService struct {
	indexer *vault.Indexer
}

func NewAdminService(indexer *vault.Indexer) *AdminService {
	return &AdminService{indexer: indexer}
}

func (s *AdminService) Reindex(ctx context.Context) (*vault.Result, error) {
	return s.indexer.Reindex(ctx)
}
