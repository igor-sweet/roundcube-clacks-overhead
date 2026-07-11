# E2E tests

Full integration test: a real Roundcube instance (with the plugin
mounted from the working tree) talking to GreenMail as a disposable
SMTP+IMAP server, driven by Playwright.

## What's tested here vs. `tests/unit/`

- `tests/unit/` (PHPUnit) tests the plugin's hook *logic* in isolation
  with mock objects - fast, no containers needed.
- This directory tests the *actual wiring*: does the header really end
  up on the wire, does Roundcube's UI really render the widget, across
  real Roundcube versions.

## Running locally

```bash
cd tests/e2e
cp .env.example .env        # adjust ROUNDCUBE_TAG etc. if you like
docker compose up -d
./wait-for-stack.sh         # polls from the host until both are ready

# Inject a fixture mail directly via SMTP (bypasses Roundcube on purpose,
# see fixtures/inject-mail.sh for why):
./fixtures/inject-mail.sh positive
# fixtures: positive | negative | whitespace | xss

# Log into Roundcube by hand to poke around:
open http://localhost:8080   # user: tester@example.test, any password

# Run the automated suite:
cd playwright
npm ci
npx playwright install --with-deps chromium
npx playwright test

# ... and tear down again:
cd ../.. && docker compose -f tests/e2e/docker-compose.yml down -v
```

Requires `swaks` locally (`apt-get install swaks` / `brew install swaks`)
for the fixture script, and Docker/Docker Compose for the stack.

## Why there's no `healthcheck:` in docker-compose.yml

GreenMail's image is built on a bare JRE (`azul/zulu-openjdk`), and
Roundcube's apache image doesn't guarantee a `curl`/`nc` binary either -
both are minimal images, so a `healthcheck:` block invoked *inside* the
container can't safely assume any particular tool is there (this bit us
once already: `/dev/tcp` needs bash, which the JRE image doesn't have).
`wait-for-stack.sh` polls both services from the *host* instead, where we
know bash/curl are available (true on any GitHub Actions runner and on
most dev machines).

## Why one mailbox is enough

The outgoing test (`tests/outgoing.spec.ts`) sends a mail to the same
account it's logged in as, then verifies the header via a direct IMAP
fetch - that's sufficient to prove `add_clacks_overhead()` ran on the
real send path. A second mailbox would only be needed if we cared about
routing between two distinct accounts, which nothing in this plugin does.

## Why fixture mails aren't sent through Roundcube

`add_clacks_overhead()` hooks `message_before_send` and adds the header
to *every* outgoing mail, unconditionally. Sending fixtures through
Roundcube's own compose UI would mean we could never construct a
mail *without* the header - which is exactly the negative test case we
need. So incoming fixtures are injected directly into GreenMail via raw
SMTP (`fixtures/inject-mail.sh`), completely bypassing the plugin.

## CI

Runs in `.github/workflows/e2e.yml`, only on pull requests targeting
`main` (or manually via workflow_dispatch) - it's the slowest job in the
pipeline, so it's intentionally not on every push.
