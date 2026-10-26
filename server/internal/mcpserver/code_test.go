package mcpserver

import (
	"context"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestLoginSavesAnAcceptedCodePrivately(t *testing.T) {
	url, id := startTestServer(t)
	path := filepath.Join(t.TempDir(), "sub", "mcp.code")

	if err := Login(context.Background(), url, id, testAccessCode, path); err != nil {
		t.Fatal(err)
	}
	got, err := ReadCode(path)
	if err != nil || got != testAccessCode {
		t.Fatalf("ReadCode = %q, %v", got, err)
	}
	if runtime.GOOS != "windows" {
		info, _ := os.Stat(path)
		if info.Mode().Perm() != 0o600 {
			t.Errorf("code file mode = %v, want 0600", info.Mode().Perm())
		}
	}
}

func TestLoginRejectsAWrongCodeAndSavesNothing(t *testing.T) {
	url, id := startTestServer(t)
	path := filepath.Join(t.TempDir(), "mcp.code")

	err := Login(context.Background(), url, id, "wrong-code-0000", path)
	if err == nil {
		t.Fatal("expected an error")
	}
	if strings.Contains(err.Error(), "wrong-code-0000") {
		t.Errorf("error leaks the access code: %v", err)
	}
	if _, statErr := os.Stat(path); statErr == nil {
		t.Error("a rejected code was saved")
	}
}

func TestCodePathIsPerCampaign(t *testing.T) {
	a, err := CodePath(1)
	if err != nil {
		t.Fatal(err)
	}
	b, _ := CodePath(2)
	if a == b || !strings.HasSuffix(a, "mcp-1.code") {
		t.Errorf("unexpected paths: %s, %s", a, b)
	}
}
