package mcpserver

import (
	"context"
	"fmt"
	"net/http"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

type encounterSummary struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Status    string `json:"status"`
	Round     int64  `json:"round"`
	SessionID *int64 `json:"session_id,omitempty"`
}

func registerEncounterTools(s *mcp.Server, api *apiClient) {
	registerList(s, api, "encounters",
		"List the combat encounters of a campaign (summary). Use get_encounter for the participants.",
		"/api/campaigns/%d/encounters",
		func(e models.Encounter) (encounterSummary, bool) {
			return encounterSummary{ID: e.ID, Name: e.Name, Status: e.Status, Round: e.Round, SessionID: e.SessionID}, true
		})

	mcp.AddTool(s, &mcp.Tool{
		Name:        "get_encounter",
		Description: "Get one combat encounter with its participants (HP, initiative, turn type).",
		Annotations: readOnly,
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in idArgs) (*mcp.CallToolResult, any, error) {
		var encounter models.Encounter
		if err := api.do(ctx, http.MethodGet, fmt.Sprintf("/api/encounters/%d", in.ID), nil, &encounter); err != nil {
			return nil, nil, err
		}
		var participants []models.EncounterParticipant
		if err := api.do(ctx, http.MethodGet, fmt.Sprintf("/api/encounters/%d/participants", in.ID), nil, &participants); err != nil {
			return nil, nil, err
		}
		// Out is any: participants have json.RawMessage fields (see registerEntity).
		return nil, map[string]any{"encounter": encounter, "participants": nonNil(participants)}, nil
	})
}
