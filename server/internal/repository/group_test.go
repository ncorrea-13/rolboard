package repository

import (
	"context"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

func TestGroupCreate(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	repo := NewGroupRepository(db)
	group := &models.Group{CampaignID: campaignID, Name: "Bridge Four"}

	if err := repo.Create(ctx, group); err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if group.ID == 0 {
		t.Error("Expected group ID to be set")
	}
}

func TestGroupListByCampaign(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	repo := NewGroupRepository(db)
	for i := 0; i < 2; i++ {
		if err := repo.Create(ctx, &models.Group{CampaignID: campaignID, Name: "Group"}); err != nil {
			t.Fatalf("Create failed: %v", err)
		}
	}

	groups, err := repo.List(ctx, campaignID)
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if len(groups) != 2 {
		t.Errorf("Expected 2 groups, got %d", len(groups))
	}
}

func TestGroupGetByIDNotFound(t *testing.T) {
	db := setupTestDB(t)
	repo := NewGroupRepository(db)

	_, err := repo.GetByID(context.Background(), 9999)
	if err != ErrNotFound {
		t.Errorf("Expected ErrNotFound, got %v", err)
	}
}

func TestGroupUpdate(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	repo := NewGroupRepository(db)
	created := &models.Group{CampaignID: campaignID, Name: "Original"}
	if err := repo.Create(ctx, created); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	updated := &models.Group{Name: "Updated", Description: "New desc"}
	if err := repo.Update(ctx, created.ID, updated); err != nil {
		t.Fatalf("Update failed: %v", err)
	}

	retrieved, err := repo.GetByID(ctx, created.ID)
	if err != nil {
		t.Fatalf("GetByID after update failed: %v", err)
	}
	if retrieved.Name != "Updated" {
		t.Errorf("Expected name 'Updated', got '%s'", retrieved.Name)
	}
}

func TestGroupGetMembersEmpty(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	repo := NewGroupRepository(db)
	group := &models.Group{CampaignID: campaignID, Name: "Bridge Four"}
	if err := repo.Create(ctx, group); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	members, err := repo.GetMembers(ctx, group.ID)
	if err != nil {
		t.Fatalf("GetMembers failed: %v", err)
	}
	if len(members) != 0 {
		t.Errorf("Expected 0 members, got %d", len(members))
	}
}

func TestGroupGetMembers(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	groupRepo := NewGroupRepository(db)
	group := &models.Group{CampaignID: campaignID, Name: "Bridge Four"}
	if err := groupRepo.Create(ctx, group); err != nil {
		t.Fatalf("Create group failed: %v", err)
	}

	npcRepo := NewNPCRepository(db)
	kaladin := &models.NPC{CampaignID: campaignID, Name: "Kaladin", NPCKind: "npc", DetailLevel: "full", Status: "vivo"}
	if err := npcRepo.Create(ctx, kaladin); err != nil {
		t.Fatalf("Create npc failed: %v", err)
	}
	teft := &models.NPC{CampaignID: campaignID, Name: "Teft", NPCKind: "npc", DetailLevel: "minor", Status: "vivo"}
	if err := npcRepo.Create(ctx, teft); err != nil {
		t.Fatalf("Create npc failed: %v", err)
	}

	if _, err := db.ExecContext(ctx, `INSERT INTO npc_groups (npc_id, group_id, role_in_group) VALUES (?, ?, ?)`, kaladin.ID, group.ID, "Leader"); err != nil {
		t.Fatalf("Insert npc_groups failed: %v", err)
	}
	if _, err := db.ExecContext(ctx, `INSERT INTO npc_groups (npc_id, group_id) VALUES (?, ?)`, teft.ID, group.ID); err != nil {
		t.Fatalf("Insert npc_groups failed: %v", err)
	}

	members, err := groupRepo.GetMembers(ctx, group.ID)
	if err != nil {
		t.Fatalf("GetMembers failed: %v", err)
	}
	if len(members) != 2 {
		t.Fatalf("Expected 2 members, got %d", len(members))
	}

	if members[0].NPCID != kaladin.ID || members[0].RoleInGroup == nil || *members[0].RoleInGroup != "Leader" {
		t.Errorf("Expected Kaladin with role 'Leader', got %+v", members[0])
	}
	if members[1].NPCID != teft.ID || members[1].RoleInGroup != nil {
		t.Errorf("Expected Teft with nil role, got %+v", members[1])
	}
}

func TestGroupGetMembersExcludesDeletedNPC(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	groupRepo := NewGroupRepository(db)
	group := &models.Group{CampaignID: campaignID, Name: "Bridge Four"}
	if err := groupRepo.Create(ctx, group); err != nil {
		t.Fatalf("Create group failed: %v", err)
	}

	npcRepo := NewNPCRepository(db)
	npc := &models.NPC{CampaignID: campaignID, Name: "Moash", NPCKind: "npc", DetailLevel: "minor", Status: "vivo"}
	if err := npcRepo.Create(ctx, npc); err != nil {
		t.Fatalf("Create npc failed: %v", err)
	}
	if _, err := db.ExecContext(ctx, `INSERT INTO npc_groups (npc_id, group_id) VALUES (?, ?)`, npc.ID, group.ID); err != nil {
		t.Fatalf("Insert npc_groups failed: %v", err)
	}
	if err := npcRepo.Delete(ctx, npc.ID); err != nil {
		t.Fatalf("Delete npc failed: %v", err)
	}

	members, err := groupRepo.GetMembers(ctx, group.ID)
	if err != nil {
		t.Fatalf("GetMembers failed: %v", err)
	}
	if len(members) != 0 {
		t.Errorf("Expected 0 members after npc soft-delete, got %d", len(members))
	}
}

func TestGroupDelete(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	repo := NewGroupRepository(db)
	created := &models.Group{CampaignID: campaignID, Name: "To Delete"}
	if err := repo.Create(ctx, created); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	if err := repo.Delete(ctx, created.ID); err != nil {
		t.Fatalf("Delete failed: %v", err)
	}

	_, err := repo.GetByID(ctx, created.ID)
	if err != ErrNotFound {
		t.Errorf("Expected ErrNotFound after delete, got %v", err)
	}
}
