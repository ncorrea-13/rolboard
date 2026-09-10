package service

import "testing"

func TestSafeVaultRelPath(t *testing.T) {
	cases := []struct {
		path string
		ok   bool
	}{
		{"NPCs/Velen.md", true},
		{"Arcos/Arco 1.md", true},
		{"../../etc/passwd", false},
		{"../secret.md", false},
		{"/etc/passwd", false},
		{"..", false},
		{"NPCs/Velen.png", false},
		{"NPCs/../../secret.md", false},
	}
	for _, c := range cases {
		_, ok := safeVaultRelPath(c.path)
		if ok != c.ok {
			t.Errorf("safeVaultRelPath(%q) ok = %v, want %v", c.path, ok, c.ok)
		}
	}
}
