package mcpserver

import (
	"context"
	"net/http"
	"net/http/cookiejar"
	"strings"
	"testing"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

func structured(t *testing.T, res *mcp.CallToolResult) map[string]any {
	t.Helper()
	if res.IsError {
		t.Fatalf("tool error: %+v", res.Content)
	}
	m, ok := res.StructuredContent.(map[string]any)
	if !ok {
		t.Fatalf("unexpected structured content: %#v", res.StructuredContent)
	}
	return m
}

func errorText(t *testing.T, res *mcp.CallToolResult) string {
	t.Helper()
	if !res.IsError {
		t.Fatal("expected a tool error")
	}
	return res.Content[0].(*mcp.TextContent).Text
}

func TestWriteToolsAreAnnotated(t *testing.T) {
	api, _ := newTestClient(t)
	s := connect(t, api)

	tools, err := s.ListTools(context.Background(), nil)
	if err != nil {
		t.Fatal(err)
	}
	writes := 0
	for _, tool := range tools.Tools {
		isWrite := strings.HasPrefix(tool.Name, "create_") || strings.HasPrefix(tool.Name, "update_")
		for _, banned := range []string{"delete", "remove", "reindex", "restore", "image"} {
			if strings.Contains(tool.Name, banned) {
				t.Errorf("%s: agents can't delete, restore, reindex or touch images", tool.Name)
			}
		}
		if isWrite != !tool.Annotations.ReadOnlyHint {
			t.Errorf("%s: ReadOnlyHint=%v does not match its name", tool.Name, tool.Annotations.ReadOnlyHint)
		}
		if isWrite {
			writes++
			if tool.Annotations.DestructiveHint == nil {
				t.Errorf("%s: DestructiveHint must be explicit (the default is true)", tool.Name)
			}
		}
	}
	if writes != 31 {
		t.Errorf("expected 31 write tools, got %d", writes)
	}
}

func TestLooseNoteCreateAndPartialUpdate(t *testing.T) {
	api, id := newTestClient(t)
	s := connect(t, api)

	created := structured(t, call(t, s, "create_loose_note", map[string]any{
		"campaign_id": id, "title": "Idea", "body": "un puente roto", "pending": true,
	}))
	noteID := created["id"].(float64)

	updated := structured(t, call(t, s, "update_loose_note", map[string]any{"id": noteID, "title": "Idea 2"}))
	if updated["title"] != "Idea 2" || updated["body"] != "un puente roto" || updated["pending"] != true {
		t.Errorf("a partial update must keep the other fields: %v", updated)
	}
}

func TestUpdateSessionPrepKeepsTheRestOfTheSession(t *testing.T) {
	api, id := newTestClient(t)
	ctx := context.Background()
	var session struct {
		ID int64 `json:"id"`
	}
	body := map[string]any{"session_number": 1, "session_type": "session", "title": "Inicio", "date": "2026-01-01", "summary": "resumen"}
	if err := api.do(ctx, http.MethodPost, "/api/campaigns/"+itoa(id)+"/sessions", body, &session); err != nil {
		t.Fatal(err)
	}
	s := connect(t, api)

	updated := structured(t, call(t, s, "update_session_prep", map[string]any{"session_id": session.ID, "prep_notes": "preparar la emboscada"}))
	if updated["prep_notes"] != "preparar la emboscada" {
		t.Errorf("prep notes not saved: %v", updated)
	}
	if updated["title"] != "Inicio" || updated["date"] != "2026-01-01" || updated["summary"] != "resumen" {
		t.Errorf("the rest of the session changed: %v", updated)
	}
}

func TestCreateNPCUsesDefaultsAndCampaignTypes(t *testing.T) {
	api, id := newTestClient(t)
	s := connect(t, api)

	types := structured(t, call(t, s, "list_npc_types", map[string]any{"campaign_id": id}))["items"].([]any)
	if len(types) == 0 {
		t.Fatal("a new campaign should come with NPC types")
	}
	kind := types[0].(map[string]any)["key"]

	res := call(t, s, "create_npc", map[string]any{"campaign_id": id, "name": "Syl", "npc_kind": kind})
	npc := res.StructuredContent
	if res.IsError || npc == nil {
		t.Fatalf("create_npc: %+v", res.Content)
	}
	got := npc.(map[string]any)
	if got["detail_level"] != "minor" || got["status"] != "vivo" {
		t.Errorf("defaults not applied: %v", got)
	}

	bad := call(t, s, "create_npc", map[string]any{"campaign_id": id, "name": "X", "npc_kind": "no-such-kind"})
	if !strings.Contains(errorText(t, bad), "400") {
		t.Errorf("an unknown npc_kind should be a 400: %s", errorText(t, bad))
	}
}

func TestCreateQuestAndLore(t *testing.T) {
	api, id := newTestClient(t)
	s := connect(t, api)

	quest := structured(t, call(t, s, "create_quest", map[string]any{"campaign_id": id, "title": "Salvar la aldea"}))
	if quest["status"] != "active" {
		t.Errorf("default status should be active: %v", quest)
	}
	errorText(t, call(t, s, "create_quest", map[string]any{"campaign_id": id, "title": "X", "status": "nope"}))

	lore := structured(t, call(t, s, "create_lore", map[string]any{"campaign_id": id, "title": "La Guerra"}))
	if lore["title"] != "La Guerra" {
		t.Errorf("unexpected lore: %v", lore)
	}
	errorText(t, call(t, s, "create_lore", map[string]any{"campaign_id": id, "title": "  "}))
}

func TestItemsInventoryAndShop(t *testing.T) {
	api, id := newTestClient(t)
	s := connect(t, api)

	currencies := structured(t, call(t, s, "list_currencies", map[string]any{"campaign_id": id}))["items"].([]any)
	if len(currencies) != 0 {
		t.Fatalf("a new campaign has no currencies: %v", currencies)
	}
	var currency struct {
		ID int64 `json:"id"`
	}
	if err := api.do(context.Background(), http.MethodPost, "/api/campaigns/"+itoa(id)+"/currencies", map[string]any{"name": "Oro", "symbol": "po", "is_base": true}, &currency); err != nil {
		t.Fatal(err)
	}

	item := structured(t, call(t, s, "create_item", map[string]any{
		"campaign_id": id, "name": "Espada corta", "category": "arma", "rarity": "común",
		"prices": []any{map[string]any{"currency_id": currency.ID, "amount": 10}},
	}))
	itemID := item["id"].(float64)
	if prices := item["prices"].([]any); len(prices) != 1 {
		t.Errorf("price not saved: %v", item)
	}
	errorText(t, call(t, s, "create_item", map[string]any{"campaign_id": id, "name": " "}))

	var npc struct {
		ID int64 `json:"id"`
	}
	kind := structured(t, call(t, s, "list_npc_types", map[string]any{"campaign_id": id}))["items"].([]any)[0].(map[string]any)["key"]
	if err := api.do(context.Background(), http.MethodPost, "/api/campaigns/"+itoa(id)+"/npcs", map[string]any{"name": "Syl", "npc_kind": kind, "detail_level": "minor", "status": "vivo"}, &npc); err != nil {
		t.Fatal(err)
	}

	inv := structured(t, call(t, s, "update_inventory_item", map[string]any{"kind": "npc", "owner_id": npc.ID, "item_id": itemID, "quantity": 3, "notes": "oxidada"}))
	entries := inv["items"].([]any)
	if len(entries) != 1 || entries[0].(map[string]any)["quantity"] != float64(3) {
		t.Errorf("unexpected inventory: %v", inv)
	}
	errorText(t, call(t, s, "update_inventory_item", map[string]any{"kind": "npc", "owner_id": npc.ID, "item_id": itemID, "quantity": 0}))
	errorText(t, call(t, s, "update_inventory_item", map[string]any{"kind": "dragon", "owner_id": npc.ID, "item_id": itemID, "quantity": 1}))

	if got := structured(t, call(t, s, "get_inventory", map[string]any{"kind": "npc", "owner_id": npc.ID}))["items"].([]any); len(got) != 1 {
		t.Errorf("get_inventory: %v", got)
	}
	if got := structured(t, call(t, s, "get_item_owners", map[string]any{"id": itemID}))["items"].([]any); len(got) != 1 {
		t.Errorf("get_item_owners: %v", got)
	}

	var loc struct {
		ID int64 `json:"id"`
	}
	if err := api.do(context.Background(), http.MethodPost, "/api/campaigns/"+itoa(id)+"/locations", map[string]any{"name": "Herrería", "location_type": "city"}, &loc); err != nil {
		t.Fatal(err)
	}
	shop := structured(t, call(t, s, "update_shop_item", map[string]any{
		"location_id": loc.ID, "item_id": itemID, "notes": "oferta",
		"prices": []any{map[string]any{"currency_id": currency.ID, "amount": 8}},
	}))
	if len(shop["items"].([]any)) != 1 {
		t.Errorf("unexpected shop: %v", shop)
	}
	if got := structured(t, call(t, s, "get_shop", map[string]any{"location_id": loc.ID}))["items"].([]any); len(got) != 1 {
		t.Errorf("get_shop: %v", got)
	}
}

// call2 calls a tool and returns its structured result, failing on a tool error.
func call2(t *testing.T, s *mcp.ClientSession, name string, args map[string]any) map[string]any {
	t.Helper()
	return structured(t, call(t, s, name, args))
}

func id(m map[string]any) float64 { return m["id"].(float64) }

func TestCreateAndUpdateToolsRoundTrip(t *testing.T) {
	api, cid := newTestClient(t)
	s := connect(t, api)
	camp := map[string]any{"campaign_id": cid}
	with := func(extra map[string]any) map[string]any {
		out := map[string]any{"campaign_id": cid}
		for k, v := range extra {
			out[k] = v
		}
		return out
	}

	arc := call2(t, s, "create_arc", with(map[string]any{"title": "Acto 1", "order": 1}))
	if arc["title"] != "Acto 1" || arc["status"] != "planificado" {
		t.Errorf("create_arc: %v", arc)
	}
	arc = call2(t, s, "update_arc", map[string]any{"id": id(arc), "title": "Acto I", "summary": "resumen"})
	if arc["title"] != "Acto I" || arc["summary"] != "resumen" || arc["status"] != "planificado" {
		t.Errorf("update_arc must keep the other fields: %v", arc)
	}

	session := call2(t, s, "create_session", with(map[string]any{"session_number": 1, "title": "Inicio", "date": "2026-02-01", "arc_id": id(arc)}))
	session = call2(t, s, "update_session", map[string]any{"id": id(session), "summary": "pasó algo", "planned": true})
	if session["summary"] != "pasó algo" || session["title"] != "Inicio" || session["arc_id"] != id(arc) || session["date"] != "2026-02-01" {
		t.Errorf("update_session must keep the other fields: %v", session)
	}

	loc := call2(t, s, "create_location", with(map[string]any{"name": "Ciudad", "location_type": "city"}))
	child := call2(t, s, "create_location", with(map[string]any{"name": "Barrio", "location_type": "site", "parent_location_id": id(loc)}))
	child = call2(t, s, "update_location", map[string]any{"id": id(child), "notes": "ruidoso"})
	if child["notes"] != "ruidoso" || child["parent_location_id"] != id(loc) {
		t.Errorf("update_location lost the parent: %v", child)
	}

	kind := call2(t, s, "list_npc_types", camp)["items"].([]any)[0].(map[string]any)["key"]
	npc := call2(t, s, "create_npc", with(map[string]any{"name": "Syl", "npc_kind": kind}))
	npc = call2(t, s, "update_npc", map[string]any{"id": id(npc), "location_id": id(loc), "rol": "guía", "max_hp": 12})
	if npc["rol"] != "guía" || npc["location_id"] != id(loc) || npc["max_hp"] != float64(12) || npc["name"] != "Syl" || npc["status"] != "vivo" {
		t.Errorf("update_npc: %v", npc)
	}

	group := call2(t, s, "create_group", with(map[string]any{"name": "Gremio", "lider_npc_id": id(npc)}))
	group = call2(t, s, "update_group", map[string]any{"id": id(group), "alineacion": "neutral"})
	if group["alineacion"] != "neutral" || group["lider_npc_id"] != id(npc) {
		t.Errorf("update_group: %v", group)
	}

	secret := call2(t, s, "create_secret", with(map[string]any{"title": "El rey miente", "npc_id": id(npc), "known_by_npc_ids": []any{id(npc)}}))
	if secret["status"] != "hidden" {
		t.Errorf("create_secret default status: %v", secret)
	}
	secret = call2(t, s, "update_secret", map[string]any{"id": id(secret), "status": "revealed", "revealed_session_id": id(session)})
	if secret["status"] != "revealed" || secret["npc_id"] != id(npc) || len(secret["known_by_npc_ids"].([]any)) != 1 {
		t.Errorf("update_secret must keep links: %v", secret)
	}

	timelines := call2(t, s, "list_timelines", camp)["items"].([]any)
	if len(timelines) == 0 {
		var tl struct {
			ID int64 `json:"id"`
		}
		if err := api.do(context.Background(), http.MethodPost, "/api/campaigns/"+itoa(cid)+"/timelines", map[string]any{"name": "Historia", "color": "#aabbcc"}, &tl); err != nil {
			t.Fatal(err)
		}
		timelines = call2(t, s, "list_timelines", camp)["items"].([]any)
	}
	tlID := timelines[0].(map[string]any)["id"]
	event := call2(t, s, "create_timeline_event", with(map[string]any{"timeline_id": tlID, "title": "Guerra", "date_label": "Año 1", "arc_id": id(arc)}))
	event = call2(t, s, "update_timeline_event", map[string]any{"id": id(event), "description": "larga"})
	if event["description"] != "larga" || event["arc_id"] != id(arc) || event["date_label"] != "Año 1" {
		t.Errorf("update_timeline_event: %v", event)
	}

	pc := call2(t, s, "create_player_character", with(map[string]any{"character_name": "Kal", "player_name": "Ana"}))
	if pc["status"] != "activo" {
		t.Errorf("create_player_character default status: %v", pc)
	}
	pc = call2(t, s, "update_player_character", map[string]any{"id": id(pc), "class": "guerrero"})
	if pc["class"] != "guerrero" || pc["player_name"] != "Ana" {
		t.Errorf("update_player_character: %v", pc)
	}

	quest := call2(t, s, "create_quest", with(map[string]any{"title": "Misión"}))
	quest = call2(t, s, "update_quest", map[string]any{"id": id(quest), "status": "completed"})
	if quest["status"] != "completed" || quest["title"] != "Misión" {
		t.Errorf("update_quest: %v", quest)
	}

	lore := call2(t, s, "create_lore", with(map[string]any{"title": "Mito", "arc_id": id(arc)}))
	lore = call2(t, s, "update_lore", map[string]any{"id": id(lore), "body": "érase una vez"})
	if lore["body"] != "érase una vez" || lore["arc_id"] != id(arc) {
		t.Errorf("update_lore: %v", lore)
	}

	item := call2(t, s, "create_item", with(map[string]any{"name": "Daga", "rarity": "rara"}))
	item = call2(t, s, "update_item", map[string]any{"id": id(item), "effect": "brilla"})
	if item["effect"] != "brilla" || item["rarity"] != "rara" || item["name"] != "Daga" {
		t.Errorf("update_item: %v", item)
	}

	enc := call2(t, s, "create_encounter", with(map[string]any{"name": "Emboscada", "session_id": id(session)}))
	enc = call2(t, s, "update_encounter", map[string]any{"id": id(enc), "status": "activo", "round": 2})
	if enc["status"] != "activo" || enc["round"] != float64(2) || enc["session_id"] != id(session) {
		t.Errorf("update_encounter: %v", enc)
	}
	part := call2(t, s, "create_encounter_participant", map[string]any{"encounter_id": id(enc), "npc_id": id(npc), "max_hp": 10, "current_hp": 10})
	part = call2(t, s, "update_encounter_participant", map[string]any{"encounter_id": id(enc), "id": id(part), "current_hp": 4, "initiative_value": 15})
	if part["current_hp"] != float64(4) || part["max_hp"] != float64(10) || part["npc_id"] != id(npc) {
		t.Errorf("update_encounter_participant: %v", part)
	}
	errorText(t, call(t, s, "update_encounter_participant", map[string]any{"encounter_id": id(enc), "id": 999999, "current_hp": 1}))
	errorText(t, call(t, s, "update_npc", map[string]any{"id": 999999, "name": "x"}))
	errorText(t, call(t, s, "update_npc", map[string]any{"id": id(npc), "status": "dead"}))
}

func TestWriteToolsRejectReferencesToAnotherCampaign(t *testing.T) {
	srv, cid := startServer(t, false)
	jar, _ := cookiejar.New(nil)
	adminHTTP := srv.Client()
	adminHTTP.Jar = jar
	admin := &apiClient{http: adminHTTP, cfg: Config{BaseURL: srv.URL}}
	ctx := context.Background()
	if err := admin.send(ctx, http.MethodPost, "/api/admin/login", map[string]string{"token": testAdminToken}, nil); err != nil {
		t.Fatal(err)
	}
	var other models.Campaign
	if err := admin.send(ctx, http.MethodPost, "/api/campaigns", map[string]string{"name": "Other", "system": "dnd5e"}, &other); err != nil {
		t.Fatal(err)
	}
	var foreign struct {
		ID int64 `json:"id"`
	}
	if err := admin.send(ctx, http.MethodPost, "/api/campaigns/"+itoa(other.ID)+"/locations", map[string]any{"name": "Far", "location_type": "city"}, &foreign); err != nil {
		t.Fatal(err)
	}

	api, err := newAPIClient(Config{BaseURL: srv.URL, CampaignID: cid, AccessCode: testAccessCode})
	if err != nil {
		t.Fatal(err)
	}
	s := connect(t, api)
	kind := call2(t, s, "list_npc_types", map[string]any{"campaign_id": cid})["items"].([]any)[0].(map[string]any)["key"]

	own := call2(t, s, "create_location", map[string]any{"campaign_id": cid, "name": "Near", "location_type": "city"})
	npc := call2(t, s, "create_npc", map[string]any{"campaign_id": cid, "name": "Syl", "npc_kind": kind, "location_id": id(own)})

	if text := errorText(t, call(t, s, "create_npc", map[string]any{"campaign_id": cid, "name": "X", "npc_kind": kind, "location_id": foreign.ID})); !strings.Contains(text, "400") {
		t.Errorf("create_npc with a foreign location: %s", text)
	}
	if text := errorText(t, call(t, s, "update_npc", map[string]any{"id": id(npc), "location_id": foreign.ID})); !strings.Contains(text, "400") {
		t.Errorf("update_npc with a foreign location: %s", text)
	}
	if text := errorText(t, call(t, s, "update_location", map[string]any{"id": foreign.ID, "name": "Hijack"})); !strings.Contains(text, "401") {
		t.Errorf("update_location of a foreign location: %s", text)
	}
	if text := errorText(t, call(t, s, "create_location", map[string]any{"campaign_id": other.ID, "name": "Hijack", "location_type": "city"})); !strings.Contains(text, "can only use campaign") {
		t.Errorf("create_location in a foreign campaign: %s", text)
	}
}
