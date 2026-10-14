package handlers

import (
	"bytes"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

func (h *Handlers) ExportCampaign(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}
	campaign, err := h.campaigns.GetByID(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Campaign not found", http.StatusNotFound)
		return
	}
	if err != nil {
		internalError(w, err, "Error retrieving campaign")
		return
	}

	var buf bytes.Buffer
	if err := h.exports.Write(r.Context(), id, &buf); err != nil {
		internalError(w, err, "Error exporting campaign")
		return
	}

	slug := repository.NPCTypeKey(campaign.Name)
	if slug == "" {
		slug = "campaign"
	}
	filename := "rolboard-" + slug + "-" + time.Now().Format("2006-01-02") + ".zip"
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", `attachment; filename="`+filename+`"`)
	w.Header().Set("Content-Length", strconv.Itoa(buf.Len()))
	_, _ = w.Write(buf.Bytes())
}
