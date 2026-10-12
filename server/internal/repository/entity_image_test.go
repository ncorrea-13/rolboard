package repository

import (
	"context"
	"errors"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

func TestEntityImagePathRoundTripAndUpdateKeepsIt(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))
	images := NewEntityImageRepository(db)
	path := "x/1-portrait.png"

	arc := &models.Arc{CampaignID: campaignID, Title: "Arc", Order: 1, Status: "planificado"}
	if err := NewArcRepository(db).Create(ctx, arc); err != nil {
		t.Fatalf("Create arc failed: %v", err)
	}
	lore := &models.LoreEntry{CampaignID: campaignID, Title: "Lore"}
	if err := NewLoreEntryRepository(db).Create(ctx, lore); err != nil {
		t.Fatalf("Create lore failed: %v", err)
	}
	quest := &models.Quest{CampaignID: campaignID, Title: "Quest", Status: "active"}
	if err := NewQuestRepository(db).Create(ctx, quest); err != nil {
		t.Fatalf("Create quest failed: %v", err)
	}
	item := &models.Item{CampaignID: campaignID, Name: "Item"}
	if err := NewItemRepository(db).Create(ctx, item); err != nil {
		t.Fatalf("Create item failed: %v", err)
	}

	cases := []struct {
		table string
		id    int64
		read  func() (*string, error)
		save  func() error
	}{
		{"arcs", arc.ID,
			func() (*string, error) {
				a, err := NewArcRepository(db).GetByID(ctx, arc.ID)
				if err != nil {
					return nil, err
				}
				return a.ImagePath, nil
			},
			func() error {
				return NewArcRepository(db).Update(ctx, arc.ID, &models.Arc{Title: "Arc 2", Order: 1, Status: "planificado"})
			}},
		{"lore_entries", lore.ID,
			func() (*string, error) {
				e, err := NewLoreEntryRepository(db).GetByID(ctx, lore.ID)
				if err != nil {
					return nil, err
				}
				return e.ImagePath, nil
			},
			func() error {
				return NewLoreEntryRepository(db).Update(ctx, lore.ID, &models.LoreEntry{Title: "Lore 2"})
			}},
		{"quests", quest.ID,
			func() (*string, error) {
				q, err := NewQuestRepository(db).GetByID(ctx, quest.ID)
				if err != nil {
					return nil, err
				}
				return q.ImagePath, nil
			},
			func() error {
				return NewQuestRepository(db).Update(ctx, quest.ID, &models.Quest{Title: "Quest 2", Status: "active"})
			}},
		{"items", item.ID,
			func() (*string, error) {
				it, err := NewItemRepository(db).GetByID(ctx, item.ID)
				if err != nil {
					return nil, err
				}
				return it.ImagePath, nil
			},
			func() error {
				return NewItemRepository(db).Update(ctx, item.ID, &models.Item{Name: "Item 2"})
			}},
	}

	for _, c := range cases {
		t.Run(c.table, func(t *testing.T) {
			if err := images.SetPath(ctx, c.table, c.id, &path); err != nil {
				t.Fatalf("SetPath failed: %v", err)
			}
			if err := c.save(); err != nil {
				t.Fatalf("Update failed: %v", err)
			}
			got, err := c.read()
			if err != nil {
				t.Fatalf("read failed: %v", err)
			}
			if got == nil || *got != path {
				t.Fatalf("image_path after Update = %v, want %q", got, path)
			}
			if err := images.SetPath(ctx, c.table, c.id, nil); err != nil {
				t.Fatalf("clearing path failed: %v", err)
			}
			cleared, err := images.Path(ctx, c.table, c.id)
			if err != nil || cleared != nil {
				t.Fatalf("Path after clear = %v, %v; want nil, nil", cleared, err)
			}
		})
	}
}

func TestEntityImageRepositoryRejectsUnknownTable(t *testing.T) {
	db := setupTestDB(t)
	images := NewEntityImageRepository(db)
	if _, err := images.Path(context.Background(), "campaigns", 1); !errors.Is(err, errUnknownImageTable) {
		t.Fatalf("Path on foreign table = %v, want errUnknownImageTable", err)
	}
	if err := images.SetPath(context.Background(), "npcs; DROP TABLE npcs", 1, nil); !errors.Is(err, errUnknownImageTable) {
		t.Fatalf("SetPath on foreign table = %v, want errUnknownImageTable", err)
	}
}
