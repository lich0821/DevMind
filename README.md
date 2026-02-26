# DevMind

[中文版](README_CN.md)

> Give your AI coding assistant a working memory — so it remembers decisions, respects boundaries, and knows when to stop.

**DevMind** is a developer workflow framework that deeply integrates with [Claude  Code](https://claude.ai/code). Using local files + Hooks + Slash commands, it transforms your AI assistant from a "smart one-shot tool" into a "long-term collaborator with memory."

## Why DevMind?

If you've used AI coding tools for more than a few sessions, you've probably experienced:

- You agreed "no class components" last session — the AI wrote them again anyway
- The AI modified files while you were just exploring, with no warning
- After three rounds of conversation, the implementation quietly drifted from the original design
- A rejected approach wasn't recorded, so it keeps coming back in future sessions
- A task was interrupted, and there's no way to resume — you have to start over

DevMind addresses these issues by maintaining a set of local "project state files," so the AI can load context at the start of every session, sense the current task phase, and proactively pause when it's about to overstep.

## Core Mechanism

### 4 Work Modes

| Mode | Purpose | AI Permissions |
|------|---------|----------------|
| `explore` | Read-only analysis, understand code | File writes blocked |
| `plan` | Design solutions, no code changes | Business code writes blocked |
| `build` | Execute per plan | Only files in plan scope allowed |
| `edit` | Small targeted changes | Allowed; cross-file changes require confirmation |

### 5-Layer State Management

- **Mode**: Current work mode, enforced by Hooks
- **Memory**: Cross-session memory — decisions / patterns / graveyard (rejected approaches)
- **Flow**: Auto-checkpoints — pauses on scope violations, uncertainty, or dangerous operations
- **Session**: Checkpoint chain for tasks, supports resume after interruption
- **Collaboration**: Multi-developer config (v0.1 supports solo mode)

## Quick Start

### Install

```bash
npm install -g @lich0821/devmind
```

### Initialize a Project

Run in your project root:

```bash
devmind init
```

This generates:
- `.devmind/`: State management directory (mode, memory, session, config)
- `.claude/hooks/`: PreToolUse / PostToolUse hooks
- `.claude/commands/dm/`: 11 slash commands
- `.claude/CLAUDE.md`: State-awareness prompt auto-injected at session start

### Start Working

Open Claude  Code and start a new session — it will automatically load the current mode and memory index.

```
/dm:explore    # Enter read-only analysis mode
/dm:plan       # Design a structured solution
/dm:build      # Execute per plan (auto-maintains checkpoints)
/dm:edit       # Make small direct changes
/dm:remember   # Persist decisions/patterns to memory
/dm:recall     # Search memory history
/dm:audit      # View file modification log
/dm:status     # Show current status (also: devmind status)
```

### CLI Commands

You can also use the CLI directly in your terminal:

```bash
devmind status               # Show current mode, active plan, checkpoints
devmind recall hook          # Search memory for anything related to "hook"
devmind audit --last 10      # View the last 10 file modification entries
devmind audit --plan "v0.1"  # Filter audit log by plan name
```

## Typical Workflow

```
Session start
  └─ Claude auto-loads mode + memory index

Explore phase
  └─ Read-only analysis — AI cannot accidentally modify files

Plan phase
  ├─ Auto-searches Graveyard to avoid repeating rejected approaches
  ├─ Outputs structured comparison (confirmed / uncertain / risks)
  └─ Writes current-plan.md with Spec constraints

Build phase
  ├─ Strictly follows Spec
  ├─ Writes session.yaml checkpoint after each step
  └─ Auto-pauses on scope violations or dangerous operations

Consolidation phase
  ├─ /dm:remember  → Write decisions/patterns to .devmind/memory/
  ├─ /dm:publish   → Write feature docs to docs/designs/draft/
  └─ /dm:release   → Archive draft/ as versioned dir, generate docs/releases/<version>.md
```

## Directory Structure

After `devmind init`, the `.devmind/` directory looks like:

```
.devmind/
├── current-mode.txt        Current mode (explore/plan/build/edit)
├── current-plan.md         Active execution plan (with Spec constraints)
├── session.yaml            Session checkpoint chain
├── config.yaml             Project configuration
├── flow.yaml               Auto-pause trigger rules
├── memory/
│   ├── decisions/          Technical decision records
│   ├── patterns/           Reusable patterns and lessons learned
│   ├── graveyard/          Rejected approaches (never forget)
│   └── index.md            Lightweight index (auto-generated)
├── modes/                  Mode documentation
└── scripts/
    ├── rebuild-index.sh    Rebuild memory index
    └── check-graveyard.py  Detect duplicate/rejected approaches
```

## Releases

**v0.2.1** (current)
- fix: inject hooks into user-level `~/.claude/settings.json` so mode enforcement actually works

**v0.2.0**
- `devmind migrate` command + `/dm:migrate` slash command for onboarding existing projects

**v0.1.0**
- Phase 1: 4 work modes + Hook enforcement + 9 slash commands + audit log
- Phase 2 core: `devmind init/status/recall/audit` CLI commands

## License

MIT
