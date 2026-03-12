# VaultZero Database Migrations

## What are migrations?

Migrations are SQL scripts that modify the database schema (tables, columns, indexes) in a controlled, versioned way. Each migration file represents a specific set of changes and is run once against the database.

## When to run migrations

- **Before starting the server** after pulling new code that includes migration files.
- **In order** — migrations are numbered sequentially (001, 002, …) and must be run in that order.
- **Once per environment** — never re-run a migration that has already been applied.

## How to run

```bash
mysql -u root -p VaultZero < migrations/<filename>.sql
```

Example:

```bash
mysql -u root -p VaultZero < migrations/001_security_hardening.sql
```

## Existing migrations

| File | Description |
|------|-------------|
| `001_security_hardening.sql` | Renames `token` → `token_hash`, adds indexes for release tokens and vault lookups |
