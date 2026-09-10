package vault

import (
	"strings"
	"testing"
)

func TestRenderNoteEscapesUnresolvedWikilinkLabel(t *testing.T) {
	idx := NewNameIndex()
	content := []byte("---\ntipo: npc\n---\n[[<script>alert(1)</script>|<b>hi</b>]]")

	out, err := RenderNote(content, idx)
	if err != nil {
		t.Fatalf("RenderNote failed: %v", err)
	}
	if strings.Contains(out, "<script>") || strings.Contains(out, "<b>") {
		t.Errorf("Expected wikilink label to be escaped, got %q", out)
	}
}

func TestRenderNoteEscapesResolvedWikilinkLabel(t *testing.T) {
	idx := NewNameIndex()
	idx.Add(IndexEntry{ID: 1, Name: "Velen", Type: "npc"})
	content := []byte("---\ntipo: npc\n---\n[[Velen|<img src=x onerror=alert(1)>]]")

	out, err := RenderNote(content, idx)
	if err != nil {
		t.Fatalf("RenderNote failed: %v", err)
	}
	if strings.Contains(out, "<img") {
		t.Errorf("Expected resolved wikilink label to be escaped, got %q", out)
	}
	if !strings.Contains(out, `data-entity-type="npc"`) {
		t.Errorf("Expected resolved link to keep its entity type, got %q", out)
	}
}
