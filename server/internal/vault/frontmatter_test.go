package vault

import (
	"strings"
	"testing"
)

func TestSplitParsesFrontmatterAndBody(t *testing.T) {
	content := []byte("---\ntipo: npc\nstatus: vivo\n---\nEsto es el cuerpo de la nota.")

	fm, body, err := Split(content)
	if err != nil {
		t.Fatalf("Split failed: %v", err)
	}

	if !strings.Contains(string(fm), "tipo: npc") {
		t.Errorf("Expected frontmatter to contain 'tipo: npc', got %q", string(fm))
	}
	if !strings.Contains(string(fm), "status: vivo") {
		t.Errorf("Expected frontmatter to contain 'status: vivo', got %q", string(fm))
	}
	if string(body) != "Esto es el cuerpo de la nota." {
		t.Errorf("Expected trimmed body, got %q", string(body))
	}
}

func TestSplitBodyWithOwnDelimiters(t *testing.T) {
	content := []byte("---\ntipo: npc\n---\nIntro\n---\nMore content after a section break")

	_, body, err := Split(content)
	if err != nil {
		t.Fatalf("Split failed: %v", err)
	}

	want := "Intro\n---\nMore content after a section break"
	if string(body) != want {
		t.Errorf("Expected body %q, got %q", want, string(body))
	}
}

func TestSplitNoFrontmatter(t *testing.T) {
	content := []byte("Just plain content, no frontmatter here.")

	_, _, err := Split(content)
	if err == nil {
		t.Error("Expected error for content without frontmatter, got nil")
	}
}

func TestSplitEmptyFrontmatter(t *testing.T) {
	content := []byte("---\n---\nBody only")

	fm, body, err := Split(content)
	if err != nil {
		t.Fatalf("Split failed: %v", err)
	}
	if strings.TrimSpace(string(fm)) != "" {
		t.Errorf("Expected empty frontmatter, got %q", string(fm))
	}
	if string(body) != "Body only" {
		t.Errorf("Expected 'Body only', got %q", string(body))
	}
}
