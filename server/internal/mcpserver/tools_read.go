package mcpserver

import (
	"context"
	"fmt"
	"net/http"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

var readOnly = &mcp.ToolAnnotations{ReadOnlyHint: true}

type campaignArgs struct {
	CampaignID int64 `json:"campaign_id" jsonschema:"campaign ID, from list_campaigns"`
}

type idArgs struct {
	ID int64 `json:"id" jsonschema:"entity ID, from the matching list_* tool"`
}

type noArgs struct{}

// list wraps every list_* result in an object, which is what MCP clients expect.
type list[S any] struct {
	Items []S `json:"items"`
}

type campaignSummary struct {
	ID     int64  `json:"id"`
	Name   string `json:"name"`
	System string `json:"system"`
	Status string `json:"status"`
}

type npcSummary struct {
	ID     int64  `json:"id"`
	Name   string `json:"name"`
	Kind   string `json:"npc_kind"`
	Status string `json:"status"`
}

type playerCharacterSummary struct {
	ID            int64  `json:"id"`
	CharacterName string `json:"character_name"`
	PlayerName    string `json:"player_name"`
	Class         string `json:"class"`
	Status        string `json:"status"`
}

type sessionSummary struct {
	ID            int64  `json:"id"`
	SessionNumber int64  `json:"session_number"`
	SubNumber     int64  `json:"sub_number"`
	SessionType   string `json:"session_type"`
	Title         string `json:"title"`
	Date          string `json:"date"`
}

type arcSummary struct {
	ID     int64  `json:"id"`
	Title  string `json:"title"`
	Order  int64  `json:"order"`
	Status string `json:"status"`
}

type questSummary struct {
	ID       int64  `json:"id"`
	Title    string `json:"title"`
	Status   string `json:"status"`
	Priority *int64 `json:"priority,omitempty"`
}

type locationSummary struct {
	ID               int64  `json:"id"`
	Name             string `json:"name"`
	LocationType     string `json:"location_type"`
	ParentLocationID *int64 `json:"parent_location_id,omitempty"`
}

type groupSummary struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	Alineacion  string `json:"alineacion"`
	MemberCount int64  `json:"member_count"`
}

type loreSummary struct {
	ID         int64  `json:"id"`
	Title      string `json:"title"`
	CategoryID *int64 `json:"category_id,omitempty"`
}

type looseNoteSummary struct {
	ID      int64  `json:"id"`
	Title   string `json:"title"`
	Pending bool   `json:"pending"`
}

type secretSummary struct {
	ID     int64  `json:"id"`
	Title  string `json:"title"`
	Status string `json:"status"`
}

type timelineEventSummary struct {
	ID         int64  `json:"id"`
	TimelineID int64  `json:"timeline_id"`
	Title      string `json:"title"`
	DateLabel  string `json:"date_label"`
}

// registerEntity adds list_<plural> and get_<singular> for one entity.
// listPath and getPath take the campaign ID and the entity ID respectively.
// summarize returns false to leave an item out of the list.
func registerEntity[T, S any](s *mcp.Server, api *apiClient, singular, plural, listPath, getPath string, summarize func(T) (S, bool)) {
	mcp.AddTool(s, &mcp.Tool{
		Name:        "list_" + plural,
		Description: fmt.Sprintf("List the %s of a campaign (summary). Use get_%s for the full record.", plural, singular),
		Annotations: readOnly,
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in campaignArgs) (*mcp.CallToolResult, list[S], error) {
		var all []T
		if err := api.do(ctx, http.MethodGet, fmt.Sprintf(listPath, in.CampaignID), nil, &all); err != nil {
			return nil, list[S]{}, err
		}
		out := list[S]{Items: make([]S, 0, len(all))}
		for _, item := range all {
			if sum, ok := summarize(item); ok {
				out.Items = append(out.Items, sum)
			}
		}
		return nil, out, nil
	})

	mcp.AddTool(s, &mcp.Tool{
		Name:        "get_" + singular,
		Description: fmt.Sprintf("Get one %s with all its fields.", singular),
		Annotations: readOnly,
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in idArgs) (*mcp.CallToolResult, any, error) {
		// Out is any, not T: the SDK infers an array schema for json.RawMessage
		// fields (NPC, PlayerCharacter) and would reject the object.
		var item T
		if err := api.do(ctx, http.MethodGet, fmt.Sprintf(getPath, in.ID), nil, &item); err != nil {
			return nil, nil, err
		}
		return nil, item, nil
	})
}

func registerReadTools(s *mcp.Server, api *apiClient) {
	mcp.AddTool(s, &mcp.Tool{
		Name:        "list_campaigns",
		Description: "List the campaigns of this Rolboard instance. You can only read the one this connection is logged into.",
		Annotations: readOnly,
	}, func(ctx context.Context, _ *mcp.CallToolRequest, _ noArgs) (*mcp.CallToolResult, list[campaignSummary], error) {
		var campaigns []models.Campaign
		if err := api.do(ctx, http.MethodGet, "/api/campaigns", nil, &campaigns); err != nil {
			return nil, list[campaignSummary]{}, err
		}
		out := list[campaignSummary]{Items: make([]campaignSummary, 0, len(campaigns))}
		for _, c := range campaigns {
			out.Items = append(out.Items, campaignSummary{ID: c.ID, Name: c.Name, System: c.System, Status: c.Status})
		}
		return nil, out, nil
	})

	registerEntity(s, api, "npc", "npcs", "/api/campaigns/%d/npcs", "/api/npcs/%d",
		func(n models.NPC) (npcSummary, bool) {
			// "referencia" NPCs are vault index notes, not characters.
			return npcSummary{ID: n.ID, Name: n.Name, Kind: n.NPCKind, Status: n.Status}, n.NPCKind != "referencia"
		})
	registerEntity(s, api, "player_character", "player_characters", "/api/campaigns/%d/player-characters", "/api/player-characters/%d",
		func(p models.PlayerCharacter) (playerCharacterSummary, bool) {
			return playerCharacterSummary{ID: p.ID, CharacterName: p.CharacterName, PlayerName: p.PlayerName, Class: p.Class, Status: p.Status}, true
		})
	registerEntity(s, api, "session", "sessions", "/api/campaigns/%d/sessions", "/api/sessions/%d",
		func(x models.Session) (sessionSummary, bool) {
			return sessionSummary{ID: x.ID, SessionNumber: x.SessionNumber, SubNumber: x.SubNumber, SessionType: x.SessionType, Title: x.Title, Date: x.Date}, true
		})
	registerEntity(s, api, "arc", "arcs", "/api/campaigns/%d/arcs", "/api/arcs/%d",
		func(a models.Arc) (arcSummary, bool) {
			return arcSummary{ID: a.ID, Title: a.Title, Order: a.Order, Status: a.Status}, true
		})
	registerEntity(s, api, "quest", "quests", "/api/campaigns/%d/quests", "/api/quests/%d",
		func(q models.Quest) (questSummary, bool) {
			return questSummary{ID: q.ID, Title: q.Title, Status: q.Status, Priority: q.Priority}, true
		})
	registerEntity(s, api, "location", "locations", "/api/campaigns/%d/locations", "/api/locations/%d",
		func(l models.Location) (locationSummary, bool) {
			return locationSummary{ID: l.ID, Name: l.Name, LocationType: l.LocationType, ParentLocationID: l.ParentLocationID}, true
		})
	registerEntity(s, api, "group", "groups", "/api/campaigns/%d/groups", "/api/groups/%d",
		func(g models.Group) (groupSummary, bool) {
			return groupSummary{ID: g.ID, Name: g.Name, Alineacion: g.Alineacion, MemberCount: g.MemberCount}, true
		})
	registerEntity(s, api, "lore_entry", "lore_entries", "/api/campaigns/%d/lore", "/api/lore/%d",
		func(e models.LoreEntry) (loreSummary, bool) {
			return loreSummary{ID: e.ID, Title: e.Title, CategoryID: e.CategoryID}, true
		})
	registerEntity(s, api, "loose_note", "loose_notes", "/api/campaigns/%d/loose-notes", "/api/loose-notes/%d",
		func(n models.LooseNote) (looseNoteSummary, bool) {
			return looseNoteSummary{ID: n.ID, Title: n.Title, Pending: n.Pending}, true
		})
	registerEntity(s, api, "secret", "secrets", "/api/campaigns/%d/secrets", "/api/secrets/%d",
		func(x models.Secret) (secretSummary, bool) {
			return secretSummary{ID: x.ID, Title: x.Title, Status: x.Status}, true
		})
	registerEntity(s, api, "timeline_event", "timeline_events", "/api/campaigns/%d/timeline-events", "/api/timeline-events/%d",
		func(e models.TimelineEvent) (timelineEventSummary, bool) {
			return timelineEventSummary{ID: e.ID, TimelineID: e.TimelineID, Title: e.Title, DateLabel: e.DateLabel}, true
		})

	mcp.AddTool(s, &mcp.Tool{
		Name:        "get_appearances",
		Description: "Sessions, quests, encounters and secrets where an NPC or a player character appears.",
		Annotations: readOnly,
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in appearancesArgs) (*mcp.CallToolResult, any, error) {
		var path string
		switch in.Kind {
		case "npc":
			path = fmt.Sprintf("/api/npcs/%d/appearances", in.ID)
		case "player_character":
			path = fmt.Sprintf("/api/player-characters/%d/appearances", in.ID)
		default:
			return nil, nil, fmt.Errorf("kind must be npc or player_character, got %q", in.Kind)
		}
		var out any
		if err := api.do(ctx, http.MethodGet, path, nil, &out); err != nil {
			return nil, nil, err
		}
		return nil, out, nil
	})
}

type appearancesArgs struct {
	Kind string `json:"kind" jsonschema:"npc or player_character"`
	ID   int64  `json:"id" jsonschema:"ID of the NPC or player character"`
}
