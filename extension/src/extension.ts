import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const MCP_SERVER_KEY = 'twozero_td';
const MCP_ENTRY = { url: 'http://localhost:40404/mcp' };

function getCursorConfigPath(): string {
	return path.join(os.homedir(), '.cursor', 'mcp.json');
}

function ensureMcpConfig(): { changed: boolean; error?: string } {
	const configPath = getCursorConfigPath();
	const configDir = path.dirname(configPath);

	try {
		if (!fs.existsSync(configDir)) {
			fs.mkdirSync(configDir, { recursive: true });
		}

		let config: { mcpServers: Record<string, unknown> };

		if (fs.existsSync(configPath)) {
			const raw = fs.readFileSync(configPath, 'utf-8');
			config = JSON.parse(raw);
			if (!config.mcpServers) {
				config.mcpServers = {};
			}
		} else {
			config = { mcpServers: {} };
		}

		if (config.mcpServers[MCP_SERVER_KEY]) {
			return { changed: false };
		}

		config.mcpServers = {
			[MCP_SERVER_KEY]: MCP_ENTRY,
			...config.mcpServers,
		};

		fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
		return { changed: true };
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : String(e);
		return { changed: false, error: msg };
	}
}

export function activate(context: vscode.ExtensionContext) {
	const result = ensureMcpConfig();

	if (result.error) {
		vscode.window.showErrorMessage(`twozero MCP: Failed to configure â€” ${result.error}`);
	} else if (result.changed) {
		vscode.window.showInformationMessage(
			'twozero MCP: TouchDesigner MCP server added to Cursor config. Reload to connect.'
		);
	}

	const cmd = vscode.commands.registerCommand('twozero-mcp.setup', () => {
		const r = ensureMcpConfig();
		if (r.error) {
			vscode.window.showErrorMessage(`twozero MCP: ${r.error}`);
		} else if (r.changed) {
			vscode.window.showInformationMessage('twozero MCP: Connection configured. Reload to connect.');
		} else {
			vscode.window.showInformationMessage('twozero MCP: Already configured.');
		}
	});

	context.subscriptions.push(cmd);
}

export function deactivate() {}


