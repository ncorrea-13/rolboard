package desktop

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func write(t *testing.T, path, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
}

func read(t *testing.T, path string) string {
	t.Helper()
	b, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	return string(b)
}

func TestMergeMCPServerCreatesTheFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "new", "cfg.json")
	if err := mergeMCPServer(path, "rolboard", map[string]any{"command": "/x/rolboard", "args": []string{"mcp"}}); err != nil {
		t.Fatal(err)
	}
	var doc struct {
		Servers map[string]struct {
			Command string   `json:"command"`
			Args    []string `json:"args"`
		} `json:"mcpServers"`
	}
	if err := json.Unmarshal([]byte(read(t, path)), &doc); err != nil {
		t.Fatal(err)
	}
	if got := doc.Servers["rolboard"]; got.Command != "/x/rolboard" || len(got.Args) != 1 || got.Args[0] != "mcp" {
		t.Errorf("unexpected entry: %+v", got)
	}
}

func TestMergeMCPServerKeepsEverythingElse(t *testing.T) {
	path := filepath.Join(t.TempDir(), "cfg.json")
	write(t, path, `{
  "theme": "dark",
  "bigNumber": 12345678901234567890,
  "mcpServers": {
    "other": {"command": "npx", "args": ["-y", "thing"], "env": {"TOKEN": "secret"}},
    "rolboard": {"command": "/old/rolboard", "args": ["mcp"]}
  }
}`)
	if err := mergeMCPServer(path, "rolboard", map[string]any{"command": "/new/rolboard", "args": []string{"mcp"}}); err != nil {
		t.Fatal(err)
	}
	got := read(t, path)
	for _, want := range []string{`"theme": "dark"`, `12345678901234567890`, `"TOKEN": "secret"`, `"command": "npx"`, `/new/rolboard`} {
		if !strings.Contains(got, want) {
			t.Errorf("lost %q:\n%s", want, got)
		}
	}
	if strings.Contains(got, "/old/rolboard") {
		t.Errorf("the old entry should be replaced:\n%s", got)
	}
	if n := strings.Count(got, `"rolboard"`); n != 1 {
		t.Errorf("expected one rolboard entry, got %d:\n%s", n, got)
	}
}

func TestMergeMCPServerRefusesInvalidJSONAndLeavesTheFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "cfg.json")
	write(t, path, `{ this is not json`)
	if err := mergeMCPServer(path, "rolboard", map[string]any{"command": "x"}); err == nil {
		t.Fatal("expected an error")
	}
	if got := read(t, path); got != `{ this is not json` {
		t.Errorf("the file must not change, got %q", got)
	}
}

func TestMergeKeepsTheFirstBackupAndThePermissions(t *testing.T) {
	path := filepath.Join(t.TempDir(), "cfg.json")
	original := `{"mcpServers": {"other": {"command": "a"}}}`
	write(t, path, original)

	for i := 0; i < 2; i++ {
		if err := mergeMCPServer(path, "rolboard", map[string]any{"command": "x"}); err != nil {
			t.Fatal(err)
		}
	}
	if got := read(t, path+".rolboard.bak"); got != original {
		t.Errorf("the backup must keep the original, got %q", got)
	}
	if runtime.GOOS != "windows" {
		if info, _ := os.Stat(path); info.Mode().Perm() != 0o600 {
			t.Errorf("permissions changed to %o", info.Mode().Perm())
		}
	}
}

func TestMergeWritesThroughASymlink(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("symlinks need privileges on Windows")
	}
	dir := t.TempDir()
	target := filepath.Join(dir, "dotfiles", "cfg.json")
	link := filepath.Join(dir, "cfg.json")
	write(t, target, `{}`)
	if err := os.Symlink(target, link); err != nil {
		t.Fatal(err)
	}
	if err := mergeMCPServer(link, "rolboard", map[string]any{"command": "x"}); err != nil {
		t.Fatal(err)
	}
	if info, err := os.Lstat(link); err != nil || info.Mode()&os.ModeSymlink == 0 {
		t.Errorf("the link must stay a link: %v %v", info, err)
	}
	if !strings.Contains(read(t, target), "rolboard") {
		t.Error("the real file should have the entry")
	}
}

func TestMergeCodexServer(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.toml")
	write(t, path, `model = "gpt"

# my notes
[mcp_servers.other]
command = "npx"

[mcp_servers.rolboard]
command = "/old"
args = ["mcp"]

[mcp_servers.rolboard.env]
KEY = "v"

[projects."/home/x"]
trust = "trusted"
`)
	for i := 0; i < 2; i++ { // twice: it must not duplicate
		if err := mergeCodexServer(path, "rolboard", `C:\Apps\rolboard.exe`); err != nil {
			t.Fatal(err)
		}
	}
	got := read(t, path)
	for _, want := range []string{`model = "gpt"`, "# my notes", "[mcp_servers.other]", `command = "npx"`, `[projects."/home/x"]`, `command = "C:\\Apps\\rolboard.exe"`} {
		if !strings.Contains(got, want) {
			t.Errorf("lost %q:\n%s", want, got)
		}
	}
	for _, gone := range []string{`"/old"`, "rolboard.env", `KEY = "v"`} {
		if strings.Contains(got, gone) {
			t.Errorf("should have been replaced: %q\n%s", gone, got)
		}
	}
	if n := strings.Count(got, "[mcp_servers.rolboard]"); n != 1 {
		t.Errorf("expected one block, got %d:\n%s", n, got)
	}
}

func TestClientStatusAndConnect(t *testing.T) {
	cfg, home := t.TempDir(), t.TempDir()
	clients := ClientsAt(cfg, home)
	claude, _ := FindClient(clients, "claude-desktop")
	codex, _ := FindClient(clients, "codex")

	if st := claude.Status(); st.Installed || st.Connected {
		t.Errorf("nothing exists yet: %+v", st)
	}
	if err := claude.Connect("/x/rolboard"); !errors.Is(err, ErrClientNotInstalled) {
		t.Errorf("connecting a client that is not installed should fail, got %v", err)
	}

	if err := os.MkdirAll(filepath.Join(cfg, "Claude"), 0o755); err != nil {
		t.Fatal(err)
	}
	if st := claude.Status(); !st.Installed || st.Connected {
		t.Errorf("installed but not connected: %+v", st)
	}
	if err := claude.Connect("/x/rolboard"); err != nil {
		t.Fatal(err)
	}
	if st := claude.Status(); !st.Installed || !st.Connected {
		t.Errorf("should be connected: %+v", st)
	}

	if err := os.MkdirAll(filepath.Join(home, ".codex"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := codex.Connect("/x/rolboard"); err != nil {
		t.Fatal(err)
	}
	if st := codex.Status(); !st.Connected {
		t.Errorf("codex should be connected: %+v", st)
	}

	if _, err := FindClient(clients, "nope"); !errors.Is(err, ErrUnknownClient) {
		t.Errorf("expected ErrUnknownClient, got %v", err)
	}
}

func TestClaudeCodeKeepsItsOwnConfig(t *testing.T) {
	cfg, home := t.TempDir(), t.TempDir()
	write(t, filepath.Join(home, ".claude.json"), `{"numStartups": 7, "mcpServers": {"other": {"command": "x"}}}`)
	write(t, filepath.Join(home, ".claude", "settings.json"), `{}`)
	code, err := FindClient(ClientsAt(cfg, home), "claude-code")
	if err != nil {
		t.Fatal(err)
	}
	if st := code.Status(); !st.Installed || st.Connected {
		t.Fatalf("before connect: %+v", st)
	}
	if err := code.Connect("/x/rolboard"); err != nil {
		t.Fatal(err)
	}
	if st := code.Status(); !st.Connected {
		t.Errorf("not connected after Connect: %+v", st)
	}
	got := read(t, filepath.Join(home, ".claude.json"))
	for _, want := range []string{`"numStartups": 7`, `"other"`, `"/x/rolboard"`} {
		if !strings.Contains(got, want) {
			t.Errorf("missing %s in:\n%s", want, got)
		}
	}
}
