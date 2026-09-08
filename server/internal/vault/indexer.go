package vault

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

// Result resume lo que hizo un Reindex — ver POST /api/admin/reindex en API.md.
type Result struct {
	Processed           int
	UnresolvedWikilinks []string
	Conflicts           []string
	Errors              []string
}

// Indexer orquesta el indexado completo de un vault para una única campaña.
// Un vault = una campaña fija (decisión explícita del usuario, ver AGENTS.md).
type Indexer struct {
	root             string
	campaignID       int64
	db               *sql.DB
	locations        *repository.LocationRepository
	npcs             *repository.NPCRepository
	groups           *repository.GroupRepository
	sessions         *repository.SessionRepository
	arcs             *repository.ArcRepository
	playerCharacters *repository.PlayerCharacterRepository
}

func NewIndexer(root string, campaignID int64, db *sql.DB) *Indexer {
	return &Indexer{
		root:             root,
		campaignID:       campaignID,
		db:               db,
		locations:        repository.NewLocationRepository(db),
		npcs:             repository.NewNPCRepository(db),
		groups:           repository.NewGroupRepository(db),
		sessions:         repository.NewSessionRepository(db),
		arcs:             repository.NewArcRepository(db),
		playerCharacters: repository.NewPlayerCharacterRepository(db),
	}
}

// locationTypeMap traduce el "tipo" del frontmatter del vault al enum real
// de la columna location_type (CHECK constraint en 0001_initial_schema.sql).
// estructura->site y shadesmar->plane son mapeos aproximados, confirmados
// con el usuario (no hay un tipo 1:1 en el schema actual).
var locationTypeMap = map[string]string{
	"ciudad":     "city",
	"región":     "region",
	"planeta":    "planet",
	"estructura": "site",
	"shadesmar":  "plane",
}

// firstWikilinkTarget devuelve el nombre real dentro de un campo frontmatter
// tipo "[[Nombre]]" ("" si el campo está vacío o no tiene wikilink).
func firstWikilinkTarget(raw string) string {
	links := ExtractWikilinks(raw)
	if len(links) == 0 {
		return ""
	}
	return links[0]
}

type stagedLocation struct {
	id     int64
	parent string
}

type stagedNPC struct {
	id         int64
	location   string
	vinculoCon string
	faccion    string
}

type stagedSession struct {
	id   int64
	arco string
}

// Reindex hace las dos pasadas descritas en VAULT_INDEXER.md: primero crea
// cada entidad (sin resolver relaciones todavía) y las registra en el
// índice de nombres; después resuelve los wikilinks a IDs reales y
// actualiza las FKs / tablas puente.
func (ix *Indexer) Reindex(ctx context.Context) (*Result, error) {
	result := &Result{}

	paths, err := Walk(ix.root)
	if err != nil {
		return nil, err
	}

	idx := NewNameIndex()
	var stagedLocations []stagedLocation
	var stagedNPCs []stagedNPC
	var stagedSessions []stagedSession

	for _, relPath := range paths {
		full := filepath.Join(ix.root, relPath)
		content, err := os.ReadFile(full)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", relPath, err))
			continue
		}

		entityType, ok := entityTypeForPath(relPath)
		if !ok {
			continue
		}

		raw, _, err := Split(content)
		if err != nil {
			// Sin frontmatter -> contenido narrativo asociado (ej. Historia.md
			// de un jugador), no es una entidad propia. Se ignora, no es error.
			continue
		}

		name := strings.TrimSuffix(filepath.Base(relPath), filepath.Ext(relPath))
		obsidianPath := relPath

		switch entityType {
		case "location":
			fm, err := ParseLocation(raw)
			if err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", relPath, err))
				continue
			}
			locationType, ok := locationTypeMap[fm.Tipo]
			if !ok {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: tipo de location desconocido '%s'", relPath, fm.Tipo))
				continue
			}
			loc := &models.Location{
				CampaignID:   ix.campaignID,
				Name:         name,
				LocationType: locationType,
				ObsidianPath: &obsidianPath,
			}
			if err := ix.locations.Create(ctx, loc); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", relPath, err))
				continue
			}
			idx.Add(IndexEntry{ID: loc.ID, Name: name, Type: "location", RawPath: relPath})
			stagedLocations = append(stagedLocations, stagedLocation{id: loc.ID, parent: firstWikilinkTarget(fm.Parent)})
			result.Processed++

		case "npc":
			fm, err := ParseNPC(raw)
			if err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", relPath, err))
				continue
			}
			npc := &models.NPC{
				CampaignID:   ix.campaignID,
				Name:         name,
				NPCKind:      fm.Tipo,
				DetailLevel:  "full",
				Status:       fm.Status,
				ObsidianPath: &obsidianPath,
			}
			if fm.Etnia != "" {
				npc.Etnia = &fm.Etnia
			}
			if fm.Rol != "" {
				npc.Rol = &fm.Rol
			}
			if fm.TipoSpren != "" {
				npc.TipoSpren = &fm.TipoSpren
			}
			if err := ix.npcs.Create(ctx, npc); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", relPath, err))
				continue
			}
			idx.Add(IndexEntry{ID: npc.ID, Name: name, Type: "npc", RawPath: relPath})
			stagedNPCs = append(stagedNPCs, stagedNPC{
				id:         npc.ID,
				location:   firstWikilinkTarget(fm.CurrentLocation),
				vinculoCon: firstWikilinkTarget(fm.VinculoCon),
				faccion:    firstWikilinkTarget(fm.Faccion),
			})
			result.Processed++

		case "group":
			// ponytail: los campos propios de Group (alineacion, astilla,
			// investidura, lider) no tienen columna en la tabla groups (solo
			// name/description/notes) — no se persisten, agregar columnas si
			// llegan a hacer falta.
			if _, err := ParseGroup(raw); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", relPath, err))
				continue
			}
			group := &models.Group{
				CampaignID:   ix.campaignID,
				Name:         name,
				ObsidianPath: &obsidianPath,
			}
			if err := ix.groups.Create(ctx, group); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", relPath, err))
				continue
			}
			idx.Add(IndexEntry{ID: group.ID, Name: name, Type: "group", RawPath: relPath})
			result.Processed++

		case "session":
			fm, err := ParseSession(raw)
			if err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", relPath, err))
				continue
			}
			session := &models.Session{
				CampaignID: ix.campaignID,
				// ponytail: session_type siempre "session", el frontmatter real no
				// distingue interlude/planning todavía — ajustar cuando el vault lo marque.
				SessionType:   "session",
				SessionNumber: int64(fm.Numero),
				Date:          fm.Date,
				Summary:       fm.Estado,
				ObsidianPath:  &obsidianPath,
			}
			if err := ix.sessions.Create(ctx, session); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", relPath, err))
				continue
			}
			idx.Add(IndexEntry{ID: session.ID, Name: name, Type: "session", RawPath: relPath})
			stagedSessions = append(stagedSessions, stagedSession{id: session.ID, arco: firstWikilinkTarget(fm.Arco)})
			result.Processed++

		case "arc":
			fm, err := ParseArc(raw)
			if err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", relPath, err))
				continue
			}
			arc := &models.Arc{
				CampaignID: ix.campaignID,
				Title:      fm.Titulo,
				Order:      int64(fm.Arco),
				Summary:    fm.MisionPrincipal,
			}
			if err := ix.arcs.Create(ctx, arc); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", relPath, err))
				continue
			}
			idx.Add(IndexEntry{ID: arc.ID, Name: name, Type: "arc", RawPath: relPath})
			result.Processed++

		case "player_character":
			fm, err := ParseJugador(raw)
			if err != nil {
				// Historia.md / Avances.md / la ficha del personaje en sí no
				// tienen "tipo: jugador" -> no son la nota jugador. Se ignoran.
				continue
			}
			// ponytail: CharacterName queda como el nombre crudo del wikilink de
			// "personaje", no se resuelve contra la ficha real todavía (matching
			// de Jugadores/<Nombre>/ descrito en VAULT_INDEXER.md queda pendiente).
			characterName := firstWikilinkTarget(fm.Personaje)
			if characterName == "" {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: sin campo 'personaje'", relPath))
				continue
			}
			pc := &models.PlayerCharacter{
				CampaignID:    ix.campaignID,
				PlayerName:    fm.Jugador,
				CharacterName: characterName,
				ObsidianPath:  &obsidianPath,
			}
			if err := ix.playerCharacters.Create(ctx, pc); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", relPath, err))
				continue
			}
			idx.Add(IndexEntry{ID: pc.ID, Name: name, Type: "player_character", RawPath: relPath})
			result.Processed++
		}
	}

	ix.resolveLocations(ctx, idx, stagedLocations, result)
	ix.resolveNPCs(ctx, idx, stagedNPCs, result)
	ix.resolveSessions(ctx, idx, stagedSessions, result)

	return result, nil
}

func (ix *Indexer) resolveLocations(ctx context.Context, idx *NameIndex, staged []stagedLocation, result *Result) {
	for _, sl := range staged {
		if sl.parent == "" {
			continue
		}
		parentID, err := Resolve(idx, sl.parent, "location")
		if err != nil {
			result.UnresolvedWikilinks = append(result.UnresolvedWikilinks, sl.parent)
			continue
		}
		loc, err := ix.locations.GetByID(ctx, sl.id)
		if err != nil {
			result.Errors = append(result.Errors, err.Error())
			continue
		}
		loc.ParentLocationID = &parentID
		if err := ix.locations.Update(ctx, sl.id, loc); err != nil {
			result.Errors = append(result.Errors, err.Error())
		}
	}
}

func (ix *Indexer) resolveNPCs(ctx context.Context, idx *NameIndex, staged []stagedNPC, result *Result) {
	for _, sn := range staged {
		npc, err := ix.npcs.GetByID(ctx, sn.id)
		if err != nil {
			result.Errors = append(result.Errors, err.Error())
			continue
		}

		changed := false
		if sn.location != "" {
			if locationID, err := Resolve(idx, sn.location, "location"); err == nil {
				npc.LocationID = &locationID
				changed = true
			} else {
				result.UnresolvedWikilinks = append(result.UnresolvedWikilinks, sn.location)
			}
		}
		if sn.vinculoCon != "" {
			if vinculoID, err := Resolve(idx, sn.vinculoCon, "npc"); err == nil {
				npc.VinculoCon = &vinculoID
				changed = true
			} else {
				result.UnresolvedWikilinks = append(result.UnresolvedWikilinks, sn.vinculoCon)
			}
		}
		if changed {
			if err := ix.npcs.Update(ctx, sn.id, npc); err != nil {
				result.Errors = append(result.Errors, err.Error())
			}
		}

		if sn.faccion != "" {
			groupID, err := Resolve(idx, sn.faccion, "group")
			if err != nil {
				result.UnresolvedWikilinks = append(result.UnresolvedWikilinks, sn.faccion)
				continue
			}
			if _, err := ix.db.ExecContext(ctx,
				`INSERT OR IGNORE INTO npc_groups (npc_id, group_id) VALUES (?, ?)`,
				sn.id, groupID,
			); err != nil {
				result.Errors = append(result.Errors, err.Error())
			}
		}
	}
}

func (ix *Indexer) resolveSessions(ctx context.Context, idx *NameIndex, staged []stagedSession, result *Result) {
	for _, ss := range staged {
		if ss.arco == "" {
			continue
		}
		arcID, err := Resolve(idx, ss.arco, "arc")
		if err != nil {
			result.UnresolvedWikilinks = append(result.UnresolvedWikilinks, ss.arco)
			continue
		}
		session, err := ix.sessions.GetByID(ctx, ss.id)
		if err != nil {
			result.Errors = append(result.Errors, err.Error())
			continue
		}
		session.ArcID = &arcID
		if err := ix.sessions.Update(ctx, ss.id, session); err != nil {
			result.Errors = append(result.Errors, err.Error())
		}
	}
}
