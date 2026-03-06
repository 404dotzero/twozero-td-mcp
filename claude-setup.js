#!/usr/bin/env node
/**
 * Claude Code MCP setup for TouchDesigner
 * Adds twozero_td MCP server to ~/.claude.json (local project scope)
 *
 * Usage: node claude-setup.js
 *    or: chmod +x claude-setup.js && ./claude-setup.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const SERVER_KEY = 'twozero_td';
const SERVER_URL = 'http://localhost:40404/mcp';

function setup() {
  // Try using the claude CLI first (preferred)
  try {
    execSync(`claude mcp add --transport http ${SERVER_KEY} ${SERVER_URL}`, {
      stdio: 'pipe',
    });
    console.log(`âœ“ Added ${SERVER_KEY} to Claude Code via CLI`);
    console.log(`  URL: ${SERVER_URL}`);
    return;
  } catch (e) {
    // claude CLI not found or failed â€” fall back to direct file edit
  }

  // Fallback: edit ~/.claude.json directly
  const configPath = path.join(os.homedir(), '.claude.json');

  let config = {};
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch {
      console.error('âœ— Failed to parse ~/.claude.json');
      process.exit(1);
    }
  }

  // Navigate to the mcpServers section
  if (!config.mcpServers) config.mcpServers = {};

  if (config.mcpServers[SERVER_KEY]) {
    console.log(`âœ“ ${SERVER_KEY} already configured in ~/.claude.json`);
    return;
  }

  config.mcpServers = {
    [SERVER_KEY]: { type: 'http', url: SERVER_URL },
    ...config.mcpServers,
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  console.log(`âœ“ Added ${SERVER_KEY} to ~/.claude.json`);
  console.log(`  URL: ${SERVER_URL}`);
  console.log('  Restart Claude Code to connect.');
}

setup();


