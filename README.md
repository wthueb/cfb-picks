# cfb-picks

## Development data

Development does not connect to Redis or query the CFBD API. It reads the JSON files in
`packages/cfbd/test-data` on every cache lookup, so edits are available without restarting the
application. The fixture filenames include the configured `SEASON`; add a matching set of files
when changing seasons.

Run `pnpm db:seed` to migrate and populate the development SQLite database with two teams, four
users, ten completed weeks of picks and results, and an open week 11 referencing those fixtures.
The seed is idempotent. Development also adds a one-click `Development Admin` sign-in provider; it
is not available in production.
