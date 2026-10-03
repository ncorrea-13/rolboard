package vault

import (
	"io/fs"
	"os"
	"strings"
)

var excludedFiles = map[string]bool{
	"CLAUDE.md":                 true,
	"FORMAT.md":                 true,
	"Primer Ideal.md":           true,
	"Método para crear NPCs.md": true,
}

func Walk(root string) ([]string, error) {
	r, err := os.OpenRoot(root)
	if err != nil {
		return nil, err
	}
	defer func() { _ = r.Close() }()

	var paths []string
	err = fs.WalkDir(r.FS(), ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		if !strings.HasSuffix(path, ".md") {
			return nil
		}
		if excludedFiles[d.Name()] {
			return nil
		}
		paths = append(paths, path)
		return nil
	})

	return paths, err
}
