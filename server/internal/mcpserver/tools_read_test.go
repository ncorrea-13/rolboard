package mcpserver

import (
	"context"
	"net/http"
	"strings"
	"testing"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func connect(t *testing.T, api *apiClient) *mcp.ClientSession {
	t.Helper()
	ctx := context.Background()
	serverT, clientT := mcp.NewInMemoryTransports()
	if _, err := newServer(api, "test").Connect(ctx, serverT, nil); err != nil {
		t.Fatal(err)
	}
	session, err := mcp.NewClient(&mcp.Implementation{Name: "test"}, nil).Connect(ctx, clientT, nil)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = session.Close() })
	return session
}

func call(t *testing.T, s *mcp.ClientSession, name string, args any) *mcp.CallToolResult {
	t.Helper()
	res, err := s.CallTool(context.Background(), &mcp.CallToolParams{Name: name, Arguments: args})
	if err != nil {
		t.Fatalf("%s: %v", name, err)
	}
	return res
}

func TestListCampaigns(t *testing.T) {
	api, id := newTestClient(t)
	s := connect(t, api)

	res := call(t, s, "list_campaigns", map[string]any{})
	if res.IsError {
		t.Fatalf("tool error: %+v", res.Content)
	}
	items := res.StructuredContent.(map[string]any)["items"].([]any)
	if len(items) != 1 || int64(items[0].(map[string]any)["id"].(float64)) != id {
		t.Errorf("unexpected campaigns: %v", items)
	}
}

func TestNPCRoundTrip(t *testing.T) {
	api, id := newTestClient(t)
	ctx := context.Background()
	var created struct {
		ID int64 `json:"id"`
	}
	body := map[string]any{"name": "Kaladin", "npc_kind": "npc", "detail_level": "full", "status": "vivo"}
	if err := api.do(ctx, http.MethodPost, "/api/campaigns/"+itoa(id)+"/npcs", body, &created); err != nil {
		t.Fatal(err)
	}
	s := connect(t, api)

	list := call(t, s, "list_npcs", map[string]any{"campaign_id": id})
	if list.IsError {
		t.Fatalf("list_npcs: %+v", list.Content)
	}
	items := list.StructuredContent.(map[string]any)["items"].([]any)
	if len(items) != 1 || items[0].(map[string]any)["name"] != "Kaladin" {
		t.Errorf("unexpected NPCs: %v", items)
	}

	got := call(t, s, "get_npc", map[string]any{"id": created.ID})
	if got.IsError {
		t.Fatalf("get_npc: %+v", got.Content)
	}
	if got.StructuredContent.(map[string]any)["name"] != "Kaladin" {
		t.Errorf("unexpected NPC: %v", got.StructuredContent)
	}
}

func TestToolErrorIsNotAProtocolError(t *testing.T) {
	api, _ := newTestClient(t)
	s := connect(t, api)

	res := call(t, s, "get_npc", map[string]any{"id": 999999})
	if !res.IsError {
		t.Error("expected IsError for a missing NPC")
	}
}

func TestEveryListToolWorksOnAnEmptyCampaign(t *testing.T) {
	api, id := newTestClient(t)
	s := connect(t, api)

	tools, err := s.ListTools(context.Background(), nil)
	if err != nil {
		t.Fatal(err)
	}
	lists := 0
	for _, tool := range tools.Tools {
		if !strings.HasPrefix(tool.Name, "list_") {
			continue
		}
		lists++
		args := map[string]any{"campaign_id": id}
		if tool.Name == "list_campaigns" {
			args = map[string]any{}
		}
		if res := call(t, s, tool.Name, args); res.IsError {
			t.Errorf("%s: %+v", tool.Name, res.Content)
		}
	}
	if lists != 16 {
		t.Errorf("expected 16 list tools, got %d", lists)
	}
}

func TestEveryGetToolReachesItsHandler(t *testing.T) {
	api, _ := newTestClient(t)
	s := connect(t, api)

	tools, err := s.ListTools(context.Background(), nil)
	if err != nil {
		t.Fatal(err)
	}
	gets := 0
	for _, tool := range tools.Tools {
		// These take more than an ID and have their own tests.
		own := tool.Name == "get_appearances" || tool.Name == "get_inventory" || tool.Name == "get_shop"
		if !strings.HasPrefix(tool.Name, "get_") || own {
			continue
		}
		gets++
		res := call(t, s, tool.Name, map[string]any{"id": 999999})
		if !res.IsError {
			t.Errorf("%s: expected an error for a missing ID", tool.Name)
			continue
		}
		// The mux answers an unknown route with "404 page not found"; a real
		// handler answers with its own message.
		text := res.Content[0].(*mcp.TextContent).Text
		if strings.Contains(text, "page not found") {
			t.Errorf("%s hits a route that does not exist: %s", tool.Name, text)
		}
	}
	if gets != 13 {
		t.Errorf("expected 13 get tools, got %d", gets)
	}
}

func TestSearchRanksTitleBeforeBodyAndIgnoresAccents(t *testing.T) {
	api, id := newTestClient(t)
	ctx := context.Background()
	base := "/api/campaigns/" + itoa(id)
	// A body match created first, a title match second: ranking must not follow creation order.
	notes := []map[string]any{
		{"title": "Apuntes", "body": "el viaje fue épico"},
		{"title": "Épico", "body": ""},
	}
	for _, n := range notes {
		if err := api.do(ctx, http.MethodPost, base+"/loose-notes", n, nil); err != nil {
			t.Fatal(err)
		}
	}
	s := connect(t, api)

	res := call(t, s, "search", map[string]any{"campaign_id": id, "query": "EPICO"})
	if res.IsError {
		t.Fatalf("search: %+v", res.Content)
	}
	items := res.StructuredContent.(map[string]any)["items"].([]any)
	if len(items) != 2 {
		t.Fatalf("expected 2 hits, got %v", items)
	}
	if first := items[0].(map[string]any)["title"]; first != "Épico" {
		t.Errorf("title match should rank first, got %v", first)
	}
}

func TestSearchEmptyQueryReturnsNothing(t *testing.T) {
	api, id := newTestClient(t)
	s := connect(t, api)

	res := call(t, s, "search", map[string]any{"campaign_id": id, "query": "  "})
	if res.IsError {
		t.Fatalf("search: %+v", res.Content)
	}
	if items := res.StructuredContent.(map[string]any)["items"].([]any); len(items) != 0 {
		t.Errorf("expected no hits, got %v", items)
	}
}

func TestGetAppearancesValidatesKind(t *testing.T) {
	api, _ := newTestClient(t)
	s := connect(t, api)

	res := call(t, s, "get_appearances", map[string]any{"kind": "quest", "id": 1})
	if !res.IsError {
		t.Error("expected an error for an unsupported kind")
	}
	res = call(t, s, "get_appearances", map[string]any{"kind": "npc", "id": 999999})
	if !res.IsError || strings.Contains(res.Content[0].(*mcp.TextContent).Text, "page not found") {
		t.Errorf("expected the handler's own error, got %+v", res.Content)
	}
}
