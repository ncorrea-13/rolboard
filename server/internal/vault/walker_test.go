package vault

import (
	"os"
	"path/filepath"
	"slices"
	"testing"
)

func writeTestFile(t *testing.T, root, relPath string) {
	t.Helper()
	full := filepath.Join(root, relPath)
	if err := os.MkdirAll(filepath.Dir(full), 0755); err != nil {
		t.Fatalf("MkdirAll failed: %v", err)
	}
	if err := os.WriteFile(full, []byte("---\ntipo: npc\n---\ncontent"), 0644); err != nil {
		t.Fatalf("WriteFile failed: %v", err)
	}
}

func TestWalkFindsMarkdownFiles(t *testing.T) {
	root := t.TempDir()
	writeTestFile(t, root, "NPC/Kaladin.md")
	writeTestFile(t, root, "Locaciones/Ciudades/Kharbranth.md")

	paths, err := Walk(root)
	if err != nil {
		t.Fatalf("Walk failed: %v", err)
	}

	want := []string{"Locaciones/Ciudades/Kharbranth.md", "NPC/Kaladin.md"}
	slices.Sort(paths)
	if !slices.Equal(paths, want) {
		t.Errorf("Expected %v, got %v", want, paths)
	}
}

func TestWalkSkipsExcludedFiles(t *testing.T) {
	root := t.TempDir()
	writeTestFile(t, root, "NPC/Kaladin.md")
	writeTestFile(t, root, "CLAUDE.md")
	writeTestFile(t, root, "FORMAT.md")
	writeTestFile(t, root, "Primer Ideal.md")
	writeTestFile(t, root, "Método para crear NPCs.md")

	paths, err := Walk(root)
	if err != nil {
		t.Fatalf("Walk failed: %v", err)
	}

	if len(paths) != 1 || paths[0] != "NPC/Kaladin.md" {
		t.Errorf("Expected only NPC/Kaladin.md, got %v", paths)
	}
}

func TestWalkSkipsNonMarkdownFiles(t *testing.T) {
	root := t.TempDir()
	writeTestFile(t, root, "NPC/Kaladin.md")
	if err := os.WriteFile(filepath.Join(root, "notes.txt"), []byte("hi"), 0644); err != nil {
		t.Fatalf("WriteFile failed: %v", err)
	}
	if err := os.MkdirAll(filepath.Join(root, "assets"), 0755); err != nil {
		t.Fatalf("MkdirAll failed: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, "assets", "image.png"), []byte{0}, 0644); err != nil {
		t.Fatalf("WriteFile failed: %v", err)
	}

	paths, err := Walk(root)
	if err != nil {
		t.Fatalf("Walk failed: %v", err)
	}

	if len(paths) != 1 || paths[0] != "NPC/Kaladin.md" {
		t.Errorf("Expected only NPC/Kaladin.md, got %v", paths)
	}
}

func TestWalkEmptyDir(t *testing.T) {
	root := t.TempDir()

	paths, err := Walk(root)
	if err != nil {
		t.Fatalf("Walk failed: %v", err)
	}
	if len(paths) != 0 {
		t.Errorf("Expected 0 paths, got %v", paths)
	}
}

func TestWalkReturnsRelativePaths(t *testing.T) {
	root := t.TempDir()
	writeTestFile(t, root, "Arcos/Arco-1.md")

	paths, err := Walk(root)
	if err != nil {
		t.Fatalf("Walk failed: %v", err)
	}
	if len(paths) != 1 {
		t.Fatalf("Expected 1 path, got %d", len(paths))
	}
	if filepath.IsAbs(paths[0]) {
		t.Errorf("Expected relative path, got absolute: %s", paths[0])
	}
	if paths[0] != filepath.Join("Arcos", "Arco-1.md") {
		t.Errorf("Expected 'Arcos/Arco-1.md', got '%s'", paths[0])
	}
}
