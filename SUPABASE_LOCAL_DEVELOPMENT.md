# Local Supabase development

This project uses the Supabase CLI to run PostgreSQL, Auth, Storage, and the other Supabase services locally. The stack runs in containers. This guide does not link the project to a hosted Supabase project.

## Before installing

On Windows, Docker Desktop is the supported runtime used by the Supabase CLI. Confirm the Windows edition, build, architecture, virtualization support, and WSL status first. Current Docker Desktop Windows requirements list 64-bit Windows 10 Enterprise, Pro, or Education 22H2 (build 19045), or Windows 11 Enterprise, Pro, or Education 23H2 (build 22631) or later, and WSL 2.1.5 or later for the WSL 2 backend. Home editions are not in that supported-edition list. See [Docker Desktop for Windows requirements](https://docs.docker.com/desktop/setup/install/windows-install/).

Install or update WSL only after confirming the machine meets Docker's Windows and hardware requirements. Some WSL/virtualization changes require an administrator and a restart. Docker Desktop installation and engine startup also require system-level setup. Do not install Docker Desktop on a machine whose edition is unsupported; arrange a supported Windows environment with the device administrator instead.

## Supabase CLI

The official Windows/npm setup installs the CLI as a project dev dependency and runs it through `npx`. Node.js 20 or later is required; this project currently uses Node.js 24. See [Supabase CLI installation](https://supabase.com/docs/guides/local-development/cli/getting-started).

After the Docker runtime has been approved and started, install the CLI if it is not already present:

```powershell
npm install --save-dev supabase
npx supabase --help
```

The CLI is currently absent from this project. Installing it modifies `package.json` and the lockfile and downloads a dependency; this guide intentionally leaves that step for after Docker compatibility is confirmed.

## Initialize and start locally

The repository already has a `supabase/migrations` directory but no `supabase/config.toml`. Once Docker is available, initialize the local CLI configuration from the repository root:

```powershell
npx supabase init
```

Review the generated `supabase/config.toml` and keep the existing migration file. `supabase init` is local setup; do not run `supabase link` or provide hosted project credentials.

Start the local stack:

```powershell
npx supabase start
```

The first start downloads container images. Supabase recommends at least 7 GB of RAM for the full stack. The command prints local-only service URLs and development keys. Do not copy local secrets into public frontend environment variables.

## Apply migrations and run security tests

Review the target before running any database reset. The default command below targets the local stack; avoid `--linked`, `--remote`, and `--db-url` in this local-only workflow.

```powershell
npx supabase db reset --local
npx supabase test db --local
```

`db reset --local` recreates the local database and applies all files in `supabase/migrations`. It discards local database changes. The pgTAP test suite is under `supabase/tests/database/`; the CLI rolls each test file back after it runs. See the [database testing guide](https://supabase.com/docs/guides/database/testing) and [CLI reference](https://supabase.com/docs/reference/cli/introduction).

## Stop the local stack

```powershell
npx supabase stop
```

Do not add `--no-backup` unless you intentionally want the CLI to discard local database volumes. The commands above were checked against the official Supabase CLI documentation; they have not been run on this machine because Docker Desktop and the Supabase CLI are unavailable.
