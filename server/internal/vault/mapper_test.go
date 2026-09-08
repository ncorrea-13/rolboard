package vault

import "testing"

func TestEntityTypeForPathTopLevel(t *testing.T) {
	entityType, ok := entityTypeForPath("NPC/Kaladin.md")
	if !ok {
		t.Fatal("Expected ok true")
	}
	if entityType != "npc" {
		t.Errorf("Expected 'npc', got '%s'", entityType)
	}
}

func TestEntityTypeForPathNestedSubfolder(t *testing.T) {
	entityType, ok := entityTypeForPath("Locaciones/Ciudades/Kharbranth.md")
	if !ok {
		t.Fatal("Expected ok true")
	}
	if entityType != "location" {
		t.Errorf("Expected 'location', got '%s'", entityType)
	}
}

func TestEntityTypeForPathAllFolders(t *testing.T) {
	cases := map[string]string{
		"NPC/Kaladin.md":              "npc",
		"Locaciones/Kharbranth.md":    "location",
		"Grupos/Bridge Four.md":       "group",
		"Sesiones/Arco-1/Sesion-1.md": "session",
		"Jugadores/Nico/Shallan.md":   "player_character",
		"Arcos/Arco-1.md":             "arc",
	}
	for path, want := range cases {
		got, ok := entityTypeForPath(path)
		if !ok {
			t.Errorf("%s: expected ok true", path)
			continue
		}
		if got != want {
			t.Errorf("%s: expected '%s', got '%s'", path, want, got)
		}
	}
}

func TestEntityTypeForPathUnknownFolder(t *testing.T) {
	_, ok := entityTypeForPath("Reglas/Combate.md")
	if ok {
		t.Error("Expected ok false for unmapped folder")
	}
}
