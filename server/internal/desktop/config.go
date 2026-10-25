package desktop

import (
	"encoding/json"
	"os"
	"path/filepath"
)

type Config struct {
	VaultsRoot string `json:"vaultsRoot"`
	SyncDir    string `json:"syncDir,omitempty"`
	LastSync   string `json:"lastSync,omitempty"`
	MCPEnabled bool   `json:"mcpEnabled,omitempty"`
}

func Dir() (string, error) {
	base, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(base, "rolboard"), nil
}

func DBPath(dir string) string {
	return filepath.Join(dir, "rolboard.db")
}

// SocketPath is where the app listens for MCP clients while agents are enabled.
func SocketPath(dir string) string {
	return filepath.Join(dir, "mcp.sock")
}

func UploadsDir(dir string) string {
	return filepath.Join(dir, "uploads")
}

func Load(dir string) (Config, error) {
	var cfg Config
	data, err := os.ReadFile(filepath.Join(dir, "config.json"))
	if err != nil {
		return cfg, err
	}
	err = json.Unmarshal(data, &cfg)
	return cfg, err
}

func Save(dir string, cfg Config) error {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	tmp := filepath.Join(dir, "config.json.tmp")
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, filepath.Join(dir, "config.json"))
}
