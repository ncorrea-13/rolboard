// Package repository handles the SQLite connection, migrations, and per-entity data access.
package repository

import (
	"context"
	"database/sql"
	"embed"
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

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

		if strings.HasPrefix(migrationSQL, "-- notx") {
			if err := runMigrationWithoutForeignKeys(db, migrationSQL, entry.Name()); err != nil {
				return err
			}
			continue
		}

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

func runMigrationWithoutForeignKeys(db *sql.DB, migrationSQL, version string) error {
	ctx := context.Background()
	conn, err := db.Conn(ctx)
	if err != nil {
		return err
	}
	defer conn.Close()

	if _, err := conn.ExecContext(ctx, `PRAGMA foreign_keys=OFF`); err != nil {
		return err
	}
	defer conn.ExecContext(ctx, `PRAGMA foreign_keys=ON`)

	tx, err := conn.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, migrationSQL); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO schema_migrations (version) VALUES (?)`, version); err != nil {
		return err
	}
	return tx.Commit()
}
