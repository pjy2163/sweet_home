from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MAX_PUBLIC_FILE_SIZE = 5 * 1024 * 1024

SECRET_PATTERNS = [
    re.compile(r"https://discord(?:app)?\.com/api/webhooks/\d+/[A-Za-z0-9._-]+"),
    re.compile(r"\bghp_[A-Za-z0-9_]{20,}\b"),
    re.compile(r"\bgithub_pat_[A-Za-z0-9_]{20,}\b"),
    re.compile(r"\bsk-[A-Za-z0-9]{20,}\b"),
    re.compile(r"\bntn_[A-Za-z0-9_=-]{20,}\b"),
    re.compile(r"(?i)\b(password|secret|api_key|apikey|credential)\s*=\s*['\"]?[^'\"\s]+"),
]

SENSITIVE_CSV_HEADER_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        r"주민(?:등록)?번호",
        r"외국인등록번호",
        r"휴대폰(?:번호)?",
        r"전화번호",
        r"이메일",
        r"email",
        r"계좌번호",
        r"카드번호",
    )
]

BLOCKED_PATH_PREFIXES = [
    "data/raw/",
    "docs/agents/",
    "docs/workflows/",
]

BLOCKED_FILES = {
    "docs/project-board.md",
    "docs/project-log.md",
    "docs/automation-playbook.md",
    "docs/integration-strategy.md",
    "docs/open-source-strategy.md",
    "docs/original-product-definition.xltx",
    "docs/data-inventory.xlsx",
}

ALLOWLIST_FILES = {
    ".env.example",
    "docs/public-project-summary.md",
}


def git_lines(*args: str) -> list[str]:
    result = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        check=True,
        text=True,
        capture_output=True,
    )
    return [line for line in result.stdout.splitlines() if line]


def public_candidate_files() -> list[Path]:
    tracked = git_lines("ls-files")
    untracked = git_lines("ls-files", "--others", "--exclude-standard")
    paths = sorted(set(tracked + untracked))
    return [ROOT / path for path in paths if (ROOT / path).is_file()]


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def is_blocked_path(path: Path) -> bool:
    rel = relative(path)
    return rel in BLOCKED_FILES or any(rel.startswith(prefix) for prefix in BLOCKED_PATH_PREFIXES)


def scan_file(path: Path) -> list[str]:
    rel = relative(path)
    issues: list[str] = []

    if is_blocked_path(path):
        issues.append(f"blocked path is visible to git: {rel}")

    size = path.stat().st_size
    if size > MAX_PUBLIC_FILE_SIZE:
        issues.append(f"large public file: {rel} ({size:,} bytes)")

    if rel in ALLOWLIST_FILES:
        return issues

    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return issues

    for pattern in SECRET_PATTERNS:
        if pattern.search(text):
            issues.append(f"possible secret pattern in {rel}: {pattern.pattern}")

    if path.suffix.lower() == ".csv":
        header = text.splitlines()[0] if text else ""
        for pattern in SENSITIVE_CSV_HEADER_PATTERNS:
            if pattern.search(header):
                issues.append(
                    f"possible sensitive CSV column in {rel}: {pattern.pattern}"
                )

    return issues


def main() -> int:
    issues: list[str] = []

    for path in public_candidate_files():
        issues.extend(scan_file(path))

    if issues:
        print("Security scan failed:")
        for issue in issues:
            print(f"- {issue}")
        return 1

    print("Security scan passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
