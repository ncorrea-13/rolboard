package service

import (
	"context"
	"errors"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

func TestAdminWithoutVaultsRoot(t *testing.T) {
	db := setupAuthTestDB(t)
	svc := NewAdminService(db, repository.NewCampaignRepository(db), "")

	dirs, err := svc.ListVaultDirs(context.Background(), 0)
	if err != nil || len(dirs) != 0 {
		t.Fatalf("ListVaultDirs: got %v, %v; want empty, nil", dirs, err)
	}
	if _, err := svc.Reindex(context.Background(), 1); !errors.Is(err, ErrNoVaultsRoot) {
		t.Fatalf("Reindex: got %v, want ErrNoVaultsRoot", err)
	}
}
