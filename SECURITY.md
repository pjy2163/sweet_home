# Security

This repository must not contain secrets, private operating notes, or large raw datasets.

## Do Not Commit

- `.env`
- API keys
- Discord webhook URLs
- Notion API tokens
- service account files
- raw large datasets
- private planning notes

## Before Publishing

Run:

```bash
python scripts/security_scan.py
git status --short --ignored
```

Only commit files that are meant to be public.
