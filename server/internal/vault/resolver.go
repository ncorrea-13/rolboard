package vault

import "fmt"

var (
	ErrWikilinkNotFound  = fmt.Errorf("wikilink not found in index")
	ErrWikilinkAmbiguous = fmt.Errorf("wikilink matches more than one entity of the expected type")
)

func Resolve(idx *NameIndex, name string, expectedType string) (int64, error) {
	candidates := idx.Lookup(name)

	var matches []IndexEntry
	for _, c := range candidates {
		if c.Type == expectedType {
			matches = append(matches, c)
		}
	}

	switch len(matches) {
	case 0:
		return 0, ErrWikilinkNotFound
	case 1:
		return matches[0].ID, nil
	default:
		return 0, ErrWikilinkAmbiguous
	}
}

func ResolveWikilink(idx *NameIndex, raw string, expectedType string) (id int64, ok bool, err error) {
	if raw == "" {
		return 0, false, nil
	}
	links := ExtractWikilinks(raw)
	if len(links) == 0 {
		return 0, false, nil
	}
	id, err = Resolve(idx, links[0], expectedType)
	if err != nil {
		return 0, true, err
	}
	return id, true, nil
}
