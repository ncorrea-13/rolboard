package models

type Currency struct {
	ID          int64    `json:"id"`
	CampaignID  int64    `json:"campaign_id"`
	Name        string   `json:"name"`
	Symbol      string   `json:"symbol"`
	RateToBase  *float64 `json:"rate_to_base"`
	IsBase      bool     `json:"is_base"`
	LocationIDs []int64  `json:"location_ids"`
	CreatedAt   string   `json:"created_at"`
	UpdatedAt   string   `json:"updated_at"`
}

type Price struct {
	CurrencyID int64   `json:"currency_id"`
	Amount     float64 `json:"amount"`
}

type Item struct {
	ID          int64    `json:"id"`
	CampaignID  int64    `json:"campaign_id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Effect      string   `json:"effect"`
	Category    string   `json:"category"`
	Rarity      string   `json:"rarity"`
	Weight      *float64 `json:"weight"`
	Prices      []Price  `json:"prices"`
	ImagePath   *string  `json:"image_path,omitempty"`
	CreatedAt   string   `json:"created_at"`
	UpdatedAt   string   `json:"updated_at"`
}

type InventoryEntry struct {
	ItemID   int64  `json:"item_id"`
	Name     string `json:"name"`
	Quantity int64  `json:"quantity"`
	Notes    string `json:"notes"`
}

type ShopEntry struct {
	ItemID int64   `json:"item_id"`
	Name   string  `json:"name"`
	Notes  string  `json:"notes"`
	Prices []Price `json:"prices"`
}
