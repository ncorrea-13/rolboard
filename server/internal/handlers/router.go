package handlers

import (
	"net/http"
	"time"
)

func NewRouter(h *Handlers) *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", h.Health)

	loginLimiter := newRateLimiter(5, time.Minute)

	mux.HandleFunc("POST /api/admin/login", h.AdminLogin)
	mux.HandleFunc("POST /api/admin/logout", h.AdminLogout)
	mux.HandleFunc("GET /api/admin/session", h.requireAdmin(h.AdminSession))

	mux.Handle("GET /api/campaigns", http.HandlerFunc(h.ListCampaigns))
	mux.HandleFunc("POST /api/campaigns", h.requireAdmin(h.CreateCampaign))
	mux.HandleFunc("POST /api/campaigns/{id}/access-code", h.requireAdmin(h.SetAccessCode))
	mux.HandleFunc("POST /api/campaigns/{id}/login", h.rateLimit(loginLimiter, h.Login))
	mux.HandleFunc("POST /api/campaigns/{id}/logout", h.Logout)

	mux.Handle("GET /api/campaigns/{id}", http.HandlerFunc(h.requireCampaign(resolveCampaignFromPath, h.GetCampaign)))
	mux.Handle("PUT /api/campaigns/{id}", http.HandlerFunc(h.requireCampaign(resolveCampaignFromPath, h.UpdateCampaign)))
	mux.Handle("DELETE /api/campaigns/{id}", http.HandlerFunc(h.requireCampaign(resolveCampaignFromPath, h.DeleteCampaign)))
	mux.Handle("GET /api/campaigns/{id}/dashboard", http.HandlerFunc(h.requireCampaign(resolveCampaignFromPath, h.GetDashboard)))
	mux.Handle("GET /api/campaigns/{id}/notes/render", http.HandlerFunc(h.requireCampaign(resolveCampaignFromPath, h.RenderNote)))

	mux.Handle("GET /api/campaigns/{id}/arcs", http.HandlerFunc(h.requireCampaign(resolveCampaignFromPath, h.ListArcs)))
	mux.Handle("POST /api/campaigns/{id}/arcs", http.HandlerFunc(h.requireCampaign(resolveCampaignFromPath, h.CreateArc)))
	mux.Handle("GET /api/arcs/{id}", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("arcs"), h.GetArc)))
	mux.Handle("PUT /api/arcs/{id}", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("arcs"), h.UpdateArc)))
	mux.Handle("DELETE /api/arcs/{id}", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("arcs"), h.DeleteArc)))

	mux.Handle("GET /api/campaigns/{id}/locations", http.HandlerFunc(h.requireCampaign(resolveCampaignFromPath, h.ListLocations)))
	mux.Handle("POST /api/campaigns/{id}/locations", http.HandlerFunc(h.requireCampaign(resolveCampaignFromPath, h.CreateLocation)))
	mux.Handle("GET /api/locations/{id}", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("locations"), h.GetLocation)))
	mux.Handle("PUT /api/locations/{id}", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("locations"), h.UpdateLocation)))
	mux.Handle("DELETE /api/locations/{id}", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("locations"), h.DeleteLocation)))
	mux.Handle("POST /api/locations/{id}/image", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("locations"), h.SetLocationImage)))
	mux.Handle("DELETE /api/locations/{id}/image", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("locations"), h.DeleteLocationImage)))
	mux.Handle("GET /api/locations/{id}/image", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("locations"), h.GetLocationImage)))

	mux.Handle("GET /api/campaigns/{id}/npcs", http.HandlerFunc(h.requireCampaign(resolveCampaignFromPath, h.ListNPCs)))
	mux.Handle("POST /api/campaigns/{id}/npcs", http.HandlerFunc(h.requireCampaign(resolveCampaignFromPath, h.CreateNPC)))
	mux.Handle("GET /api/npcs/{id}", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("npcs"), h.GetNPC)))
	mux.Handle("PUT /api/npcs/{id}", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("npcs"), h.UpdateNPC)))
	mux.Handle("DELETE /api/npcs/{id}", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("npcs"), h.DeleteNPC)))
	mux.Handle("GET /api/npcs/{id}/relations", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("npcs"), h.ListNPCRelations)))
	mux.Handle("POST /api/npcs/{id}/relations", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("npcs"), h.CreateNPCRelation)))
	mux.Handle("DELETE /api/npcs/{id}/relations/{toId}/{role}", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("npcs"), h.DeleteNPCRelation)))
	mux.Handle("POST /api/npcs/{id}/image", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("npcs"), h.SetNPCImage)))
	mux.Handle("DELETE /api/npcs/{id}/image", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("npcs"), h.DeleteNPCImage)))
	mux.Handle("GET /api/npcs/{id}/image", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("npcs"), h.GetNPCImage)))

	mux.Handle("GET /api/campaigns/{id}/player-characters", http.HandlerFunc(h.requireCampaign(resolveCampaignFromPath, h.ListPlayerCharacters)))
	mux.Handle("POST /api/campaigns/{id}/player-characters", http.HandlerFunc(h.requireCampaign(resolveCampaignFromPath, h.CreatePlayerCharacter)))
	mux.Handle("GET /api/player-characters/{id}", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("player_characters"), h.GetPlayerCharacter)))
	mux.Handle("PUT /api/player-characters/{id}", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("player_characters"), h.UpdatePlayerCharacter)))
	mux.Handle("DELETE /api/player-characters/{id}", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("player_characters"), h.DeletePlayerCharacter)))
	mux.Handle("POST /api/player-characters/{id}/image", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("player_characters"), h.SetPlayerCharacterImage)))
	mux.Handle("DELETE /api/player-characters/{id}/image", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("player_characters"), h.DeletePlayerCharacterImage)))
	mux.Handle("GET /api/player-characters/{id}/image", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("player_characters"), h.GetPlayerCharacterImage)))

	mux.Handle("GET /api/campaigns/{id}/quests", http.HandlerFunc(h.requireCampaign(resolveCampaignFromPath, h.ListQuests)))
	mux.Handle("POST /api/campaigns/{id}/quests", http.HandlerFunc(h.requireCampaign(resolveCampaignFromPath, h.CreateQuest)))
	mux.Handle("GET /api/quests/{id}", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("quests"), h.GetQuest)))
	mux.Handle("PUT /api/quests/{id}", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("quests"), h.UpdateQuest)))
	mux.Handle("DELETE /api/quests/{id}", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("quests"), h.DeleteQuest)))

	mux.Handle("GET /api/campaigns/{id}/sessions", http.HandlerFunc(h.requireCampaign(resolveCampaignFromPath, h.ListSessions)))
	mux.Handle("POST /api/campaigns/{id}/sessions", http.HandlerFunc(h.requireCampaign(resolveCampaignFromPath, h.CreateSession)))
	mux.Handle("GET /api/sessions/{id}", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("sessions"), h.GetSession)))
	mux.Handle("PUT /api/sessions/{id}", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("sessions"), h.UpdateSession)))
	mux.Handle("DELETE /api/sessions/{id}", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("sessions"), h.DeleteSession)))
	mux.Handle("GET /api/sessions/{id}/npcs", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("sessions"), h.ListSessionNpcs)))
	mux.Handle("POST /api/sessions/{id}/npcs", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("sessions"), h.AddSessionNpc)))
	mux.Handle("DELETE /api/sessions/{id}/npcs/{npcId}", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("sessions"), h.RemoveSessionNpc)))
	mux.Handle("GET /api/sessions/{id}/quests", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("sessions"), h.ListSessionQuests)))
	mux.Handle("POST /api/sessions/{id}/quests", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("sessions"), h.AddSessionQuest)))
	mux.Handle("DELETE /api/sessions/{id}/quests/{questId}", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("sessions"), h.RemoveSessionQuest)))

	mux.Handle("GET /api/campaigns/{id}/groups", http.HandlerFunc(h.requireCampaign(resolveCampaignFromPath, h.ListGroups)))
	mux.Handle("POST /api/campaigns/{id}/groups", http.HandlerFunc(h.requireCampaign(resolveCampaignFromPath, h.CreateGroup)))
	mux.Handle("GET /api/groups/{id}", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("groups"), h.GetGroup)))
	mux.Handle("GET /api/groups/{id}/members", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("groups"), h.GetMembers)))
	mux.Handle("GET /api/groups/{id}/pc-members", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("groups"), h.GetPCMembers)))
	mux.Handle("POST /api/groups/{id}/pc-members", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("groups"), h.AddGroupPCMember)))
	mux.Handle("DELETE /api/groups/{id}/pc-members/{pcId}", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("groups"), h.RemoveGroupPCMember)))
	mux.Handle("POST /api/groups/{id}/members", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("groups"), h.AddGroupMember)))
	mux.Handle("DELETE /api/groups/{id}/members/{npcId}", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("groups"), h.RemoveGroupMember)))
	mux.Handle("PUT /api/groups/{id}", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("groups"), h.UpdateGroup)))
	mux.Handle("DELETE /api/groups/{id}", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("groups"), h.DeleteGroup)))
	mux.Handle("POST /api/groups/{id}/image", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("groups"), h.SetGroupImage)))
	mux.Handle("DELETE /api/groups/{id}/image", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("groups"), h.DeleteGroupImage)))
	mux.Handle("GET /api/groups/{id}/image", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("groups"), h.GetGroupImage)))

	mux.Handle("GET /api/campaigns/{id}/encounters", http.HandlerFunc(h.requireCampaign(resolveCampaignFromPath, h.ListEncounters)))
	mux.Handle("POST /api/campaigns/{id}/encounters", http.HandlerFunc(h.requireCampaign(resolveCampaignFromPath, h.CreateEncounter)))
	mux.Handle("GET /api/encounters/{id}", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("encounters"), h.GetEncounter)))
	mux.Handle("PUT /api/encounters/{id}", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("encounters"), h.UpdateEncounter)))
	mux.Handle("DELETE /api/encounters/{id}", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("encounters"), h.DeleteEncounter)))
	mux.Handle("GET /api/encounters/{id}/participants", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("encounters"), h.ListEncounterParticipants)))
	mux.Handle("POST /api/encounters/{id}/participants", http.HandlerFunc(h.requireCampaign(h.resolveViaTable("encounters"), h.CreateEncounterParticipant)))
	mux.Handle("PUT /api/encounter-participants/{id}", http.HandlerFunc(h.requireCampaign(h.resolveEncounterParticipant, h.UpdateEncounterParticipant)))
	mux.Handle("DELETE /api/encounter-participants/{id}", http.HandlerFunc(h.requireCampaign(h.resolveEncounterParticipant, h.DeleteEncounterParticipant)))

	mux.Handle("POST /api/campaigns/{id}/reindex", http.HandlerFunc(h.requireCampaign(resolveCampaignFromPath, h.Reindex)))
	mux.Handle("GET /api/admin/vault-dirs", http.HandlerFunc(h.requireCampaign(resolveCampaignIDFromQuery, h.ListVaultDirs)))

	return mux
}
