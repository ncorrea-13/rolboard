package service

import (
	"context"
	"database/sql"
	"io"

	"github.com/ncorrea-13/rolboard/server/internal/export"
)

type ExportService struct {
	db          *sql.DB
	uploadsRoot string
}

func NewExportService(db *sql.DB, uploadsRoot string) *ExportService {
	return &ExportService{db: db, uploadsRoot: uploadsRoot}
}

func (s *ExportService) Write(ctx context.Context, campaignID int64, w io.Writer) error {
	return export.Write(ctx, s.db, s.uploadsRoot, campaignID, w)
}
