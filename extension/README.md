# twozero MCP (Cursor Extension)

Cursor extension that adds TouchDesigner MCP connection for twozero.

## Requirements

- TouchDesigner `2025.32280+`
- twozero plugin: [https://www.404zero.com/twozero](https://www.404zero.com/twozero)
- For best TD results: `Claude 4.6+` or `GPT-5.3+`

## Quickstart

1. Install twozero in TD from tox:
   - [https://www.404zero.com/pisang/twozero.tox](https://www.404zero.com/pisang/twozero.tox) -> Install
2. Install this VSIX in Cursor.
3. Reload Cursor.

The extension writes:

```json
{
  "mcpServers": {
    "twozero_td": {
      "url": "http://localhost:40404/mcp"
    }
  }
}
```

## Manual setup (without extension)

### Cursor

`~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "twozero_td": {
      "url": "http://localhost:40404/mcp"
    }
  }
}
```

### Codex

`~/.codex/config.toml`:

```toml
[mcp_servers.twozero_td]
url = "http://127.0.0.1:40404/mcp"
```

### Claude Code

```bash
claude mcp add --transport http --scope user twozero_td http://localhost:40404/mcp
```

## Build

```bash
npm install
npm run compile
npx @vscode/vsce package --allow-missing-repository
```
