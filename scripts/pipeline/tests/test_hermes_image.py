"""Unit tests for the Hermes image-gen helper.

Every test mocks subprocess so we never actually call Hermes (and never spend
Portal credits from a CI run). One real-world run against Portal from the
ProDesk is the acceptance check for #84 — see the PR description.
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import hermes_image
from hermes_image import PHOTOREALISM_SPEC, generate_stage_image


@pytest.fixture
def out_path(tmp_path: Path) -> str:
    return str(tmp_path / "img.png")


@pytest.fixture(autouse=True)
def _fake_hermes_bin(monkeypatch, tmp_path: Path) -> str:
    """Pretend the hermes binary exists so we don't hit the resolver's real
    filesystem lookup. Tests that care about resolution override this."""
    fake = tmp_path / "hermes-bin"
    fake.write_text("#!/bin/sh\nexit 0\n")
    fake.chmod(0o755)
    monkeypatch.setattr(hermes_image, "DEFAULT_HERMES_PATH", str(fake))
    return str(fake)


def _fake_completed(returncode: int = 0, stdout: str = "", stderr: str = ""):
    return subprocess.CompletedProcess(
        args=["hermes"], returncode=returncode, stdout=stdout, stderr=stderr
    )


def test_happy_path_writes_file_and_returns_true(out_path):
    def _run(cmd, *_a, **_kw):
        # Simulate Hermes producing the requested file.
        Path(out_path).write_bytes(b"x" * 4096)
        return _fake_completed(0, "Saved.")

    with patch.object(subprocess, "run", side_effect=_run):
        assert generate_stage_image("a Kumara seedling", out_path) is True
    assert os.path.getsize(out_path) == 4096


def test_prompt_carries_photorealism_spec_and_out_path(out_path):
    captured = {}

    def _run(cmd, *_a, **_kw):
        # cmd = [hermes_bin, "-z", "<composed prompt>"]
        captured["prompt"] = cmd[2]
        Path(out_path).write_bytes(b"x" * 4096)
        return _fake_completed(0)

    with patch.object(subprocess, "run", side_effect=_run):
        assert generate_stage_image("a Kumara seedling in dark soil", out_path) is True

    p = captured["prompt"]
    assert out_path in p
    assert "a Kumara seedling in dark soil" in p
    # Every call must be forced to hyper-realistic — this is the whole
    # point of the wrapper baseline.
    assert PHOTOREALISM_SPEC in p
    assert "Hyper-realistic" in p
    assert "no cartoon" in p.lower() or "no watermarks" in p.lower()


def test_timeout_returns_false_and_does_not_raise(out_path):
    def _run(cmd, *_a, **kw):
        raise subprocess.TimeoutExpired(cmd, kw.get("timeout", 90))

    with patch.object(subprocess, "run", side_effect=_run):
        assert generate_stage_image("anything", out_path, timeout_s=1) is False
    assert not os.path.exists(out_path)


def test_nonzero_exit_returns_false(out_path):
    with patch.object(
        subprocess, "run", return_value=_fake_completed(2, stderr="boom")
    ):
        assert generate_stage_image("anything", out_path) is False


def test_exit_zero_but_no_file_returns_false(out_path):
    # Hermes sometimes exits 0 while the tool call actually failed — this is
    # exactly the case the "verify file exists" guard exists to catch.
    with patch.object(
        subprocess, "run", return_value=_fake_completed(0, "Sorry, tool errored")
    ):
        assert generate_stage_image("anything", out_path) is False


def test_tiny_output_file_treated_as_failure(out_path):
    def _run(cmd, *_a, **_kw):
        Path(out_path).write_bytes(b"tiny")  # 4 bytes
        return _fake_completed(0)

    with patch.object(subprocess, "run", side_effect=_run):
        assert generate_stage_image("anything", out_path) is False


def test_missing_hermes_binary_returns_false(monkeypatch, out_path, tmp_path):
    monkeypatch.setattr(
        hermes_image, "DEFAULT_HERMES_PATH", str(tmp_path / "nope")
    )
    monkeypatch.setattr(hermes_image.shutil, "which", lambda _n: None)
    # Should never even reach subprocess.
    with patch.object(subprocess, "run") as run:
        assert generate_stage_image("anything", out_path) is False
        run.assert_not_called()


def test_stale_output_file_is_removed_before_generation(out_path):
    Path(out_path).write_bytes(b"stale content from a previous run")

    with patch.object(subprocess, "run", return_value=_fake_completed(1)):
        assert generate_stage_image("anything", out_path) is False
    # The stale bytes must NOT still be there after a failed run.
    assert not os.path.exists(out_path)


def test_explicit_hermes_bin_override_is_honoured(out_path, tmp_path):
    override = tmp_path / "custom-hermes"
    override.write_text("")
    captured = {}

    def _run(cmd, *_a, **_kw):
        captured["bin"] = cmd[0]
        Path(out_path).write_bytes(b"x" * 4096)
        return _fake_completed(0)

    with patch.object(subprocess, "run", side_effect=_run):
        assert (
            generate_stage_image(
                "anything", out_path, hermes_bin=str(override)
            )
            is True
        )
    assert captured["bin"] == str(override)
