#!/usr/bin/env node
// install-hooks.ts — Postinstall script to set up global DevMind hooks
// This runs automatically after `npm install -g @lich0821/devmind`

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { PRE_TOOL_USE_JS, POST_TOOL_USE_JS, STOP_JS } from '../templates.js';

type HookEntry = { type: string; command: string; timeout?: number };
type HookMatcher = { matcher: string; hooks: HookEntry[] };
type HooksMap = Record<string, HookMatcher[]>;
type UserSettings = { hooks?: HooksMap; [key: string]: unknown };

function installGlobalHooks(): void {
    const userSettingsPath = resolve(homedir(), '.claude', 'settings.json');
    const globalHooksDir = resolve(homedir(), '.devmind', 'hooks');

    // Global hook paths
    const preHookPath = join(globalHooksDir, 'dm-pre-tool-use.js');
    const postHookPath = join(globalHooksDir, 'dm-post-tool-use.js');
    const stopHookPath = join(globalHooksDir, 'dm-stop.js');
    const preHookCommand = `node "${preHookPath}"`;
    const postHookCommand = `node "${postHookPath}"`;
    const stopHookCommand = `node "${stopHookPath}"`;

    // Ensure ~/.devmind/hooks/ exists
    if (!existsSync(globalHooksDir)) {
        mkdirSync(globalHooksDir, { recursive: true });
    }

    // Write/update hook scripts (always overwrite to ensure latest version)
    writeFileSync(preHookPath, PRE_TOOL_USE_JS, 'utf-8');
    writeFileSync(postHookPath, POST_TOOL_USE_JS, 'utf-8');
    writeFileSync(stopHookPath, STOP_JS, 'utf-8');

    console.log('✓ Hook scripts installed to ~/.devmind/hooks/');

    // Read or initialize user settings
    let settings: UserSettings = {};
    if (existsSync(userSettingsPath)) {
        try {
            settings = JSON.parse(readFileSync(userSettingsPath, 'utf-8')) as UserSettings;
        } catch {
            console.error('✗ ~/.claude/settings.json is malformed JSON');
            console.error('  Please fix the file manually and re-run: devmind install-hooks');
            process.exit(1);
        }
    }

    const hooks: HooksMap = settings.hooks ? { ...settings.hooks } : {};

    // Check if global hooks are already registered
    const preAlready = (hooks['PreToolUse'] ?? []).some(m =>
        m.hooks?.some(h => h.command === preHookCommand),
    );
    const postAlready = (hooks['PostToolUse'] ?? []).some(m =>
        m.hooks?.some(h => h.command === postHookCommand),
    );
    const stopAlready = (hooks['Stop'] ?? []).some(m =>
        m.hooks?.some(h => h.command === stopHookCommand),
    );

    if (preAlready && postAlready && stopAlready) {
        console.log('~ Global hooks already registered in ~/.claude/settings.json');
        return;
    }

    // Register global hooks (only once, no project-specific entries)
    if (!preAlready) {
        hooks['PreToolUse'] = [
            ...(hooks['PreToolUse'] ?? []),
            { matcher: '', hooks: [{ type: 'command', command: preHookCommand }] },
        ];
    }
    if (!postAlready) {
        hooks['PostToolUse'] = [
            ...(hooks['PostToolUse'] ?? []),
            { matcher: '', hooks: [{ type: 'command', command: postHookCommand }] },
        ];
    }
    if (!stopAlready) {
        hooks['Stop'] = [
            ...(hooks['Stop'] ?? []),
            { matcher: '', hooks: [{ type: 'command', command: stopHookCommand }] },
        ];
    }

    settings.hooks = hooks;

    // Ensure ~/.claude/ dir exists
    const claudeDir = resolve(homedir(), '.claude');
    if (!existsSync(claudeDir)) {
        mkdirSync(claudeDir, { recursive: true });
    }

    writeFileSync(userSettingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');

    console.log('✓ Hooks registered in ~/.claude/settings.json');
}

// Run on import (postinstall)
try {
    installGlobalHooks();
} catch (err) {
    console.error('Hook installation failed:', (err as Error).message);
    // Don't fail the npm install
    process.exit(0);
}
