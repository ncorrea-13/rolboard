package vault

import (
	"bytes"
	"fmt"
)

var frontmatterDelimiter = []byte("---")

func Split(content []byte) (frontmatter []byte, body []byte, err error) {
	rest := bytes.TrimLeft(content, "\ufeff \t\r\n")
	line, rest, ok := cutLine(rest)
	if !ok || !isDelimiter(line) {
		return nil, content, fmt.Errorf("no frontmatter found")
	}

	var fm []byte
	for len(rest) > 0 {
		line, next, _ := cutLine(rest)
		if isDelimiter(line) {
			return fm, bytes.TrimSpace(next), nil
		}
		fm = append(fm, rest[:len(rest)-len(next)]...)
		rest = next
	}
	return nil, content, fmt.Errorf("no frontmatter found")
}

func cutLine(b []byte) (line, rest []byte, found bool) {
	i := bytes.IndexByte(b, '\n')
	if i < 0 {
		return b, nil, len(b) > 0
	}
	return b[:i], b[i+1:], true
}

func isDelimiter(line []byte) bool {
	return bytes.Equal(bytes.TrimRight(line, " \t\r"), frontmatterDelimiter)
}
