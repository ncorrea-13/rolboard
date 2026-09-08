package vault

type IndexEntry struct {
	ID      int64
	Name    string
	Type    string
	RawPath string
}

type NameIndex struct {
	entries map[string][]IndexEntry
}

func NewNameIndex() *NameIndex {
	return &NameIndex{entries: make(map[string][]IndexEntry)}
}

func (idx *NameIndex) Add(entry IndexEntry) {
	idx.entries[entry.Name] = append(idx.entries[entry.Name], entry)
}

func (idx *NameIndex) Lookup(name string) []IndexEntry {
	return idx.entries[name]
}
