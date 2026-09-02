package repository

import (
	"database/sql"
	"embed"
	"errors"
	"io/fs"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

func Open(path string) (*sql.DB, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return nil, err
	}

	dsn := "file:" + path + "?_pragma=foreign_keys(1)"
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	return db, nil
}

func Migrate(db *sql.DB) error {
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
              version TEXT PRIMARY KEY,
              applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`); err != nil {
		return err
	}

	entries, err := fs.ReadDir(migrationsFS, "migrations")
	if err != nil {
		return err
	}

	for _, entry := range entries {
		exist := 0
		err := db.QueryRow(`SELECT 1 FROM schema_migrations WHERE version = ?`, entry.Name()).Scan(&exist)

		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return err
		}
		if exist != 0 {
			continue
		}

		migrationContent, err := migrationsFS.ReadFile("migrations/" + entry.Name())
		if err != nil {
			return err
		}

		migrationSQL := string(migrationContent)
		migrationTx, err := db.Begin()
		if err != nil {
			return err
		}
		if _, err := migrationTx.Exec(migrationSQL); err != nil {
			return err
		}

		if _, err := migrationTx.Exec(`INSERT INTO schema_migrations (version) VALUES (?)`, entry.Name()); err != nil {
			return err
		}
		if err := migrationTx.Commit(); err != nil {
			return err
		}
	}

	return nil
}
