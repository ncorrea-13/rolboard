package app

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"path/filepath"
	"testing"
)

const (
	adminToken = "admin-token-for-tests"
	codeA      = "access-code-aaaa"
	codeB      = "access-code-bbbb"
)

type api struct {
	t   *testing.T
	url string
	c   *http.Client
}

func (a *api) do(method, path string, body any) (int, []byte) {
	a.t.Helper()
	var r io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			a.t.Fatal(err)
		}
		r = bytes.NewReader(raw)
	}
	req, err := http.NewRequest(method, a.url+path, r)
	if err != nil {
		a.t.Fatal(err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := a.c.Do(req)
	if err != nil {
		a.t.Fatal(err)
	}
	defer func() { _ = resp.Body.Close() }()
	out, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, out
}

// create posts a body and returns the ID of the created entity.
func (a *api) create(path string, body any) int64 {
	a.t.Helper()
	status, out := a.do(http.MethodPost, path, body)
	if status != http.StatusCreated {
		a.t.Fatalf("POST %s: %d %s", path, status, out)
	}
	var e struct {
		ID int64 `json:"id"`
	}
	if err := json.Unmarshal(out, &e); err != nil || e.ID == 0 {
		a.t.Fatalf("POST %s: no id in %s", path, out)
	}
	return e.ID
}

func newClient(t *testing.T, url string) *api {
	jar, _ := cookiejar.New(nil)
	return &api{t: t, url: url, c: &http.Client{Jar: jar}}
}

// world holds the IDs of one campaign's entities.
type world struct {
	campaign, arc, session, location, npc, pc, quest, group, lore, secret int64
	note, timeline, event, item, currency, encounter, participant         int64
	npcKind                                                               string
	customKind                                                            string
}

func seed(t *testing.T, admin *api, name, code string, n int) world {
	t.Helper()
	var w world
	w.campaign = admin.create("/api/campaigns", map[string]string{"name": name, "system": "dnd5e"})
	if status, out := admin.do(http.MethodPost, fmt.Sprintf("/api/campaigns/%d/access-code", w.campaign), map[string]string{"code": code}); status != http.StatusNoContent {
		t.Fatalf("access code: %d %s", status, out)
	}
	p := fmt.Sprintf("/api/campaigns/%d", w.campaign)
	w.arc = admin.create(p+"/arcs", map[string]any{"name": name + " arc", "order": 1, "status": "planificado"})
	w.session = admin.create(p+"/sessions", map[string]any{"session_number": n, "session_type": "session", "title": "s", "date": "2026-01-01"})
	w.location = admin.create(p+"/locations", map[string]any{"name": name + " loc", "location_type": "city"})

	status, out := admin.do(http.MethodGet, p+"/npc-types", nil)
	var types []struct {
		Key string `json:"key"`
	}
	if status != http.StatusOK || json.Unmarshal(out, &types) != nil || len(types) == 0 {
		t.Fatalf("npc types: %d %s", status, out)
	}
	w.npcKind = types[0].Key
	// A type that only exists in this campaign.
	admin.create(p+"/npc-types", map[string]string{"label": "Only " + name, "color": "#112233"})
	status, out = admin.do(http.MethodGet, p+"/npc-types", nil)
	if status != http.StatusOK || json.Unmarshal(out, &types) != nil {
		t.Fatalf("npc types: %d %s", status, out)
	}
	w.customKind = types[len(types)-1].Key

	w.npc = admin.create(p+"/npcs", map[string]any{"name": name + " npc", "npc_kind": w.npcKind, "detail_level": "minor", "status": "vivo"})
	w.pc = admin.create(p+"/player-characters", map[string]any{"player_name": "p", "character_name": name + " pc", "status": "activo"})
	w.quest = admin.create(p+"/quests", map[string]any{"title": name + " quest", "status": "active"})
	w.group = admin.create(p+"/groups", map[string]any{"name": name + " group"})
	w.lore = admin.create(p+"/lore", map[string]any{"title": name + " lore"})
	w.secret = admin.create(p+"/secrets", map[string]any{"title": name + " secret", "status": "hidden"})
	w.note = admin.create(p+"/loose-notes", map[string]any{"title": name + " note"})
	w.timeline = admin.create(p+"/timelines", map[string]any{"name": name + " timeline", "color": "#aabbcc"})
	w.event = admin.create(p+"/timeline-events", map[string]any{"timeline_id": w.timeline, "title": name + " event", "date_label": "1"})
	w.item = admin.create(p+"/items", map[string]any{"name": name + " item"})
	w.currency = admin.create(p+"/currencies", map[string]any{"name": name + " coin", "symbol": "c"})
	w.encounter = admin.create(p+"/encounters", map[string]any{"name": name + " fight", "status": "planificado"})
	w.participant = admin.create(fmt.Sprintf("/api/encounters/%d/participants", w.encounter), map[string]any{"display_name": "goblin"})
	return w
}

// TestCampaignSessionCannotReachAnotherCampaign logs into campaign A only
// and tries to read, change or link everything that belongs to campaign B.
// This is what keeps an AI agent connected to one campaign inside it.
func TestCampaignSessionCannotReachAnotherCampaign(t *testing.T) {
	dir := t.TempDir()
	handler, closer, err := New(Config{
		DBPath:      filepath.Join(dir, "rolboard.db"),
		VaultsRoot:  filepath.Join(dir, "vaults"),
		UploadsRoot: filepath.Join(dir, "uploads"),
		AdminToken:  adminToken,
	})
	if err != nil {
		t.Fatal(err)
	}
	srv := httptest.NewServer(handler)
	t.Cleanup(func() {
		srv.Close()
		_ = closer.Close()
	})

	admin := newClient(t, srv.URL)
	if status, out := admin.do(http.MethodPost, "/api/admin/login", map[string]string{"token": adminToken}); status != http.StatusNoContent && status != http.StatusOK {
		t.Fatalf("admin login: %d %s", status, out)
	}
	a := seed(t, admin, "A", codeA, 1)
	b := seed(t, admin, "B", codeB, 2)

	agent := newClient(t, srv.URL)
	if status, out := agent.do(http.MethodPost, fmt.Sprintf("/api/campaigns/%d/login", a.campaign), map[string]string{"code": codeA}); status != http.StatusNoContent {
		t.Fatalf("campaign login: %d %s", status, out)
	}

	t.Run("direct access to another campaign's resources", func(t *testing.T) {
		agent.t = t
		pb := fmt.Sprintf("/api/campaigns/%d", b.campaign)
		reads := []string{pb, pb + "/dashboard", pb + "/export", pb + "/trash"}
		for _, list := range []string{"arcs", "locations", "npcs", "npc-types", "player-characters", "quests", "sessions", "groups", "lore", "lore-categories", "secrets", "loose-notes", "timelines", "timeline-events", "items", "currencies", "encounters"} {
			reads = append(reads, pb+"/"+list)
		}
		entities := []string{
			fmt.Sprintf("/api/arcs/%d", b.arc), fmt.Sprintf("/api/sessions/%d", b.session),
			fmt.Sprintf("/api/locations/%d", b.location), fmt.Sprintf("/api/npcs/%d", b.npc),
			fmt.Sprintf("/api/player-characters/%d", b.pc), fmt.Sprintf("/api/quests/%d", b.quest),
			fmt.Sprintf("/api/groups/%d", b.group), fmt.Sprintf("/api/lore/%d", b.lore),
			fmt.Sprintf("/api/secrets/%d", b.secret), fmt.Sprintf("/api/loose-notes/%d", b.note),
			fmt.Sprintf("/api/timeline-events/%d", b.event), fmt.Sprintf("/api/items/%d", b.item),
			fmt.Sprintf("/api/encounters/%d", b.encounter),
		}
		subs := []string{
			fmt.Sprintf("/api/items/%d/owners", b.item), fmt.Sprintf("/api/npcs/%d/items", b.npc),
			fmt.Sprintf("/api/player-characters/%d/items", b.pc), fmt.Sprintf("/api/locations/%d/items", b.location),
			fmt.Sprintf("/api/encounters/%d/participants", b.encounter), fmt.Sprintf("/api/npcs/%d/appearances", b.npc),
			fmt.Sprintf("/api/player-characters/%d/appearances", b.pc), fmt.Sprintf("/api/npcs/%d/relations", b.npc),
			fmt.Sprintf("/api/groups/%d/members", b.group), fmt.Sprintf("/api/quests/%d/npcs", b.quest),
			fmt.Sprintf("/api/sessions/%d/npcs", b.session), fmt.Sprintf("/api/sessions/%d/quests", b.session),
		}
		for _, path := range append(append(reads, entities...), subs...) {
			if status, out := agent.do(http.MethodGet, path, nil); status < 400 {
				t.Errorf("GET %s: %d %s", path, status, out)
			}
		}
		for _, path := range entities {
			if status, out := agent.do(http.MethodPut, path, map[string]any{"title": "x", "name": "x"}); status < 400 {
				t.Errorf("PUT %s: %d %s", path, status, out)
			}
			if status, out := agent.do(http.MethodDelete, path, nil); status < 400 {
				t.Errorf("DELETE %s: %d %s", path, status, out)
			}
		}
		for _, list := range []string{"arcs", "locations", "npcs", "player-characters", "quests", "sessions", "groups", "lore", "secrets", "loose-notes", "timelines", "timeline-events", "items", "currencies", "encounters"} {
			if status, out := agent.do(http.MethodPost, pb+"/"+list, map[string]any{"name": "x", "title": "x"}); status < 400 {
				t.Errorf("POST %s/%s: %d %s", pb, list, status, out)
			}
		}
		for _, path := range entities {
			if status, out := admin.do(http.MethodGet, path, nil); status != http.StatusOK {
				t.Errorf("%s should survive the attempts: %d %s", path, status, out)
			}
		}
	})

	t.Run("references to another campaign in a body", func(t *testing.T) {
		agent.t = t
		session := int64(100)
		type ref struct {
			field string
			a, b  int64
		}
		type target struct {
			name, method, path string
			base               func() map[string]any
			refs               []ref
		}
		pa := fmt.Sprintf("/api/campaigns/%d", a.campaign)
		targets := []target{
			{"create npc", http.MethodPost, pa + "/npcs", func() map[string]any {
				return map[string]any{"name": "n", "npc_kind": a.npcKind, "detail_level": "minor", "status": "vivo"}
			}, []ref{{"location_id", a.location, b.location}}},
			{"update npc", http.MethodPut, fmt.Sprintf("/api/npcs/%d", a.npc), func() map[string]any {
				return map[string]any{"name": "n", "npc_kind": a.npcKind, "detail_level": "minor", "status": "vivo"}
			}, []ref{{"location_id", a.location, b.location}}},
			{"create location", http.MethodPost, pa + "/locations", func() map[string]any {
				return map[string]any{"name": "l", "location_type": "city"}
			}, []ref{{"parent_location_id", a.location, b.location}}},
			{"update location", http.MethodPut, fmt.Sprintf("/api/locations/%d", a.location), func() map[string]any {
				return map[string]any{"name": "l", "location_type": "city"}
			}, []ref{{"parent_location_id", 0, b.location}}},
			{"create session", http.MethodPost, pa + "/sessions", func() map[string]any {
				session++
				return map[string]any{"session_number": session, "session_type": "session", "title": "s", "date": "2026-01-01"}
			}, []ref{{"arc_id", a.arc, b.arc}}},
			{"update session", http.MethodPut, fmt.Sprintf("/api/sessions/%d", a.session), func() map[string]any {
				return map[string]any{"session_number": 1, "session_type": "session", "title": "s", "date": "2026-01-01"}
			}, []ref{{"arc_id", a.arc, b.arc}}},
			{"create lore", http.MethodPost, pa + "/lore", func() map[string]any { return map[string]any{"title": "t"} },
				[]ref{{"arc_id", a.arc, b.arc}, {"location_id", a.location, b.location}}},
			{"update lore", http.MethodPut, fmt.Sprintf("/api/lore/%d", a.lore), func() map[string]any { return map[string]any{"title": "t"} },
				[]ref{{"arc_id", a.arc, b.arc}, {"location_id", a.location, b.location}}},
			{"create group", http.MethodPost, pa + "/groups", func() map[string]any { return map[string]any{"name": "g"} },
				[]ref{{"lider_npc_id", a.npc, b.npc}}},
			{"update group", http.MethodPut, fmt.Sprintf("/api/groups/%d", a.group), func() map[string]any { return map[string]any{"name": "g"} },
				[]ref{{"lider_npc_id", a.npc, b.npc}}},
			{"create secret", http.MethodPost, pa + "/secrets", func() map[string]any { return map[string]any{"title": "s", "status": "hidden"} },
				[]ref{{"npc_id", a.npc, b.npc}, {"location_id", a.location, b.location}, {"lore_entry_id", a.lore, b.lore}}},
			{"update secret", http.MethodPut, fmt.Sprintf("/api/secrets/%d", a.secret), func() map[string]any { return map[string]any{"title": "s", "status": "hidden"} },
				[]ref{{"npc_id", a.npc, b.npc}, {"location_id", a.location, b.location}, {"lore_entry_id", a.lore, b.lore}}},
			{"create timeline event", http.MethodPost, pa + "/timeline-events", func() map[string]any {
				return map[string]any{"timeline_id": a.timeline, "title": "e", "date_label": "1"}
			}, []ref{{"timeline_id", a.timeline, b.timeline}, {"arc_id", a.arc, b.arc}, {"session_id", a.session, b.session},
				{"location_id", a.location, b.location}, {"group_id", a.group, b.group}, {"lore_entry_id", a.lore, b.lore}}},
			{"update timeline event", http.MethodPut, fmt.Sprintf("/api/timeline-events/%d", a.event), func() map[string]any {
				return map[string]any{"timeline_id": a.timeline, "title": "e", "date_label": "1"}
			}, []ref{{"timeline_id", a.timeline, b.timeline}, {"arc_id", a.arc, b.arc}, {"session_id", a.session, b.session},
				{"location_id", a.location, b.location}, {"group_id", a.group, b.group}, {"lore_entry_id", a.lore, b.lore}}},
			{"create encounter", http.MethodPost, pa + "/encounters", func() map[string]any { return map[string]any{"name": "e", "status": "planificado"} },
				[]ref{{"session_id", a.session, b.session}}},
			{"update encounter", http.MethodPut, fmt.Sprintf("/api/encounters/%d", a.encounter), func() map[string]any { return map[string]any{"name": "e", "status": "planificado"} },
				[]ref{{"session_id", a.session, b.session}}},
			{"create participant", http.MethodPost, fmt.Sprintf("/api/encounters/%d/participants", a.encounter), func() map[string]any { return map[string]any{} },
				[]ref{{"pc_id", a.pc, b.pc}, {"npc_id", a.npc, b.npc}}},
			{"update participant", http.MethodPut, fmt.Sprintf("/api/encounter-participants/%d", a.participant), func() map[string]any { return map[string]any{} },
				[]ref{{"pc_id", a.pc, b.pc}, {"npc_id", a.npc, b.npc}}},
		}
		for _, tg := range targets {
			for _, r := range tg.refs {
				body := tg.base()
				if r.a != 0 {
					body[r.field] = r.a
					if status, out := agent.do(tg.method, tg.path, body); status >= 300 {
						t.Fatalf("%s control (%s in the same campaign): %d %s", tg.name, r.field, status, out)
					}
				}
				body = tg.base()
				body[r.field] = r.b
				if status, out := agent.do(tg.method, tg.path, body); status < 400 {
					t.Errorf("%s accepted %s from another campaign: %d %s", tg.name, r.field, status, out)
				}
			}
		}

		attacks := []struct {
			name, method, path string
			body               any
		}{
			{"secret known by foreign npc", http.MethodPost, pa + "/secrets", map[string]any{"title": "s", "status": "hidden", "known_by_npc_ids": []int64{b.npc}}},
			{"secret revealed in foreign session", http.MethodPost, pa + "/secrets", map[string]any{"title": "s", "status": "revealed", "revealed_session_id": b.session}},
			{"npc of a type from another campaign", http.MethodPost, pa + "/npcs", map[string]any{"name": "n", "npc_kind": b.customKind, "detail_level": "minor", "status": "vivo"}},
			{"item priced in a foreign currency", http.MethodPost, pa + "/items", map[string]any{"name": "i", "prices": []any{map[string]any{"currency_id": b.currency, "amount": 1}}}},
			{"currency sold in a foreign location", http.MethodPost, pa + "/currencies", map[string]any{"name": "c", "symbol": "c", "location_ids": []int64{b.location}}},
			{"foreign item in an npc inventory", http.MethodPut, fmt.Sprintf("/api/npcs/%d/items/%d", a.npc, b.item), map[string]any{"quantity": 1}},
			{"foreign item in a pc inventory", http.MethodPut, fmt.Sprintf("/api/player-characters/%d/items/%d", a.pc, b.item), map[string]any{"quantity": 1}},
			{"foreign item in a shop", http.MethodPut, fmt.Sprintf("/api/locations/%d/items/%d", a.location, b.item), map[string]any{}},
			{"foreign currency in a shop price", http.MethodPut, fmt.Sprintf("/api/locations/%d/items/%d", a.location, a.item), map[string]any{"prices": []any{map[string]any{"currency_id": b.currency, "amount": 1}}}},
			{"relation to a foreign npc", http.MethodPost, fmt.Sprintf("/api/npcs/%d/relations", a.npc), map[string]any{"to_npc_id": b.npc, "role": "ally"}},
			{"link to a foreign pc", http.MethodPut, fmt.Sprintf("/api/npcs/%d/players/%d", a.npc, b.pc), map[string]any{"role": "ally"}},
			{"foreign npc in a quest", http.MethodPut, fmt.Sprintf("/api/quests/%d/npcs/%d", a.quest, b.npc), map[string]any{"role": "ally"}},
			{"foreign npc in a session", http.MethodPost, fmt.Sprintf("/api/sessions/%d/npcs", a.session), map[string]any{"npc_id": b.npc}},
			{"foreign quest in a session", http.MethodPost, fmt.Sprintf("/api/sessions/%d/quests", a.session), map[string]any{"quest_id": b.quest}},
			{"foreign npc in a group", http.MethodPost, fmt.Sprintf("/api/groups/%d/members", a.group), map[string]any{"npc_id": b.npc}},
			{"foreign pc in a group", http.MethodPost, fmt.Sprintf("/api/groups/%d/pc-members", a.group), map[string]any{"pc_id": b.pc}},
			{"foreign item in a foreign npc inventory", http.MethodPut, fmt.Sprintf("/api/npcs/%d/items/%d", b.npc, a.item), map[string]any{"quantity": 1}},
		}
		for _, at := range attacks {
			if status, out := agent.do(at.method, at.path, at.body); status < 400 {
				t.Errorf("%s: %d %s", at.name, status, out)
			}
		}
	})
}
