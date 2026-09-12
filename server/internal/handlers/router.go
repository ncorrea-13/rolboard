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
	mux.Handle("GET /api/campaigns/{id}/dashboard", http.HandlerFunc(h.GetDashboard))
	mux.Handle("GET /api/campaigns/{id}/notes/render", http.HandlerFunc(h.RenderNote))
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
	mux.Handle("GET /api/npcs/{id}/relations", http.HandlerFunc(h.ListNPCRelations))
	mux.Handle("POST /api/npcs/{id}/relations", http.HandlerFunc(h.CreateNPCRelation))
	mux.Handle("DELETE /api/npcs/{id}/relations/{toId}/{role}", http.HandlerFunc(h.DeleteNPCRelation))

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
	mux.Handle("GET /api/sessions/{id}/npcs", http.HandlerFunc(h.ListSessionNpcs))
	mux.Handle("POST /api/sessions/{id}/npcs", http.HandlerFunc(h.AddSessionNpc))
	mux.Handle("DELETE /api/sessions/{id}/npcs/{npcId}", http.HandlerFunc(h.RemoveSessionNpc))
	mux.Handle("GET /api/sessions/{id}/quests", http.HandlerFunc(h.ListSessionQuests))
	mux.Handle("POST /api/sessions/{id}/quests", http.HandlerFunc(h.AddSessionQuest))
	mux.Handle("DELETE /api/sessions/{id}/quests/{questId}", http.HandlerFunc(h.RemoveSessionQuest))

	mux.Handle("GET /api/campaigns/{id}/groups", http.HandlerFunc(h.ListGroups))
	mux.HandleFunc("POST /api/campaigns/{id}/groups", h.CreateGroup)
	mux.Handle("GET /api/groups/{id}", http.HandlerFunc(h.GetGroup))
	mux.Handle("GET /api/groups/{id}/members", http.HandlerFunc(h.GetMembers))
	mux.Handle("GET /api/groups/{id}/pc-members", http.HandlerFunc(h.GetPCMembers))
	mux.Handle("POST /api/groups/{id}/pc-members", http.HandlerFunc(h.AddGroupPCMember))
	mux.Handle("DELETE /api/groups/{id}/pc-members/{pcId}", http.HandlerFunc(h.RemoveGroupPCMember))
	mux.Handle("POST /api/groups/{id}/members", http.HandlerFunc(h.AddGroupMember))
	mux.Handle("DELETE /api/groups/{id}/members/{npcId}", http.HandlerFunc(h.RemoveGroupMember))
	mux.Handle("PUT /api/groups/{id}", http.HandlerFunc(h.UpdateGroup))
	mux.Handle("DELETE /api/groups/{id}", http.HandlerFunc(h.DeleteGroup))

	mux.Handle("GET /api/campaigns/{id}/encounters", http.HandlerFunc(h.ListEncounters))
	mux.HandleFunc("POST /api/campaigns/{id}/encounters", h.CreateEncounter)
	mux.Handle("GET /api/encounters/{id}", http.HandlerFunc(h.GetEncounter))
	mux.Handle("PUT /api/encounters/{id}", http.HandlerFunc(h.UpdateEncounter))
	mux.Handle("DELETE /api/encounters/{id}", http.HandlerFunc(h.DeleteEncounter))
	mux.Handle("GET /api/encounters/{id}/participants", http.HandlerFunc(h.ListEncounterParticipants))
	mux.HandleFunc("POST /api/encounters/{id}/participants", h.CreateEncounterParticipant)
	mux.Handle("PUT /api/encounter-participants/{id}", http.HandlerFunc(h.UpdateEncounterParticipant))
	mux.Handle("DELETE /api/encounter-participants/{id}", http.HandlerFunc(h.DeleteEncounterParticipant))

	mux.HandleFunc("POST /api/campaigns/{id}/reindex", h.Reindex)
	mux.Handle("GET /api/admin/vault-dirs", http.HandlerFunc(h.ListVaultDirs))

	return mux
}
