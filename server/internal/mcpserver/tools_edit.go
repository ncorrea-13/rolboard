package mcpserver

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// fields turns a tool's arguments into the JSON object the model sent: the
// optional ones are pointers, so what it left out is not here.
func fields(args any) (map[string]json.RawMessage, error) {
	raw, err := json.Marshal(args)
	if err != nil {
		return nil, err
	}
	m := map[string]json.RawMessage{}
	return m, json.Unmarshal(raw, &m)
}

func takeID(m map[string]json.RawMessage, key string) (int64, error) {
	id, err := strconv.ParseInt(string(m[key]), 10, 64)
	if err != nil || id < 1 {
		return 0, fmt.Errorf("%s is required", key)
	}
	delete(m, key)
	return id, nil
}

func rename(m map[string]json.RawMessage, names map[string]string) {
	for from, to := range names {
		if v, ok := m[from]; ok {
			m[to] = v
			delete(m, from)
		}
	}
}

func addCreate[A any](s *mcp.Server, api *apiClient, name, description, pathFmt, idKey string, defaults map[string]any, names map[string]string) {
	mcp.AddTool(s, &mcp.Tool{Name: name, Description: description, Annotations: create},
		func(ctx context.Context, _ *mcp.CallToolRequest, in A) (*mcp.CallToolResult, any, error) {
			body, err := fields(in)
			if err != nil {
				return nil, nil, err
			}
			parent, err := takeID(body, idKey)
			if err != nil {
				return nil, nil, err
			}
			for k, v := range defaults {
				if _, ok := body[k]; !ok {
					if body[k], err = json.Marshal(v); err != nil {
						return nil, nil, err
					}
				}
			}
			rename(body, names)
			var out json.RawMessage
			if err := api.do(ctx, http.MethodPost, fmt.Sprintf(pathFmt, parent), body, &out); err != nil {
				return nil, nil, err
			}
			return nil, out, nil
		})
}

// addUpdate registers a tool that changes only the fields it is given. The
// API replaces whole entities on PUT, so the tool reads the entity, overlays
// the given fields and writes it back. Nothing is cleared: to keep a field,
// leave it out.
func addUpdate[A any](s *mcp.Server, api *apiClient, name, description, pathFmt string, names map[string]string) {
	mcp.AddTool(s, &mcp.Tool{Name: name, Description: description, Annotations: replace},
		func(ctx context.Context, _ *mcp.CallToolRequest, in A) (*mcp.CallToolResult, any, error) {
			changes, err := fields(in)
			if err != nil {
				return nil, nil, err
			}
			id, err := takeID(changes, "id")
			if err != nil {
				return nil, nil, err
			}
			out, err := patchEntity(ctx, api, fmt.Sprintf(pathFmt, id), changes, names)
			if err != nil {
				return nil, nil, err
			}
			return nil, out, nil
		})
}

func patchEntity(ctx context.Context, api *apiClient, path string, changes map[string]json.RawMessage, names map[string]string) (json.RawMessage, error) {
	current := map[string]json.RawMessage{}
	if err := api.do(ctx, http.MethodGet, path, nil, &current); err != nil {
		return nil, err
	}
	rename(current, names)
	rename(changes, names)
	for k, v := range changes {
		current[k] = v
	}
	var out json.RawMessage
	if err := api.do(ctx, http.MethodPut, path, current, &out); err != nil {
		return nil, err
	}
	if len(out) == 0 {
		return out, api.do(ctx, http.MethodGet, path, nil, &out)
	}
	return out, nil
}

type campaignScoped struct {
	CampaignID int64 `json:"campaign_id" jsonschema:"campaign ID, from list_campaigns"`
}

type createArcArgs struct {
	campaignScoped
	Title   string `json:"title"`
	Order   int64  `json:"order" jsonschema:"position among the arcs, at least 1"`
	Status  string `json:"status,omitempty" jsonschema:"planificado, en_curso or cerrado; default planificado"`
	Summary string `json:"summary,omitempty"`
}

type updateArcArgs struct {
	ID      int64   `json:"id" jsonschema:"arc ID, from list_arcs"`
	Title   *string `json:"title,omitempty"`
	Order   *int64  `json:"order,omitempty"`
	Status  *string `json:"status,omitempty" jsonschema:"planificado, en_curso or cerrado"`
	Summary *string `json:"summary,omitempty" jsonschema:"replaces the current summary"`
}

type createSessionArgs struct {
	campaignScoped
	SessionNumber int64  `json:"session_number" jsonschema:"must be free among the active sessions"`
	SessionType   string `json:"session_type,omitempty" jsonschema:"session, interlude, planning or oneshot; default session"`
	Title         string `json:"title"`
	Date          string `json:"date,omitempty" jsonschema:"YYYY-MM-DD; required unless planned"`
	Planned       bool   `json:"planned,omitempty" jsonschema:"true for a session not played yet"`
	Summary       string `json:"summary,omitempty"`
	PrepNotes     string `json:"prep_notes,omitempty"`
	ArcID         *int64 `json:"arc_id,omitempty" jsonschema:"from list_arcs"`
}

type updateSessionArgs struct {
	ID            int64   `json:"id" jsonschema:"session ID, from list_sessions"`
	SessionNumber *int64  `json:"session_number,omitempty"`
	SessionType   *string `json:"session_type,omitempty" jsonschema:"session, interlude, planning or oneshot"`
	Title         *string `json:"title,omitempty"`
	Date          *string `json:"date,omitempty" jsonschema:"YYYY-MM-DD"`
	Planned       *bool   `json:"planned,omitempty"`
	Summary       *string `json:"summary,omitempty" jsonschema:"replaces the current summary"`
	PrepNotes     *string `json:"prep_notes,omitempty" jsonschema:"replaces the current prep notes"`
	ArcID         *int64  `json:"arc_id,omitempty" jsonschema:"from list_arcs"`
}

type createLocationArgs struct {
	campaignScoped
	Name             string `json:"name"`
	LocationType     string `json:"location_type" jsonschema:"planet, region, city, site or plane"`
	ParentLocationID *int64 `json:"parent_location_id,omitempty" jsonschema:"from list_locations"`
	Description      string `json:"description,omitempty"`
	Notes            string `json:"notes,omitempty"`
}

type updateLocationArgs struct {
	ID               int64   `json:"id" jsonschema:"location ID, from list_locations"`
	Name             *string `json:"name,omitempty"`
	LocationType     *string `json:"location_type,omitempty" jsonschema:"planet, region, city, site or plane"`
	ParentLocationID *int64  `json:"parent_location_id,omitempty" jsonschema:"from list_locations"`
	Description      *string `json:"description,omitempty"`
	Notes            *string `json:"notes,omitempty"`
}

type createGroupArgs struct {
	campaignScoped
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	Notes       string `json:"notes,omitempty"`
	Alineacion  string `json:"alineacion,omitempty" jsonschema:"alignment (free text)"`
	LiderNPCID  *int64 `json:"lider_npc_id,omitempty" jsonschema:"leader, from list_npcs"`
}

type updateGroupArgs struct {
	ID          int64   `json:"id" jsonschema:"group ID, from list_groups"`
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
	Notes       *string `json:"notes,omitempty"`
	Alineacion  *string `json:"alineacion,omitempty"`
	LiderNPCID  *int64  `json:"lider_npc_id,omitempty" jsonschema:"from list_npcs"`
}

type createSecretArgs struct {
	campaignScoped
	Title             string  `json:"title"`
	Body              string  `json:"body,omitempty" jsonschema:"Markdown"`
	Status            string  `json:"status,omitempty" jsonschema:"hidden or revealed; default hidden"`
	RevealedSessionID *int64  `json:"revealed_session_id,omitempty" jsonschema:"only when revealed, from list_sessions"`
	NPCID             *int64  `json:"npc_id,omitempty" jsonschema:"from list_npcs"`
	LocationID        *int64  `json:"location_id,omitempty" jsonschema:"from list_locations"`
	LoreEntryID       *int64  `json:"lore_entry_id,omitempty" jsonschema:"from list_lore_entries"`
	KnownByNPCIDs     []int64 `json:"known_by_npc_ids,omitempty" jsonschema:"NPCs that know it, from list_npcs"`
}

type updateSecretArgs struct {
	ID                int64   `json:"id" jsonschema:"secret ID, from list_secrets"`
	Title             *string `json:"title,omitempty"`
	Body              *string `json:"body,omitempty" jsonschema:"replaces the current body"`
	Status            *string `json:"status,omitempty" jsonschema:"hidden or revealed"`
	RevealedSessionID *int64  `json:"revealed_session_id,omitempty" jsonschema:"only when revealed, from list_sessions"`
	NPCID             *int64  `json:"npc_id,omitempty" jsonschema:"from list_npcs"`
	LocationID        *int64  `json:"location_id,omitempty" jsonschema:"from list_locations"`
	LoreEntryID       *int64  `json:"lore_entry_id,omitempty" jsonschema:"from list_lore_entries"`
	KnownByNPCIDs     []int64 `json:"known_by_npc_ids,omitempty" jsonschema:"replaces the list of NPCs that know it; omit to keep it"`
}

type createTimelineEventArgs struct {
	campaignScoped
	TimelineID   int64    `json:"timeline_id" jsonschema:"from list_timelines"`
	Title        string   `json:"title"`
	Description  string   `json:"description,omitempty"`
	DateLabel    string   `json:"date_label" jsonschema:"free-form date shown as is, e.g. Year 312"`
	EndDateLabel string   `json:"end_date_label,omitempty"`
	SortKey      *float64 `json:"sort_key,omitempty" jsonschema:"order within the timeline; lower comes first"`
	ArcID        *int64   `json:"arc_id,omitempty" jsonschema:"from list_arcs"`
	SessionID    *int64   `json:"session_id,omitempty" jsonschema:"from list_sessions"`
	LocationID   *int64   `json:"location_id,omitempty" jsonschema:"from list_locations"`
	GroupID      *int64   `json:"group_id,omitempty" jsonschema:"from list_groups"`
	LoreEntryID  *int64   `json:"lore_entry_id,omitempty" jsonschema:"from list_lore_entries"`
}

type updateTimelineEventArgs struct {
	ID           int64    `json:"id" jsonschema:"event ID, from list_timeline_events"`
	Title        *string  `json:"title,omitempty"`
	Description  *string  `json:"description,omitempty"`
	DateLabel    *string  `json:"date_label,omitempty"`
	EndDateLabel *string  `json:"end_date_label,omitempty"`
	SortKey      *float64 `json:"sort_key,omitempty"`
	ArcID        *int64   `json:"arc_id,omitempty" jsonschema:"from list_arcs"`
	SessionID    *int64   `json:"session_id,omitempty" jsonschema:"from list_sessions"`
	LocationID   *int64   `json:"location_id,omitempty" jsonschema:"from list_locations"`
	GroupID      *int64   `json:"group_id,omitempty" jsonschema:"from list_groups"`
	LoreEntryID  *int64   `json:"lore_entry_id,omitempty" jsonschema:"from list_lore_entries"`
}

type createPlayerCharacterArgs struct {
	campaignScoped
	CharacterName string `json:"character_name"`
	PlayerName    string `json:"player_name"`
	Race          string `json:"race,omitempty"`
	Class         string `json:"class,omitempty"`
	Status        string `json:"status,omitempty" jsonschema:"vivo, muerto, desaparecido or activo; default activo"`
	Description   string `json:"description,omitempty"`
	Backstory     string `json:"backstory,omitempty"`
}

type updatePlayerCharacterArgs struct {
	ID               int64   `json:"id" jsonschema:"player character ID, from list_player_characters"`
	CharacterName    *string `json:"character_name,omitempty"`
	PlayerName       *string `json:"player_name,omitempty"`
	Race             *string `json:"race,omitempty"`
	Class            *string `json:"class,omitempty"`
	Status           *string `json:"status,omitempty" jsonschema:"vivo, muerto, desaparecido or activo"`
	Description      *string `json:"description,omitempty"`
	Backstory        *string `json:"backstory,omitempty"`
	ProgressionNotes *string `json:"progression_notes,omitempty"`
	CurrentHP        *int64  `json:"current_hp,omitempty"`
	MaxHP            *int64  `json:"max_hp,omitempty"`
}

type updateNPCArgs struct {
	ID          int64   `json:"id" jsonschema:"NPC ID, from list_npcs"`
	Name        *string `json:"name,omitempty"`
	NPCKind     *string `json:"npc_kind,omitempty" jsonschema:"key of an NPC type of this campaign, from list_npc_types"`
	DetailLevel *string `json:"detail_level,omitempty" jsonschema:"full or minor"`
	Status      *string `json:"status,omitempty" jsonschema:"vivo, muerto, desaparecido, activo, consolidado or paused"`
	LocationID  *int64  `json:"location_id,omitempty" jsonschema:"from list_locations"`
	Rol         *string `json:"rol,omitempty"`
	Origen      *string `json:"origen,omitempty"`
	Subtipo     *string `json:"subtipo,omitempty"`
	Description *string `json:"description,omitempty"`
	Notes       *string `json:"notes,omitempty"`
	CurrentHP   *int64  `json:"current_hp,omitempty"`
	MaxHP       *int64  `json:"max_hp,omitempty"`
}

type updateQuestArgs struct {
	ID          int64   `json:"id" jsonschema:"quest ID, from list_quests"`
	Title       *string `json:"title,omitempty"`
	Description *string `json:"description,omitempty"`
	Status      *string `json:"status,omitempty" jsonschema:"active, completed, failed or on_hold"`
	Priority    *int64  `json:"priority,omitempty"`
	Notes       *string `json:"notes,omitempty"`
}

type updateLoreArgs struct {
	ID         int64   `json:"id" jsonschema:"lore entry ID, from list_lore_entries"`
	Title      *string `json:"title,omitempty"`
	Body       *string `json:"body,omitempty" jsonschema:"replaces the current body (read it first with get_lore_entry to append)"`
	CategoryID *int64  `json:"category_id,omitempty" jsonschema:"from list_lore_categories"`
	ArcID      *int64  `json:"arc_id,omitempty" jsonschema:"from list_arcs"`
	LocationID *int64  `json:"location_id,omitempty" jsonschema:"from list_locations"`
}

type updateItemArgs struct {
	ID          int64      `json:"id" jsonschema:"item ID, from list_items"`
	Name        *string    `json:"name,omitempty"`
	Description *string    `json:"description,omitempty"`
	Effect      *string    `json:"effect,omitempty"`
	Category    *string    `json:"category,omitempty"`
	Rarity      *string    `json:"rarity,omitempty"`
	Weight      *float64   `json:"weight,omitempty"`
	Prices      []priceArg `json:"prices,omitempty" jsonschema:"replaces the catalog prices; omit to keep them"`
}

type createEncounterArgs struct {
	campaignScoped
	Name      string `json:"name"`
	Status    string `json:"status,omitempty" jsonschema:"planificado, activo or cerrado; default planificado"`
	SessionID *int64 `json:"session_id,omitempty" jsonschema:"from list_sessions"`
}

type updateEncounterArgs struct {
	ID        int64   `json:"id" jsonschema:"encounter ID, from list_encounters"`
	Name      *string `json:"name,omitempty"`
	Status    *string `json:"status,omitempty" jsonschema:"planificado, activo or cerrado"`
	Round     *int64  `json:"round,omitempty"`
	SessionID *int64  `json:"session_id,omitempty" jsonschema:"from list_sessions"`
}

type createParticipantArgs struct {
	EncounterID int64   `json:"encounter_id" jsonschema:"from list_encounters"`
	PcID        *int64  `json:"pc_id,omitempty" jsonschema:"a player character; give only one of pc_id, npc_id and display_name"`
	NpcID       *int64  `json:"npc_id,omitempty" jsonschema:"an NPC"`
	DisplayName *string `json:"display_name,omitempty" jsonschema:"a free-form combatant such as a goblin"`
	CurrentHP   *int64  `json:"current_hp,omitempty"`
	MaxHP       *int64  `json:"max_hp,omitempty"`
	Initiative  *int64  `json:"initiative_value,omitempty"`
	TurnType    *string `json:"turn_type,omitempty" jsonschema:"rapido or lento"`
	Notes       string  `json:"notes,omitempty"`
}

type updateParticipantArgs struct {
	EncounterID int64   `json:"encounter_id" jsonschema:"the encounter it belongs to, from list_encounters"`
	ID          int64   `json:"id" jsonschema:"participant ID, from get_encounter"`
	DisplayName *string `json:"display_name,omitempty"`
	CurrentHP   *int64  `json:"current_hp,omitempty"`
	MaxHP       *int64  `json:"max_hp,omitempty"`
	Initiative  *int64  `json:"initiative_value,omitempty"`
	TurnType    *string `json:"turn_type,omitempty" jsonschema:"rapido or lento"`
	Notes       *string `json:"notes,omitempty"`
}

func registerEditTools(s *mcp.Server, api *apiClient) {
	addCreate[createArcArgs](s, api, "create_arc", "Create an arc.",
		"/api/campaigns/%d/arcs", "campaign_id", map[string]any{"status": "planificado"}, map[string]string{"title": "name"})
	addCreate[createSessionArgs](s, api, "create_session", "Create a session (planned or played).",
		"/api/campaigns/%d/sessions", "campaign_id", map[string]any{"session_type": "session"}, nil)
	addCreate[createLocationArgs](s, api, "create_location", "Create a location. It lives only in the database: a vault note with the same name creates another one on the next reindex.",
		"/api/campaigns/%d/locations", "campaign_id", nil, nil)
	addCreate[createGroupArgs](s, api, "create_group", "Create a group (faction).",
		"/api/campaigns/%d/groups", "campaign_id", nil, nil)
	addCreate[createSecretArgs](s, api, "create_secret", "Create a secret. Reading secrets is allowed, so anything saved here can be read back.",
		"/api/campaigns/%d/secrets", "campaign_id", map[string]any{"status": "hidden"}, nil)
	addCreate[createTimelineEventArgs](s, api, "create_timeline_event", "Add an event to a timeline.",
		"/api/campaigns/%d/timeline-events", "campaign_id", nil, nil)
	addCreate[createPlayerCharacterArgs](s, api, "create_player_character", "Create a player character.",
		"/api/campaigns/%d/player-characters", "campaign_id", map[string]any{"status": "activo"}, nil)
	addCreate[createEncounterArgs](s, api, "create_encounter", "Create a combat encounter. Add combatants with create_encounter_participant.",
		"/api/campaigns/%d/encounters", "campaign_id", map[string]any{"status": "planificado"}, nil)
	addCreate[createParticipantArgs](s, api, "create_encounter_participant", "Add a combatant to an encounter: a player character, an NPC or a free-form name.",
		"/api/encounters/%d/participants", "encounter_id", nil, nil)

	addUpdate[updateArcArgs](s, api, "update_arc", "Change an arc. Only the fields you pass change.", "/api/arcs/%d", map[string]string{"title": "name"})
	addUpdate[updateSessionArgs](s, api, "update_session", "Change a session. Only the fields you pass change.", "/api/sessions/%d", nil)
	addUpdate[updateLocationArgs](s, api, "update_location", "Change a location. Only the fields you pass change.", "/api/locations/%d", nil)
	addUpdate[updateGroupArgs](s, api, "update_group", "Change a group. Only the fields you pass change.", "/api/groups/%d", nil)
	addUpdate[updateSecretArgs](s, api, "update_secret", "Change a secret. Only the fields you pass change.", "/api/secrets/%d", nil)
	addUpdate[updateTimelineEventArgs](s, api, "update_timeline_event", "Change a timeline event. Only the fields you pass change.", "/api/timeline-events/%d", nil)
	addUpdate[updatePlayerCharacterArgs](s, api, "update_player_character", "Change a player character. Only the fields you pass change.", "/api/player-characters/%d", nil)
	addUpdate[updateNPCArgs](s, api, "update_npc", "Change an NPC. Only the fields you pass change.", "/api/npcs/%d", nil)
	addUpdate[updateQuestArgs](s, api, "update_quest", "Change a quest. Only the fields you pass change.", "/api/quests/%d", nil)
	addUpdate[updateLoreArgs](s, api, "update_lore", "Change a lore entry. Only the fields you pass change.", "/api/lore/%d", nil)
	addUpdate[updateItemArgs](s, api, "update_item", "Change a catalog item. Only the fields you pass change.", "/api/items/%d", nil)
	addUpdate[updateEncounterArgs](s, api, "update_encounter", "Change a combat encounter: name, status, round or session.", "/api/encounters/%d", nil)

	mcp.AddTool(s, &mcp.Tool{
		Name:        "update_encounter_participant",
		Description: "Change a combatant: HP, initiative, turn type or notes. Only the fields you pass change.",
		Annotations: replace,
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in updateParticipantArgs) (*mcp.CallToolResult, any, error) {
		changes, err := fields(in)
		if err != nil {
			return nil, nil, err
		}
		encounterID, err := takeID(changes, "encounter_id")
		if err != nil {
			return nil, nil, err
		}
		id, err := takeID(changes, "id")
		if err != nil {
			return nil, nil, err
		}
		// There is no endpoint for one participant: find it among the encounter's.
		var all []map[string]json.RawMessage
		if err := api.do(ctx, http.MethodGet, fmt.Sprintf("/api/encounters/%d/participants", encounterID), nil, &all); err != nil {
			return nil, nil, err
		}
		var current map[string]json.RawMessage
		for _, p := range all {
			if string(p["id"]) == strconv.FormatInt(id, 10) {
				current = p
			}
		}
		if current == nil {
			return nil, nil, fmt.Errorf("participant %d is not in encounter %d", id, encounterID)
		}
		for k, v := range changes {
			current[k] = v
		}
		var out json.RawMessage
		if err := api.do(ctx, http.MethodPut, fmt.Sprintf("/api/encounter-participants/%d", id), current, &out); err != nil {
			return nil, nil, err
		}
		return nil, out, nil
	})
}
