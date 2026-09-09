package service

import (
	"context"
	"os"
	"path/filepath"
	"strings"

	"github.com/ncorrea-13/rolboard/server/internal/repository"
	"github.com/ncorrea-13/rolboard/server/internal/vault"
)

type NotesService struct {
	campaignRepo     *repository.CampaignRepository
	locations        *repository.LocationRepository
	npcs             *repository.NPCRepository
	groups           *repository.GroupRepository
	sessions         *repository.SessionRepository
	arcs             *repository.ArcRepository
	playerCharacters *repository.PlayerCharacterRepository
	vaultsRoot       string
}

func NewNotesService(
	campaignRepo *repository.CampaignRepository,
	locations *repository.LocationRepository,
	npcs *repository.NPCRepository,
	groups *repository.GroupRepository,
	sessions *repository.SessionRepository,
	arcs *repository.ArcRepository,
	playerCharacters *repository.PlayerCharacterRepository,
	vaultsRoot string,
) *NotesService {
	return &NotesService{
		campaignRepo:     campaignRepo,
		locations:        locations,
		npcs:             npcs,
		groups:           groups,
		sessions:         sessions,
		arcs:             arcs,
		playerCharacters: playerCharacters,
		vaultsRoot:       vaultsRoot,
	}
}

func (s *NotesService) Render(ctx context.Context, campaignID int64, relPath string) (string, error) {
	campaign, err := s.campaignRepo.GetByID(ctx, campaignID)
	if err != nil {
		return "", err
	}

	full := filepath.Join(s.vaultsRoot, campaign.VaultPath, relPath)
	content, err := os.ReadFile(full)
	if err != nil {
		return "", err
	}

	idx, err := s.buildNameIndex(ctx, campaignID)
	if err != nil {
		return "", err
	}

	return vault.RenderNote(content, idx)
}

func (s *NotesService) buildNameIndex(ctx context.Context, campaignID int64) (*vault.NameIndex, error) {
	idx := vault.NewNameIndex()

	locations, err := s.locations.List(ctx, campaignID)
	if err != nil {
		return nil, err
	}
	for _, l := range locations {
		idx.Add(vault.IndexEntry{ID: l.ID, Name: l.Name, Type: "location"})
	}

	npcs, err := s.npcs.List(ctx, campaignID)
	if err != nil {
		return nil, err
	}
	for _, n := range npcs {
		idx.Add(vault.IndexEntry{ID: n.ID, Name: n.Name, Type: "npc"})
	}

	groups, err := s.groups.List(ctx, campaignID)
	if err != nil {
		return nil, err
	}
	for _, g := range groups {
		idx.Add(vault.IndexEntry{ID: g.ID, Name: g.Name, Type: "group"})
	}

	sessions, err := s.sessions.List(ctx, campaignID)
	if err != nil {
		return nil, err
	}
	for _, sess := range sessions {
		if sess.ObsidianPath == nil {
			continue
		}
		name := strings.TrimSuffix(filepath.Base(*sess.ObsidianPath), filepath.Ext(*sess.ObsidianPath))
		idx.Add(vault.IndexEntry{ID: sess.ID, Name: name, Type: "session"})
	}

	arcs, err := s.arcs.List(ctx, campaignID)
	if err != nil {
		return nil, err
	}
	for _, a := range arcs {
		idx.Add(vault.IndexEntry{ID: a.ID, Name: a.Title, Type: "arc"})
	}

	playerCharacters, err := s.playerCharacters.List(ctx, campaignID)
	if err != nil {
		return nil, err
	}
	for _, p := range playerCharacters {
		idx.Add(vault.IndexEntry{ID: p.ID, Name: p.CharacterName, Type: "player_character"})
	}

	return idx, nil
}
