package mcpserver

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

func CodePath(campaign int64) (string, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "rolboard", "mcp-"+strconv.FormatInt(campaign, 10)+".code"), nil
}

func ReadCode(path string) (string, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(raw)), nil
}

// Login checks the access code against the server and, only if it is
// accepted, saves it at path (0600 inside a 0700 dir).
//
// shortcut: Windows ignores those modes; the file is private through the ACL
// of the user profile folder. Tighten the ACL if that proves not to be enough.
func Login(ctx context.Context, baseURL string, campaign int64, code, path string) error {
	api, err := newAPIClient(Config{BaseURL: baseURL, CampaignID: campaign, AccessCode: code})
	if err != nil {
		return err
	}
	if err := api.login(ctx); err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return err
	}
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, []byte(code+"\n"), 0o600); err != nil {
		return err
	}
	if err := os.Rename(tmp, path); err != nil {
		_ = os.Remove(tmp)
		return fmt.Errorf("saving the access code: %w", err)
	}
	return nil
}
