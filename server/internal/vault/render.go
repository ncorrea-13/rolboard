package vault

import (
	"bytes"
	"fmt"
	"html"
	"regexp"
	"strings"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	goldmarkhtml "github.com/yuin/goldmark/renderer/html"
)

var wikilinkFullRe = regexp.MustCompile(`!?\[\[([^\]|]+)(?:\|([^\]]+))?\]\]`)

var markdown = goldmark.New(
	goldmark.WithExtensions(extension.Table),
	goldmark.WithRendererOptions(goldmarkhtml.WithUnsafe()),
)

func RenderNote(content []byte, idx *NameIndex) (string, error) {
	_, body, err := Split(content)
	if err != nil {
		return "", err
	}

	var placeholders []string
	rewritten := wikilinkFullRe.ReplaceAllStringFunc(string(body), func(match string) string {
		groups := wikilinkFullRe.FindStringSubmatch(match)
		target := strings.TrimSpace(groups[1])
		label := target
		if groups[2] != "" {
			label = strings.TrimSpace(groups[2])
		}
		entries := idx.Lookup(target)
		if len(entries) != 1 {
			return html.EscapeString(label)
		}

		anchor := fmt.Sprintf(
			`<a href="#" data-entity-type="%s" data-entity-id="%d">%s</a>`,
			html.EscapeString(entries[0].Type), entries[0].ID, html.EscapeString(label),
		)
		placeholder := fmt.Sprintf("@@WIKILINK_%d@@", len(placeholders))
		placeholders = append(placeholders, anchor)
		return placeholder
	})
	rewritten = html.EscapeString(rewritten)
	for i, anchor := range placeholders {
		rewritten = strings.ReplaceAll(rewritten, fmt.Sprintf("@@WIKILINK_%d@@", i), anchor)
	}

	var buf bytes.Buffer
	if err := markdown.Convert([]byte(rewritten), &buf); err != nil {
		return "", err
	}
	return buf.String(), nil
}
