package vault

import (
	"context"
	"database/sql"
	"os"
	"path/filepath"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
	_ "modernc.org/sqlite"
)

func setupIndexerTestDB(t *testing.T) *sql.DB {
	db, err := sql.Open("sqlite", "file::memory:?cache=shared")
	if err != nil {
		t.Fatalf("Failed to open test DB: %v", err)
	}
	if err := repository.Migrate(db); err != nil {
		t.Fatalf("Failed to migrate test DB: %v", err)
	}
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Logf("error closing test DB: %v", err)
		}
	})
	return db
}

func writeVaultFile(t *testing.T, root, relPath, content string) {
	t.Helper()
	full := filepath.Join(root, relPath)
	if err := os.MkdirAll(filepath.Dir(full), 0755); err != nil {
		t.Fatalf("MkdirAll failed: %v", err)
	}
	if err := os.WriteFile(full, []byte(content), 0644); err != nil {
		t.Fatalf("WriteFile failed: %v", err)
	}
}

func TestReindexCreatesEntitiesAndResolvesRelations(t *testing.T) {
	db := setupIndexerTestDB(t)
	ctx := context.Background()

	campaign := &models.Campaign{Name: "Cosmere", System: "Cosmere RPG"}
	if err := repository.NewCampaignRepository(db).Create(ctx, campaign); err != nil {
		t.Fatalf("Create campaign failed: %v", err)
	}

	root := t.TempDir()
	writeVaultFile(t, root, "Locaciones/Roshar.md", "---\ntipo: planeta\nrelevancia: alta\n---\nEl mundo principal.")
	writeVaultFile(t, root, "Locaciones/Ciudades/Kharbranth.md", "---\ntipo: ciudad\nrelevancia: media\nparent: \"[[Roshar]]\"\n---\nCiudad puerto.")
	writeVaultFile(t, root, "Grupos/Bridge Four.md", "---\ntipo: faccion\nalineacion: neutral\n---\nEscuadrón de puentes.")
	writeVaultFile(t, root, "NPC/Kaladin.md", "---\ntipo: npc\nstatus: vivo\ncurrent_location: \"[[Kharbranth]]\"\nfaccion:\n  - \"[[Bridge Four]]\"\n---\nCapitán de Bridge Four.")
	writeVaultFile(t, root, "Arcos/Arco 1.md", "---\ntipo: arco\narco: 1\ntitulo: Arco Uno\nstatus: en curso\n---\nPrimer arco.")
	writeVaultFile(t, root, "Sesiones/Sesion 1.md", "---\ntipo: sesion\nnumero: 1\narco: \"[[Arco 1]]\"\nfecha: 2026-01-01\nestado: jugada\n---\nPrimera sesión.")

	indexer := NewIndexer(root, campaign.ID, db)
	result, err := indexer.Reindex(ctx)
	if err != nil {
		t.Fatalf("Reindex failed: %v", err)
	}

	if len(result.Errors) != 0 {
		t.Errorf("Expected no errors, got %v", result.Errors)
	}
	if len(result.UnresolvedWikilinks) != 0 {
		t.Errorf("Expected no unresolved wikilinks, got %v", result.UnresolvedWikilinks)
	}
	if result.Processed != 6 {
		t.Errorf("Expected 6 processed entities, got %d", result.Processed)
	}

	locRepo := repository.NewLocationRepository(db)
	locations, err := locRepo.List(ctx, campaign.ID)
	if err != nil {
		t.Fatalf("List locations failed: %v", err)
	}
	var roshar, kharbranth *models.Location
	for i := range locations {
		switch locations[i].Name {
		case "Roshar":
			roshar = &locations[i]
		case "Kharbranth":
			kharbranth = &locations[i]
		}
	}
	if roshar == nil || kharbranth == nil {
		t.Fatalf("Expected both locations to exist, got %+v", locations)
	}
	if kharbranth.ParentLocationID == nil || *kharbranth.ParentLocationID != roshar.ID {
		t.Errorf("Expected Kharbranth.ParentLocationID = %d, got %v", roshar.ID, kharbranth.ParentLocationID)
	}

	npcRepo := repository.NewNPCRepository(db)
	npcs, err := npcRepo.List(ctx, campaign.ID)
	if err != nil {
		t.Fatalf("List npcs failed: %v", err)
	}
	if len(npcs) != 1 {
		t.Fatalf("Expected 1 npc, got %d", len(npcs))
	}
	kaladin := npcs[0]
	if kaladin.LocationID == nil || *kaladin.LocationID != kharbranth.ID {
		t.Errorf("Expected Kaladin.LocationID = %d, got %v", kharbranth.ID, kaladin.LocationID)
	}

	groupRepo := repository.NewGroupRepository(db)
	groups, err := groupRepo.List(ctx, campaign.ID)
	if err != nil {
		t.Fatalf("List groups failed: %v", err)
	}
	if len(groups) != 1 {
		t.Fatalf("Expected 1 group, got %d", len(groups))
	}

	members, err := groupRepo.GetMembers(ctx, groups[0].ID)
	if err != nil {
		t.Fatalf("GetMembers failed: %v", err)
	}
	if len(members) != 1 || members[0].NPCID != kaladin.ID {
		t.Errorf("Expected Kaladin as sole group member, got %+v", members)
	}

	sessionRepo := repository.NewSessionRepository(db)
	sessions, err := sessionRepo.List(ctx, campaign.ID)
	if err != nil {
		t.Fatalf("List sessions failed: %v", err)
	}
	if len(sessions) != 1 {
		t.Fatalf("Expected 1 session, got %d", len(sessions))
	}

	arcRepo := repository.NewArcRepository(db)
	arcs, err := arcRepo.List(ctx, campaign.ID)
	if err != nil {
		t.Fatalf("List arcs failed: %v", err)
	}
	if len(arcs) != 1 {
		t.Fatalf("Expected 1 arc, got %d", len(arcs))
	}
	if sessions[0].ArcID == nil || *sessions[0].ArcID != arcs[0].ID {
		t.Errorf("Expected session.ArcID = %d, got %v", arcs[0].ID, sessions[0].ArcID)
	}
	if arcs[0].Status != "en_curso" {
		t.Errorf("Expected arc status 'en_curso' (from vault 'en curso'), got %q", arcs[0].Status)
	}
	if arcs[0].SubarcOrder != nil {
		t.Errorf("Expected nil SubarcOrder for an arc without subarco, got %v", *arcs[0].SubarcOrder)
	}
}

func TestReindexPreservesDashboardEditWhenNoteUnchanged(t *testing.T) {
	db := setupIndexerTestDB(t)
	ctx := context.Background()

	campaign := &models.Campaign{Name: "Cosmere", System: "Cosmere RPG"}
	if err := repository.NewCampaignRepository(db).Create(ctx, campaign); err != nil {
		t.Fatalf("Create campaign failed: %v", err)
	}

	root := t.TempDir()
	writeVaultFile(t, root, "NPC/Kaladin.md", "---\ntipo: npc\nstatus: vivo\n---\nCapitán de Bridge Four.")

	indexer := NewIndexer(root, campaign.ID, db)
	if _, err := indexer.Reindex(ctx); err != nil {
		t.Fatalf("First reindex failed: %v", err)
	}

	npcRepo := repository.NewNPCRepository(db)
	npcs, err := npcRepo.List(ctx, campaign.ID)
	if err != nil || len(npcs) != 1 {
		t.Fatalf("Expected 1 npc after first reindex, err=%v npcs=%+v", err, npcs)
	}
	kaladin := npcs[0]

	// Simula una edición hecha desde el dashboard (PUT /npcs/{id}), sin tocar el archivo del vault.
	kaladin.Status = "muerto"
	if err := npcRepo.Update(ctx, kaladin.ID, &kaladin); err != nil {
		t.Fatalf("Simulated dashboard edit failed: %v", err)
	}

	result, err := indexer.Reindex(ctx)
	if err != nil {
		t.Fatalf("Second reindex failed: %v", err)
	}
	if len(result.Errors) != 0 {
		t.Errorf("Expected no errors on second reindex, got %v", result.Errors)
	}
	if result.Processed != 1 {
		t.Errorf("Expected 1 processed (skipped-unchanged still counts), got %d", result.Processed)
	}

	after, err := npcRepo.GetByID(ctx, kaladin.ID)
	if err != nil {
		t.Fatalf("GetByID failed: %v", err)
	}
	if after.Status != "muerto" {
		t.Errorf("Expected dashboard edit 'muerto' to survive an unchanged-note reindex, got %q", after.Status)
	}

	// Si la nota SÍ cambia, el vault vuelve a mandar.
	writeVaultFile(t, root, "NPC/Kaladin.md", "---\ntipo: npc\nstatus: vivo\n---\nCapitán de Bridge Four, ascendido a Alto Príncipe.")
	if _, err := indexer.Reindex(ctx); err != nil {
		t.Fatalf("Third reindex failed: %v", err)
	}
	after, err = npcRepo.GetByID(ctx, kaladin.ID)
	if err != nil {
		t.Fatalf("GetByID failed: %v", err)
	}
	if after.Status != "vivo" {
		t.Errorf("Expected vault edit to win once the note actually changed, got %q", after.Status)
	}
}

func TestReindexResolvesPlayerCharacterSprenAndFaccion(t *testing.T) {
	db := setupIndexerTestDB(t)
	ctx := context.Background()

	campaign := &models.Campaign{Name: "Cosmere", System: "Cosmere RPG"}
	if err := repository.NewCampaignRepository(db).Create(ctx, campaign); err != nil {
		t.Fatalf("Create campaign failed: %v", err)
	}

	root := t.TempDir()
	writeVaultFile(t, root, "NPC/Astillas/Cuarzo.md", "---\ntipo: spren\nstatus: vivo\ntipo_spren: Honorspren\n---\nSpren de Valisha.")
	writeVaultFile(t, root, "Grupos/Radiantes.md", "---\ntipo: faccion\nalineacion: neutral\n---\nOrden de Radiantes.")
	writeVaultFile(t, root, "Jugadores/Valisha.md", "---\ntipo: jugador\njugador: Agus Horas\nstatus: activo\nraza: Cognitiva\nspren: \"[[Cuarzo]]\"\nfacciones:\n  - \"[[Radiantes]]\"\n---\nPersonaje jugado por Agus.")

	indexer := NewIndexer(root, campaign.ID, db)
	result, err := indexer.Reindex(ctx)
	if err != nil {
		t.Fatalf("Reindex failed: %v", err)
	}
	if len(result.Errors) != 0 {
		t.Errorf("Expected no errors, got %v", result.Errors)
	}
	if len(result.UnresolvedWikilinks) != 0 {
		t.Errorf("Expected no unresolved wikilinks, got %v", result.UnresolvedWikilinks)
	}

	npcs, err := repository.NewNPCRepository(db).List(ctx, campaign.ID)
	if err != nil || len(npcs) != 1 {
		t.Fatalf("Expected 1 npc (Cuarzo), err=%v npcs=%+v", err, npcs)
	}
	cuarzo := npcs[0]

	groups, err := repository.NewGroupRepository(db).List(ctx, campaign.ID)
	if err != nil || len(groups) != 1 {
		t.Fatalf("Expected 1 group (Radiantes), err=%v groups=%+v", err, groups)
	}
	radiantes := groups[0]

	pcs, err := repository.NewPlayerCharacterRepository(db).List(ctx, campaign.ID)
	if err != nil || len(pcs) != 1 {
		t.Fatalf("Expected 1 player character, err=%v pcs=%+v", err, pcs)
	}
	valisha := pcs[0]

	if valisha.Race != "Cognitiva" {
		t.Errorf("Expected race 'Cognitiva', got %q", valisha.Race)
	}
	if valisha.Status != "activo" {
		t.Errorf("Expected status 'activo', got %q", valisha.Status)
	}
	if valisha.SprenNPCID == nil || *valisha.SprenNPCID != cuarzo.ID {
		t.Errorf("Expected SprenNPCID = %d, got %v", cuarzo.ID, valisha.SprenNPCID)
	}

	var groupID int64
	err = db.QueryRowContext(ctx, `SELECT group_id FROM pc_groups WHERE pc_id = ?`, valisha.ID).Scan(&groupID)
	if err != nil {
		t.Fatalf("Expected pc_groups row for Valisha, got: %v", err)
	}
	if groupID != radiantes.ID {
		t.Errorf("Expected pc_groups.group_id = %d, got %d", radiantes.ID, groupID)
	}
}

func TestReindexParsesArcSubarcoAndUnknownStatus(t *testing.T) {
	db := setupIndexerTestDB(t)
	ctx := context.Background()

	campaign := &models.Campaign{Name: "Cosmere", System: "Cosmere RPG"}
	if err := repository.NewCampaignRepository(db).Create(ctx, campaign); err != nil {
		t.Fatalf("Create campaign failed: %v", err)
	}

	root := t.TempDir()
	writeVaultFile(t, root, "Arcos/Arco 2.md", "---\ntipo: arco\narco: 2\ntitulo: Arco Dos\nstatus: planificado\n---\nSegundo arco.")
	writeVaultFile(t, root, "Arcos/Arco 2.1.md", "---\ntipo: arco\narco: 2\nsubarco: 1\ntitulo: Shadesmar - parte 1\nstatus: rota\n---\nSubarco.")

	indexer := NewIndexer(root, campaign.ID, db)
	if _, err := indexer.Reindex(ctx); err != nil {
		t.Fatalf("Reindex failed: %v", err)
	}

	arcs, err := repository.NewArcRepository(db).List(ctx, campaign.ID)
	if err != nil {
		t.Fatalf("List arcs failed: %v", err)
	}
	if len(arcs) != 2 {
		t.Fatalf("Expected 2 arcs, got %d", len(arcs))
	}
	// List ordena por "order", subarc_order — el principal (subarc_order NULL) sale antes que el subarco.
	main, sub := arcs[0], arcs[1]
	if main.SubarcOrder != nil {
		t.Errorf("Expected main arc SubarcOrder nil, got %v", *main.SubarcOrder)
	}
	if sub.SubarcOrder == nil || *sub.SubarcOrder != 1 {
		t.Errorf("Expected subarc SubarcOrder 1, got %v", sub.SubarcOrder)
	}
	if sub.Status != "planificado" {
		t.Errorf("Expected unknown vault status 'rota' to fall back to 'planificado', got %q", sub.Status)
	}
}

func TestReindexUnresolvedWikilink(t *testing.T) {
	db := setupIndexerTestDB(t)
	ctx := context.Background()

	campaign := &models.Campaign{Name: "Cosmere", System: "Cosmere RPG"}
	if err := repository.NewCampaignRepository(db).Create(ctx, campaign); err != nil {
		t.Fatalf("Create campaign failed: %v", err)
	}

	root := t.TempDir()
	writeVaultFile(t, root, "NPC/Kaladin.md", "---\ntipo: npc\nstatus: vivo\ncurrent_location: \"[[Ciudad Inexistente]]\"\n---\nSin ubicación real.")

	indexer := NewIndexer(root, campaign.ID, db)
	result, err := indexer.Reindex(ctx)
	if err != nil {
		t.Fatalf("Reindex failed: %v", err)
	}

	if result.Processed != 1 {
		t.Errorf("Expected 1 processed (npc still created), got %d", result.Processed)
	}
	if len(result.UnresolvedWikilinks) != 1 || result.UnresolvedWikilinks[0] != "Ciudad Inexistente" {
		t.Errorf("Expected 1 unresolved wikilink 'Ciudad Inexistente', got %v", result.UnresolvedWikilinks)
	}

	npcRepo := repository.NewNPCRepository(db)
	npcs, err := npcRepo.List(ctx, campaign.ID)
	if err != nil {
		t.Fatalf("List npcs failed: %v", err)
	}
	if len(npcs) != 1 || npcs[0].LocationID != nil {
		t.Errorf("Expected npc created with nil LocationID, got %+v", npcs)
	}
}

func TestReindexSkipsUnmappedLocationType(t *testing.T) {
	db := setupIndexerTestDB(t)
	ctx := context.Background()

	campaign := &models.Campaign{Name: "Cosmere", System: "Cosmere RPG"}
	if err := repository.NewCampaignRepository(db).Create(ctx, campaign); err != nil {
		t.Fatalf("Create campaign failed: %v", err)
	}

	root := t.TempDir()
	writeVaultFile(t, root, "Locaciones/Rara.md", "---\ntipo: dimension-desconocida\nrelevancia: baja\n---\nAlgo raro.")

	indexer := NewIndexer(root, campaign.ID, db)
	result, err := indexer.Reindex(ctx)
	if err != nil {
		t.Fatalf("Reindex failed: %v", err)
	}

	if result.Processed != 0 {
		t.Errorf("Expected 0 processed, got %d", result.Processed)
	}
	if len(result.Errors) != 1 {
		t.Errorf("Expected 1 error for unmapped location type, got %v", result.Errors)
	}
}

func TestReindexIgnoresFilesWithoutFrontmatter(t *testing.T) {
	db := setupIndexerTestDB(t)
	ctx := context.Background()

	campaign := &models.Campaign{Name: "Cosmere", System: "Cosmere RPG"}
	if err := repository.NewCampaignRepository(db).Create(ctx, campaign); err != nil {
		t.Fatalf("Create campaign failed: %v", err)
	}

	root := t.TempDir()
	writeVaultFile(t, root, "Jugadores/Nico/Historia.md", "Prosa narrativa sin frontmatter.")

	indexer := NewIndexer(root, campaign.ID, db)
	result, err := indexer.Reindex(ctx)
	if err != nil {
		t.Fatalf("Reindex failed: %v", err)
	}

	if result.Processed != 0 || len(result.Errors) != 0 {
		t.Errorf("Expected file without frontmatter to be silently skipped, got %+v", result)
	}
}

func TestReindexPopulatesSessionNpcsAndPcs(t *testing.T) {
	db := setupIndexerTestDB(t)
	ctx := context.Background()

	campaign := &models.Campaign{Name: "Cosmere", System: "Cosmere RPG"}
	if err := repository.NewCampaignRepository(db).Create(ctx, campaign); err != nil {
		t.Fatalf("Create campaign failed: %v", err)
	}

	root := t.TempDir()
	writeVaultFile(t, root, "Locaciones/Kholinar.md", "---\ntipo: ciudad\nrelevancia: alta\n---\nCapital de Alethkar.")
	writeVaultFile(t, root, "NPC/Threnn.md", "---\ntipo: npc\nstatus: vivo\n---\nContable de la Casa Corvain.")
	writeVaultFile(t, root, "Jugadores/Lucas/Yashin.md", "---\ntipo: jugador\njugador: Lucas\nstatus: activo\n---\nFicha de Yashin.")
	writeVaultFile(t, root, "Arcos/Arco 1.md", "---\ntipo: arco\narco: 1\ntitulo: Arco Uno\nstatus: en curso\n---\nPrimer arco.")
	writeVaultFile(t, root, "Sesiones/Sesion 1.md",
		"---\ntipo: sesion\nnumero: 1\narco: \"[[Arco 1]]\"\nfecha: 2026-01-01\nestado: jugada\n---\n"+
			"El grupo llega a [[Kholinar]]. [[Yashin]] negocia con [[Threnn]]. Más tarde, [[Yashin]] se retira solo.")

	indexer := NewIndexer(root, campaign.ID, db)
	result, err := indexer.Reindex(ctx)
	if err != nil {
		t.Fatalf("Reindex failed: %v", err)
	}
	if len(result.Errors) != 0 {
		t.Fatalf("Expected no errors, got %v", result.Errors)
	}

	pcRepo := repository.NewPlayerCharacterRepository(db)
	pcs, err := pcRepo.List(ctx, campaign.ID)
	if err != nil {
		t.Fatalf("List player characters failed: %v", err)
	}
	if len(pcs) != 1 || pcs[0].CharacterName != "Yashin" {
		t.Fatalf("Expected 1 player character named Yashin, got %+v", pcs)
	}

	npcRepo := repository.NewNPCRepository(db)
	npcs, err := npcRepo.List(ctx, campaign.ID)
	if err != nil {
		t.Fatalf("List npcs failed: %v", err)
	}
	if len(npcs) != 1 || npcs[0].Name != "Threnn" {
		t.Fatalf("Expected 1 npc named Threnn, got %+v", npcs)
	}

	var sessionNpcCount, sessionPcCount int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM session_npcs`).Scan(&sessionNpcCount); err != nil {
		t.Fatalf("count session_npcs: %v", err)
	}
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM session_pcs`).Scan(&sessionPcCount); err != nil {
		t.Fatalf("count session_pcs: %v", err)
	}
	if sessionNpcCount != 1 {
		t.Errorf("Expected 1 session_npcs row, got %d", sessionNpcCount)
	}
	if sessionPcCount != 1 {
		t.Errorf("Expected 1 session_pcs row (deduplicado), got %d", sessionPcCount)
	}

	if len(result.UnresolvedWikilinks) != 0 {
		t.Errorf("Expected no unresolved wikilinks (location links in body are ignored on purpose), got %v", result.UnresolvedWikilinks)
	}
}
