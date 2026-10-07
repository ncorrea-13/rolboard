package snapshot

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"

	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

const fileName = "rolboard.db"

var ErrNewerSchema = errors.New("snapshot was made by a newer Rolboard version")

func Path(dir string) string {
	return filepath.Join(dir, fileName)
}

func UploadsDir(dir string) string {
	return filepath.Join(dir, "uploads")
}

func Fingerprint(dir string) (string, error) {
	f, err := os.Open(Path(dir))
	if err != nil {
		return "", err
	}
	defer func() { _ = f.Close() }()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

func Changed(dir, last string) (string, bool, error) {
	current, err := Fingerprint(dir)
	if errors.Is(err, fs.ErrNotExist) {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}
	return current, current != last, nil
}

func Export(ctx context.Context, dbPath, dir string) (string, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	db, err := sql.Open("sqlite", "file:"+dbPath+"?mode=ro")
	if err != nil {
		return "", err
	}
	defer func() { _ = db.Close() }()
	tmp := Path(dir) + ".tmp"
	if err := os.Remove(tmp); err != nil && !errors.Is(err, fs.ErrNotExist) {
		return "", err
	}
	if _, err := db.ExecContext(ctx, `VACUUM INTO ?`, tmp); err != nil {
		return "", fmt.Errorf("vacuum into: %w", err)
	}
	if err := syncFile(tmp); err != nil {
		return "", err
	}
	if err := os.Rename(tmp, Path(dir)); err != nil {
		return "", err
	}
	return Fingerprint(dir)
}

func KeepConflict(dir string) error {
	return copyFile(Path(dir), filepath.Join(dir, "rolboard.conflict.db"))
}

func Import(ctx context.Context, dir, dbPath string) error {
	if err := checkSchema(ctx, Path(dir)); err != nil {
		return err
	}
	tmp := dbPath + ".tmp"
	if err := copyFile(Path(dir), tmp); err != nil {
		return err
	}
	if err := os.Rename(dbPath, dbPath+".bak"); err != nil && !errors.Is(err, fs.ErrNotExist) {
		return err
	}
	_ = os.Remove(dbPath + "-journal")
	return os.Rename(tmp, dbPath)
}

func CopyMissing(src, dst string) error {
	return filepath.WalkDir(src, func(path string, entry fs.DirEntry, err error) error {
		if errors.Is(err, fs.ErrNotExist) {
			return nil
		}
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		target := filepath.Join(dst, rel)
		if entry.IsDir() {
			return os.MkdirAll(target, 0o755)
		}
		if _, err := os.Stat(target); err == nil {
			return nil
		}
		return copyFile(path, target)
	})
}

func checkSchema(ctx context.Context, path string) error {
	known, err := repository.KnownMigrations()
	if err != nil {
		return err
	}
	db, err := sql.Open("sqlite", "file:"+path+"?mode=ro")
	if err != nil {
		return err
	}
	defer func() { _ = db.Close() }()
	rows, err := db.QueryContext(ctx, `SELECT version FROM schema_migrations`)
	if err != nil {
		return fmt.Errorf("reading snapshot schema: %w", err)
	}
	defer func() { _ = rows.Close() }()
	for rows.Next() {
		var version string
		if err := rows.Scan(&version); err != nil {
			return err
		}
		if !known[version] {
			return ErrNewerSchema
		}
	}
	return rows.Err()
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer func() { _ = in.Close() }()
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	if _, err := io.Copy(out, in); err != nil {
		_ = out.Close()
		return err
	}
	if err := out.Sync(); err != nil {
		_ = out.Close()
		return err
	}
	return out.Close()
}

func syncFile(path string) error {
	f, err := os.OpenFile(path, os.O_RDWR, 0)
	if err != nil {
		return err
	}
	if err := f.Sync(); err != nil {
		_ = f.Close()
		return err
	}
	return f.Close()
}
