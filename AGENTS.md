# Repository Guidelines

## Project Structure & Module Organization
- `src/index.js` runs the Express proxy, serves `src/public/`, and forwards `/api` calls to the Python backend under `src/backend/`.
- Backend services (e.g., `arxiv_client.py`, `chatbot_service.py`) store cache and history in `data/`; keep sensitive experiment outputs out of version control.
- Shared docs belong in `docs/`; automated checks and fixtures live under `tests/` with `frontend/` and `backend/` mirrors for coverage parity.

## Build, Test, and Development Commands
- `pnpm install` installs frontend dependencies (requires pnpm ≥8).
- `pnpm setup-python` provisions `venv/` and installs backend requirements after editing `requirements.txt`.
- `pnpm dev` launches the Express proxy with static assets and the Flask API for end-to-end development.
- `pnpm frontend` / `pnpm backend` run either side independently for focused debugging.

## Coding Style & Naming Conventions
- JavaScript: ES modules, async/await, 4-space indentation, camelCase variables, PascalCase components.
- Python: PEP 8 formatting, snake_case names, module-level docstrings summarizing services or routes.
- Centralize route constants, cache keys, and filesystem paths near file tops; document env vars instead of hardcoding secrets.

## Testing Guidelines
- Backend tests use `pytest` under `tests/backend/` named `test_<module>.py` (e.g., `test_chatbot_service.py`).
- Future frontend specs should live in `tests/frontend/` with `.test.js` suffixes.
- Target scenarios: arXiv search flows, caching logic, chatbot responses, and offline fallbacks. Add regression cases for API failures.

## Commit & Pull Request Guidelines
- Follow Conventional Commits such as `feat(frontend): add cached search panel`; scope prefixes ease triage.
- PRs should link related issues, list manual test commands, and include screenshots or curl transcripts when behaviors change.
- Call out breaking changes and ensure new assets respect `data/cache/` layout to avoid bundling user files.

## Security & Configuration Tips
- Never commit API keys; load providers via environment variables surfaced in PR notes.
- Confirm new features honor `data/` storage conventions and keep user-specific files out of `src/`.
