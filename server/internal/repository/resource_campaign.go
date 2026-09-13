package repository

import (
	"context"
	"database/sql"
	"fmt"
)

func CampaignIDByEntity(ctx context.Context, db *sql.DB, table string, id int64) (int64, error) {
	var campaignID int64
	query := fmt.Sprintf(`SELECT campaign_id FROM %s WHERE id = ? AND deleted_at IS NULL`, table)
	err := db.QueryRowContext(ctx, query, id).Scan(&campaignID)
	if err == sql.ErrNoRows {
		return 0, ErrNotFound
	}
	return campaignID, err
}

func CampaignIDByEncounterParticipant(ctx context.Context, db *sql.DB, id int64) (int64, error) {
	var campaignID int64
	err := db.QueryRowContext(ctx, `
              SELECT e.campaign_id FROM encounter_participants ep
              JOIN encounters e ON e.id = ep.encounter_id
              WHERE ep.id = ? AND ep.deleted_at IS NULL`,
		id,
	).Scan(&campaignID)
	if err == sql.ErrNoRows {
		return 0, ErrNotFound
	}
	return campaignID, err
}
