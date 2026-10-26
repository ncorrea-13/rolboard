package desktop

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

const serverName = "rolboard"

var (
	ErrUnknownClient      = errors.New("unknown MCP client")
	ErrClientNotInstalled = errors.New("MCP client is not installed")
)

// Client is an app that can talk MCP and keeps its servers in a config file.
type Client struct {
	ID    string
	Label string

	configPath string // file that lists the MCP servers
	detectDir  string // exists when the client is installed
	toml       bool   // config.toml instead of a JSON file with mcpServers
}

// ClientStatus is what the settings screen shows for one client.
type ClientStatus struct {
	ID        string `json:"id"`
	Label     string `json:"label"`
	Installed bool   `json:"installed"`
	Connected bool   `json:"connected"`
}

// Clients lists the supported MCP clients with their config in the real user dirs.
func Clients() ([]Client, error) {
	cfg, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return nil, err
	}
	return ClientsAt(cfg, home), nil
}

// ClientsAt is Clients with the user config and home dirs given, for tests.
// The paths come from each client's docs and are not verified on every OS.
func ClientsAt(configDir, home string) []Client {
	return []Client{
		{
			ID: "claude-desktop", Label: "Claude Desktop",
			configPath: filepath.Join(configDir, "Claude", "claude_desktop_config.json"),
			detectDir:  filepath.Join(configDir, "Claude"),
		},
		{
			ID: "claude-code", Label: "Claude Code",
			configPath: filepath.Join(home, ".claude.json"),
			detectDir:  filepath.Join(home, ".claude"),
		},
		{
			ID: "antigravity", Label: "Antigravity",
			configPath: filepath.Join(home, ".gemini", "config", "mcp_config.json"),
			detectDir:  filepath.Join(home, ".gemini"),
		},
		{
			ID: "codex", Label: "Codex",
			configPath: filepath.Join(home, ".codex", "config.toml"),
			detectDir:  filepath.Join(home, ".codex"),
			toml:       true,
		},
	}
}

// FindClient returns the client with that ID.
func FindClient(clients []Client, id string) (Client, error) {
	for _, c := range clients {
		if c.ID == id {
			return c, nil
		}
	}
	return Client{}, ErrUnknownClient
}

// Status reports whether the client is installed and already has the entry.
func (c Client) Status() ClientStatus {
	st := ClientStatus{ID: c.ID, Label: c.Label}
	if info, err := os.Stat(c.detectDir); err == nil && info.IsDir() {
		st.Installed = true
	}
	raw, err := os.ReadFile(c.configPath)
	if err != nil {
		return st
	}
	if c.toml {
		st.Connected = codexHasServer(string(raw), serverName)
		return st
	}
	var doc struct {
		Servers map[string]json.RawMessage `json:"mcpServers"`
	}
	if json.Unmarshal(raw, &doc) == nil {
		_, st.Connected = doc.Servers[serverName]
	}
	return st
}

// Connect adds (or replaces) the Rolboard entry so the client launches
// `<exe> mcp`. The rest of the file is kept.
func (c Client) Connect(exe string) error {
	if !c.Status().Installed {
		return ErrClientNotInstalled
	}
	if c.toml {
		return mergeCodexServer(c.configPath, serverName, exe)
	}
	return mergeMCPServer(c.configPath, serverName, map[string]any{"command": exe, "args": []string{"mcp"}})
}

// SelfExecutable is the path to launch this app again, for the client's
// config: the .AppImage itself on Linux (the mounted path changes on every run).
func SelfExecutable() (string, error) {
	if p := os.Getenv("APPIMAGE"); p != "" {
		if _, err := os.Stat(p); err == nil {
			return p, nil
		}
	}
	return os.Executable()
}

// mergeMCPServer sets mcpServers[name] in a JSON config, keeping every other
// key exactly as it was. Key order is not preserved.
func mergeMCPServer(path, name string, entry any) error {
	path, raw, perm, err := readConfig(path)
	if err != nil {
		return err
	}
	doc := map[string]json.RawMessage{}
	if len(bytes.TrimSpace(raw)) > 0 {
		if err := json.Unmarshal(raw, &doc); err != nil {
			return fmt.Errorf("%s is not valid JSON: %w", path, err)
		}
	}
	servers := map[string]json.RawMessage{}
	if v, ok := doc["mcpServers"]; ok {
		if err := json.Unmarshal(v, &servers); err != nil {
			return fmt.Errorf("mcpServers in %s is not an object: %w", path, err)
		}
	}
	if servers[name], err = json.Marshal(entry); err != nil {
		return err
	}
	if doc["mcpServers"], err = json.Marshal(servers); err != nil {
		return err
	}
	out, err := json.MarshalIndent(doc, "", "  ")
	if err != nil {
		return err
	}
	return writeConfig(path, raw, append(out, '\n'), perm)
}

// codexHasServer reports whether the TOML text has a [mcp_servers.<name>] table.
func codexHasServer(text, name string) bool {
	header := "[mcp_servers." + name + "]"
	for _, line := range strings.Split(text, "\n") {
		if strings.TrimSpace(line) == header {
			return true
		}
	}
	return false
}

// mergeCodexServer sets the [mcp_servers.<name>] table in Codex's config.toml
// as plain text, keeping every other line.
//
// shortcut: line based, not a TOML parser; it misses a quoted key like
// [mcp_servers."rolboard"] and would misread a multi-line string containing a
// header-looking line. Upgrade to a TOML dependency if either shows up.
func mergeCodexServer(path, name, exe string) error {
	path, raw, perm, err := readConfig(path)
	if err != nil {
		return err
	}
	header := "[mcp_servers." + name + "]"
	var kept []string
	skipping := false
	for _, line := range strings.Split(string(raw), "\n") {
		trimmed := strings.TrimSpace(line)
		switch {
		case trimmed == header || strings.HasPrefix(trimmed, "[mcp_servers."+name+"."):
			skipping = true
		case strings.HasPrefix(trimmed, "["):
			skipping = false
		}
		if !skipping {
			kept = append(kept, line)
		}
	}
	text := strings.TrimRight(strings.Join(kept, "\n"), "\r\n\t ")
	if text != "" {
		text += "\n\n"
	}
	text += header + "\ncommand = " + strconv.Quote(exe) + "\nargs = [\"mcp\"]\n"
	return writeConfig(path, raw, []byte(text), perm)
}

// readConfig resolves symlinks (a dotfiles setup keeps the real file elsewhere
// and replacing the link would break it) and reads the file. A missing file is
// not an error: raw comes back empty.
func readConfig(path string) (resolved string, raw []byte, perm fs.FileMode, err error) {
	if r, err := filepath.EvalSymlinks(path); err == nil {
		path = r
	}
	perm = 0o644
	if info, err := os.Stat(path); err == nil {
		perm = info.Mode().Perm()
	}
	raw, err = os.ReadFile(path)
	if errors.Is(err, fs.ErrNotExist) {
		return path, nil, perm, nil
	}
	return path, raw, perm, err
}

// writeConfig saves data atomically. The first time it touches a file it keeps
// the original next to it as <path>.rolboard.bak and never overwrites that copy.
func writeConfig(path string, original, data []byte, perm fs.FileMode) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	if len(original) > 0 {
		backup := path + ".rolboard.bak"
		if _, err := os.Stat(backup); errors.Is(err, fs.ErrNotExist) {
			if err := os.WriteFile(backup, original, perm); err != nil {
				return err
			}
		}
	}
	tmp := path + ".rolboard.tmp"
	if err := os.WriteFile(tmp, data, perm); err != nil {
		return err
	}
	if err := os.Rename(tmp, path); err != nil {
		_ = os.Remove(tmp)
		return err
	}
	return nil
}
