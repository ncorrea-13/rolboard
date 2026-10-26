package mcpserver

import (
	"context"
	"fmt"
	"net/http"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

func ptr[T any](v T) *T { return &v }

// create is for tools that only add data; replace is for tools that
// overwrite text the DM may have written. Clients can use the hint to ask
// for confirmation.
var (
	create  = &mcp.ToolAnnotations{DestructiveHint: ptr(false)}
	replace = &mcp.ToolAnnotations{DestructiveHint: ptr(true), IdempotentHint: true}
)

type createLooseNoteArgs struct {
	CampaignID int64  `json:"campaign_id" jsonschema:"campaign ID, from list_campaigns"`
	Title      string `json:"title" jsonschema:"short title"`
	Body       string `json:"body,omitempty" jsonschema:"Markdown body"`
	Pending    bool   `json:"pending,omitempty" jsonschema:"true to flag the note as pending to review"`
}

type updateLooseNoteArgs struct {
	ID      int64   `json:"id" jsonschema:"loose note ID, from list_loose_notes"`
	Title   *string `json:"title,omitempty" jsonschema:"new title; omit to keep it"`
	Body    *string `json:"body,omitempty" jsonschema:"new full body, it replaces the current one (read it first with get_loose_note to append); omit to keep it"`
	Pending *bool   `json:"pending,omitempty" jsonschema:"new pending flag; omit to keep it"`
}

type updateSessionPrepArgs struct {
	SessionID int64  `json:"session_id" jsonschema:"session ID, from list_sessions"`
	PrepNotes string `json:"prep_notes" jsonschema:"new full prep notes in Markdown, they replace the current ones (read them first with get_session to append)"`
}

type createNPCArgs struct {
	CampaignID  int64   `json:"campaign_id" jsonschema:"campaign ID, from list_campaigns"`
	Name        string  `json:"name"`
	NPCKind     string  `json:"npc_kind" jsonschema:"key of an NPC type of this campaign, from list_npc_types"`
	DetailLevel string  `json:"detail_level,omitempty" jsonschema:"full (own sheet) or minor; default minor"`
	Status      string  `json:"status,omitempty" jsonschema:"vivo, muerto, desaparecido, activo, consolidado or paused; default vivo"`
	Rol         *string `json:"rol,omitempty" jsonschema:"role or occupation"`
	Origen      *string `json:"origen,omitempty" jsonschema:"origin (free text)"`
	Subtipo     *string `json:"subtipo,omitempty" jsonschema:"subtype (free text)"`
	LocationID  *int64  `json:"location_id,omitempty" jsonschema:"location of this campaign, from list_locations"`
	Description string  `json:"description,omitempty"`
	Notes       string  `json:"notes,omitempty"`
}

type createQuestArgs struct {
	CampaignID  int64  `json:"campaign_id" jsonschema:"campaign ID, from list_campaigns"`
	Title       string `json:"title"`
	Description string `json:"description,omitempty"`
	Status      string `json:"status,omitempty" jsonschema:"active, completed, failed or on_hold; default active"`
	Priority    *int64 `json:"priority,omitempty"`
	Notes       string `json:"notes,omitempty"`
}

type createLoreArgs struct {
	CampaignID int64  `json:"campaign_id" jsonschema:"campaign ID, from list_campaigns"`
	Title      string `json:"title"`
	Body       string `json:"body,omitempty" jsonschema:"Markdown body"`
	CategoryID *int64 `json:"category_id,omitempty" jsonschema:"from list_lore_categories"`
	ArcID      *int64 `json:"arc_id,omitempty" jsonschema:"from list_arcs"`
	LocationID *int64 `json:"location_id,omitempty" jsonschema:"from list_locations"`
}

func orDefault(v, def string) string {
	if v == "" {
		return def
	}
	return v
}

func registerWriteTools(s *mcp.Server, api *apiClient) {
	mcp.AddTool(s, &mcp.Tool{
		Name:        "create_loose_note",
		Description: "Save a loose idea or note in the campaign.",
		Annotations: create,
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in createLooseNoteArgs) (*mcp.CallToolResult, models.LooseNote, error) {
		var note models.LooseNote
		body := map[string]any{"title": in.Title, "body": in.Body, "pending": in.Pending}
		err := api.do(ctx, http.MethodPost, fmt.Sprintf("/api/campaigns/%d/loose-notes", in.CampaignID), body, &note)
		return nil, note, err
	})

	mcp.AddTool(s, &mcp.Tool{
		Name:        "update_loose_note",
		Description: "Change a loose note. Only the fields you pass change.",
		Annotations: replace,
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in updateLooseNoteArgs) (*mcp.CallToolResult, models.LooseNote, error) {
		// PUT replaces the whole note: read it, change the given fields, write it back.
		path := fmt.Sprintf("/api/loose-notes/%d", in.ID)
		var note models.LooseNote
		if err := api.do(ctx, http.MethodGet, path, nil, &note); err != nil {
			return nil, models.LooseNote{}, err
		}
		if in.Title != nil {
			note.Title = *in.Title
		}
		if in.Body != nil {
			note.Body = *in.Body
		}
		if in.Pending != nil {
			note.Pending = *in.Pending
		}
		body := map[string]any{"title": note.Title, "body": note.Body, "pending": note.Pending}
		err := api.do(ctx, http.MethodPut, path, body, &note)
		return nil, note, err
	})

	mcp.AddTool(s, &mcp.Tool{
		Name:        "update_session_prep",
		Description: "Replace the prep notes of a session. The rest of the session is kept.",
		Annotations: replace,
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in updateSessionPrepArgs) (*mcp.CallToolResult, models.Session, error) {
		// PUT replaces the whole session: read it, change one field, write it back.
		path := fmt.Sprintf("/api/sessions/%d", in.SessionID)
		var session models.Session
		if err := api.do(ctx, http.MethodGet, path, nil, &session); err != nil {
			return nil, models.Session{}, err
		}
		session.PrepNotes = in.PrepNotes
		err := api.do(ctx, http.MethodPut, path, session, &session)
		return nil, session, err
	})

	mcp.AddTool(s, &mcp.Tool{
		Name:        "create_npc",
		Description: "Create an NPC. It lives only in the database: it has no note in the Obsidian vault, and a vault note with the same name creates another NPC on the next reindex.",
		Annotations: create,
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in createNPCArgs) (*mcp.CallToolResult, any, error) {
		body := map[string]any{
			"name":         in.Name,
			"npc_kind":     in.NPCKind,
			"detail_level": orDefault(in.DetailLevel, "minor"),
			"status":       orDefault(in.Status, "vivo"),
			"rol":          in.Rol,
			"origen":       in.Origen,
			"subtipo":      in.Subtipo,
			"location_id":  in.LocationID,
			"description":  in.Description,
			"notes":        in.Notes,
		}
		// Out is any: models.NPC has json.RawMessage fields (see registerEntity).
		var npc models.NPC
		if err := api.do(ctx, http.MethodPost, fmt.Sprintf("/api/campaigns/%d/npcs", in.CampaignID), body, &npc); err != nil {
			return nil, nil, err
		}
		return nil, npc, nil
	})

	mcp.AddTool(s, &mcp.Tool{
		Name:        "create_quest",
		Description: "Create a quest.",
		Annotations: create,
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in createQuestArgs) (*mcp.CallToolResult, models.Quest, error) {
		body := map[string]any{
			"title":       in.Title,
			"description": in.Description,
			"status":      orDefault(in.Status, "active"),
			"priority":    in.Priority,
			"notes":       in.Notes,
		}
		var quest models.Quest
		err := api.do(ctx, http.MethodPost, fmt.Sprintf("/api/campaigns/%d/quests", in.CampaignID), body, &quest)
		return nil, quest, err
	})

	mcp.AddTool(s, &mcp.Tool{
		Name:        "create_lore",
		Description: "Create a lore entry.",
		Annotations: create,
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in createLoreArgs) (*mcp.CallToolResult, models.LoreEntry, error) {
		body := map[string]any{
			"title":       in.Title,
			"body":        in.Body,
			"category_id": in.CategoryID,
			"arc_id":      in.ArcID,
			"location_id": in.LocationID,
		}
		var entry models.LoreEntry
		err := api.do(ctx, http.MethodPost, fmt.Sprintf("/api/campaigns/%d/lore", in.CampaignID), body, &entry)
		return nil, entry, err
	})
}
