package snapshot

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"path/filepath"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

func openDB(t *testing.T, path string) *sql.DB {
	t.Helper()
	db, err := repository.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	if err := repository.Migrate(db); err != nil {
		t.Fatal(err)
	}
	return db
}

func countCampaigns(t *testing.T, path string) int {
	t.Helper()
	db := openDB(t, path)
	defer func() { _ = db.Close() }()
	var n int
	if err := db.QueryRow(`SELECT count(*) FROM campaigns`).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func TestExportImportRoundTrip(t *testing.T) {
	ctx := context.Background()
	syncDir := t.TempDir()
	deskPath := filepath.Join(t.TempDir(), "rolboard.db")
	phonePath := filepath.Join(t.TempDir(), "rolboard.db")

	desk := openDB(t, deskPath)
	if _, err := desk.Exec(`INSERT INTO campaigns (name, system) VALUES ('Valdris', 'D&D')`); err != nil {
		t.Fatal(err)
	}
	_ = desk.Close()
	exported, err := Export(ctx, deskPath, syncDir)
	if err != nil {
		t.Fatal(err)
	}

	phone := openDB(t, phonePath)
	_ = phone.Close()

	current, changed, err := Changed(syncDir, "")
	if err != nil || !changed || current != exported {
		t.Fatalf("changed: %q %v %v", current, changed, err)
	}
	if err := Import(ctx, syncDir, phonePath); err != nil {
		t.Fatal(err)
	}
	if got := countCampaigns(t, phonePath); got != 1 {
		t.Fatalf("campaigns after import: %d", got)
	}
	if _, err := os.Stat(phonePath + ".bak"); err != nil {
		t.Fatalf("backup: %v", err)
	}
	if _, changed, _ := Changed(syncDir, exported); changed {
		t.Fatal("same snapshot reported as changed")
	}
}

func TestChangedWithoutSnapshot(t *testing.T) {
	if _, changed, err := Changed(t.TempDir(), "x"); err != nil || changed {
		t.Fatalf("got %v, %v", changed, err)
	}
}

func TestImportRejectsNewerSchema(t *testing.T) {
	ctx := context.Background()
	syncDir := t.TempDir()
	newer := filepath.Join(t.TempDir(), "rolboard.db")
	db := openDB(t, newer)
	if _, err := db.Exec(`INSERT INTO schema_migrations (version) VALUES ('9999_from_the_future.sql')`); err != nil {
		t.Fatal(err)
	}
	_ = db.Close()
	if _, err := Export(ctx, newer, syncDir); err != nil {
		t.Fatal(err)
	}

	local := filepath.Join(t.TempDir(), "rolboard.db")
	_ = openDB(t, local).Close()
	if err := Import(ctx, syncDir, local); !errors.Is(err, ErrNewerSchema) {
		t.Fatalf("got %v, want ErrNewerSchema", err)
	}
	if _, err := os.Stat(local + ".bak"); !errors.Is(err, os.ErrNotExist) {
		t.Fatal("local db was touched")
	}
}
