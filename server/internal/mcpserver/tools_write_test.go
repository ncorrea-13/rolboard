package mcpserver

import (
	"context"
	"net/http"
	"strings"
	"testing"

	"github.com/modelcontextprotocol/go-sdk/mcp"
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
	if writes != 9 {
		t.Errorf("expected 9 write tools, got %d", writes)
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
