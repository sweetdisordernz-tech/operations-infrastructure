# Sweet Disorder Ops - notes for whoever (human or Claude) works on this next

## Schema changes: always commit a matching migration

`prisma/migrations/` is real migration history now (added after stages 1-4
were applied via `prisma db push`, which doesn't produce migration files -
see the "Add prisma/migrations" commit for the full story). Every future
schema change should ship a matching migration file in the same commit,
generated **offline**, without needing a live database connection:

```bash
# 1. Get the last-committed schema (before your edits) into a temp file
git show HEAD:prisma/schema.prisma > /tmp/schema-before.prisma

# 2. Edit prisma/schema.prisma as normal

# 3. Generate the migration by diffing the two schema files directly -
#    no database, no network, works from any sandbox
mkdir -p prisma/migrations/$(date -u +%Y%m%d%H%M%S)_describe_the_change
npx prisma migrate diff \
  --from-schema-datamodel /tmp/schema-before.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script \
  > prisma/migrations/<the_folder_you_just_made>/migration.sql

# 4. Regenerate the client and sanity-check the SQL reads as expected
npx prisma generate
cat prisma/migrations/<folder>/migration.sql
```

If a sandbox has a local Postgres available (check with `pg_lsclusters` /
`service postgresql start`), it's worth the extra few minutes to verify
properly rather than trusting the diff blind: create two throwaway
databases, `prisma migrate deploy` the full `prisma/migrations/` history
into one, `prisma db push` the current `schema.prisma` straight into the
other, and `pg_dump --schema-only` both to confirm they match (aside from
Prisma's own `_prisma_migrations` bookkeeping table, which only `migrate`
creates). This is exactly how the retroactive migration history was
verified - see commit `defb7c9`.

**Applying to the real Neon database:** every sandbox this project has run
in so far has blocked outbound connections to Neon (raw TCP and
WebSocket), so no migration has ever been applied to the live database
from within a session - only generated and committed. The user has always
applied it themselves afterward with real network access:
```
npx prisma migrate deploy
```
If a future session's sandbox *can* reach the database, use `migrate
deploy` (not `db push`) so the applied migration actually gets recorded in
`_prisma_migrations` and this doesn't happen again.

## Environment / network notes

- This repo's sessions have consistently had no route to Neon (`P1001` on
  both the pooled and direct connection strings, and the Neon HTTP API
  host is separately blocked by egress allowlist). Don't spend time
  re-diagnosing this each session - confirm quickly if needed, then work
  around it by generating SQL/migrations offline and asking the user to
  apply + report back, rather than assuming DB access will work.
- `.env` is gitignored and holds real Neon credentials - never commit it,
  never echo its contents into a commit message or PR description.
