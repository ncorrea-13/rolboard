package vault

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"strings"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

func contentHash(content []byte) string {
	sum := sha256.Sum256(content)
	return hex.EncodeToString(sum[:])
}

type Result struct {
	Processed           int
	UnresolvedWikilinks []string
	Conflicts           []string
	Errors              []string
}

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
	fileState        *repository.VaultFileStateRepository
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
		fileState:        repository.NewVaultFileStateRepository(db),
	}
}

func (ix *Indexer) skipUnchanged(ctx context.Context, idx *NameIndex, relPath, name, entityType string, content []byte) bool {
	hash := contentHash(content)
	state, err := ix.fileState.Get(ctx, ix.campaignID, relPath)
	if err != nil || state.ContentHash != hash {
		return false
	}
	idx.Add(IndexEntry{ID: state.EntityID, Name: name, Type: entityType, RawPath: relPath})
	return true
}

var locationTypeMap = map[string]string{
	"ciudad":     "city",
	"región":     "region",
	"planeta":    "planet",
	"estructura": "site",
	"shadesmar":  "plane",
}

var playedStatuses = map[string]bool{
	"completada": true,
	"jugada":     true,
}

var arcStatuses = map[string]string{
	"planificado": "planificado",
	"en curso":    "en_curso",
	"cerrado":     "cerrado",
}

func arcStatus(raw string) string {
	if status, ok := arcStatuses[strings.ToLower(raw)]; ok {
		return status
	}
	return "planificado"
}

var validPCStatuses = map[string]bool{
	"vivo":         true,
	"muerto":       true,
	"desaparecido": true,
	"activo":       true,
}

func pcStatus(raw string) string {
	if validPCStatuses[strings.ToLower(raw)] {
		return strings.ToLower(raw)
	}
	return "activo"
}

func sessionType(tags []string, status string) string {
	for _, tag := range tags {
		if tag == "campaña/interludio" {
			return "interlude"
		}
	}
	if playedStatuses[strings.ToLower(status)] {
		return "session"
	}
	return "planning"
}

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

type stagedGroup struct {
	id    int64
	lider string
}

type stagedNPC struct {
	id         int64
	location   string
	vinculoCon string
	facciones  []string
}

type stagedPC struct {
	id        int64
	spren     string
	facciones []string
}

type stagedPlayerNote struct {
	personaje string
	path      string
	kind      string // "historia" o "avances"
}

type stagedSession struct {
	id   int64
	arco string
	body string
}

func (ix *Indexer) Reindex(ctx context.Context) (*Result, error) {
	result := &Result{}

	paths, err := Walk(ix.root)
	if err != nil {
		return nil, err
	}

	stalePaths, err := ix.snapshotObsidianPaths(ctx)
	if err != nil {
		return nil, err
	}

	seenPaths := make(map[string]bool)
	idx := NewNameIndex()
	var stagedLocations []stagedLocation
	var stagedNPCs []stagedNPC
	var stagedPCs []stagedPC
	var stagedSessions []stagedSession
	var stagedGroups []stagedGroup
	var stagedPlayerNotes []stagedPlayerNote

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

		raw, body, err := Split(content)
		if err != nil {
			continue
		}

		name := strings.TrimSuffix(filepath.Base(relPath), filepath.Ext(relPath))
		obsidianPath := relPath
		seenPaths[relPath] = true

		switch entityType {
		case "location":
			if ix.skipUnchanged(ctx, idx, relPath, name, "location", content) {
				result.Processed++
				continue
			}
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
			if err := ix.fileState.Set(ctx, ix.campaignID, relPath, contentHash(content), "location", loc.ID); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", relPath, err))
			}
			stagedLocations = append(stagedLocations, stagedLocation{id: loc.ID, parent: firstWikilinkTarget(fm.Parent)})
			result.Processed++

		case "npc":
			if ix.skipUnchanged(ctx, idx, relPath, name, "npc", content) {
				result.Processed++
				continue
			}
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
			if err := ix.fileState.Set(ctx, ix.campaignID, relPath, contentHash(content), "npc", npc.ID); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", relPath, err))
			}
			var facciones []string
			for _, raw := range fm.Faccion {
				if target := firstWikilinkTarget(raw); target != "" {
					facciones = append(facciones, target)
				}
			}
			stagedNPCs = append(stagedNPCs, stagedNPC{
				id:         npc.ID,
				location:   firstWikilinkTarget(fm.CurrentLocation),
				vinculoCon: firstWikilinkTarget(fm.VinculoCon),
				facciones:  facciones,
			})
			result.Processed++

		case "group":
			if ix.skipUnchanged(ctx, idx, relPath, name, "group", content) {
				result.Processed++
				continue
			}
			fm, err := ParseGroup(raw)
			if err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", relPath, err))
				continue
			}
			group := &models.Group{
				CampaignID:   ix.campaignID,
				Name:         name,
				Alineacion:   fm.Alineacion,
				ObsidianPath: &obsidianPath,
			}
			if err := ix.groups.Create(ctx, group); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", relPath, err))
				continue
			}
			idx.Add(IndexEntry{ID: group.ID, Name: name, Type: "group", RawPath: relPath})
			if err := ix.fileState.Set(ctx, ix.campaignID, relPath, contentHash(content), "group", group.ID); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", relPath, err))
			}
			stagedGroups = append(stagedGroups, stagedGroup{id: group.ID, lider: firstWikilinkTarget(fm.Lider)})
			result.Processed++

		case "session":
			fm, err := ParseSession(raw)
			if err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", relPath, err))
				continue
			}
			archived := strings.Contains(name, "ARCHIVADO")
			sessionNumber := int64(math.Trunc(fm.Numero))
			subNumber := int64(math.Round((fm.Numero - math.Trunc(fm.Numero)) * 10))
			if archived {
				subNumber = 99
			}
			status := fm.Status
			if status == "" {
				status = fm.Estado
			}
			session := &models.Session{
				CampaignID:    ix.campaignID,
				SessionType:   sessionType(fm.Tags, status),
				SessionNumber: sessionNumber,
				SubNumber:     subNumber,
				Date:          fm.Date,
				Summary:       fm.Titulo,
				ObsidianPath:  &obsidianPath,
			}
			if err := ix.sessions.Create(ctx, session); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", relPath, err))
				continue
			}
			if archived {
				if err := ix.sessions.Delete(ctx, session.ID); err != nil && err != repository.ErrNotFound {
					result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", relPath, err))
				}
				continue
			}
			idx.Add(IndexEntry{ID: session.ID, Name: name, Type: "session", RawPath: relPath})
			stagedSessions = append(stagedSessions, stagedSession{id: session.ID, arco: firstWikilinkTarget(fm.Arco), body: string(body)})
			result.Processed++

		case "arc":
			fm, err := ParseArc(raw)
			if err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", relPath, err))
				continue
			}
			var subarcOrder *int64
			if fm.Subarco != 0 {
				s := int64(fm.Subarco)
				subarcOrder = &s
			}
			arc := &models.Arc{
				CampaignID:   ix.campaignID,
				Title:        fm.Titulo,
				Order:        int64(fm.Arco),
				Status:       arcStatus(fm.Status),
				SubarcOrder:  subarcOrder,
				Summary:      fm.MisionPrincipal,
				ObsidianPath: &obsidianPath,
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
				continue
			}

			switch fm.Tipo {
			case "jugador":
				if ix.skipUnchanged(ctx, idx, relPath, name, "player_character", content) {
					result.Processed++
					continue
				}
				pc := &models.PlayerCharacter{
					CampaignID:    ix.campaignID,
					PlayerName:    fm.Jugador,
					CharacterName: name,
					Race:          fm.Raza,
					Status:        pcStatus(fm.Status),
					ObsidianPath:  &obsidianPath,
				}
				if err := ix.playerCharacters.Create(ctx, pc); err != nil {
					result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", relPath, err))
					continue
				}
				idx.Add(IndexEntry{ID: pc.ID, Name: name, Type: "player_character", RawPath: relPath})
				if err := ix.fileState.Set(ctx, ix.campaignID, relPath, contentHash(content), "player_character", pc.ID); err != nil {
					result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", relPath, err))
				}
				var pcFacciones []string
				for _, raw := range fm.Facciones {
					if target := firstWikilinkTarget(raw); target != "" {
						pcFacciones = append(pcFacciones, target)
					}
				}
				stagedPCs = append(stagedPCs, stagedPC{id: pc.ID, spren: firstWikilinkTarget(fm.Spren), facciones: pcFacciones})
				result.Processed++
			case "historia-jugador", "avances":
				personaje := firstWikilinkTarget(fm.Personaje)
				if personaje == "" {
					continue
				}
				kind := "historia"
				if fm.Tipo == "avances" {
					kind = "avances"
				}
				stagedPlayerNotes = append(stagedPlayerNotes, stagedPlayerNote{personaje: personaje, path: obsidianPath, kind: kind})
				result.Processed++
			default:
				// ponytail: fichas extra bajo Jugadores/ sin tipo:jugador/historia-jugador/avances
				// (ej. hojas de clase) no se indexan, no hay caso de uso todavía.
			}
		}
	}

	ix.resolveLocations(ctx, idx, stagedLocations, result)
	ix.resolveNPCs(ctx, idx, stagedNPCs, result)
	ix.resolvePCs(ctx, idx, stagedPCs, result)
	ix.resolveSessions(ctx, idx, stagedSessions, result)
	ix.resolveGroups(ctx, idx, stagedGroups, result)
	ix.resolvePlayerNotes(ctx, idx, stagedPlayerNotes, result)

	ix.deleteStalePaths(ctx, stalePaths, seenPaths, result)

	return result, nil
}

type obsidianPathSnapshot struct {
	locations        map[string]int64
	npcs             map[string]int64
	groups           map[string]int64
	sessions         map[string]int64
	playerCharacters map[string]int64
}

func (ix *Indexer) snapshotObsidianPaths(ctx context.Context) (obsidianPathSnapshot, error) {
	snap := obsidianPathSnapshot{
		locations:        make(map[string]int64),
		npcs:             make(map[string]int64),
		groups:           make(map[string]int64),
		sessions:         make(map[string]int64),
		playerCharacters: make(map[string]int64),
	}

	locations, err := ix.locations.List(ctx, ix.campaignID)
	if err != nil {
		return snap, err
	}
	for _, l := range locations {
		if l.ObsidianPath != nil {
			snap.locations[*l.ObsidianPath] = l.ID
		}
	}

	npcs, err := ix.npcs.List(ctx, ix.campaignID)
	if err != nil {
		return snap, err
	}
	for _, n := range npcs {
		if n.ObsidianPath != nil {
			snap.npcs[*n.ObsidianPath] = n.ID
		}
	}

	groups, err := ix.groups.List(ctx, ix.campaignID)
	if err != nil {
		return snap, err
	}
	for _, g := range groups {
		if g.ObsidianPath != nil {
			snap.groups[*g.ObsidianPath] = g.ID
		}
	}

	sessions, err := ix.sessions.List(ctx, ix.campaignID)
	if err != nil {
		return snap, err
	}
	for _, s := range sessions {
		if s.ObsidianPath != nil {
			snap.sessions[*s.ObsidianPath] = s.ID
		}
	}

	playerCharacters, err := ix.playerCharacters.List(ctx, ix.campaignID)
	if err != nil {
		return snap, err
	}
	for _, p := range playerCharacters {
		if p.ObsidianPath != nil {
			snap.playerCharacters[*p.ObsidianPath] = p.ID
		}
	}

	return snap, nil
}

func (ix *Indexer) deleteStalePaths(ctx context.Context, stale obsidianPathSnapshot, seen map[string]bool, result *Result) {
	for path, id := range stale.locations {
		if !seen[path] {
			if err := ix.locations.Delete(ctx, id); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", path, err))
			}
		}
	}
	for path, id := range stale.npcs {
		if !seen[path] {
			if err := ix.npcs.Delete(ctx, id); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", path, err))
			}
		}
	}
	for path, id := range stale.groups {
		if !seen[path] {
			if err := ix.groups.Delete(ctx, id); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", path, err))
			}
		}
	}
	for path, id := range stale.sessions {
		if !seen[path] {
			if err := ix.sessions.Delete(ctx, id); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", path, err))
			}
		}
	}
	for path, id := range stale.playerCharacters {
		if !seen[path] {
			if err := ix.playerCharacters.Delete(ctx, id); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", path, err))
			}
		}
	}
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
		if changed {
			if err := ix.npcs.Update(ctx, sn.id, npc); err != nil {
				result.Errors = append(result.Errors, err.Error())
			}
		}

		if _, err := ix.db.ExecContext(ctx, `DELETE FROM npc_relations WHERE from_npc_id = ? AND role = 'vinculado_a'`, sn.id); err != nil {
			result.Errors = append(result.Errors, err.Error())
			continue
		}
		if sn.vinculoCon != "" {
			if vinculoID, err := Resolve(idx, sn.vinculoCon, "npc"); err == nil {
				if err := ix.npcs.CreateRelation(ctx, &models.NPCRelation{FromNPCID: sn.id, ToNPCID: vinculoID, Role: "vinculado_a"}); err != nil {
					result.Errors = append(result.Errors, err.Error())
				}
			} else {
				result.UnresolvedWikilinks = append(result.UnresolvedWikilinks, sn.vinculoCon)
			}
		}

		if _, err := ix.db.ExecContext(ctx, `DELETE FROM npc_groups WHERE npc_id = ?`, sn.id); err != nil {
			result.Errors = append(result.Errors, err.Error())
			continue
		}
		for _, faccion := range sn.facciones {
			groupID, err := Resolve(idx, faccion, "group")
			if err != nil {
				result.UnresolvedWikilinks = append(result.UnresolvedWikilinks, faccion)
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

func (ix *Indexer) resolveGroups(ctx context.Context, idx *NameIndex, staged []stagedGroup, result *Result) {
	for _, sg := range staged {
		if sg.lider == "" {
			continue
		}
		group, err := ix.groups.GetByID(ctx, sg.id)
		if err != nil {
			result.Errors = append(result.Errors, err.Error())
			continue
		}
		liderID, err := Resolve(idx, sg.lider, "npc")
		if err != nil {
			result.UnresolvedWikilinks = append(result.UnresolvedWikilinks, sg.lider)
			continue
		}
		group.LiderNPCID = &liderID
		if err := ix.groups.Update(ctx, sg.id, group); err != nil {
			result.Errors = append(result.Errors, err.Error())
		}
	}
}

func (ix *Indexer) resolvePlayerNotes(ctx context.Context, idx *NameIndex, staged []stagedPlayerNote, result *Result) {
	for _, sn := range staged {
		pcID, err := Resolve(idx, sn.personaje, "player_character")
		if err != nil {
			result.UnresolvedWikilinks = append(result.UnresolvedWikilinks, sn.personaje)
			continue
		}
		column := "historia_path"
		if sn.kind == "avances" {
			column = "avances_path"
		}
		if _, err := ix.db.ExecContext(ctx, `UPDATE player_characters SET `+column+` = ? WHERE id = ?`, sn.path, pcID); err != nil {
			result.Errors = append(result.Errors, err.Error())
		}
	}
}

func (ix *Indexer) resolvePCs(ctx context.Context, idx *NameIndex, staged []stagedPC, result *Result) {
	for _, sp := range staged {
		if sp.spren != "" {
			if sprenID, err := Resolve(idx, sp.spren, "npc"); err == nil {
				if _, err := ix.db.ExecContext(ctx, `UPDATE player_characters SET spren_npc_id = ? WHERE id = ?`, sprenID, sp.id); err != nil {
					result.Errors = append(result.Errors, err.Error())
				}
			} else {
				result.UnresolvedWikilinks = append(result.UnresolvedWikilinks, sp.spren)
			}
		}

		if _, err := ix.db.ExecContext(ctx, `DELETE FROM pc_groups WHERE pc_id = ?`, sp.id); err != nil {
			result.Errors = append(result.Errors, err.Error())
			continue
		}
		for _, faccion := range sp.facciones {
			groupID, err := Resolve(idx, faccion, "group")
			if err != nil {
				result.UnresolvedWikilinks = append(result.UnresolvedWikilinks, faccion)
				continue
			}
			if _, err := ix.db.ExecContext(ctx,
				`INSERT OR IGNORE INTO pc_groups (pc_id, group_id) VALUES (?, ?)`,
				sp.id, groupID,
			); err != nil {
				result.Errors = append(result.Errors, err.Error())
			}
		}
	}
}

func (ix *Indexer) resolveSessions(ctx context.Context, idx *NameIndex, staged []stagedSession, result *Result) {
	for _, ss := range staged {
		if ss.arco != "" {
			arcID, err := Resolve(idx, ss.arco, "arc")
			if err != nil {
				result.UnresolvedWikilinks = append(result.UnresolvedWikilinks, ss.arco)
			} else {
				session, err := ix.sessions.GetByID(ctx, ss.id)
				if err != nil {
					result.Errors = append(result.Errors, err.Error())
				} else {
					session.ArcID = &arcID
					if err := ix.sessions.Update(ctx, ss.id, session); err != nil {
						result.Errors = append(result.Errors, err.Error())
					}
				}
			}
		}

		ix.linkSessionEntities(ctx, idx, ss, result)
	}
}

func (ix *Indexer) linkSessionEntities(ctx context.Context, idx *NameIndex, ss stagedSession, result *Result) {
	if _, err := ix.db.ExecContext(ctx, `DELETE FROM session_npcs WHERE session_id = ?`, ss.id); err != nil {
		result.Errors = append(result.Errors, err.Error())
		return
	}
	if _, err := ix.db.ExecContext(ctx, `DELETE FROM session_pcs WHERE session_id = ?`, ss.id); err != nil {
		result.Errors = append(result.Errors, err.Error())
		return
	}

	seen := make(map[string]bool)
	for _, link := range ExtractWikilinks(ss.body) {
		if seen[link] {
			continue
		}
		seen[link] = true

		for _, entry := range idx.Lookup(link) {
			var query string
			switch entry.Type {
			case "npc":
				query = `INSERT OR IGNORE INTO session_npcs (session_id, npc_id) VALUES (?, ?)`
			case "player_character":
				query = `INSERT OR IGNORE INTO session_pcs (session_id, pc_id) VALUES (?, ?)`
			default:
				continue
			}
			if _, err := ix.db.ExecContext(ctx, query, ss.id, entry.ID); err != nil {
				result.Errors = append(result.Errors, err.Error())
			}
		}
	}
}
