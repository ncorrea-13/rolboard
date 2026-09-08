package vault

import (
	"io/fs"
	"path/filepath"
	"strings"
)

var excludedFiles = map[string]bool{
	"CLAUDE.md":                 true,
	"FORMAT.md":                 true,
	"Primer Ideal.md":           true,
	"Método para crear NPCs.md": true,
}

func Walk(root string) ([]string, error) {
	var paths []string

	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
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

		rel, err := filepath.Rel(root, path)
		if err != nil {
			return err
		}
		paths = append(paths, rel)
		return nil
	})

	return paths, err
}
