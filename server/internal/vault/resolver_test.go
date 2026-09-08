package vault

import "testing"

func TestResolveFound(t *testing.T) {
	idx := NewNameIndex()
	idx.Add(IndexEntry{ID: 1, Name: "Tashikk", Type: "location"})

	id, err := Resolve(idx, "Tashikk", "location")
	if err != nil {
		t.Fatalf("Resolve failed: %v", err)
	}
	if id != 1 {
		t.Errorf("Expected ID 1, got %d", id)
	}
}

func TestResolveNotFound(t *testing.T) {
	idx := NewNameIndex()

	_, err := Resolve(idx, "Nadie", "npc")
	if err != ErrWikilinkNotFound {
		t.Errorf("Expected ErrWikilinkNotFound, got %v", err)
	}
}

func TestResolveWrongType(t *testing.T) {
	idx := NewNameIndex()
	idx.Add(IndexEntry{ID: 1, Name: "Luz de plata", Type: "group"})

	_, err := Resolve(idx, "Luz de plata", "location")
	if err != ErrWikilinkNotFound {
		t.Errorf("Expected ErrWikilinkNotFound (no location candidate), got %v", err)
	}
}

func TestResolveAmbiguous(t *testing.T) {
	idx := NewNameIndex()
	idx.Add(IndexEntry{ID: 1, Name: "Luz de plata", Type: "location"})
	idx.Add(IndexEntry{ID: 2, Name: "Luz de plata", Type: "location"})

	_, err := Resolve(idx, "Luz de plata", "location")
	if err != ErrWikilinkAmbiguous {
		t.Errorf("Expected ErrWikilinkAmbiguous, got %v", err)
	}
}

func TestResolveWikilinkEmptyField(t *testing.T) {
	idx := NewNameIndex()

	id, ok, err := ResolveWikilink(idx, "", "location")
	if ok {
		t.Error("Expected ok=false for empty field")
	}
	if err != nil {
		t.Errorf("Expected no error for empty field, got %v", err)
	}
	if id != 0 {
		t.Errorf("Expected id 0, got %d", id)
	}
}

func TestResolveWikilinkResolves(t *testing.T) {
	idx := NewNameIndex()
	idx.Add(IndexEntry{ID: 5, Name: "Kharbranth", Type: "location"})

	id, ok, err := ResolveWikilink(idx, "[[Kharbranth]]", "location")
	if err != nil {
		t.Fatalf("ResolveWikilink failed: %v", err)
	}
	if !ok {
		t.Error("Expected ok=true")
	}
	if id != 5 {
		t.Errorf("Expected ID 5, got %d", id)
	}
}

func TestResolveWikilinkUnresolvedStillOk(t *testing.T) {
	idx := NewNameIndex()

	_, ok, err := ResolveWikilink(idx, "[[Ciudad Fantasma]]", "location")
	if !ok {
		t.Error("Expected ok=true (field was present, just unresolved)")
	}
	if err != ErrWikilinkNotFound {
		t.Errorf("Expected ErrWikilinkNotFound, got %v", err)
	}
}
