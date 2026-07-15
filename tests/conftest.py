from __future__ import annotations

import os


# Production fails closed. The existing AI contract suite opts in explicitly.
os.environ.setdefault("SWEETHOME_AI_REPORT_ENABLED", "true")
