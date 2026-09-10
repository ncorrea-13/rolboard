package vault

import (
	"slices"
	"testing"
)

func TestExtractWikilinksSimple(t *testing.T) {
	links := ExtractWikilinks("Kaladin viajó a [[Kharbranth]] con [[Shallan]].")
	want := []string{"Kharbranth", "Shallan"}
	if !slices.Equal(links, want) {
		t.Errorf("Expected %v, got %v", want, links)
	}
}

func TestExtractWikilinksWithAlias(t *testing.T) {
	links := ExtractWikilinks("Fue a [[Tashikk|la ciudad de los mercados]].")
	want := []string{"Tashikk"}
	if !slices.Equal(links, want) {
		t.Errorf("Expected %v, got %v", want, links)
	}
}

func TestExtractWikilinksTrimsSpaces(t *testing.T) {
	links := ExtractWikilinks("Viven en [[ Urithiru ]].")
	want := []string{"Urithiru"}
	if !slices.Equal(links, want) {
		t.Errorf("Expected %v, got %v", want, links)
	}
}

func TestExtractWikilinksNone(t *testing.T) {
	links := ExtractWikilinks("Texto sin ningún link.")
	if len(links) != 0 {
		t.Errorf("Expected 0 links, got %v", links)
	}
}

func TestExtractWikilinksDuplicatesPreserved(t *testing.T) {
	links := ExtractWikilinks("[[Kaladin]] habló con [[Kaladin]] otra vez.")
	want := []string{"Kaladin", "Kaladin"}
	if !slices.Equal(links, want) {
		t.Errorf("Expected duplicates preserved %v, got %v", want, links)
	}
}

func TestExtractWikilinksEmbed(t *testing.T) {
	links := ExtractWikilinks("![[Kaladin]]")
	want := []string{"Kaladin"}
	if !slices.Equal(links, want) {
		t.Errorf("Expected %v, got %v", want, links)
	}
}
