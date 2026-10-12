package handlers

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strconv"

	"github.com/ncorrea-13/rolboard/server/internal/imagestore"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type entityFetcher func(ctx context.Context, id int64) (any, error)

// registerImageRoutes wires POST, DELETE and GET /api/{path}/{id}/image for an
// entity stored in table. fetch returns the entity echoed back to the client.
func (h *Handlers) registerImageRoutes(mux *http.ServeMux, path, table string, fetch entityFetcher) {
	resolve := h.resolveViaTable(table)
	mux.Handle("POST /api/"+path+"/{id}/image", http.HandlerFunc(h.requireCampaign(resolve, h.setEntityImage(table, fetch))))
	mux.Handle("DELETE /api/"+path+"/{id}/image", http.HandlerFunc(h.requireCampaign(resolve, h.deleteEntityImage(table, fetch))))
	mux.Handle("GET /api/"+path+"/{id}/image", http.HandlerFunc(h.requireCampaign(resolve, h.getEntityImage(table))))
}

func (h *Handlers) setEntityImage(table string, fetch entityFetcher) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
		if err != nil {
			http.Error(w, "Invalid id", http.StatusBadRequest)
			return
		}
		data, ok := readUploadedImage(w, r)
		if !ok {
			return
		}
		err = h.entityImages.Set(r.Context(), table, id, data)
		switch {
		case errors.Is(err, imagestore.ErrUnsupportedFormat):
			apiError(w, http.StatusBadRequest, "image_unsupported_format")
			return
		case errors.Is(err, repository.ErrNotFound):
			http.Error(w, "Not found", http.StatusNotFound)
			return
		case err != nil:
			log.Printf("set image %s/%d: %v", table, id, err)
			http.Error(w, "Error saving image", http.StatusInternalServerError)
			return
		}
		h.writeEntity(w, r, id, fetch)
	}
}

func (h *Handlers) deleteEntityImage(table string, fetch entityFetcher) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
		if err != nil {
			http.Error(w, "Invalid id", http.StatusBadRequest)
			return
		}
		err = h.entityImages.Delete(r.Context(), table, id)
		switch {
		case errors.Is(err, repository.ErrNotFound):
			http.Error(w, "Not found", http.StatusNotFound)
			return
		case err != nil:
			log.Printf("delete image %s/%d: %v", table, id, err)
			http.Error(w, "Error deleting image", http.StatusInternalServerError)
			return
		}
		h.writeEntity(w, r, id, fetch)
	}
}

func (h *Handlers) getEntityImage(table string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
		if err != nil {
			http.Error(w, "Invalid id", http.StatusBadRequest)
			return
		}
		absPath, contentType, err := h.entityImages.File(r.Context(), table, id)
		switch {
		case errors.Is(err, repository.ErrNotFound):
			http.Error(w, "Image not found", http.StatusNotFound)
			return
		case err != nil:
			http.Error(w, "Error retrieving image", http.StatusInternalServerError)
			return
		}
		serveImage(w, r, absPath, contentType)
	}
}

func (h *Handlers) writeEntity(w http.ResponseWriter, r *http.Request, id int64, fetch entityFetcher) {
	entity, err := fetch(r.Context(), id)
	if err != nil {
		internalError(w, err, "Error retrieving entity")
		return
	}
	writeJSON(w, http.StatusOK, entity)
}
