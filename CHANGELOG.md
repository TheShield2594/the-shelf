# Changelog

All notable changes to The Shelf will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Backend test suite (pytest + pytest-asyncio against a real Postgres instance)
  covering registration, login, password/email changes, rate limiting, and
  password reset
- GitHub Actions CI running backend tests and frontend lint/type-check/build
  on every PR
- Rate limiting on auth endpoints (login, register, forgot/reset-password)
  via slowapi
- Self-service password reset flow: `/forgot-password` and `/reset-password`
  pages, stateless single-use JWT reset tokens, optional SMTP email delivery
- `scripts/backup.sh` / `scripts/restore.sh` for backing up and restoring the
  docker-compose Postgres volume

### Fixed
- `GOOGLE_BOOKS_API_KEY` is now actually passed through to the backend
  container in `docker-compose.yml` (was documented but silently dropped)
- ESLint was uninstalled despite an existing `.eslintrc.json`; `next lint`
  now runs and passes in CI
- `DATABASE_MIGRATION_GUIDE.md` no longer instructs readers to install
  pgvector, which the current schema doesn't use

### Changed
- Moved early strategic/planning documents (product vision, target
  architecture, implementation roadmap, UI modernization plan, the old
  quick-start guide, and the Railway/Neon deployment guide) into
  `docs/planning/`, since they described a target state that has since
  diverged from what's actually implemented. See
  [docs/planning/README.md](docs/planning/README.md).

## Version History

### [0.2.0]
- Multi-dimensional (7-axis) rating system with book fingerprints and radar
  charts, replacing 5-star ratings as the primary rating mechanism
- Migrated frontend from Vite/React to Next.js (`frontend-next/`)
- Alembic database migrations
- Dark mode

### [0.1.0] - Initial implementation
- Basic book tracking (want-to-read, currently reading, finished, DNF)
- 5-star ratings
- Review system
- Content ratings (community-driven)
- Open Library import
- User authentication

## Links

- [Database Migration Guide](DATABASE_MIGRATION_GUIDE.md)
- [Multi-Dimensional Ratings](MULTI_DIMENSIONAL_RATINGS.md)
- [Content Ratings](CONTENT_RATINGS.md)
- [Planning Archive](docs/planning/README.md)
