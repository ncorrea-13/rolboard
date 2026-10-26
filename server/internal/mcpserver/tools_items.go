package mcpserver

import (
	"context"
	"fmt"
	"net/http"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

type itemSummary struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	Category string `json:"category"`
	Rarity   string `json:"rarity"`
}

type currencySummary struct {
	ID     int64  `json:"id"`
	Name   string `json:"name"`
	Symbol string `json:"symbol"`
	IsBase bool   `json:"is_base"`
}

type priceArg struct {
	CurrencyID int64   `json:"currency_id" jsonschema:"from list_currencies"`
	Amount     float64 `json:"amount" jsonschema:"not negative"`
}

type ownerArgs struct {
	Kind    string `json:"kind" jsonschema:"npc or player_character"`
	OwnerID int64  `json:"owner_id" jsonschema:"ID of the NPC or player character"`
}

type shopArgs struct {
	LocationID int64 `json:"location_id" jsonschema:"location that sells items, from list_locations"`
}

type createItemArgs struct {
	CampaignID  int64      `json:"campaign_id" jsonschema:"campaign ID, from list_campaigns"`
	Name        string     `json:"name" jsonschema:"1-80 characters"`
	Description string     `json:"description,omitempty"`
	Effect      string     `json:"effect,omitempty" jsonschema:"what the item does (free text, no mechanics)"`
	Category    string     `json:"category,omitempty" jsonschema:"free text, e.g. weapon or potion"`
	Rarity      string     `json:"rarity,omitempty" jsonschema:"free text, e.g. common or rare"`
	Weight      *float64   `json:"weight,omitempty" jsonschema:"not negative"`
	Prices      []priceArg `json:"prices,omitempty" jsonschema:"catalog price, one per currency"`
}

type updateInventoryArgs struct {
	Kind     string `json:"kind" jsonschema:"npc or player_character"`
	OwnerID  int64  `json:"owner_id" jsonschema:"ID of the NPC or player character"`
	ItemID   int64  `json:"item_id" jsonschema:"from list_items"`
	Quantity int64  `json:"quantity" jsonschema:"new total, at least 1; it replaces the current quantity (read it first with get_inventory to add to it)"`
	Notes    string `json:"notes,omitempty" jsonschema:"replaces the current notes"`
}

type updateShopArgs struct {
	LocationID int64      `json:"location_id" jsonschema:"location that sells items, from list_locations"`
	ItemID     int64      `json:"item_id" jsonschema:"from list_items"`
	Notes      string     `json:"notes,omitempty" jsonschema:"replaces the current notes"`
	Prices     []priceArg `json:"prices,omitempty" jsonschema:"prices of this shop; empty means it uses the catalog price. They replace the current ones"`
}

// inventoryPath returns the API path of an owner's inventory.
func inventoryPath(kind string, ownerID int64) (string, error) {
	switch kind {
	case "npc":
		return fmt.Sprintf("/api/npcs/%d/items", ownerID), nil
	case "player_character":
		return fmt.Sprintf("/api/player-characters/%d/items", ownerID), nil
	}
	return "", fmt.Errorf("kind must be npc or player_character, got %q", kind)
}

func registerItemTools(s *mcp.Server, api *apiClient) {
	registerEntity(s, api, "item", "items", "/api/campaigns/%d/items", "/api/items/%d",
		func(i models.Item) (itemSummary, bool) {
			return itemSummary{ID: i.ID, Name: i.Name, Category: i.Category, Rarity: i.Rarity}, true
		})
	registerList(s, api, "currencies",
		"List the currencies of a campaign. Use the id in the prices of create_item and update_shop_item.",
		"/api/campaigns/%d/currencies",
		func(c models.Currency) (currencySummary, bool) {
			return currencySummary{ID: c.ID, Name: c.Name, Symbol: c.Symbol, IsBase: c.IsBase}, true
		})

	mcp.AddTool(s, &mcp.Tool{
		Name:        "get_item_owners",
		Description: "Who holds an item: the NPCs and player characters with it, and how many.",
		Annotations: readOnly,
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in idArgs) (*mcp.CallToolResult, list[models.ItemOwner], error) {
		var owners []models.ItemOwner
		if err := api.do(ctx, http.MethodGet, fmt.Sprintf("/api/items/%d/owners", in.ID), nil, &owners); err != nil {
			return nil, list[models.ItemOwner]{}, err
		}
		return nil, list[models.ItemOwner]{Items: nonNil(owners)}, nil
	})

	mcp.AddTool(s, &mcp.Tool{
		Name:        "get_inventory",
		Description: "The items an NPC or a player character carries, with quantity and notes.",
		Annotations: readOnly,
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in ownerArgs) (*mcp.CallToolResult, list[models.InventoryEntry], error) {
		out, err := readInventory(ctx, api, in)
		return nil, out, err
	})

	mcp.AddTool(s, &mcp.Tool{
		Name:        "get_shop",
		Description: "What a location sells, with the shop's own prices (empty prices mean the catalog price).",
		Annotations: readOnly,
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in shopArgs) (*mcp.CallToolResult, list[models.ShopEntry], error) {
		out, err := readShop(ctx, api, in.LocationID)
		return nil, out, err
	})

	mcp.AddTool(s, &mcp.Tool{
		Name:        "create_item",
		Description: "Create an item in the campaign catalog. To give it to someone use update_inventory_item; to sell it, update_shop_item.",
		Annotations: create,
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in createItemArgs) (*mcp.CallToolResult, models.Item, error) {
		body := map[string]any{
			"name": in.Name, "description": in.Description, "effect": in.Effect,
			"category": in.Category, "rarity": in.Rarity, "weight": in.Weight,
			"prices": nonNil(in.Prices),
		}
		var item models.Item
		err := api.do(ctx, http.MethodPost, fmt.Sprintf("/api/campaigns/%d/items", in.CampaignID), body, &item)
		return nil, item, err
	})

	mcp.AddTool(s, &mcp.Tool{
		Name:        "update_inventory_item",
		Description: "Put an item in an NPC's or player character's inventory, or change its quantity and notes. Returns the whole inventory. It cannot remove items.",
		Annotations: replace,
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in updateInventoryArgs) (*mcp.CallToolResult, list[models.InventoryEntry], error) {
		path, err := inventoryPath(in.Kind, in.OwnerID)
		if err != nil {
			return nil, list[models.InventoryEntry]{}, err
		}
		body := map[string]any{"quantity": in.Quantity, "notes": in.Notes}
		if err := api.do(ctx, http.MethodPut, fmt.Sprintf("%s/%d", path, in.ItemID), body, nil); err != nil {
			return nil, list[models.InventoryEntry]{}, err
		}
		out, err := readInventory(ctx, api, ownerArgs{Kind: in.Kind, OwnerID: in.OwnerID})
		return nil, out, err
	})

	mcp.AddTool(s, &mcp.Tool{
		Name:        "update_shop_item",
		Description: "Stock an item in a location's shop, or change its notes and prices there. Returns the whole shop. It cannot remove items.",
		Annotations: replace,
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in updateShopArgs) (*mcp.CallToolResult, list[models.ShopEntry], error) {
		body := map[string]any{"notes": in.Notes, "prices": nonNil(in.Prices)}
		path := fmt.Sprintf("/api/locations/%d/items/%d", in.LocationID, in.ItemID)
		if err := api.do(ctx, http.MethodPut, path, body, nil); err != nil {
			return nil, list[models.ShopEntry]{}, err
		}
		out, err := readShop(ctx, api, in.LocationID)
		return nil, out, err
	})
}

func readInventory(ctx context.Context, api *apiClient, in ownerArgs) (list[models.InventoryEntry], error) {
	path, err := inventoryPath(in.Kind, in.OwnerID)
	if err != nil {
		return list[models.InventoryEntry]{}, err
	}
	var entries []models.InventoryEntry
	if err := api.do(ctx, http.MethodGet, path, nil, &entries); err != nil {
		return list[models.InventoryEntry]{}, err
	}
	return list[models.InventoryEntry]{Items: nonNil(entries)}, nil
}

func readShop(ctx context.Context, api *apiClient, locationID int64) (list[models.ShopEntry], error) {
	var entries []models.ShopEntry
	if err := api.do(ctx, http.MethodGet, fmt.Sprintf("/api/locations/%d/items", locationID), nil, &entries); err != nil {
		return list[models.ShopEntry]{}, err
	}
	return list[models.ShopEntry]{Items: nonNil(entries)}, nil
}

// nonNil turns a nil slice into an empty one, so JSON carries [] and not null.
func nonNil[T any](s []T) []T {
	if s == nil {
		return []T{}
	}
	return s
}
