# Hermes-agent on ProDesk — install log

Ops record of Hermes-agent's install on `fss-nz-server` (the ProDesk running
auckland.garden and parishhub). This is the anchor for issues #83 → #84 → #85,
so H2/H3 (image-gen helper + pipeline fallback) don't have to rediscover the
entry surface. Update in place if we ever re-install or move users.

## Host

- **Machine**: `fss-nz-server` (HP ProDesk 400 G3, Ubuntu 22.04, 4 cores, 7.6 GB RAM)
- **Owner user**: `tauriq` (UID 1000). Same user that runs the plant-request
  pipeline cron (`scripts/pipeline/run.sh`), so image gen can reach Hermes state.
- **Reached via**: Tailscale MagicDNS. See the ProDesk-estate skill.

## Install

Date: 19 August 2026. One-liner from the official installer:

```bash
ssh tauriq@fss-nz-server 'curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash'
```

The installer brings its own uv + Python 3.11 + Node.js + ripgrep + ffmpeg
under `~/.hermes/`; nothing system-wide changes.

## Versions installed (at time of writing)

```
Hermes Agent v0.20.4 (2026.8.18)
Install directory: /home/tauriq/.hermes/hermes-agent
Python: 3.11.16
OpenAI SDK: 2.24.0
```

## Paths that matter

| Purpose | Path |
| --- | --- |
| **Cron-safe binary** | `/home/tauriq/.local/bin/hermes` |
| Bin is a shim; execs | `/home/tauriq/.hermes/hermes-agent/venv/bin/python /home/tauriq/.hermes/hermes-agent/hermes` |
| Config | `/home/tauriq/.hermes/config.yaml` |
| Env / API keys | `/home/tauriq/.hermes/.env` |
| Sessions / logs | `/home/tauriq/.hermes/{sessions,logs,cron}/` |
| Portal token store | inside `/home/tauriq/.hermes/` (managed by Hermes) |

**Cron trap (important).** `hermes` is on the interactive PATH via
`~/.local/bin`, which Ubuntu adds through `~/.profile`. Cron does **not** source
`.profile`, so a bare `hermes` in a crontab entry will fail with
`command not found`. Always use the **absolute path**
`/home/tauriq/.local/bin/hermes` in cron and in scripts callable from cron.

## Portal (subscription) authentication

Tauriq's Nous Portal subscription was activated with:

```bash
ssh tauriq@fss-nz-server
/home/tauriq/.local/bin/hermes portal
```

Interactive OAuth (opens a URL that must be authorised in a browser). Token is
persisted inside `~/.hermes/`; no secrets committed to this repo.

Post-auth verification (`hermes portal info`):

```
Nous Portal
Auth:    ✓ logged in
Model:   ✓ using Nous as inference provider

Tool Gateway
Web tools            via Nous Portal
Image generation     via Nous Portal
Video generation     not configured
OpenAI TTS           via Nous Portal
Speech-to-text       via Nous Portal
Browser automation   via Nous Portal
```

## Non-interactive image generation — the anchor H2/H3 build on

Hermes exposes a headless one-shot mode via `-z PROMPT` / `--oneshot PROMPT`.
The prompt is executed on a single turn with tools enabled; when the prompt
asks for an image at a specific path, the image-gen tool (FAL, routed through
Portal) fulfils it and Hermes writes the file directly.

Smoke test that produced a valid image on this box:

```bash
/home/tauriq/.local/bin/hermes -z \
  "Generate an image: a single ripe tomato on a white background, watercolor style. Save it to /tmp/hermes-smoke/tomato.png"
```

Result: `/tmp/hermes-smoke/tomato.png` — **1024×1024 PNG, 911 KB**, wall-clock
well under 60 s. Exit code 0. No TTY required. This is the invocation shape
H2's `generate_stage_image()` should build on:

- Use the **absolute** hermes path (see cron trap above).
- Wrap in `timeout 90` (Hermes should return in ~30 s but Portal calls
  occasionally stall).
- Assert the target file exists and is non-empty after the call — don't trust
  exit code alone; Hermes may exit 0 while reporting a tool failure.
- Capture `stderr` to a log so cron doesn't email you a wall of ANSI.

## What's deliberately not set up yet

- `hermes gateway` (Telegram/Discord/etc.). Skipped — outside this feature.
- `hermes cron` / `hermes kanban`. Skipped — the auckland.garden pipeline runs
  on the host's crontab; there is no reason to move it inside Hermes.
- Any additional model configuration. Left at Hermes' default (Portal-hosted).
