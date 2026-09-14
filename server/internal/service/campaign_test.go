package service

import "testing"

func TestSafeVaultPath(t *testing.T) {
	cases := []struct {
		path string
		want bool
	}{
		{"my-vault", true},
		{"nested/vault", true},
		{"", false},
		{"..", false},
		{"../etc", false},
		{"../../etc/passwd", false},
		{"/etc/passwd", false},
		{"foo/../../bar", false},
		{".", false},
	}
	for _, c := range cases {
		if got := safeVaultPath(c.path); got != c.want {
			t.Errorf("safeVaultPath(%q) = %v, want %v", c.path, got, c.want)
		}
	}
}
