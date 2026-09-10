package vault

import (
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

var folderToEntityType = map[string]string{
	"NPC":        "npc",
	"Locaciones": "location",
	"Grupos":     "group",
	"Sesiones":   "session",
	"Jugadores":  "player_character",
	"Arcos":      "arc",
}

type ArcFrontmatter struct {
	Tipo            string   `yaml:"tipo"`
	Arco            int      `yaml:"arco"`
	Subarco         int      `yaml:"subarco,omitempty"`
	Titulo          string   `yaml:"titulo"`
	Escenario       string   `yaml:"escenario,omitempty"`
	MisionPrincipal string   `yaml:"mision_principal,omitempty"`
	Status          string   `yaml:"status"`
	Tags            []string `yaml:"tags,omitempty"`
}

type NPCFrontmatter struct {
	Tipo            string   `yaml:"tipo"`
	Status          string   `yaml:"status"`
	Etnia           string   `yaml:"etnia,omitempty"`
	Rol             string   `yaml:"rol,omitempty"`
	Faccion         []string `yaml:"faccion,omitempty"`
	VinculoCon      string   `yaml:"vinculo_con,omitempty"`
	TipoSpren       string   `yaml:"tipo_spren,omitempty"`
	CurrentLocation string   `yaml:"current_location,omitempty"`
	Tags            []string `yaml:"tags,omitempty"`
}

type LocationFrontmatter struct {
	Tipo               string   `yaml:"tipo"`
	Relevancia         string   `yaml:"relevancia"`
	Region             string   `yaml:"region,omitempty"`
	FaccionesPresentes []string `yaml:"facciones_presentes,omitempty"`
	Parent             string   `yaml:"parent,omitempty"`
	Tags               []string `yaml:"tags,omitempty"`
}

type GroupFrontmatter struct {
	Tipo        string   `yaml:"tipo"`
	Alineacion  string   `yaml:"alineacion"`
	Alcance     string   `yaml:"alcance,omitempty"`
	Astilla     string   `yaml:"astilla,omitempty"`
	Investidura string   `yaml:"investidura,omitempty"`
	Lider       string   `yaml:"lider,omitempty"`
	Tags        []string `yaml:"tags,omitempty"`
}

type SessionFrontmatter struct {
	Tipo   string   `yaml:"tipo"`
	Numero float64  `yaml:"numero"`
	Arco   string   `yaml:"arco,omitempty"`
	Date   string   `yaml:"fecha"`
	Status string   `yaml:"status,omitempty"`
	Estado string   `yaml:"estado"`
	Titulo string   `yaml:"titulo,omitempty"`
	Pov    string   `yaml:"pov,omitempty"`
	Tags   []string `yaml:"tags,omitempty"`
}

type JugadorFrontmatter struct {
	Tipo      string   `yaml:"tipo"`
	Jugador   string   `yaml:"jugador"`
	Personaje string   `yaml:"personaje"`
	Spren     string   `yaml:"spren,omitempty"`
	Origen    string   `yaml:"origen,omitempty"`
	Raza      string   `yaml:"raza,omitempty"`
	Facciones []string `yaml:"facciones,omitempty"`
	// ponytail: el campo real en las notas del vault es "status", no "estado"
	// (bug: nunca matcheaba nada). Ver docs/DECISIONS.md.
	Status string `yaml:"status,omitempty"`
}

func ParseArc(raw []byte) (ArcFrontmatter, error) {
	var fm ArcFrontmatter
	err := yaml.Unmarshal(raw, &fm)
	return fm, err
}

func entityTypeForPath(relPath string) (string, bool) {
	topFolder := strings.SplitN(relPath, string(filepath.Separator), 2)[0]
	entityType, ok := folderToEntityType[topFolder]
	return entityType, ok
}

func ParseNPC(raw []byte) (NPCFrontmatter, error) {
	var fm NPCFrontmatter
	err := yaml.Unmarshal(raw, &fm)
	return fm, err
}

func ParseGroup(raw []byte) (GroupFrontmatter, error) {
	var fm GroupFrontmatter
	err := yaml.Unmarshal(raw, &fm)
	return fm, err
}

func ParseLocation(raw []byte) (LocationFrontmatter, error) {
	var fm LocationFrontmatter
	err := yaml.Unmarshal(raw, &fm)
	return fm, err
}

func ParseSession(raw []byte) (SessionFrontmatter, error) {
	var fm SessionFrontmatter
	err := yaml.Unmarshal(raw, &fm)
	return fm, err
}

func ParseJugador(raw []byte) (JugadorFrontmatter, error) {
	var fm JugadorFrontmatter
	err := yaml.Unmarshal(raw, &fm)
	return fm, err
}
