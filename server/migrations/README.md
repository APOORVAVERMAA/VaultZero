# VaultZero Database Migrations

## What are migrations?

Migrations are SQL scripts that modify the database schema (tables, columns, indexes) in a controlled, versioned way. Each migration file represents a specific set of changes and is run once against the database.

## When to run migrations

- **Before starting the server** after pulling new code that includes migration files.
- **In order** — migrations are numbered sequentially (001, 002, …) and must be run in that order.
- **Once per environment** — never re-run a migration that has already been applied.

## How to run

```bash
psql "$DATABASE_URL" -f migrations/<filename>.sql
```

Example:

```bash
psql "$DATABASE_URL" -f migrations/schema.sql
```

## Existing migrations

| File | Description |
|------|-------------|
| `001_security_hardening.sql` | Renames `token` → `token_hash`, adds indexes for release tokens and vault lookups |
| `002_add_full_name.sql` | Adds `full_name` column for legacy environments |
| `003_full_schema.sql` | PostgreSQL full schema for fresh installations |
| `schema.sql` | Canonical complete PostgreSQL schema |
