package vault

import "testing"

func TestNameIndexAddAndLookup(t *testing.T) {
	idx := NewNameIndex()
	idx.Add(IndexEntry{ID: 1, Name: "Kaladin", Type: "npc", RawPath: "NPC/Kaladin.md"})

	entries := idx.Lookup("Kaladin")
	if len(entries) != 1 {
		t.Fatalf("Expected 1 entry, got %d", len(entries))
	}
	if entries[0].ID != 1 || entries[0].Type != "npc" {
		t.Errorf("Unexpected entry: %+v", entries[0])
	}
}

func TestNameIndexLookupMissing(t *testing.T) {
	idx := NewNameIndex()

	entries := idx.Lookup("Nadie")
	if len(entries) != 0 {
		t.Errorf("Expected 0 entries, got %d", len(entries))
	}
}

func TestNameIndexDuplicateNamesDifferentTypes(t *testing.T) {
	idx := NewNameIndex()
	idx.Add(IndexEntry{ID: 1, Name: "Luz de plata", Type: "group", RawPath: "Grupos/Planetas/Luz de plata.md"})
	idx.Add(IndexEntry{ID: 2, Name: "Luz de plata", Type: "location", RawPath: "Locaciones/Extras/Luz de plata.md"})

	entries := idx.Lookup("Luz de plata")
	if len(entries) != 2 {
		t.Fatalf("Expected 2 candidates, got %d", len(entries))
	}

	types := map[string]bool{entries[0].Type: true, entries[1].Type: true}
	if !types["group"] || !types["location"] {
		t.Errorf("Expected both 'group' and 'location' candidates, got %+v", entries)
	}
}
