package mcpserver

import (
	"context"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"unicode"

	"github.com/modelcontextprotocol/go-sdk/mcp"
	"golang.org/x/text/runes"
	"golang.org/x/text/transform"
	"golang.org/x/text/unicode/norm"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

const searchLimit = 40

type searchArgs struct {
	CampaignID int64  `json:"campaign_id" jsonschema:"campaign ID, from list_campaigns"`
	Query      string `json:"query" jsonschema:"text to look for; case and accents are ignored"`
}

type searchHit struct {
	Kind     string `json:"kind" jsonschema:"entity type; pass the id to the matching get_* tool"`
	ID       int64  `json:"id"`
	Title    string `json:"title"`
	Subtitle string `json:"subtitle,omitempty"`
}

type doc struct {
	hit  searchHit
	body string
}

// normalize lowercases and strips accents, like normalize() in client/src/lib/search.ts.
func normalize(text string) string {
	out, _, err := transform.String(transform.Chain(norm.NFD, runes.Remove(runes.In(unicode.Mn)), norm.NFC), text)
	if err != nil {
		out = text
	}
	return strings.ToLower(out)
}

// score ranks where the query matches. The weights are the ones the web
// client uses: title, then subtitle, then body.
func score(d doc, q string) int {
	title := normalize(d.hit.Title)
	switch {
	case title == q:
		return 100
	case strings.HasPrefix(title, q):
		return 80
	case hasWordPrefix(title, q):
		return 65
	case strings.Contains(title, q):
		return 50
	case d.hit.Subtitle != "" && strings.Contains(normalize(d.hit.Subtitle), q):
		return 30
	case strings.Contains(normalize(d.body), q):
		return 10
	}
	return 0
}

func hasWordPrefix(title, q string) bool {
	for _, w := range strings.Fields(title) {
		if strings.HasPrefix(w, q) {
			return true
		}
	}
	return false
}

func rank(docs []doc, query string) []searchHit {
	q := normalize(strings.TrimSpace(query))
	if q == "" {
		return []searchHit{}
	}
	type scored struct {
		hit   searchHit
		score int
	}
	var found []scored
	for _, d := range docs {
		if s := score(d, q); s > 0 {
			found = append(found, scored{d.hit, s})
		}
	}
	sort.SliceStable(found, func(i, j int) bool {
		if found[i].score != found[j].score {
			return found[i].score > found[j].score
		}
		return found[i].hit.Title < found[j].hit.Title
	})
	if len(found) > searchLimit {
		found = found[:searchLimit]
	}
	hits := make([]searchHit, len(found))
	for i, f := range found {
		hits[i] = f.hit
	}
	return hits
}

type loader struct {
	ctx  context.Context
	api  *apiClient
	docs []doc
	err  error
}

func load[T any](l *loader, path string, conv func(T) (doc, bool)) {
	if l.err != nil {
		return
	}
	var all []T
	if l.err = l.api.do(l.ctx, http.MethodGet, path, nil, &all); l.err != nil {
		return
	}
	for _, item := range all {
		if d, ok := conv(item); ok {
			l.docs = append(l.docs, d)
		}
	}
}

func join(parts ...string) string { return strings.TrimSpace(strings.Join(parts, " ")) }

// loadDocs fetches every searchable list of the campaign. There is no search
// endpoint: the web client filters in memory too (see DECISIONS.md).
func loadDocs(ctx context.Context, api *apiClient, id int64) ([]doc, error) {
	l := &loader{ctx: ctx, api: api}
	path := func(format string) string { return fmt.Sprintf(format, id) }

	load(l, path("/api/campaigns/%d/npcs"), func(n models.NPC) (doc, bool) {
		rol := ""
		if n.Rol != nil {
			rol = *n.Rol
		}
		// "referencia" NPCs are vault index notes, not characters.
		return doc{searchHit{"npc", n.ID, n.Name, rol}, join(n.Description, n.Notes)}, n.NPCKind != "referencia"
	})
	load(l, path("/api/campaigns/%d/player-characters"), func(c models.PlayerCharacter) (doc, bool) {
		return doc{searchHit{"player_character", c.ID, c.CharacterName, join(c.Race, c.Class)}, join(c.Description, c.Backstory, c.ProgressionNotes)}, true
	})
	load(l, path("/api/campaigns/%d/locations"), func(x models.Location) (doc, bool) {
		return doc{searchHit{"location", x.ID, x.Name, ""}, join(x.Description, x.Notes)}, true
	})
	load(l, path("/api/campaigns/%d/groups"), func(g models.Group) (doc, bool) {
		return doc{searchHit{"group", g.ID, g.Name, g.Alineacion}, join(g.Description, g.Notes)}, true
	})
	load(l, path("/api/campaigns/%d/arcs"), func(a models.Arc) (doc, bool) {
		return doc{searchHit{"arc", a.ID, a.Title, ""}, a.Summary}, true
	})
	load(l, path("/api/campaigns/%d/quests"), func(q models.Quest) (doc, bool) {
		return doc{searchHit{"quest", q.ID, q.Title, ""}, join(q.Description, q.Notes)}, true
	})
	load(l, path("/api/campaigns/%d/sessions"), func(x models.Session) (doc, bool) {
		return doc{searchHit{"session", x.ID, x.Title, x.Date}, join(x.Summary, x.PrepNotes)}, true
	})
	load(l, path("/api/campaigns/%d/lore"), func(e models.LoreEntry) (doc, bool) {
		return doc{searchHit{"lore_entry", e.ID, e.Title, ""}, e.Body}, true
	})
	load(l, path("/api/campaigns/%d/secrets"), func(x models.Secret) (doc, bool) {
		return doc{searchHit{"secret", x.ID, x.Title, ""}, x.Body}, true
	})
	load(l, path("/api/campaigns/%d/loose-notes"), func(n models.LooseNote) (doc, bool) {
		return doc{searchHit{"loose_note", n.ID, n.Title, ""}, n.Body}, true
	})
	load(l, path("/api/campaigns/%d/timeline-events"), func(e models.TimelineEvent) (doc, bool) {
		return doc{searchHit{"timeline_event", e.ID, e.Title, e.DateLabel}, e.Description}, true
	})
	load(l, path("/api/campaigns/%d/items"), func(i models.Item) (doc, bool) {
		return doc{searchHit{"item", i.ID, i.Name, join(i.Category, i.Rarity)}, join(i.Description, i.Effect)}, true
	})
	load(l, path("/api/campaigns/%d/encounters"), func(e models.Encounter) (doc, bool) {
		return doc{searchHit{"encounter", e.ID, e.Name, e.Status}, ""}, true
	})
	return l.docs, l.err
}

func registerSearch(s *mcp.Server, api *apiClient) {
	mcp.AddTool(s, &mcp.Tool{
		Name:        "search",
		Description: "Search a campaign by text across NPCs, player characters, locations, groups, arcs, quests, sessions, lore, secrets, loose notes, timeline events, items and encounters. Matches words, not meaning. Ranked: title first, then subtitle, then body.",
		Annotations: readOnly,
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in searchArgs) (*mcp.CallToolResult, list[searchHit], error) {
		docs, err := loadDocs(ctx, api, in.CampaignID)
		if err != nil {
			return nil, list[searchHit]{}, err
		}
		return nil, list[searchHit]{Items: rank(docs, in.Query)}, nil
	})
}
