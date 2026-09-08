package vault

import (
	"bytes"
	"fmt"
)

var frontmatterDelimiter = []byte("---")

func Split(content []byte) (frontmatter []byte, body []byte, err error) {
	parts := bytes.SplitN(content, frontmatterDelimiter, 3)
	if len(parts) < 3 {
		return nil, content, fmt.Errorf("no frontmatter found")
	}

	body = bytes.TrimSpace(parts[2])
	return parts[1], body, nil
}
