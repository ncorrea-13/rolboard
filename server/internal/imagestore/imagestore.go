// Package imagestore validates and persists entity portraits on the filesystem
package imagestore

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"os"
	"path/filepath"
)

const MaxUploadBytes = 5 << 20

var ErrUnsupportedFormat = errors.New("unsupported image format: only PNG and JPEG are accepted")

var ErrInvalidPath = errors.New("image path escapes the uploads root")

var knownExts = []string{".png", ".jpg"}

func Store(root, entity string, id int64, data []byte) (string, error) {
	ext, err := detectExt(data)
	if err != nil {
		return "", err
	}

	dir := filepath.Join(root, entity)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}

	base := fmt.Sprintf("%d-portrait", id)
	relPath := filepath.Join(entity, base+ext)

	for _, otherExt := range knownExts {
		if otherExt == ext {
			continue
		}
		_ = os.Remove(filepath.Join(dir, base+otherExt))
	}

	if err := os.WriteFile(filepath.Join(root, relPath), data, 0o644); err != nil {
		return "", err
	}
	return relPath, nil
}

// Path joins root with a stored image path, rejecting paths that leave root.
func Path(root, relPath string) (string, error) {
	if !filepath.IsLocal(relPath) {
		return "", ErrInvalidPath
	}
	return filepath.Join(root, relPath), nil
}

func Delete(root, relPath string) error {
	if relPath == "" {
		return nil
	}
	path, err := Path(root, relPath)
	if err != nil {
		return err
	}
	err = os.Remove(path)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	return err
}

func ContentType(relPath string) string {
	switch filepath.Ext(relPath) {
	case ".png":
		return "image/png"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	default:
		return "application/octet-stream"
	}
}

func detectExt(data []byte) (string, error) {
	_, format, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		return "", ErrUnsupportedFormat
	}
	switch format {
	case "png":
		return ".png", nil
	case "jpeg":
		return ".jpg", nil
	default:
		return "", ErrUnsupportedFormat
	}
}

func ReadAllLimited(r io.Reader, limit int64) ([]byte, error) {
	data, err := io.ReadAll(io.LimitReader(r, limit+1))
	if err != nil {
		return nil, err
	}
	if int64(len(data)) > limit {
		return nil, fmt.Errorf("file exceeds %d bytes", limit)
	}
	return data, nil
}
