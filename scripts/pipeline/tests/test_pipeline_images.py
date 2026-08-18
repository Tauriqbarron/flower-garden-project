"""Tests for pipeline.fetch_images() Wikimedia-then-Hermes fallback logic.

Every test mocks both Wikimedia (`_commons_search` + urllib download) and the
Hermes helper — no network, no FAL credits used.
"""
from __future__ import annotations

import io
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pipeline  # noqa: E402


@pytest.fixture
def entry():
    return {
        "common_name": "Rocket",
        "botanical_name": "Eruca sativa",
        "slug": "rocket",
    }


def _fake_urlopen(_req, timeout=None):
    """urlopen replacement that returns 4 KB of fake image bytes."""
    return _ClosableBytes(b"x" * 4096)


class _ClosableBytes(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()


def test_all_wikimedia_hits_no_hermes_call(entry, tmp_path):
    """Baseline: Wikimedia serves all 3 stages, Hermes must NOT be called."""

    def _commons(_q, limit=6):
        return (1280, "https://commons.example/img.jpg", "https://orig.example/img.jpg")

    with (
        patch.object(pipeline, "_commons_search", side_effect=_commons),
        patch.object(pipeline.urllib.request, "urlopen", side_effect=_fake_urlopen),
        patch.object(pipeline, "generate_stage_image") as hermes_mock,
    ):
        stages, err = pipeline.fetch_images(entry, "vegetable", str(tmp_path))

    assert err is None
    assert set(stages) == {"seedling", "young_plant", "harvest"}
    assert all(v and v.startswith("/images/vegetables/rocket/") for v in stages.values())
    hermes_mock.assert_not_called()


def test_wikimedia_empty_for_one_stage_hermes_fills_that_stage_only(entry, tmp_path):
    """Wikimedia has 2/3 stages; Hermes must be called exactly once, for
    the remaining stage. Other stages get their Wikimedia paths."""
    calls = {"n": 0}

    def _commons(query, limit=6):
        # Simulate a miss on the "seedling" query bundle (queries include the
        # word "seedling"), hits otherwise.
        if "seedling" in query:
            return None
        return (1280, "https://commons.example/img.jpg", "https://orig.example/img.jpg")

    def _hermes(prompt, out_path, timeout_s=90):
        calls["n"] += 1
        Path(out_path).write_bytes(b"x" * 4096)
        return True

    with (
        patch.object(pipeline, "_commons_search", side_effect=_commons),
        patch.object(pipeline.urllib.request, "urlopen", side_effect=_fake_urlopen),
        patch.object(pipeline, "generate_stage_image", side_effect=_hermes),
    ):
        stages, err = pipeline.fetch_images(entry, "vegetable", str(tmp_path))

    assert err is None
    assert calls["n"] == 1  # exactly one Hermes call
    assert stages["seedling"] == "/images/vegetables/rocket/seedling.png"
    assert stages["young_plant"].endswith(".jpg")
    assert stages["harvest"].endswith(".jpg")


def test_wikimedia_empty_for_all_stages_hermes_called_three_times(entry, tmp_path):
    """Wikimedia returns nothing at all. Hermes must be called exactly 3× —
    once per stage, in cost-cap territory but not over it."""
    called_stages = []

    def _hermes(prompt, out_path, timeout_s=90):
        # infer stage from out_path
        called_stages.append(Path(out_path).stem)
        Path(out_path).write_bytes(b"x" * 4096)
        return True

    with (
        patch.object(pipeline, "_commons_search", return_value=None),
        patch.object(pipeline, "generate_stage_image", side_effect=_hermes),
    ):
        stages, err = pipeline.fetch_images(entry, "flower", str(tmp_path))

    assert err is None
    assert sorted(called_stages) == ["harvest", "seedling", "young_plant"]
    assert all(v.startswith("/images/flowers/rocket/") for v in stages.values())


def test_hermes_returns_false_stage_is_none(entry, tmp_path):
    """Wikimedia empty + Hermes fails for one stage → that stage's slot is
    None (no ghost path), the other stages still work."""
    hermes_calls = {"n": 0}

    def _hermes(prompt, out_path, timeout_s=90):
        hermes_calls["n"] += 1
        # First call fails, subsequent ones succeed.
        if hermes_calls["n"] == 1:
            return False
        Path(out_path).write_bytes(b"x" * 4096)
        return True

    with (
        patch.object(pipeline, "_commons_search", return_value=None),
        patch.object(pipeline, "generate_stage_image", side_effect=_hermes),
    ):
        stages, err = pipeline.fetch_images(entry, "vegetable", str(tmp_path))

    assert err is None  # 2 of 3 still there
    none_count = sum(1 for v in stages.values() if v is None)
    assert none_count == 1


def test_both_sources_empty_returns_error(entry, tmp_path):
    """Wikimedia + Hermes both empty for all 3 stages → error tuple."""
    with (
        patch.object(pipeline, "_commons_search", return_value=None),
        patch.object(pipeline, "generate_stage_image", return_value=False),
    ):
        stages, err = pipeline.fetch_images(entry, "vegetable", str(tmp_path))

    assert stages is None
    assert err and "Wikimedia + Hermes" in err


def test_hermes_prompts_carry_stage_and_plant_details(entry, tmp_path):
    """Each Hermes call must get a stage-appropriate prompt that names the
    plant so the generated image is on-subject."""
    captured = []

    def _hermes(prompt, out_path, timeout_s=90):
        captured.append((Path(out_path).stem, prompt))
        Path(out_path).write_bytes(b"x" * 4096)
        return True

    with (
        patch.object(pipeline, "_commons_search", return_value=None),
        patch.object(pipeline, "generate_stage_image", side_effect=_hermes),
    ):
        pipeline.fetch_images(entry, "vegetable", str(tmp_path))

    assert len(captured) == 3
    for stage, prompt in captured:
        assert "Rocket" in prompt
        assert "Eruca sativa" in prompt
        # stage-appropriate cue
        if stage == "seedling":
            assert "seedling" in prompt.lower()
        elif stage == "young_plant":
            assert "young" in prompt.lower()
        elif stage == "harvest":
            assert "harvest" in prompt.lower() or "mature" in prompt.lower()


def test_flower_harvest_prompt_talks_about_blooms(entry, tmp_path):
    """The harvest stage for a flower should call for blooms; for a vegetable
    it should call for the edible part."""
    prompt_flower = pipeline._hermes_prompt("harvest", entry, "flower")
    prompt_veg = pipeline._hermes_prompt("harvest", entry, "vegetable")
    assert "bloom" in prompt_flower.lower() or "flower" in prompt_flower.lower()
    assert "edible" in prompt_veg.lower() or "harvest" in prompt_veg.lower()
