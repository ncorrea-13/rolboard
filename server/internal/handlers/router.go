package handlers

import (
	"net/http"
)

func NewRouter(h *Handlers) *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", h.Health)
	mux.Handle("GET /api/campaigns", http.HandlerFunc(h.ListCampaigns))
	mux.HandleFunc("POST /api/campaigns", h.CreateCampaign)
	mux.Handle("GET /api/campaigns/{id}", http.HandlerFunc(h.GetCampaign))
	mux.Handle("PUT /api/campaigns/{id}", http.HandlerFunc(h.UpdateCampaign))
	mux.Handle("DELETE /api/campaigns/{id}", http.HandlerFunc(h.DeleteCampaign))
	mux.Handle("GET /api/campaigns/{id}/arcs", http.HandlerFunc(h.ListArcs))
	mux.HandleFunc("POST /api/campaigns/{id}/arcs", h.CreateArc)
	mux.Handle("GET /api/arcs/{id}", http.HandlerFunc(h.GetArc))
	mux.Handle("PUT /api/arcs/{id}", http.HandlerFunc(h.UpdateArc))
	mux.Handle("DELETE /api/arcs/{id}", http.HandlerFunc(h.DeleteArc))

	mux.Handle("GET /api/campaigns/{id}/locations", http.HandlerFunc(h.ListLocations))
	mux.HandleFunc("POST /api/campaigns/{id}/locations", h.CreateLocation)
	mux.Handle("GET /api/locations/{id}", http.HandlerFunc(h.GetLocation))
	mux.Handle("PUT /api/locations/{id}", http.HandlerFunc(h.UpdateLocation))
	mux.Handle("DELETE /api/locations/{id}", http.HandlerFunc(h.DeleteLocation))

	mux.Handle("GET /api/campaigns/{id}/npcs", http.HandlerFunc(h.ListNPCs))
	mux.HandleFunc("POST /api/campaigns/{id}/npcs", h.CreateNPC)
	mux.Handle("GET /api/npcs/{id}", http.HandlerFunc(h.GetNPC))
	mux.Handle("PUT /api/npcs/{id}", http.HandlerFunc(h.UpdateNPC))
	mux.Handle("DELETE /api/npcs/{id}", http.HandlerFunc(h.DeleteNPC))

	mux.Handle("GET /api/campaigns/{id}/player-characters", http.HandlerFunc(h.ListPlayerCharacters))
	mux.HandleFunc("POST /api/campaigns/{id}/player-characters", h.CreatePlayerCharacter)
	mux.Handle("GET /api/player-characters/{id}", http.HandlerFunc(h.GetPlayerCharacter))
	mux.Handle("PUT /api/player-characters/{id}", http.HandlerFunc(h.UpdatePlayerCharacter))
	mux.Handle("DELETE /api/player-characters/{id}", http.HandlerFunc(h.DeletePlayerCharacter))

	mux.Handle("GET /api/campaigns/{id}/quests", http.HandlerFunc(h.ListQuests))
	mux.HandleFunc("POST /api/campaigns/{id}/quests", h.CreateQuest)
	mux.Handle("GET /api/quests/{id}", http.HandlerFunc(h.GetQuest))
	mux.Handle("PUT /api/quests/{id}", http.HandlerFunc(h.UpdateQuest))
	mux.Handle("DELETE /api/quests/{id}", http.HandlerFunc(h.DeleteQuest))

	mux.Handle("GET /api/campaigns/{id}/sessions", http.HandlerFunc(h.ListSessions))
	mux.HandleFunc("POST /api/campaigns/{id}/sessions", h.CreateSession)
	mux.Handle("GET /api/sessions/{id}", http.HandlerFunc(h.GetSession))
	mux.Handle("PUT /api/sessions/{id}", http.HandlerFunc(h.UpdateSession))
	mux.Handle("DELETE /api/sessions/{id}", http.HandlerFunc(h.DeleteSession))

	mux.Handle("GET /api/campaigns/{id}/groups", http.HandlerFunc(h.ListGroups))
	mux.HandleFunc("POST /api/campaigns/{id}/groups", h.CreateGroup)
	mux.Handle("GET /api/groups/{id}", http.HandlerFunc(h.GetGroup))
	mux.Handle("GET /api/groups/{id}/members", http.HandlerFunc(h.GetMembers))
	mux.Handle("PUT /api/groups/{id}", http.HandlerFunc(h.UpdateGroup))
	mux.Handle("DELETE /api/groups/{id}", http.HandlerFunc(h.DeleteGroup))

	return mux
}
