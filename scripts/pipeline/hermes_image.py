"""Non-interactive Hermes/Portal image-gen helper for the plant pipeline.

Wraps ``hermes -z PROMPT`` (one-shot mode) so callers get a simple
``generate_stage_image(prompt, out_path)`` and don't have to know anything
about Hermes' TTY behaviour or Portal wiring. Safe to run from cron.

Anchor for the invocation choice is in ``docs/hermes/install-log.md``.

Nothing here imports from Hermes; we shell out to the installed CLI so this
module stays trivially unit-testable (mock ``subprocess.run``).
"""
from __future__ import annotations

import logging
import os
import shutil
import subprocess

log = logging.getLogger("hermes_image")

# Prefer the cron-safe absolute path we captured during H1. Cron does NOT
# source ``~/.profile`` on the ProDesk, so the shim on ``~/.local/bin`` won't
# be on PATH unless we ask explicitly. Fall back to whatever ``hermes`` the
# environment provides (dev boxes, CI mocks) so tests can override at will.
DEFAULT_HERMES_PATH = os.environ.get(
    "HERMES_BIN", "/home/tauriq/.local/bin/hermes"
)


def _resolve_hermes_binary() -> str | None:
    if os.path.isfile(DEFAULT_HERMES_PATH) and os.access(DEFAULT_HERMES_PATH, os.X_OK):
        return DEFAULT_HERMES_PATH
    return shutil.which("hermes")


# Baseline photorealism specification applied to every call. Matches the
# hyper-realistic look of the existing site images so pipeline-generated
# fallbacks are indistinguishable from the Wikimedia-sourced ones. Callers
# pass in the plant-specific description; this wrapper prevents anyone from
# accidentally landing an illustration / watercolor / stylised render on the
# site.
PHOTOREALISM_SPEC = (
    "Hyper-realistic professional photograph, DSLR quality, sharp focus, "
    "natural outdoor daylight, home garden setting, shallow depth of field. "
    "Realistic textures on leaves and soil. Single subject, no people, "
    "no hands, no text, no watermarks, no labels, no illustrations, no "
    "cartoon or painterly stylisation. 4:3 landscape framing."
)


def _build_prompt(prompt: str, out_path: str) -> str:
    """Compose the one-shot instruction. Hermes reads this on a single turn,
    calls the image-gen tool, and writes the file directly to ``out_path``.

    ``prompt`` is the plant/stage-specific description (e.g. ``"a Kumara plant
    at seedling stage, cotyledons emerging from dark soil"``). The wrapper
    forces the photorealism spec around it and instructs Hermes to produce
    the file directly without narration.
    """
    return (
        f"Generate an image and save it to {out_path}.\n\n"
        f"Subject: {prompt}\n\n"
        f"Style requirements (mandatory): {PHOTOREALISM_SPEC}\n\n"
        "Do not summarise or narrate the result. If the image tool fails, "
        "exit without creating a placeholder file."
    )


def generate_stage_image(
    prompt: str,
    out_path: str,
    timeout_s: int = 90,
    hermes_bin: str | None = None,
) -> bool:
    """Generate a single image at ``out_path`` via Hermes/Portal.

    Returns ``True`` if a non-empty file exists at ``out_path`` after the
    call, ``False`` on any failure. Never raises.

    Guardrails:
    - Uses the absolute Hermes path so it works under cron.
    - Hard timeout at ``timeout_s`` (default 90 s).
    - **Verifies the file** afterwards — Hermes can exit 0 while reporting a
      tool failure, so we don't trust the exit code alone.
    - Captures stdout/stderr; the caller gets a clear log line, cron doesn't
      get a wall of ANSI in an email.
    """
    hermes = hermes_bin or _resolve_hermes_binary()
    if not hermes:
        log.warning(
            "hermes binary not found (looked at %s and PATH); skipping image gen",
            DEFAULT_HERMES_PATH,
        )
        return False

    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    if os.path.exists(out_path):
        # Guarantee we can distinguish a stale file from a fresh generation.
        try:
            os.remove(out_path)
        except OSError:
            pass

    composed = _build_prompt(prompt, out_path)
    try:
        result = subprocess.run(
            [hermes, "-z", composed],
            capture_output=True,
            text=True,
            timeout=timeout_s,
            check=False,
        )
    except subprocess.TimeoutExpired:
        log.warning("hermes image gen timed out after %ss for %s", timeout_s, out_path)
        return False
    except OSError as e:
        log.warning("hermes image gen failed to launch: %s", e)
        return False

    if result.returncode != 0:
        log.warning(
            "hermes exited %s for %s: %s",
            result.returncode,
            out_path,
            (result.stderr or result.stdout or "").strip()[:400],
        )
        return False

    try:
        size = os.path.getsize(out_path)
    except OSError:
        log.warning(
            "hermes exited 0 but produced no file at %s (stdout tail: %s)",
            out_path,
            (result.stdout or "").strip()[-200:],
        )
        return False

    if size < 1024:  # Anything under 1 KB is not a real plant photo.
        log.warning("hermes produced a tiny file (%s bytes) at %s", size, out_path)
        return False

    log.info("hermes image ok: %s (%s bytes)", out_path, size)
    return True
