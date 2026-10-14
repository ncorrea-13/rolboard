package export

import (
	"archive/zip"
	"bytes"
	"context"
	"database/sql"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
	"github.com/ncorrea-13/rolboard/server/internal/vault"
)

func setupDB(t *testing.T) *sql.DB {
	db, err := sql.Open("sqlite", "file::memory:?cache=shared")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	if err := repository.Migrate(db); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return db
}

func must(t *testing.T, err error) {
	t.Helper()
	if err != nil {
		t.Fatal(err)
	}
}

func seed(t *testing.T, db *sql.DB, uploads string) int64 {
	ctx := context.Background()
	camp := &models.Campaign{Name: "Mesa de prueba", System: "Genérico", Description: "Una campaña."}
	must(t, repository.NewCampaignRepository(db).Create(ctx, camp))
	must(t, repository.NewCampaignRepository(db).SetWardails(ctx, camp.ID, "Violencia gráfica"))
	cid := camp.ID

	arc := &models.Arc{CampaignID: cid, Title: "El comienzo", Order: 1, Status: "en_curso", Summary: "Todo empieza"}
	must(t, repository.NewArcRepository(db).Create(ctx, arc))

	locs := repository.NewLocationRepository(db)
	region := &models.Location{CampaignID: cid, Name: "Región norte", LocationType: "region"}
	must(t, locs.Create(ctx, region))
	city := &models.Location{CampaignID: cid, Name: "Puerto: Viejo", LocationType: "city", ParentLocationID: &region.ID, Description: "Un puerto."}
	must(t, locs.Create(ctx, city))

	origen, subtipo := "Alethi", "Veterano"
	npcs := repository.NewNPCRepository(db)
	npc := &models.NPC{CampaignID: cid, Name: "Kaladin", NPCKind: "npc", DetailLevel: "full", Status: "vivo", LocationID: &city.ID, Origen: &origen, Subtipo: &subtipo, Description: "Soldado."}
	must(t, npcs.Create(ctx, npc))
	friend := &models.NPC{CampaignID: cid, Name: "Syl", NPCKind: "spren", DetailLevel: "full", Status: "vivo"}
	must(t, npcs.Create(ctx, friend))
	must(t, npcs.CreateRelation(ctx, &models.NPCRelation{FromNPCID: npc.ID, ToNPCID: friend.ID, Role: "vinculado_a"}))
	must(t, os.MkdirAll(filepath.Join(uploads, "npc"), 0o755))
	must(t, os.WriteFile(filepath.Join(uploads, "npc", "1-portrait.png"), []byte("png-bytes"), 0o644))
	_, err := db.ExecContext(ctx, `UPDATE npcs SET image_path = ? WHERE id = ?`, "npc/1-portrait.png", npc.ID)
	must(t, err)

	pc := &models.PlayerCharacter{CampaignID: cid, PlayerName: "Nico", CharacterName: "Shallan", Race: "Veden", Status: "activo", Backstory: "Su pasado."}
	must(t, repository.NewPlayerCharacterRepository(db).Create(ctx, pc))
	must(t, npcs.SetPlayerLink(ctx, &models.NPCPlayerRelation{NPCID: friend.ID, PlayerCharacterID: pc.ID, Role: "spren"}))

	groups := repository.NewGroupRepository(db)
	group := &models.Group{CampaignID: cid, Name: "Puente Cuatro", Alineacion: "leal", LiderNPCID: &npc.ID}
	must(t, groups.Create(ctx, group))
	must(t, groups.AddMember(ctx, group.ID, npc.ID))
	must(t, groups.AddPCMember(ctx, group.ID, pc.ID))

	sessions := repository.NewSessionRepository(db)
	s1 := &models.Session{CampaignID: cid, ArcID: &arc.ID, SessionNumber: 1, SessionType: "session", Date: "2026-01-01", Summary: "Primer encuentro"}
	must(t, sessions.Create(ctx, s1))
	must(t, sessions.AddNpc(ctx, s1.ID, npc.ID))
	must(t, sessions.Create(ctx, &models.Session{CampaignID: cid, SessionNumber: 1, SubNumber: 1, SessionType: "interlude", Summary: "Interludio"}))
	must(t, sessions.Create(ctx, &models.Session{CampaignID: cid, SessionNumber: 2, SessionType: "planning"}))

	quests := repository.NewQuestRepository(db)
	quest := &models.Quest{CampaignID: cid, Title: "Encontrar el puente", Status: "active", Description: "Buscar."}
	must(t, quests.Create(ctx, quest))
	must(t, quests.SetNpc(ctx, quest.ID, npc.ID, "guía"))
	must(t, sessions.AddQuest(ctx, s1.ID, quest.ID))

	cats, err := repository.NewLoreCategoryRepository(db).List(ctx, cid)
	must(t, err)
	lore := &models.LoreEntry{CampaignID: cid, CategoryID: &cats[0].ID, Title: "La guerra antigua", Body: "Hace mucho.", ArcID: &arc.ID, LocationID: &city.ID}
	must(t, repository.NewLoreEntryRepository(db).Create(ctx, lore))

	must(t, repository.NewSecretRepository(db).Create(ctx, &models.Secret{CampaignID: cid, Title: "Quién es el traidor", Body: "Él.", Status: "hidden", NPCID: &npc.ID, KnownByNPCIDs: []int64{friend.ID}}))
	must(t, repository.NewLooseNoteRepository(db).Create(ctx, &models.LooseNote{CampaignID: cid, Title: "Idea suelta", Body: "Algo", Pending: true}))

	cur := &models.Currency{CampaignID: cid, Name: "Marco", Symbol: "mk", IsBase: true, LocationIDs: []int64{city.ID}}
	must(t, repository.NewCurrencyRepository(db).Create(ctx, cur))
	item := &models.Item{CampaignID: cid, Name: "Espada", Description: "Afilada", Category: "arma", Prices: []models.Price{{CurrencyID: cur.ID, Amount: 12.5}}}
	must(t, repository.NewItemRepository(db).Create(ctx, item))
	must(t, repository.NewInventoryRepository(db).Set(ctx, "pc", pc.ID, item.ID, 2, "heredada"))
	must(t, repository.NewShopRepository(db).Set(ctx, city.ID, item.ID, "stock bajo", nil))

	tl := &models.Timeline{CampaignID: cid, Name: "Historia del mundo", Color: "#ff0000"}
	must(t, repository.NewTimelineRepository(db).Create(ctx, tl))
	must(t, repository.NewTimelineEventRepository(db).Create(ctx, &models.TimelineEvent{CampaignID: cid, TimelineID: tl.ID, Title: "La caída", DateLabel: "Año 0", SortKey: 1, LocationID: &city.ID}))

	enc := &models.Encounter{CampaignID: cid, Name: "Emboscada", SessionID: &s1.ID, Round: 1, Status: "planificado"}
	must(t, repository.NewEncounterRepository(db).Create(ctx, enc))
	return cid
}

func TestWriteBuildsTheStructure(t *testing.T) {
	db := setupDB(t)
	uploads := t.TempDir()
	cid := seed(t, db, uploads)

	var buf bytes.Buffer
	must(t, Write(context.Background(), db, uploads, cid, &buf))
	zr, err := zip.NewReader(bytes.NewReader(buf.Bytes()), int64(buf.Len()))
	must(t, err)

	files := map[string]string{}
	for _, f := range zr.File {
		if f.CreatorVersion>>8 != 3 {
			t.Errorf("%s: expected Unix as the creator OS so unzip keeps UTF-8 names, got %d", f.Name, f.CreatorVersion>>8)
		}
		rc, err := f.Open()
		must(t, err)
		var b bytes.Buffer
		_, err = b.ReadFrom(rc)
		must(t, err)
		_ = rc.Close()
		files[f.Name] = b.String()
	}

	for _, path := range []string{
		"Campaña.md", "Arcos/El comienzo.md", "Locaciones/Región norte.md", "Locaciones/Puerto- Viejo.md",
		"NPC/Kaladin.md", "NPC/Syl.md", "Jugadores/Shallan.md", "Grupos/Puente Cuatro.md",
		"Sesiones/Sesión 1.md", "Sesiones/Sesión 1.1 - Interludio.md", "Sesiones/Sesión 2.md",
		"Quests/Encontrar el puente.md", "Lore/La guerra antigua.md", "Secretos/Quién es el traidor.md",
		"Notas/Idea suelta.md", "Objetos/Espada.md", "Monedas/Marco.md", "Linea-de-tiempo/Historia del mundo.md",
		"Encuentros/Emboscada.md", "Imagenes/NPC/Kaladin.png",
	} {
		if _, ok := files[path]; !ok {
			t.Errorf("missing %s", path)
		}
	}

	if kal := files["NPC/Kaladin.md"]; !strings.Contains(kal, "\n---\n\n*Creado: ") || !strings.Contains(kal, " · Actualizado: ") {
		t.Errorf("Kaladin.md lacks the dates footer:\n%s", kal)
	}
	if arc := files["Arcos/El comienzo.md"]; !strings.Contains(arc, "\nTodo empieza\n") {
		t.Errorf("the arc summary should be in the body too:\n%s", arc)
	}
	if !strings.Contains(files["Campaña.md"], "Violencia gráfica") {
		t.Error("wardails missing from Campaña.md")
	}
	if strings.Contains(files["Campaña.md"], "access_code") {
		t.Error("access code leaked")
	}
	npc := files["NPC/Kaladin.md"]
	if files["Imagenes/NPC/Kaladin.png"] != "png-bytes" {
		t.Errorf("image content not copied: %q", files["Imagenes/NPC/Kaladin.png"])
	}
	for _, want := range []string{`imagen: "Imagenes/NPC/Kaladin.png"`, `![[Imagenes/NPC/Kaladin.png]]`, `origen: "Alethi"`, `subtipo: "Veterano"`, `current_location: "[[Puerto- Viejo]]"`, `vinculo_con: "[[Syl]]"`, `"[[Puente Cuatro]]"`} {
		if !strings.Contains(npc, want) {
			t.Errorf("Kaladin.md lacks %s:\n%s", want, npc)
		}
	}
	if !strings.Contains(files["NPC/Syl.md"], `"[[Shallan]]"`) {
		t.Errorf("Syl.md lacks the player link:\n%s", files["NPC/Syl.md"])
	}
	if !strings.Contains(files["Sesiones/Sesión 1.1 - Interludio.md"], "numero: 1.1") {
		t.Errorf("interlude number: %s", files["Sesiones/Sesión 1.1 - Interludio.md"])
	}
}

func TestExportReindexesIntoAnotherCampaign(t *testing.T) {
	db := setupDB(t)
	uploads := t.TempDir()
	cid := seed(t, db, uploads)

	var buf bytes.Buffer
	must(t, Write(context.Background(), db, uploads, cid, &buf))
	zr, err := zip.NewReader(bytes.NewReader(buf.Bytes()), int64(buf.Len()))
	must(t, err)
	root := t.TempDir()
	for _, f := range zr.File {
		dst := filepath.Join(root, f.Name)
		must(t, os.MkdirAll(filepath.Dir(dst), 0o755))
		rc, err := f.Open()
		must(t, err)
		var b bytes.Buffer
		_, err = b.ReadFrom(rc)
		must(t, err)
		_ = rc.Close()
		must(t, os.WriteFile(dst, b.Bytes(), 0o644))
	}

	ctx := context.Background()
	other := &models.Campaign{Name: "Copia", System: "Genérico"}
	must(t, repository.NewCampaignRepository(db).Create(ctx, other))
	result, err := vault.NewIndexer(root, other.ID, db).Reindex(ctx)
	must(t, err)
	if len(result.Errors) != 0 || len(result.UnresolvedWikilinks) != 0 {
		t.Fatalf("reindex problems: %+v", result)
	}

	count := func(q string) int {
		var n int
		must(t, db.QueryRowContext(ctx, q, other.ID).Scan(&n))
		return n
	}
	for table, want := range map[string]int{
		"arcs": 1, "locations": 2, "npcs": 2, "player_characters": 1, "groups": 1, "sessions": 3, "lore_entries": 1,
	} {
		if got := count(`SELECT COUNT(*) FROM ` + table + ` WHERE campaign_id = ? AND deleted_at IS NULL`); got != want {
			t.Errorf("%s: expected %d, got %d", table, want, got)
		}
	}
	if got := count(`SELECT COUNT(*) FROM npc_player_relations r JOIN npcs n ON n.id = r.npc_id WHERE n.campaign_id = ?`); got != 1 {
		t.Errorf("npc_player_relations: expected 1, got %d", got)
	}
	if got := count(`SELECT COUNT(*) FROM locations WHERE campaign_id = ? AND parent_location_id IS NOT NULL`); got != 1 {
		t.Errorf("location parent: expected 1, got %d", got)
	}
	if got := count(`SELECT COUNT(*) FROM groups WHERE campaign_id = ? AND lider_npc_id IS NOT NULL`); got != 1 {
		t.Errorf("group leader: expected 1, got %d", got)
	}
	if got := count(`SELECT COUNT(*) FROM npcs WHERE campaign_id = ? AND origen = 'Alethi' AND subtipo = 'Veterano' AND location_id IS NOT NULL`); got != 1 {
		t.Errorf("npc fields: expected 1, got %d", got)
	}
}
