// Package export writes a campaign as a zip of Markdown notes and their images.
package export

import (
	"archive/zip"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"gopkg.in/yaml.v3"

	"github.com/ncorrea-13/rolboard/server/internal/imagestore"
	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

func Write(ctx context.Context, db *sql.DB, uploadsRoot string, campaignID int64, w io.Writer) error {
	b := &builder{ctx: ctx, db: db, uploadsRoot: uploadsRoot, campaignID: campaignID, zw: zip.NewWriter(w)}
	if err := b.load(); err != nil {
		return err
	}
	b.writeAll()
	if b.err != nil {
		return b.err
	}
	return b.zw.Close()
}

type rawNum string

type kv struct {
	key string
	val any
}

type builder struct {
	ctx         context.Context
	db          *sql.DB
	uploadsRoot string
	campaignID  int64
	zw          *zip.Writer
	err         error

	campaign   *models.Campaign
	arcs       []models.Arc
	sessions   []models.Session
	locations  []models.Location
	npcs       []models.NPC
	pcs        []models.PlayerCharacter
	groups     []models.Group
	quests     []models.Quest
	lore       []models.LoreEntry
	categories []models.LoreCategory
	secrets    []models.Secret
	notes      []models.LooseNote
	items      []models.Item
	currencies []models.Currency
	timelines  []models.Timeline
	events     []models.TimelineEvent
	encounters []models.Encounter

	arcName, sessionName, locationName, npcName, pcName, groupName map[int64]string
	questName, loreName, itemName, currencyName                    map[int64]string
	categoryLabel                                                  map[int64]string
	used                                                           map[string]bool

	npcGroups, pcGroups map[int64][]string
	groupMembers        map[int64][]string
	sessionPCs          map[int64][]int64

	npcRepo       *repository.NPCRepository
	sessionRepo   *repository.SessionRepository
	questRepo     *repository.QuestRepository
	inventoryRepo *repository.InventoryRepository
	shopRepo      *repository.ShopRepository
	groupRepo     *repository.GroupRepository
	participants  *repository.EncounterParticipantRepository
}

func (b *builder) load() error {
	ctx, id, db := b.ctx, b.campaignID, b.db
	b.npcRepo = repository.NewNPCRepository(db)
	b.sessionRepo = repository.NewSessionRepository(db)
	b.questRepo = repository.NewQuestRepository(db)
	b.inventoryRepo = repository.NewInventoryRepository(db)
	b.shopRepo = repository.NewShopRepository(db)
	b.groupRepo = repository.NewGroupRepository(db)
	b.participants = repository.NewEncounterParticipantRepository(db)

	var err error
	steps := []func() error{
		func() (e error) { b.campaign, e = repository.NewCampaignRepository(db).GetByID(ctx, id); return },
		func() (e error) { b.arcs, e = repository.NewArcRepository(db).List(ctx, id); return },
		func() (e error) { b.sessions, e = b.sessionRepo.List(ctx, id); return },
		func() (e error) { b.locations, e = repository.NewLocationRepository(db).List(ctx, id); return },
		func() (e error) { b.npcs, e = b.npcRepo.List(ctx, id); return },
		func() (e error) { b.pcs, e = repository.NewPlayerCharacterRepository(db).List(ctx, id); return },
		func() (e error) { b.groups, e = b.groupRepo.List(ctx, id); return },
		func() (e error) { b.quests, e = b.questRepo.List(ctx, id); return },
		func() (e error) { b.lore, e = repository.NewLoreEntryRepository(db).List(ctx, id); return },
		func() (e error) { b.categories, e = repository.NewLoreCategoryRepository(db).List(ctx, id); return },
		func() (e error) { b.secrets, e = repository.NewSecretRepository(db).List(ctx, id); return },
		func() (e error) { b.notes, e = repository.NewLooseNoteRepository(db).List(ctx, id); return },
		func() (e error) { b.items, e = repository.NewItemRepository(db).List(ctx, id); return },
		func() (e error) { b.currencies, e = repository.NewCurrencyRepository(db).List(ctx, id); return },
		func() (e error) { b.timelines, e = repository.NewTimelineRepository(db).List(ctx, id); return },
		func() (e error) { b.events, e = repository.NewTimelineEventRepository(db).List(ctx, id); return },
		func() (e error) { b.encounters, e = repository.NewEncounterRepository(db).List(ctx, id); return },
	}
	for _, step := range steps {
		if err = step(); err != nil {
			return err
		}
	}

	b.used = map[string]bool{}
	b.arcName = names(b, "Arcos", b.arcs, func(a models.Arc) (int64, string) { return a.ID, a.Title })
	b.sessionName = map[int64]string{}
	for _, s := range b.sessions {
		b.sessionName[s.ID] = b.unique("Sesiones", sessionBase(s), s.ID)
	}
	b.locationName = names(b, "Locaciones", b.locations, func(l models.Location) (int64, string) { return l.ID, l.Name })
	b.npcName = names(b, "NPC", b.npcs, func(n models.NPC) (int64, string) { return n.ID, n.Name })
	b.pcName = names(b, "Jugadores", b.pcs, func(p models.PlayerCharacter) (int64, string) { return p.ID, p.CharacterName })
	b.groupName = names(b, "Grupos", b.groups, func(g models.Group) (int64, string) { return g.ID, g.Name })
	b.questName = names(b, "Quests", b.quests, func(q models.Quest) (int64, string) { return q.ID, q.Title })
	b.loreName = names(b, "Lore", b.lore, func(e models.LoreEntry) (int64, string) { return e.ID, e.Title })
	b.itemName = names(b, "Objetos", b.items, func(i models.Item) (int64, string) { return i.ID, i.Name })
	b.currencyName = names(b, "Monedas", b.currencies, func(c models.Currency) (int64, string) { return c.ID, c.Name })
	b.categoryLabel = map[int64]string{}
	for _, c := range b.categories {
		b.categoryLabel[c.ID] = c.Label
	}

	b.groupMembers = map[int64][]string{}
	b.npcGroups = map[int64][]string{}
	b.pcGroups = map[int64][]string{}
	for _, g := range b.groups {
		npcs, err := b.groupRepo.GetMembers(ctx, g.ID)
		if err != nil {
			return err
		}
		for _, m := range npcs {
			b.npcGroups[m.NPCID] = append(b.npcGroups[m.NPCID], b.groupName[g.ID])
			b.groupMembers[g.ID] = append(b.groupMembers[g.ID], link(b.npcName[m.NPCID])+role(m.RoleInGroup))
		}
		pcs, err := b.groupRepo.GetPCMembers(ctx, g.ID)
		if err != nil {
			return err
		}
		for _, m := range pcs {
			b.pcGroups[m.PCID] = append(b.pcGroups[m.PCID], b.groupName[g.ID])
			b.groupMembers[g.ID] = append(b.groupMembers[g.ID], link(b.pcName[m.PCID])+role(m.RoleInGroup))
		}
	}

	b.sessionPCs = map[int64][]int64{}
	rows, err := db.QueryContext(ctx, `
		SELECT sp.session_id, sp.pc_id FROM session_pcs sp
		JOIN sessions s ON s.id = sp.session_id AND s.deleted_at IS NULL
		WHERE s.campaign_id = ? ORDER BY sp.session_id, sp.pc_id`, id)
	if err != nil {
		return err
	}
	defer func() { _ = rows.Close() }()
	for rows.Next() {
		var sessionID, pcID int64
		if err := rows.Scan(&sessionID, &pcID); err != nil {
			return err
		}
		b.sessionPCs[sessionID] = append(b.sessionPCs[sessionID], pcID)
	}
	return rows.Err()
}

func (b *builder) writeAll() {
	b.writeCampaign()
	b.writeArcs()
	b.writeSessions()
	b.writeLocations()
	b.writeNPCs()
	b.writePlayers()
	b.writeGroups()
	b.writeQuests()
	b.writeLore()
	b.writeSecrets()
	b.writeNotes()
	b.writeItems()
	b.writeCurrencies()
	b.writeTimelines()
	b.writeEncounters()
}

func (b *builder) writeCampaign() {
	c := b.campaign
	body := section("", c.Description) + section("Temas sensibles", c.Wardails)
	b.note("Campaña.md", []kv{{"tipo", "campana"}, {"nombre", c.Name}, {"sistema", c.System}, {"status", c.Status}}, "# "+c.Name+"\n\n"+body+footer(c.CreatedAt, c.UpdatedAt))
}

var arcStatusKeys = map[string]string{"planificado": "planificado", "en_curso": "en curso", "cerrado": "cerrado"}

func (b *builder) writeArcs() {
	for _, a := range b.arcs {
		img := b.image("Arcos", b.arcName[a.ID], a.ImagePath)
		fm := []kv{{"tipo", "arco"}, {"arco", a.Order}, {"subarco", a.SubarcOrder}, {"titulo", a.Title}, {"status", arcStatusKeys[a.Status]}, {"mision_principal", a.Summary}, {"imagen", img}}
		b.note("Arcos/"+b.arcName[a.ID]+".md", fm, "# "+a.Title+"\n\n"+embed(img)+section("", a.Summary)+footer(a.CreatedAt, a.UpdatedAt))
	}
}

func sessionBase(s models.Session) string {
	switch {
	case s.SessionType == "oneshot" && s.Title != "":
		return fmt.Sprintf("Oneshot %d - %s", s.SessionNumber, s.Title)
	case s.SessionType == "oneshot":
		return fmt.Sprintf("Oneshot %d", s.SessionNumber)
	case s.SessionType == "interlude":
		return fmt.Sprintf("Sesión %d.%d - Interludio", s.SessionNumber, s.SubNumber)
	case s.SubNumber > 0:
		return fmt.Sprintf("Sesión %d.%d", s.SessionNumber, s.SubNumber)
	}
	return fmt.Sprintf("Sesión %d", s.SessionNumber)
}

func (b *builder) writeSessions() {
	for _, s := range b.sessions {
		numero := any(s.SessionNumber)
		if s.SubNumber > 0 {
			numero = rawNum(fmt.Sprintf("%d.%d", s.SessionNumber, s.SubNumber))
		}
		status, tags := "completada", []string{"campaña/sesion"}
		switch s.SessionType {
		case "planning":
			status = "planificada"
		case "interlude":
			tags = append(tags, "campaña/interludio")
		case "oneshot":
			tags = append(tags, "campaña/oneshot")
			if s.Planned {
				status = "planificada"
			}
		}
		fm := []kv{{"tipo", "sesion"}, {"numero", numero}, {"arco", optLink(b.arcName, s.ArcID)}, {"fecha", s.Date}, {"status", status}, {"titulo", s.Summary}, {"tags", tags}}

		var present []string
		npcs, err := b.sessionRepo.ListNpcs(b.ctx, s.ID)
		if b.fail(err) {
			return
		}
		for _, n := range npcs {
			present = append(present, "- "+link(b.npcName[n.NPCID]))
		}
		for _, id := range b.sessionPCs[s.ID] {
			present = append(present, "- "+link(b.pcName[id]))
		}
		quests, err := b.sessionRepo.ListQuests(b.ctx, s.ID)
		if b.fail(err) {
			return
		}
		var questLines []string
		for _, q := range quests {
			questLines = append(questLines, "- "+link(b.questName[q.QuestID]))
		}

		body := "# " + b.sessionName[s.ID] + "\n\n" + section("", s.Summary) + section("Preparación", s.PrepNotes) +
			section("Participantes", strings.Join(present, "\n")) + section("Quests", strings.Join(questLines, "\n")) + footer(s.CreatedAt, s.UpdatedAt)
		b.note("Sesiones/"+b.sessionName[s.ID]+".md", fm, body)
	}
}

var locationTypeKeys = map[string]string{"planet": "planeta", "region": "región", "city": "ciudad", "site": "estructura", "plane": "plano"}

func (b *builder) writeLocations() {
	for _, l := range b.locations {
		img := b.image("Locaciones", b.locationName[l.ID], l.ImagePath)
		fm := []kv{{"tipo", locationTypeKeys[l.LocationType]}, {"parent", optLink(b.locationName, l.ParentLocationID)}, {"imagen", img}}
		shop, err := b.shopRepo.List(b.ctx, l.ID)
		if b.fail(err) {
			return
		}
		var lines []string
		for _, e := range shop {
			lines = append(lines, "- "+link(b.itemName[e.ItemID])+b.prices(e.Prices)+suffix(e.Notes))
		}
		body := "# " + l.Name + "\n\n" + embed(img) + section("", l.Description) + section("Notas", l.Notes) + section("Tienda", strings.Join(lines, "\n")) + footer(l.CreatedAt, l.UpdatedAt)
		b.note("Locaciones/"+b.locationName[l.ID]+".md", fm, body)
	}
}

func (b *builder) writeNPCs() {
	for _, n := range b.npcs {
		relations, err := b.npcRepo.ListRelations(b.ctx, n.ID)
		if b.fail(err) {
			return
		}
		var vinculoCon string
		var relLines []string
		for _, r := range relations {
			if r.FromNPCID != n.ID {
				continue
			}
			if r.Role == "vinculado_a" && vinculoCon == "" {
				vinculoCon = link(b.npcName[r.ToNPCID])
				continue
			}
			relLines = append(relLines, "- "+link(b.npcName[r.ToNPCID])+" — "+r.Role)
		}
		links, err := b.npcRepo.ListPlayerLinks(b.ctx, n.ID)
		if b.fail(err) {
			return
		}
		var vinculados []string
		for _, l := range links {
			vinculados = append(vinculados, link(b.pcName[l.PlayerCharacterID]))
		}

		img := b.image("NPC", b.npcName[n.ID], n.ImagePath)
		fm := []kv{
			{"tipo", n.NPCKind}, {"status", n.Status}, {"nivel_detalle", n.DetailLevel}, {"imagen", img},
			{"origen", n.Origen}, {"rol", n.Rol}, {"subtipo", n.Subtipo},
			{"current_location", optLink(b.locationName, n.LocationID)},
			{"faccion", links_(b.npcGroups[n.ID])}, {"vinculado_a", vinculados}, {"vinculo_con", vinculoCon},
			{"hp", n.CurrentHp}, {"hp_max", n.MaxHp},
			{"atributos", jsonMap(n.Attributes)}, {"habilidades", jsonMap(n.Skills)},
		}
		inventory, err := b.inventory("npc", n.ID)
		if b.fail(err) {
			return
		}
		body := "# " + n.Name + "\n\n" + embed(img) + section("", n.Description) + section("Notas", n.Notes) +
			section("Relaciones", strings.Join(relLines, "\n")) + section("Inventario", inventory) + footer(n.CreatedAt, n.UpdatedAt)
		b.note("NPC/"+b.npcName[n.ID]+".md", fm, body)
	}
}

func (b *builder) writePlayers() {
	for _, p := range b.pcs {
		img := b.image("Jugadores", b.pcName[p.ID], p.ImagePath)
		fm := []kv{
			{"tipo", "jugador"}, {"imagen", img}, {"jugador", p.PlayerName}, {"raza", p.Race}, {"clase", p.Class}, {"status", p.Status},
			{"facciones", links_(b.pcGroups[p.ID])},
			{"hp", p.CurrentHp}, {"hp_max", p.MaxHp},
			{"atributos", jsonMap(p.Attributes)}, {"habilidades", jsonMap(p.Skills)},
		}
		inventory, err := b.inventory("pc", p.ID)
		if b.fail(err) {
			return
		}
		body := "# " + p.CharacterName + "\n\n" + embed(img) + section("", p.Description) + section("Historia", p.Backstory) +
			section("Avances", p.ProgressionNotes) + section("Inventario", inventory) + footer(p.CreatedAt, p.UpdatedAt)
		b.note("Jugadores/"+b.pcName[p.ID]+".md", fm, body)
	}
}

func (b *builder) writeGroups() {
	for _, g := range b.groups {
		img := b.image("Grupos", b.groupName[g.ID], g.ImagePath)
		fm := []kv{{"tipo", "faccion"}, {"alineacion", g.Alineacion}, {"lider", optLink(b.npcName, g.LiderNPCID)}, {"imagen", img}}
		body := "# " + g.Name + "\n\n" + embed(img) + section("", g.Description) + section("Notas", g.Notes) +
			section("Miembros", bullets(b.groupMembers[g.ID])) + footer(g.CreatedAt, g.UpdatedAt)
		b.note("Grupos/"+b.groupName[g.ID]+".md", fm, body)
	}
}

func (b *builder) writeQuests() {
	for _, q := range b.quests {
		npcs, err := b.questRepo.ListNpcs(b.ctx, q.ID)
		if b.fail(err) {
			return
		}
		var lines []string
		for _, n := range npcs {
			lines = append(lines, "- "+link(b.npcName[n.NPCID])+suffix(n.Role))
		}
		img := b.image("Quests", b.questName[q.ID], q.ImagePath)
		fm := []kv{{"tipo", "quest"}, {"status", q.Status}, {"prioridad", q.Priority}, {"imagen", img}}
		body := "# " + q.Title + "\n\n" + embed(img) + section("", q.Description) + section("Notas", q.Notes) + section("NPCs", strings.Join(lines, "\n")) + footer(q.CreatedAt, q.UpdatedAt)
		b.note("Quests/"+b.questName[q.ID]+".md", fm, body)
	}
}

func (b *builder) writeLore() {
	for _, e := range b.lore {
		tipo := ""
		if e.CategoryID != nil {
			tipo = b.categoryLabel[*e.CategoryID]
		}
		img := b.image("Lore", b.loreName[e.ID], e.ImagePath)
		fm := []kv{{"tipo", tipo}, {"arco", optLink(b.arcName, e.ArcID)}, {"locacion", optLink(b.locationName, e.LocationID)}, {"imagen", img}}
		b.note("Lore/"+b.loreName[e.ID]+".md", fm, "# "+e.Title+"\n\n"+embed(img)+section("", e.Body)+footer(e.CreatedAt, e.UpdatedAt))
	}
}

func (b *builder) writeSecrets() {
	names := map[string]bool{}
	for _, s := range b.secrets {
		name := b.unique("Secretos", s.Title, s.ID)
		names[name] = true
		var knownBy []string
		for _, id := range s.KnownByNPCIDs {
			knownBy = append(knownBy, link(b.npcName[id]))
		}
		fm := []kv{
			{"tipo", "secreto"}, {"status", s.Status}, {"sesion_revelada", optLink(b.sessionName, s.RevealedSessionID)},
			{"npc", optLink(b.npcName, s.NPCID)}, {"locacion", optLink(b.locationName, s.LocationID)},
			{"lore", optLink(b.loreName, s.LoreEntryID)}, {"conocen", knownBy},
		}
		b.note("Secretos/"+name+".md", fm, "# "+s.Title+"\n\n"+section("", s.Body)+footer(s.CreatedAt, s.UpdatedAt))
	}
}

func (b *builder) writeNotes() {
	for _, n := range b.notes {
		name := b.unique("Notas", n.Title, n.ID)
		b.note("Notas/"+name+".md", []kv{{"tipo", "nota"}, {"pendiente", n.Pending}}, "# "+n.Title+"\n\n"+section("", n.Body)+footer(n.CreatedAt, n.UpdatedAt))
	}
}

func (b *builder) writeItems() {
	for _, i := range b.items {
		img := b.image("Objetos", b.itemName[i.ID], i.ImagePath)
		fm := []kv{{"tipo", "objeto"}, {"categoria", i.Category}, {"rareza", i.Rarity}, {"peso", i.Weight}, {"efecto", i.Effect}, {"imagen", img}}
		var prices []string
		for _, p := range i.Prices {
			prices = append(prices, "- "+b.price(p))
		}
		b.note("Objetos/"+b.itemName[i.ID]+".md", fm, "# "+i.Name+"\n\n"+embed(img)+section("", i.Description)+section("Precios", strings.Join(prices, "\n"))+footer(i.CreatedAt, i.UpdatedAt))
	}
}

func (b *builder) writeCurrencies() {
	for _, c := range b.currencies {
		var places []string
		for _, id := range c.LocationIDs {
			places = append(places, link(b.locationName[id]))
		}
		fm := []kv{{"tipo", "moneda"}, {"simbolo", c.Symbol}, {"valor_base", c.RateToBase}, {"es_base", c.IsBase}, {"circula_en", places}}
		b.note("Monedas/"+b.currencyName[c.ID]+".md", fm, "# "+c.Name+"\n"+footer(c.CreatedAt, c.UpdatedAt))
	}
}

func (b *builder) writeTimelines() {
	events := map[int64][]models.TimelineEvent{}
	for _, e := range b.events {
		events[e.TimelineID] = append(events[e.TimelineID], e)
	}
	for _, t := range b.timelines {
		name := b.unique("Linea-de-tiempo", t.Name, t.ID)
		fm := []kv{{"tipo", "linea-de-tiempo"}, {"color", t.Color}, {"inicio", t.StartLabel}, {"fin", t.EndLabel}}
		list := events[t.ID]
		sort.SliceStable(list, func(i, j int) bool { return list[i].SortKey < list[j].SortKey })
		var sb strings.Builder
		sb.WriteString("# " + t.Name + "\n\n" + section("", t.Description))
		for _, e := range list {
			when := e.DateLabel
			if e.EndDateLabel != "" {
				when += " → " + e.EndDateLabel
			}
			var refs []string
			for _, r := range []string{
				optLink(b.arcName, e.ArcID), optLink(b.sessionName, e.SessionID), optLink(b.locationName, e.LocationID),
				optLink(b.groupName, e.GroupID), optLink(b.loreName, e.LoreEntryID),
			} {
				if r != "" {
					refs = append(refs, r)
				}
			}
			sb.WriteString("## " + e.Title + "\n\n")
			if when != "" {
				sb.WriteString("**Fecha:** " + when + "\n\n")
			}
			if len(refs) > 0 {
				sb.WriteString("**Ver:** " + strings.Join(refs, ", ") + "\n\n")
			}
			sb.WriteString(section("", e.Description))
			sb.WriteString("*Creado: " + e.CreatedAt + " UTC · Actualizado: " + e.UpdatedAt + " UTC*\n\n")
		}
		sb.WriteString(footer(t.CreatedAt, t.UpdatedAt))
		b.note("Linea-de-tiempo/"+name+".md", fm, sb.String())
	}
}

func (b *builder) writeEncounters() {
	for _, e := range b.encounters {
		title := e.Name
		if title == "" {
			title = "Encuentro " + strconv.FormatInt(e.ID, 10)
		}
		name := b.unique("Encuentros", title, e.ID)
		parts, err := b.participants.List(b.ctx, e.ID)
		if b.fail(err) {
			return
		}
		var lines []string
		for _, p := range parts {
			who := ""
			switch {
			case p.PcID != nil:
				who = link(b.pcName[*p.PcID])
			case p.NpcID != nil:
				who = link(b.npcName[*p.NpcID])
			case p.DisplayName != nil:
				who = *p.DisplayName
			}
			line := "- " + who
			if p.CurrentHp != nil || p.MaxHp != nil {
				line += fmt.Sprintf(" — HP %s/%s", intStr(p.CurrentHp), intStr(p.MaxHp))
			}
			if p.Initiative != nil {
				line += fmt.Sprintf(" — iniciativa %d", *p.Initiative)
			}
			if p.TurnType != nil {
				line += " — turno " + *p.TurnType
			}
			lines = append(lines, line+suffix(p.Notes))
		}
		fm := []kv{{"tipo", "encuentro"}, {"sesion", optLink(b.sessionName, e.SessionID)}, {"ronda", e.Round}, {"status", e.Status}}
		b.note("Encuentros/"+name+".md", fm, "# "+title+"\n\n"+section("Participantes", strings.Join(lines, "\n"))+footer(e.CreatedAt, e.UpdatedAt))
	}
}

func (b *builder) create(name string) (io.Writer, error) {
	h := &zip.FileHeader{Name: name, Method: zip.Deflate, Modified: time.Now()}
	h.SetMode(0o644)
	return b.zw.CreateHeader(h)
}

func (b *builder) image(folder, name string, imagePath *string) string {
	if b.err != nil || imagePath == nil || *imagePath == "" {
		return ""
	}
	abs, err := imagestore.Path(b.uploadsRoot, *imagePath)
	if err != nil {
		return ""
	}
	data, err := os.ReadFile(abs)
	if err != nil {
		return ""
	}
	rel := "Imagenes/" + folder + "/" + name + filepath.Ext(*imagePath)
	w, err := b.create(rel)
	if err != nil {
		b.err = err
		return ""
	}
	if _, err := w.Write(data); err != nil {
		b.err = err
	}
	return rel
}

func footer(created, updated string) string {
	return footerMark + created + " UTC · Actualizado: " + updated + " UTC*\n"
}

const footerMark = "\n---\n\n*Creado: "

func embed(img string) string {
	if img == "" {
		return ""
	}
	return "![[" + img + "]]\n\n"
}

func (b *builder) inventory(kind string, ownerID int64) (string, error) {
	entries, err := b.inventoryRepo.List(b.ctx, kind, ownerID)
	if err != nil {
		return "", err
	}
	var lines []string
	for _, e := range entries {
		lines = append(lines, fmt.Sprintf("- %s ×%d%s", link(b.itemName[e.ItemID]), e.Quantity, suffix(e.Notes)))
	}
	return strings.Join(lines, "\n"), nil
}

func (b *builder) price(p models.Price) string {
	return strconv.FormatFloat(p.Amount, 'f', -1, 64) + " " + link(b.currencyName[p.CurrencyID])
}

func (b *builder) prices(ps []models.Price) string {
	var parts []string
	for _, p := range ps {
		parts = append(parts, b.price(p))
	}
	if len(parts) == 0 {
		return ""
	}
	return " — " + strings.Join(parts, ", ")
}

func (b *builder) fail(err error) bool {
	if err != nil && b.err == nil {
		b.err = err
	}
	return b.err != nil
}

func (b *builder) note(path string, fm []kv, body string) {
	if b.err != nil {
		return
	}
	var sb strings.Builder
	sb.WriteString("---\n")
	for _, f := range fm {
		renderField(&sb, f.key, f.val)
	}
	sb.WriteString("---\n\n")
	if i := strings.LastIndex(body, footerMark); i >= 0 {
		body = strings.TrimRight(body[:i], "\n") + "\n" + body[i:]
	}
	sb.WriteString(strings.TrimRight(body, "\n") + "\n")

	w, err := b.create(path)
	if err != nil {
		b.err = err
		return
	}
	if _, err := io.WriteString(w, sb.String()); err != nil {
		b.err = err
	}
}

func renderField(sb *strings.Builder, key string, val any) {
	switch v := val.(type) {
	case nil:
	case rawNum:
		sb.WriteString(key + ": " + string(v) + "\n")
	case string:
		if v != "" {
			sb.WriteString(key + ": " + strconv.Quote(v) + "\n")
		}
	case *string:
		if v != nil && *v != "" {
			sb.WriteString(key + ": " + strconv.Quote(*v) + "\n")
		}
	case int64, int, bool:
		fmt.Fprintf(sb, "%s: %v\n", key, v)
	case *int64:
		if v != nil {
			fmt.Fprintf(sb, "%s: %d\n", key, *v)
		}
	case *float64:
		if v != nil {
			sb.WriteString(key + ": " + strconv.FormatFloat(*v, 'f', -1, 64) + "\n")
		}
	case []string:
		if len(v) > 0 {
			sb.WriteString(key + ":\n")
			for _, s := range v {
				sb.WriteString("  - " + strconv.Quote(s) + "\n")
			}
		}
	case map[string]any:
		if len(v) > 0 {
			out, err := yaml.Marshal(v)
			if err != nil {
				return
			}
			sb.WriteString(key + ":\n")
			for _, line := range strings.Split(strings.TrimRight(string(out), "\n"), "\n") {
				sb.WriteString("  " + line + "\n")
			}
		}
	}
}

func jsonMap(raw json.RawMessage) map[string]any {
	var m map[string]any
	if len(raw) == 0 || json.Unmarshal(raw, &m) != nil {
		return nil
	}
	return m
}

func names[T any](b *builder, folder string, items []T, get func(T) (int64, string)) map[int64]string {
	out := make(map[int64]string, len(items))
	for _, it := range items {
		id, base := get(it)
		out[id] = b.unique(folder, base, id)
	}
	return out
}

func (b *builder) unique(folder, base string, id int64) string {
	name := safeName(base)
	if name == "" {
		name = "Sin nombre"
	}
	key := folder + "/" + strings.ToLower(name)
	if b.used[key] {
		name = fmt.Sprintf("%s (%d)", name, id)
		key = folder + "/" + strings.ToLower(name)
	}
	b.used[key] = true
	return name
}

var nameReplacer = strings.NewReplacer(
	"/", "-", "\\", "-", ":", "-", "*", "", "?", "", "\"", "", "<", "", ">", "", "|", "-",
	"#", "", "^", "", "[", "", "]", "", "\n", " ", "\r", "",
)

func safeName(s string) string {
	s = strings.TrimSpace(nameReplacer.Replace(s))
	if len(s) > 120 {
		s = strings.TrimSpace(string([]rune(s)[:min(len([]rune(s)), 100)]))
	}
	return strings.Trim(s, ". ")
}

func link(name string) string {
	if name == "" {
		return ""
	}
	return "[[" + name + "]]"
}

func optLink(names map[int64]string, id *int64) string {
	if id == nil {
		return ""
	}
	return link(names[*id])
}

func links_(names []string) []string {
	out := make([]string, 0, len(names))
	for _, n := range names {
		out = append(out, link(n))
	}
	return out
}

func role(r *string) string {
	if r == nil || *r == "" {
		return ""
	}
	return " — " + *r
}

func suffix(s string) string {
	if s == "" {
		return ""
	}
	return " — " + s
}

func intStr(v *int64) string {
	if v == nil {
		return "?"
	}
	return strconv.FormatInt(*v, 10)
}

func bullets(lines []string) string {
	var out []string
	for _, l := range lines {
		out = append(out, "- "+l)
	}
	return strings.Join(out, "\n")
}

func section(title, text string) string {
	text = strings.TrimSpace(text)
	if text == "" {
		return ""
	}
	if title == "" {
		return text + "\n\n"
	}
	return "## " + title + "\n\n" + text + "\n\n"
}
