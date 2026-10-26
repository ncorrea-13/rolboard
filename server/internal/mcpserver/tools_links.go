package mcpserver

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type linkSessionNPCArgs struct {
	SessionID int64 `json:"session_id" jsonschema:"from list_sessions"`
	NPCID     int64 `json:"npc_id" jsonschema:"NPC that appears in the session, from list_npcs"`
}

type linkSessionQuestArgs struct {
	SessionID int64 `json:"session_id" jsonschema:"from list_sessions"`
	QuestID   int64 `json:"quest_id" jsonschema:"quest worked on in the session, from list_quests"`
}

type linkGroupNPCArgs struct {
	GroupID int64 `json:"group_id" jsonschema:"from list_groups"`
	NPCID   int64 `json:"npc_id" jsonschema:"NPC that joins the group, from list_npcs"`
}

type linkGroupPCArgs struct {
	GroupID int64 `json:"group_id" jsonschema:"from list_groups"`
	PCID    int64 `json:"pc_id" jsonschema:"player character that joins the group, from list_player_characters"`
}

type linkNPCNPCArgs struct {
	NPCID   int64  `json:"npc_id" jsonschema:"the NPC the relation starts from, from list_npcs"`
	ToNPCID int64  `json:"to_npc_id" jsonschema:"the NPC it points to, from list_npcs"`
	Role    string `json:"role" jsonschema:"what the first one is to the second, e.g. mentor"`
}

type linkNPCPlayerArgs struct {
	NPCID int64  `json:"npc_id" jsonschema:"from list_npcs"`
	PCID  int64  `json:"pc_id" jsonschema:"from list_player_characters"`
	Role  string `json:"role,omitempty" jsonschema:"kind of tie (free text); replaces the current one"`
}

type linkQuestNPCArgs struct {
	QuestID int64  `json:"quest_id" jsonschema:"from list_quests"`
	NPCID   int64  `json:"npc_id" jsonschema:"from list_npcs"`
	Role    string `json:"role,omitempty" jsonschema:"what the NPC does in the quest (free text, up to 60 characters); replaces the current one"`
}

// addLink registers a tool that makes one link and returns the list it
// belongs to. Links can be added but not removed.
func addLink[A any](s *mcp.Server, api *apiClient, name, description string, ann *mcp.ToolAnnotations, method string, path func(A) string, body func(A) any, listPath func(A) string) {
	mcp.AddTool(s, &mcp.Tool{Name: name, Description: description, Annotations: ann},
		func(ctx context.Context, _ *mcp.CallToolRequest, in A) (*mcp.CallToolResult, any, error) {
			if err := api.do(ctx, method, path(in), body(in), nil); err != nil {
				return nil, nil, err
			}
			var out json.RawMessage
			if err := api.do(ctx, http.MethodGet, listPath(in), nil, &out); err != nil {
				return nil, nil, err
			}
			// Structured results must be objects, not bare arrays.
			return nil, map[string]any{"items": out}, nil
		})
}

func registerLinkTools(s *mcp.Server, api *apiClient) {
	addLink(s, api, "link_session_npc", "Mark an NPC as appearing in a session. Returns the session's NPCs.", create, http.MethodPost,
		func(a linkSessionNPCArgs) string { return fmt.Sprintf("/api/sessions/%d/npcs", a.SessionID) },
		func(a linkSessionNPCArgs) any { return map[string]any{"npc_id": a.NPCID} },
		func(a linkSessionNPCArgs) string { return fmt.Sprintf("/api/sessions/%d/npcs", a.SessionID) })
	addLink(s, api, "link_session_quest", "Mark a quest as worked on in a session. Returns the session's quests.", create, http.MethodPost,
		func(a linkSessionQuestArgs) string { return fmt.Sprintf("/api/sessions/%d/quests", a.SessionID) },
		func(a linkSessionQuestArgs) any { return map[string]any{"quest_id": a.QuestID} },
		func(a linkSessionQuestArgs) string { return fmt.Sprintf("/api/sessions/%d/quests", a.SessionID) })
	addLink(s, api, "link_group_npc", "Add an NPC to a group. Returns the group's NPC members.", create, http.MethodPost,
		func(a linkGroupNPCArgs) string { return fmt.Sprintf("/api/groups/%d/members", a.GroupID) },
		func(a linkGroupNPCArgs) any { return map[string]any{"npc_id": a.NPCID} },
		func(a linkGroupNPCArgs) string { return fmt.Sprintf("/api/groups/%d/members", a.GroupID) })
	addLink(s, api, "link_group_pc", "Add a player character to a group. Returns the group's player character members.", create, http.MethodPost,
		func(a linkGroupPCArgs) string { return fmt.Sprintf("/api/groups/%d/pc-members", a.GroupID) },
		func(a linkGroupPCArgs) any { return map[string]any{"pc_id": a.PCID} },
		func(a linkGroupPCArgs) string { return fmt.Sprintf("/api/groups/%d/pc-members", a.GroupID) })
	addLink(s, api, "link_npc_npc", "Relate an NPC to another with a role (directed: the first is the role of the second). Returns the first NPC's relations.", create, http.MethodPost,
		func(a linkNPCNPCArgs) string { return fmt.Sprintf("/api/npcs/%d/relations", a.NPCID) },
		func(a linkNPCNPCArgs) any { return map[string]any{"to_npc_id": a.ToNPCID, "role": a.Role} },
		func(a linkNPCNPCArgs) string { return fmt.Sprintf("/api/npcs/%d/relations", a.NPCID) })
	addLink(s, api, "link_npc_player", "Tie an NPC to a player character, or change the role of an existing tie. Returns the NPC's ties.", replace, http.MethodPut,
		func(a linkNPCPlayerArgs) string { return fmt.Sprintf("/api/npcs/%d/players/%d", a.NPCID, a.PCID) },
		func(a linkNPCPlayerArgs) any { return map[string]any{"role": a.Role} },
		func(a linkNPCPlayerArgs) string { return fmt.Sprintf("/api/npcs/%d/players", a.NPCID) })
	addLink(s, api, "link_quest_npc", "Tie an NPC to a quest, or change its role there. Returns the quest's NPCs.", replace, http.MethodPut,
		func(a linkQuestNPCArgs) string { return fmt.Sprintf("/api/quests/%d/npcs/%d", a.QuestID, a.NPCID) },
		func(a linkQuestNPCArgs) any { return map[string]any{"role": a.Role} },
		func(a linkQuestNPCArgs) string { return fmt.Sprintf("/api/quests/%d/npcs", a.QuestID) })
}
