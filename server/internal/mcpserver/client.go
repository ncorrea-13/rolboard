// Package mcpserver exposes a Rolboard campaign to MCP clients over stdio,
// acting as one more client of the REST API.
package mcpserver

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/cookiejar"
	"strings"
	"sync"
	"time"
)

// Config selects how the API is reached: over TCP with a campaign login
// (BaseURL, CampaignID, AccessCode) or through the desktop app's unix socket
// (Socket), which is in local mode and needs no login.
type Config struct {
	Socket     string // unix socket of the desktop app; "" means TCP
	BaseURL    string // e.g. https://host.tailnet.ts.net
	CampaignID int64  // campaign to log into
	AccessCode string
	Version    string
}

type apiClient struct {
	http *http.Client
	cfg  Config

	loginMu sync.Mutex
}

// socketHost is a placeholder: the dialer ignores the host and uses the socket.
const socketHost = "http://rolboard"

func newAPIClient(cfg Config) (*apiClient, error) {
	if cfg.Socket != "" {
		cfg.BaseURL = socketHost
		dial := func(ctx context.Context, _, _ string) (net.Conn, error) {
			return (&net.Dialer{}).DialContext(ctx, "unix", cfg.Socket)
		}
		return &apiClient{
			http: &http.Client{Transport: &http.Transport{DialContext: dial}, Timeout: 15 * time.Second},
			cfg:  cfg,
		}, nil
	}
	if cfg.BaseURL == "" || cfg.CampaignID == 0 || cfg.AccessCode == "" {
		return nil, fmt.Errorf("faltan ROLBOARD_URL, ROLBOARD_CAMPAIGN o el access code")
	}
	jar, err := cookiejar.New(nil)
	if err != nil {
		return nil, err
	}
	cfg.BaseURL = strings.TrimRight(cfg.BaseURL, "/")
	return &apiClient{
		http: &http.Client{Jar: jar, Timeout: 15 * time.Second},
		cfg:  cfg,
	}, nil
}

// errAppClosed is what a tool reports when nothing listens on the socket.
var errAppClosed = errors.New("la app de Rolboard no está abierta, o no tiene activada la conexión de agentes (Ajustes de la app)")

// apiError is a non-2xx response from the API.
type apiError struct {
	Status int
	Code   string
	Text   string
}

func (e *apiError) Error() string {
	if e.Code != "" {
		return fmt.Sprintf("rolboard API %d %s", e.Status, e.Code)
	}
	return fmt.Sprintf("rolboard API %d: %s", e.Status, e.Text)
}

// do sends a JSON request and decodes the response into out (nil to skip).
// On 401 it logs in and retries once; it never loops, because the login
// endpoint is rate limited.
func (c *apiClient) do(ctx context.Context, method, path string, in, out any) error {
	err := c.send(ctx, method, path, in, out)
	var apiErr *apiError
	if c.cfg.Socket == "" && errors.As(err, &apiErr) && apiErr.Status == http.StatusUnauthorized {
		if err := c.login(ctx); err != nil {
			return err
		}
		return c.send(ctx, method, path, in, out)
	}
	return err
}

func (c *apiClient) send(ctx context.Context, method, path string, in, out any) error {
	var body io.Reader
	if in != nil {
		data, err := json.Marshal(in)
		if err != nil {
			return err
		}
		body = bytes.NewReader(data)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.cfg.BaseURL+path, body)
	if err != nil {
		return err
	}
	if in != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := c.http.Do(req)
	if err != nil {
		var op *net.OpError
		if c.cfg.Socket != "" && errors.As(err, &op) && op.Op == "dial" {
			return errAppClosed
		}
		return err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode >= 400 {
		raw, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		apiErr := &apiError{Status: resp.StatusCode, Text: strings.TrimSpace(string(raw))}
		var payload struct {
			Code string `json:"code"`
		}
		if json.Unmarshal(raw, &payload) == nil {
			apiErr.Code = payload.Code
		}
		return apiErr
	}
	if out == nil || resp.StatusCode == http.StatusNoContent {
		return nil
	}
	return json.NewDecoder(resp.Body).Decode(out)
}

// login stores the campaign session cookie in the client's jar. The access
// code is never logged or included in errors.
func (c *apiClient) login(ctx context.Context) error {
	c.loginMu.Lock()
	defer c.loginMu.Unlock()
	path := fmt.Sprintf("/api/campaigns/%d/login", c.cfg.CampaignID)
	if err := c.send(ctx, http.MethodPost, path, map[string]string{"code": c.cfg.AccessCode}, nil); err != nil {
		return fmt.Errorf("login: %w", err)
	}
	return nil
}
