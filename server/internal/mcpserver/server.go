package mcpserver

import (
	"context"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// Run serves the MCP protocol over stdin/stdout until the client disconnects.
// stdout belongs to the protocol: log to stderr only.
func Run(ctx context.Context, cfg Config) error {
	api, err := newAPIClient(cfg)
	if err != nil {
		return err
	}
	return newServer(api, cfg.Version).Run(ctx, &mcp.StdioTransport{})
}

// newServer is split from Run so tests can connect it to in-memory transports.
func newServer(api *apiClient, version string) *mcp.Server {
	s := mcp.NewServer(&mcp.Implementation{Name: "rolboard", Version: version}, nil)
	registerReadTools(s, api)
	registerSearch(s, api)
	registerWriteTools(s, api)
	return s
}
