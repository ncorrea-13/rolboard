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

func TestRenderNoteEscapesRawHTMLOutsideWikilinks(t *testing.T) {
	idx := NewNameIndex()
	idx.Add(IndexEntry{ID: 1, Name: "Velen", Type: "npc"})
	content := []byte("---\ntipo: npc\n---\n<script>alert(1)</script>\n[[Velen|Velen]]")

	out, err := RenderNote(content, idx)
	if err != nil {
		t.Fatalf("RenderNote failed: %v", err)
	}
	if strings.Contains(out, "<script>") {
		t.Errorf("Expected raw HTML tags to be escaped, got %q", out)
	}
	if !strings.Contains(out, `data-entity-type="npc"`) {
		t.Errorf("Expected resolved wikilink to still render as entity link, got %q", out)
	}
}

func TestRenderNoteStripsJavascriptLinks(t *testing.T) {
	idx := NewNameIndex()
	content := []byte("---\ntipo: npc\n---\n[click me](javascript:alert(1))")

	out, err := RenderNote(content, idx)
	if err != nil {
		t.Fatalf("RenderNote failed: %v", err)
	}
	if strings.Contains(out, "javascript:") {
		t.Errorf("Expected javascript: URL scheme to be stripped, got %q", out)
	}
}

func TestRenderNoteWithoutFrontmatter(t *testing.T) {
	out, err := RenderNote([]byte("# Sprens\n\nplain note"), NewNameIndex())
	if err != nil {
		t.Fatalf("RenderNote failed: %v", err)
	}
	if !strings.Contains(out, "<h1>Sprens</h1>") || !strings.Contains(out, "plain note") {
		t.Errorf("expected the note to render whole, got %q", out)
	}
}

func TestRenderNoteCalloutTitleIsEscapedOnce(t *testing.T) {
	out, err := RenderNote([]byte("---\ntipo: nota\n---\n> [!WARNING] Tom & Jerry\n> body"), NewNameIndex())
	if err != nil {
		t.Fatalf("RenderNote failed: %v", err)
	}
	if strings.Contains(out, "&amp;amp;") || !strings.Contains(out, "Tom &amp; Jerry") {
		t.Errorf("callout title escaped wrongly, got %q", out)
	}
}
