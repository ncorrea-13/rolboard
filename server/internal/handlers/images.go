package handlers

import (
	"io"
	"net/http"

	"github.com/ncorrea-13/rolboard/server/internal/imagestore"
)

func readUploadedImage(w http.ResponseWriter, r *http.Request) (data []byte, ok bool) {
	r.Body = http.MaxBytesReader(w, r.Body, imagestore.MaxUploadBytes)
	if err := r.ParseMultipartForm(imagestore.MaxUploadBytes); err != nil {
		http.Error(w, "File too large or invalid form (max 5 MiB)", http.StatusBadRequest)
		return nil, false
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, `Missing "file" field`, http.StatusBadRequest)
		return nil, false
	}
	defer func() {
		_ = file.Close()
	}()
	data, err = io.ReadAll(file)
	if err != nil {
		http.Error(w, "Error reading uploaded file", http.StatusBadRequest)
		return nil, false
	}
	return data, true
}

func serveImage(w http.ResponseWriter, r *http.Request, absPath, contentType string) {
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("X-Content-Type-Options", "nosniff")
	http.ServeFile(w, r, absPath)
}
