package imagestore

import (
	"bytes"
	"errors"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"os"
	"path/filepath"
	"testing"
)

func validPNG(t *testing.T) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, 2, 2))
	img.Set(0, 0, color.White)
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatalf("encode png: %v", err)
	}
	return buf.Bytes()
}

func validJPEG(t *testing.T) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, 2, 2))
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, nil); err != nil {
		t.Fatalf("encode jpeg: %v", err)
	}
	return buf.Bytes()
}

func TestStoreRejectsSVG(t *testing.T) {
	root := t.TempDir()
	svg := []byte(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`)
	if _, err := Store(root, "npcs", 1, svg); !errors.Is(err, ErrUnsupportedFormat) {
		t.Fatalf("expected ErrUnsupportedFormat for SVG, got %v", err)
	}
}

func TestStoreRejectsHTMLPolyglotWithImageExtension(t *testing.T) {
	root := t.TempDir()
	polyglot := []byte("<html><body><script>alert(1)</script></body></html>")
	if _, err := Store(root, "npcs", 1, polyglot); !errors.Is(err, ErrUnsupportedFormat) {
		t.Fatalf("expected ErrUnsupportedFormat for HTML polyglot, got %v", err)
	}
}

func TestStoreRejectsEmptyFile(t *testing.T) {
	root := t.TempDir()
	if _, err := Store(root, "npcs", 1, []byte{}); !errors.Is(err, ErrUnsupportedFormat) {
		t.Fatalf("expected ErrUnsupportedFormat for empty file, got %v", err)
	}
}

func TestStoreAcceptsRealPNG(t *testing.T) {
	root := t.TempDir()
	relPath, err := Store(root, "npcs", 42, validPNG(t))
	if err != nil {
		t.Fatalf("expected PNG to be accepted, got %v", err)
	}
	if relPath != filepath.Join("npcs", "42-portrait.png") {
		t.Errorf("unexpected relPath: %s", relPath)
	}
	if _, err := os.Stat(filepath.Join(root, relPath)); err != nil {
		t.Errorf("expected file on disk: %v", err)
	}
}

func TestStoreAcceptsRealJPEG(t *testing.T) {
	root := t.TempDir()
	relPath, err := Store(root, "npcs", 42, validJPEG(t))
	if err != nil {
		t.Fatalf("expected JPEG to be accepted, got %v", err)
	}
	if relPath != filepath.Join("npcs", "42-portrait.jpg") {
		t.Errorf("unexpected relPath: %s", relPath)
	}
}

func TestStoreReplacesOldExtensionSibling(t *testing.T) {
	root := t.TempDir()
	if _, err := Store(root, "npcs", 7, validPNG(t)); err != nil {
		t.Fatalf("first store failed: %v", err)
	}
	relPath, err := Store(root, "npcs", 7, validJPEG(t))
	if err != nil {
		t.Fatalf("second store failed: %v", err)
	}
	if relPath != filepath.Join("npcs", "7-portrait.jpg") {
		t.Errorf("unexpected relPath: %s", relPath)
	}
	if _, err := os.Stat(filepath.Join(root, "npcs", "7-portrait.png")); !os.IsNotExist(err) {
		t.Errorf("expected old .png sibling to be removed, stat err: %v", err)
	}
}

func TestStorePathNeverEscapesRoot(t *testing.T) {
	root := t.TempDir()
	relPath, err := Store(root, "locations", 1, validPNG(t))
	if err != nil {
		t.Fatalf("store failed: %v", err)
	}
	abs, err := filepath.Abs(filepath.Join(root, relPath))
	if err != nil {
		t.Fatalf("abs failed: %v", err)
	}
	absRoot, err := filepath.Abs(root)
	if err != nil {
		t.Fatalf("abs root failed: %v", err)
	}
	rel, err := filepath.Rel(absRoot, abs)
	if err != nil || rel == ".." || (len(rel) >= 2 && rel[:2] == "..") {
		t.Fatalf("resulting path escapes root: %s", abs)
	}
}

func TestDeleteIsNoopForMissingFile(t *testing.T) {
	root := t.TempDir()
	if err := Delete(root, filepath.Join("npcs", "999-portrait.png")); err != nil {
		t.Fatalf("expected no error deleting missing file, got %v", err)
	}
}

func TestDeleteRemovesExistingFile(t *testing.T) {
	root := t.TempDir()
	relPath, err := Store(root, "npcs", 1, validPNG(t))
	if err != nil {
		t.Fatalf("store failed: %v", err)
	}
	if err := Delete(root, relPath); err != nil {
		t.Fatalf("delete failed: %v", err)
	}
	if _, err := os.Stat(filepath.Join(root, relPath)); !os.IsNotExist(err) {
		t.Errorf("expected file to be gone, stat err: %v", err)
	}
}

func TestContentType(t *testing.T) {
	cases := map[string]string{
		"npcs/1-portrait.png":  "image/png",
		"npcs/1-portrait.jpg":  "image/jpeg",
		"npcs/1-portrait.jpeg": "image/jpeg",
		"npcs/1-portrait":      "application/octet-stream",
	}
	for path, want := range cases {
		if got := ContentType(path); got != want {
			t.Errorf("ContentType(%q) = %q, want %q", path, got, want)
		}
	}
}
