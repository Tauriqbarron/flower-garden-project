"""Test bootstrap: make the catalog build helpers importable.

The pure catalog helpers live in ``scripts/catalog/`` at the repo root (they are
an ops tool, not part of the shipped ``app`` package), so add that directory to
``sys.path`` for the tests.
"""
import os
import sys

_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_CATALOG_DIR = os.path.join(_REPO_ROOT, "scripts", "catalog")
if _CATALOG_DIR not in sys.path:
    sys.path.insert(0, _CATALOG_DIR)
