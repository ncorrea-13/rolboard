package vault

import (
	"regexp"
	"strings"
)

var wikilinkRe = regexp.MustCompile(`\[\[([^\]|]+)(?:\|[^\]]+)?\]\]`)

func ExtractWikilinks(text string) []string {
	matches := wikilinkRe.FindAllStringSubmatch(text, -1)
	links := make([]string, 0, len(matches))
	for _, m := range matches {
		links = append(links, strings.TrimSpace(m[1]))
	}
	return links
}
