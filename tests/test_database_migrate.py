from pathlib import Path

import pytest

from src.database.migrate import migration_paths


def test_migration_paths_are_sorted(tmp_path: Path) -> None:
    (tmp_path / "002_second.sql").write_text("SELECT 2;", encoding="utf-8")
    (tmp_path / "001_first.sql").write_text("SELECT 1;", encoding="utf-8")

    assert [path.name for path in migration_paths(tmp_path)] == [
        "001_first.sql",
        "002_second.sql",
    ]


def test_migration_paths_reject_empty_directory(tmp_path: Path) -> None:
    with pytest.raises(RuntimeError, match="no SQL migrations found"):
        migration_paths(tmp_path)
