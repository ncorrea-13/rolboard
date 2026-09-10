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

var escapeExceptGTReplacer = strings.NewReplacer(
	"&", "&amp;",
	"<", "&lt;",
	`"`, "&#34;",
	"'", "&#39;",
)

func escapeExceptGT(s string) string {
	return escapeExceptGTReplacer.Replace(s)
}

var calloutRe = regexp.MustCompile(`<blockquote>\s*<p>\[!(\w+)\]([^\n<]*)`)

var calloutLabel = map[string]string{
	"note":    "Nota",
	"warning": "Advertencia",
	"tip":     "Tip",
	"quote":   "Cita",
}

func renderCallouts(rendered string) string {
	return calloutRe.ReplaceAllStringFunc(rendered, func(match string) string {
		groups := calloutRe.FindStringSubmatch(match)
		kind := strings.ToLower(groups[1])
		title := strings.TrimSpace(groups[2])
		if title == "" {
			title = calloutLabel[kind]
			if title == "" {
				title = strings.ToUpper(kind[:1]) + kind[1:]
			}
		}
		return fmt.Sprintf(
			`<blockquote class="callout callout-%s" data-callout="%s"><p class="callout-title">%s</p><p>`,
			kind, kind, html.EscapeString(title),
		)
	})
}

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
	rewritten = escapeExceptGT(rewritten)
	for i, anchor := range placeholders {
		rewritten = strings.ReplaceAll(rewritten, fmt.Sprintf("@@WIKILINK_%d@@", i), anchor)
	}

	var buf bytes.Buffer
	if err := markdown.Convert([]byte(rewritten), &buf); err != nil {
		return "", err
	}
	return renderCallouts(buf.String()), nil
}
