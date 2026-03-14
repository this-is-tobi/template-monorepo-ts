# MCP Server

The `tmts-mcp` MCP server exposes the template-monorepo-ts API as [Model Context Protocol](https://modelcontextprotocol.io/) tools, enabling LLMs and AI assistants to interact with the API programmatically.

It is published as the `@template-monorepo-ts/mcp` workspace package and produces two build artefacts:

- **Node module** (`dist/index.js`) — usable as `bun run dist/index.js` and used in the Docker image
- **Self-contained binary** (`bin/tmts-mcp`) — zero-dependency native executable built with `bun build --compile`, convenient for local distribution

## Installation

### From source

```sh
# Build the binary
cd packages/mcp
bun run build

# Add to PATH (example)
cp bin/tmts-mcp ~/.local/bin/tmts-mcp
```

### Via Docker

```sh
docker pull ghcr.io/this-is-tobi/template-monorepo-ts/mcp:latest
```

## Configuration

The MCP server is configured exclusively via environment variables:

| Variable          | Required | Default   | Description                                        |
| ----------------- | :------: | --------- | -------------------------------------------------- |
| `TMTS_SERVER_URL` |    ✓     | —         | Base URL of the API server                         |
| `TMTS_TOKEN`      |          | —         | Bearer token for session-based auth                |
| `TMTS_API_KEY`    |          | —         | API key for key-based auth                         |
| `TMTS_TRANSPORT`  |          | `stdio`   | Transport mode: `stdio` or `http`                  |
| `TMTS_HTTP_HOST`  |          | `0.0.0.0` | HTTP listen host (only when `TMTS_TRANSPORT=http`) |
| `TMTS_HTTP_PORT`  |          | `3100`    | HTTP listen port (only when `TMTS_TRANSPORT=http`) |

When both `TMTS_TOKEN` and `TMTS_API_KEY` are set, the bearer token takes priority.

## Transport modes

### stdio (default)

The MCP server communicates via standard input/output. This is the recommended mode for **local IDE integrations** (VS Code, Cursor, Claude Desktop, etc.).

```sh
TMTS_SERVER_URL=http://localhost:8081 TMTS_API_KEY=your-key tmts-mcp
```

### HTTP (Streamable HTTP)

When `TMTS_TRANSPORT=http`, the server starts a Bun HTTP server exposing the [MCP Streamable HTTP transport](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http).

```sh
TMTS_TRANSPORT=http \
TMTS_SERVER_URL=http://localhost:8081 \
TMTS_API_KEY=your-key \
tmts-mcp
```

**Endpoints:**

| Method | Path       | Auth     | Description                     |
| ------ | ---------- | -------- | ------------------------------- |
| `GET`  | `/healthz` | No       | Health check (returns `200 OK`) |
| `POST` | `/mcp`     | Required | MCP Streamable HTTP endpoint    |

**Architecture:**

- **Stateless** — each `POST /mcp` request creates a fresh `McpServer` + `WebStandardStreamableHTTPServerTransport` with `sessionIdGenerator: undefined`. No sticky sessions, no shared state.
- **Per-request auth** — every request is validated against the upstream API using `Bearer <token>` or `X-Api-Key` headers. The caller's credentials are forwarded to create a scoped API client.
- **Horizontally scalable** — deploy multiple replicas behind any load balancer without affinity rules.
- **Bun.serve** — uses the native Bun HTTP server with the SDK's `WebStandardStreamableHTTPServerTransport` for optimal performance.

## Usage with AI assistants

### VS Code / GitHub Copilot (stdio)

Add the following to your `.vscode/mcp.json`:

```json
{
  "servers": {
    "tmts": {
      "command": "tmts-mcp",
      "env": {
        "TMTS_SERVER_URL": "http://localhost:8081",
        "TMTS_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Claude Desktop (stdio)

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "tmts": {
      "command": "tmts-mcp",
      "env": {
        "TMTS_SERVER_URL": "http://localhost:8081",
        "TMTS_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Docker (stdio)

```sh
docker run --rm -i \
  -e TMTS_SERVER_URL=http://host.docker.internal:8081 \
  -e TMTS_API_KEY=your-api-key \
  ghcr.io/this-is-tobi/template-monorepo-ts/mcp:latest
```

### Docker (HTTP)

```sh
docker run --rm -p 3100:3100 \
  -e TMTS_TRANSPORT=http \
  -e TMTS_SERVER_URL=http://host.docker.internal:8081 \
  -e TMTS_API_KEY=your-api-key \
  ghcr.io/this-is-tobi/template-monorepo-ts/mcp:latest
```

### Kubernetes (HTTP)

The Helm chart includes a full set of MCP templates. Configure via `mcp.*` values:

```yaml
mcp:
  image:
    repository: ghcr.io/this-is-tobi/template-monorepo-ts/mcp
    tag: latest
  envCm:
    TMTS_TRANSPORT: http
    TMTS_HTTP_PORT: "3100"
    TMTS_SERVER_URL: "http://template-monorepo-ts-api:80"
  envSecret:
    TMTS_API_KEY: your-api-key
```

See `helm/values.yaml` → `mcp:` section for the full list of available values (replicas, autoscaling, ingress, HTTPRoute, PDB, NetworkPolicy, metrics, etc.).

## Available tools

### Projects

| Tool             | Description                                        | Annotations |
| ---------------- | -------------------------------------------------- | ----------- |
| `list-projects`  | Retrieve all projects accessible to the user       | readOnly    |
| `get-project`    | Retrieve a single project by UUID                  | readOnly    |
| `create-project` | Create a new project (name + optional description) | —           |
| `update-project` | Update an existing project by UUID                 | idempotent  |
| `delete-project` | Permanently delete a project by UUID               | destructive |

### Auth

| Tool     | Description                                     | Annotations |
| -------- | ----------------------------------------------- | ----------- |
| `whoami` | Retrieve the current authenticated user session | readOnly    |

### System

| Tool          | Description                     | Annotations |
| ------------- | ------------------------------- | ----------- |
| `get-version` | Retrieve the API server version | readOnly    |
| `get-health`  | Check the API server health     | readOnly    |
| `get-ready`   | Check the API server readiness  | readOnly    |
| `get-live`    | Check the API server liveness   | readOnly    |
