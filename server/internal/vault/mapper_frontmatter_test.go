package vault

import (
	"slices"
	"testing"
)

func TestParseNPC(t *testing.T) {
	raw := []byte("tipo: npc\nstatus: vivo\netnia: Alethi\nrol: soldado\nfaccion: Bridge Four\ncurrent_location: \"[[Urithiru]]\"\ntags:\n  - protagonista\n  - spren-bond")

	fm, err := ParseNPC(raw)
	if err != nil {
		t.Fatalf("ParseNPC failed: %v", err)
	}

	if fm.Tipo != "npc" || fm.Status != "vivo" {
		t.Errorf("Unexpected tipo/status: %+v", fm)
	}
	if fm.Etnia != "Alethi" || fm.Rol != "soldado" || fm.Faccion != "Bridge Four" {
		t.Errorf("Unexpected optional fields: %+v", fm)
	}
	if fm.CurrentLocation != "[[Urithiru]]" {
		t.Errorf("Expected current_location '[[Urithiru]]', got '%s'", fm.CurrentLocation)
	}
	if !slices.Equal(fm.Tags, []string{"protagonista", "spren-bond"}) {
		t.Errorf("Unexpected tags: %v", fm.Tags)
	}
}

func TestParseNPCMinimal(t *testing.T) {
	raw := []byte("tipo: spren\nstatus: consolidado")

	fm, err := ParseNPC(raw)
	if err != nil {
		t.Fatalf("ParseNPC failed: %v", err)
	}
	if fm.Tipo != "spren" || fm.Status != "consolidado" {
		t.Errorf("Unexpected tipo/status: %+v", fm)
	}
	if fm.Etnia != "" || fm.CurrentLocation != "" {
		t.Errorf("Expected empty optional fields, got %+v", fm)
	}
}

func TestParseLocation(t *testing.T) {
	raw := []byte("tipo: ciudad\nrelevancia: alta\nregion: Azir\nparent: \"[[Roshar]]\"")

	fm, err := ParseLocation(raw)
	if err != nil {
		t.Fatalf("ParseLocation failed: %v", err)
	}
	if fm.Tipo != "ciudad" || fm.Relevancia != "alta" || fm.Region != "Azir" {
		t.Errorf("Unexpected fields: %+v", fm)
	}
	if fm.Parent != "[[Roshar]]" {
		t.Errorf("Expected parent '[[Roshar]]', got '%s'", fm.Parent)
	}
}

func TestParseGroup(t *testing.T) {
	raw := []byte("tipo: faccion\nalineacion: neutral\nlider: \"[[Kaladin]]\"")

	fm, err := ParseGroup(raw)
	if err != nil {
		t.Fatalf("ParseGroup failed: %v", err)
	}
	if fm.Tipo != "faccion" || fm.Alineacion != "neutral" {
		t.Errorf("Unexpected fields: %+v", fm)
	}
	if fm.Lider != "[[Kaladin]]" {
		t.Errorf("Expected lider '[[Kaladin]]', got '%s'", fm.Lider)
	}
}

func TestParseSession(t *testing.T) {
	raw := []byte("tipo: sesion\nnumero: 12\narco: \"[[Arco-2]]\"\ndate: 2026-01-15\nestado: jugada")

	fm, err := ParseSession(raw)
	if err != nil {
		t.Fatalf("ParseSession failed: %v", err)
	}
	if fm.Tipo != "sesion" || fm.Numero != 12 || fm.Estado != "jugada" {
		t.Errorf("Unexpected fields: %+v", fm)
	}
	if fm.Date != "2026-01-15" {
		t.Errorf("Expected date '2026-01-15', got '%s'", fm.Date)
	}
	if fm.Arco != "[[Arco-2]]" {
		t.Errorf("Expected arco '[[Arco-2]]', got '%s'", fm.Arco)
	}
}

func TestParseSessionZeroNumber(t *testing.T) {
	raw := []byte("tipo: sesion\nnumero: 0\ndate: 2025-12-01\nestado: planificacion")

	fm, err := ParseSession(raw)
	if err != nil {
		t.Fatalf("ParseSession failed: %v", err)
	}
	if fm.Numero != 0 {
		t.Errorf("Expected numero 0 (sesion introductoria), got %d", fm.Numero)
	}
}

func TestParseJugador(t *testing.T) {
	raw := []byte("tipo: jugador\njugador: Nico\npersonaje: \"[[Shallan]]\"\nspren: \"[[Patrón]]\"")

	fm, err := ParseJugador(raw)
	if err != nil {
		t.Fatalf("ParseJugador failed: %v", err)
	}
	if fm.Tipo != "jugador" || fm.Jugador != "Nico" {
		t.Errorf("Unexpected fields: %+v", fm)
	}
	if fm.Personaje != "[[Shallan]]" {
		t.Errorf("Expected personaje '[[Shallan]]', got '%s'", fm.Personaje)
	}
	if fm.Spren != "[[Patrón]]" {
		t.Errorf("Expected spren '[[Patrón]]', got '%s'", fm.Spren)
	}
}

func TestParseArc(t *testing.T) {
	raw := []byte("tipo: arco\narco: 2\ntitulo: Shadesmar\nescenario: \"[[Shadesmar]]\"\nmision_principal: \"Sobrevivir\"\nstatus: planificado")

	fm, err := ParseArc(raw)
	if err != nil {
		t.Fatalf("ParseArc failed: %v", err)
	}
	if fm.Arco != 2 || fm.Titulo != "Shadesmar" || fm.Status != "planificado" {
		t.Errorf("Unexpected fields: %+v", fm)
	}
	if fm.Subarco != 0 {
		t.Errorf("Expected Subarco 0 when absent, got %d", fm.Subarco)
	}
}

func TestParseArcWithSubarco(t *testing.T) {
	raw := []byte("tipo: arco\narco: 2\nsubarco: 1\ntitulo: Shadesmar - parte 1\nstatus: en curso")

	fm, err := ParseArc(raw)
	if err != nil {
		t.Fatalf("ParseArc failed: %v", err)
	}
	if fm.Arco != 2 || fm.Subarco != 1 {
		t.Errorf("Expected arco 2 subarco 1, got %+v", fm)
	}
}

func TestParseInvalidYAML(t *testing.T) {
	raw := []byte("tipo: [unclosed")

	_, err := ParseNPC(raw)
	if err == nil {
		t.Error("Expected error for invalid YAML, got nil")
	}
}
