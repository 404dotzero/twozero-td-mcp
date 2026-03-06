"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const MCP_SERVER_KEY = 'twozero_td';
const MCP_ENTRY = { url: 'http://localhost:40404/mcp' };
function getCursorConfigPath() {
    return path.join(os.homedir(), '.cursor', 'mcp.json');
}
function ensureMcpConfig() {
    const configPath = getCursorConfigPath();
    const configDir = path.dirname(configPath);
    try {
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        let config;
        if (fs.existsSync(configPath)) {
            const raw = fs.readFileSync(configPath, 'utf-8');
            config = JSON.parse(raw);
            if (!config.mcpServers) {
                config.mcpServers = {};
            }
        }
        else {
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
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { changed: false, error: msg };
    }
}
function activate(context) {
    const result = ensureMcpConfig();
    if (result.error) {
        vscode.window.showErrorMessage(`twozero MCP: Failed to configure â€” ${result.error}`);
    }
    else if (result.changed) {
        vscode.window.showInformationMessage('twozero MCP: TouchDesigner MCP server added to Cursor config. Reload to connect.');
    }
    const cmd = vscode.commands.registerCommand('twozero-mcp.setup', () => {
        const r = ensureMcpConfig();
        if (r.error) {
            vscode.window.showErrorMessage(`twozero MCP: ${r.error}`);
        }
        else if (r.changed) {
            vscode.window.showInformationMessage('twozero MCP: Connection configured. Reload to connect.');
        }
        else {
            vscode.window.showInformationMessage('twozero MCP: Already configured.');
        }
    });
    context.subscriptions.push(cmd);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map