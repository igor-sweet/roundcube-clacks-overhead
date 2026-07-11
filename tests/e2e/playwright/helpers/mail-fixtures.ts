import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(__dirname, '../../fixtures/inject-mail.sh');

export type Fixture = 'positive' | 'negative' | 'whitespace' | 'xss';

/**
 * Injects a fixture mail straight into GreenMail via SMTP, bypassing
 * Roundcube entirely (see fixtures/inject-mail.sh for why that matters
 * for the negative test case).
 *
 * Returns the actual subject used, which includes a nonce -
 * inject-mail.sh appends one because the mailbox is shared and persists
 * across runs, so a static subject would collide with leftovers from a
 * previous run (or a concurrently running test) and break "click the row
 * with this subject" selectors.
 */
export function injectFixture(fixture: Fixture): string {
  const output = execFileSync('bash', [SCRIPT, fixture], {
    env: process.env,
    encoding: 'utf8',
  });

  const match = output.match(/^FIXTURE_SUBJECT=(.+)$/m);
  if (!match) {
    throw new Error(`inject-mail.sh did not report a FIXTURE_SUBJECT line. Output was:\n${output}`);
  }

  return match[1];
}
