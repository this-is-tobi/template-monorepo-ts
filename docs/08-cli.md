# CLI

The `tmts` CLI provides a command-line interface for interacting with the API server. It is published as the `@template-monorepo-ts/cli` workspace package and produces two build artefacts:

- **Node module** (`dist/index.js`) — usable as `bun run dist/index.js`
- **Self-contained binary** (`bin/tmts`) — zero-dependency native executable built with `bun build --compile`

## Installation

### From source

```sh
# Build the binary
cd packages/cli
bun run build

# Add to PATH (example)
cp bin/tmts ~/.local/bin/tmts
```

### Via bun link (monorepo development)

```sh
bun link @template-monorepo-ts/cli
```

## Configuration

`tmts` resolves its configuration from three sources, in priority order (highest wins):

1. **CLI flags** — `--server`, `--token`, `--key`, `--output`
2. **Environment variables** — `TMTS_SERVER_URL`, `TMTS_TOKEN`, `TMTS_API_KEY`, `TMTS_OUTPUT`
3. **Config file** — `~/.config/tmts/config.json`

The server URL is required for every command. If it cannot be resolved from any source, the CLI exits with an error message.

### Config file

The config file is stored at `~/.config/tmts/config.json` and contains the following keys:

| Key         | Type                  | Description                      |
| ----------- | --------------------- | -------------------------------- |
| `serverUrl` | `string`              | API server base URL              |
| `token`     | `string`              | Bearer token (from `auth login`) |
| `apiKey`    | `string`              | API key alternative to token     |
| `output`    | `"table"` \| `"json"` | Default output format            |

### Quick setup

```sh
# Point the CLI at your running API instance
tmts config set serverUrl http://localhost:3000

# Authenticate
tmts auth login --email admin@example.com --password secret
```

## Global flags

These flags are accepted by every command and override environment variables and the config file.

| Flag       | Env var           | Description                                |
| ---------- | ----------------- | ------------------------------------------ |
| `--server` | `TMTS_SERVER_URL` | API server URL                             |
| `--token`  | `TMTS_TOKEN`      | Bearer token for authentication            |
| `--key`    | `TMTS_API_KEY`    | API key for authentication                 |
| `--output` | `TMTS_OUTPUT`     | Output format: `table` (default) or `json` |

## Output formats

All commands support two output formats controlled by `--output`:

- **`table`** *(default)* — human-readable tabular output
- **`json`** — machine-readable JSON, useful for piping into `jq` or scripts

```sh
tmts projects list --output json | jq '.[].name'
```

---

## Command reference

### `tmts system`

Commands that query the API server's operational status.

```sh
tmts system <subcommand> [flags]
```

| Subcommand | Description                 |
| ---------- | --------------------------- |
| `version`  | Show the API server version |
| `health`   | Check API server health     |
| `ready`    | Check API server readiness  |
| `live`     | Check API server liveness   |

**Examples**

```sh
tmts system version
tmts system health
tmts system ready --output json
```

---

### `tmts auth`

Commands for authenticating with the API server.

```sh
tmts auth <subcommand> [flags]
```

| Subcommand | Description                                   |
| ---------- | --------------------------------------------- |
| `login`    | Login with email/password or store an API key |
| `logout`   | Clear stored credentials from config          |
| `whoami`   | Show the currently authenticated user         |

#### `tmts auth login`

```sh
tmts auth login [--email <email>] [--password <password>] [--key <api-key>]
```

Two authentication modes are supported:

- **Email/password** — exchanges credentials for a bearer token via BetterAuth, then saves the token to the config file.
- **API key** (`--key`) — stores the provided API key in the config file directly (no network request needed).

**Examples**

```sh
# Interactive login (saves bearer token)
tmts auth login --email admin@example.com --password secret

# Store an API key
tmts auth login --key sk_live_abc123
```

#### `tmts auth logout`

Removes `token` and `apiKey` from the config file.

```sh
tmts auth logout
```

#### `tmts auth whoami`

Calls the API's `GET /session` endpoint and prints the current session.

```sh
tmts auth whoami
tmts auth whoami --output json
```

---

### `tmts projects`

CRUD commands for managing projects.

```sh
tmts projects <subcommand> [flags]
```

| Subcommand | Description                |
| ---------- | -------------------------- |
| `list`     | List all projects          |
| `get`      | Get a project by ID        |
| `create`   | Create a new project       |
| `update`   | Update an existing project |
| `delete`   | Delete a project           |

#### `tmts projects list`

```sh
tmts projects list [--output json]
```

#### `tmts projects get <id>`

```sh
tmts projects get 01J9Z3H2X5K7M8N4P6Q0R1S2T3
```

#### `tmts projects create`

```sh
tmts projects create --name <name> [--description <description>]
```

```sh
tmts projects create --name "My Project" --description "A sample project"
```

#### `tmts projects update <id>`

```sh
tmts projects update <id> [--name <name>] [--description <description>]
```

```sh
tmts projects update 01J9Z3H2X5K7M8N4P6Q0R1S2T3 --name "Renamed"
```

#### `tmts projects delete <id>`

```sh
tmts projects delete 01J9Z3H2X5K7M8N4P6Q0R1S2T3
```

---

### `tmts config`

Commands for reading and writing the local CLI config file (`~/.config/tmts/config.json`).

```sh
tmts config <subcommand>
```

| Subcommand          | Description                     |
| ------------------- | ------------------------------- |
| `set <key> <value>` | Set a config key to a value     |
| `get <key>`         | Print the value of a config key |
| `list`              | List all config keys and values |
| `delete <key>`      | Remove a config key             |

Valid keys: `serverUrl`, `token`, `apiKey`, `output`.

> Token and API key values are truncated (first 8 characters + `...`) when listed for security.

**Examples**

```sh
# Initial setup
tmts config set serverUrl https://api.example.com
tmts config set output json

# Inspect
tmts config list
tmts config get serverUrl

# Remove a stored token
tmts config delete token
```
