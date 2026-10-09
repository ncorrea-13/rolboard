package repository

import (
	"context"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

func TestUpdateKeepsImagePath(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))
	path := "x/1-portrait.png"

	locRepo := NewLocationRepository(db)
	loc := &models.Location{CampaignID: campaignID, Name: "Kharbranth", LocationType: "city"}
	if err := locRepo.Create(ctx, loc); err != nil {
		t.Fatalf("Create location failed: %v", err)
	}
	if _, err := locRepo.SetImagePath(ctx, loc.ID, &path); err != nil {
		t.Fatalf("SetImagePath failed: %v", err)
	}
	if err := locRepo.Update(ctx, loc.ID, &models.Location{Name: "Kharbranth 2", LocationType: "city"}); err != nil {
		t.Fatalf("Update location failed: %v", err)
	}

	npcRepo := NewNPCRepository(db)
	npc := &models.NPC{CampaignID: campaignID, Name: "Kaladin", NPCKind: "npc", DetailLevel: "full", Status: "vivo"}
	if err := npcRepo.Create(ctx, npc); err != nil {
		t.Fatalf("Create npc failed: %v", err)
	}
	if _, err := npcRepo.SetImagePath(ctx, npc.ID, &path); err != nil {
		t.Fatalf("SetImagePath failed: %v", err)
	}
	updatedNPC := &models.NPC{Name: "Kaladin 2", NPCKind: "npc", DetailLevel: "full", Status: "vivo"}
	if err := npcRepo.Update(ctx, npc.ID, updatedNPC); err != nil {
		t.Fatalf("Update npc failed: %v", err)
	}

	groupRepo := NewGroupRepository(db)
	group := &models.Group{CampaignID: campaignID, Name: "Bridge Four"}
	if err := groupRepo.Create(ctx, group); err != nil {
		t.Fatalf("Create group failed: %v", err)
	}
	if _, err := groupRepo.SetImagePath(ctx, group.ID, &path); err != nil {
		t.Fatalf("SetImagePath failed: %v", err)
	}
	updatedGroup := &models.Group{Name: "Bridge Five"}
	if err := groupRepo.Update(ctx, group.ID, updatedGroup); err != nil {
		t.Fatalf("Update group failed: %v", err)
	}

	pcRepo := NewPlayerCharacterRepository(db)
	pc := &models.PlayerCharacter{CampaignID: campaignID, PlayerName: "Nico", CharacterName: "Shallan", Status: "activo"}
	if err := pcRepo.Create(ctx, pc); err != nil {
		t.Fatalf("Create pc failed: %v", err)
	}
	if _, err := pcRepo.SetImagePath(ctx, pc.ID, &path); err != nil {
		t.Fatalf("SetImagePath failed: %v", err)
	}
	updatedPC := &models.PlayerCharacter{PlayerName: "Nico", CharacterName: "Shallan 2", Status: "activo"}
	if err := pcRepo.Update(ctx, pc.ID, updatedPC); err != nil {
		t.Fatalf("Update pc failed: %v", err)
	}

	updatedLoc := &models.Location{Name: "K3", LocationType: "city"}
	if err := locRepo.Update(ctx, loc.ID, updatedLoc); err != nil {
		t.Fatalf("Update location failed: %v", err)
	}

	for name, got := range map[string]*string{
		"location":         updatedLoc.ImagePath,
		"npc":              updatedNPC.ImagePath,
		"group":            updatedGroup.ImagePath,
		"player_character": updatedPC.ImagePath,
	} {
		if got == nil || *got != path {
			t.Errorf("%s: Update response lost image_path, got %v", name, got)
		}
	}
}

func TestGroupResponsesIncludeMemberCount(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))
	groupRepo := NewGroupRepository(db)
	npcRepo := NewNPCRepository(db)

	group := &models.Group{CampaignID: campaignID, Name: "Bridge Four"}
	if err := groupRepo.Create(ctx, group); err != nil {
		t.Fatalf("Create group failed: %v", err)
	}
	npc := &models.NPC{CampaignID: campaignID, Name: "Kaladin", NPCKind: "npc", DetailLevel: "full", Status: "vivo"}
	if err := npcRepo.Create(ctx, npc); err != nil {
		t.Fatalf("Create npc failed: %v", err)
	}
	if err := groupRepo.AddMember(ctx, group.ID, npc.ID); err != nil {
		t.Fatalf("AddMember failed: %v", err)
	}

	got, err := groupRepo.GetByID(ctx, group.ID)
	if err != nil || got.MemberCount != 1 {
		t.Fatalf("GetByID member count = %v, err %v", got, err)
	}
	updated := &models.Group{Name: "Bridge Five"}
	if err := groupRepo.Update(ctx, group.ID, updated); err != nil || updated.MemberCount != 1 {
		t.Fatalf("Update member count = %d, err %v", updated.MemberCount, err)
	}
}
