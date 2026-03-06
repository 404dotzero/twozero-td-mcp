# twozero TD MCP

MCP server for TouchDesigner, running inside the [twozero plugin](https://www.404zero.com/twozero).

## Requirements

- TouchDesigner `2025.32280+`
- twozero plugin installed in TD
- For best TD results: use `Claude 4.6+` or `GPT-5.3+`

## Quickstart

1. Drop `twozero.tox` into TouchDesigner: [https://www.404zero.com/pisang/twozero.tox](https://www.404zero.com/pisang/twozero.tox) -> Install
2. Prompt your agent (Cursor/Codex/Claude):
   - `Add twozero TD MCP for me with server key "twozero_td" and URL "http://localhost:40404/mcp". Configure it globally (user scope) so it is available from any project/workspace.`
2. Or manually:

## Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "twozero_td": {
      "url": "http://localhost:40404/mcp"
    }
  }
}
```

Reload Cursor window.

## Codex

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.twozero_td]
url = "http://127.0.0.1:40404/mcp"
```

Restart Codex app/session.

## Claude Code

```bash
claude mcp add --transport http --scope user twozero_td http://localhost:40404/mcp
```

Check:

```bash
claude mcp list
```

## Notes

- Base port is controlled by twozero setting `MCP default port`.
- Multi-instance TD behavior is automatic: configure only one MCP URL in your client (`http://localhost:<MCP default port>/mcp`). Do not add separate client entries for each TD instance; twozero handles additional instance ports internally.
