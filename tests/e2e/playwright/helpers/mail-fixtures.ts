import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(__dirname, '../../fixtures/inject-mail.sh');

export type Fixture = 'positive' | 'negative' | 'whitespace' | 'xss';

export interface InjectedFixture {
  /**
   * The actual subject used, which includes a nonce - inject-mail.sh
   * appends one because the mailbox is shared and persists across runs,
   * so a static subject would collide with leftovers from a previous run
   * (or a concurrently running test) and break "click the row with this
   * subject" selectors.
   */
  subject: string;
  /**
   * The exact X-Clacks-Overhead value that was sent (empty string for
   * 'negative', which sends no header at all). Lets a caller derive
   * expectations from what was actually sent instead of hardcoding a
   * second, independent copy of the same value.
   */
  value: string;
}

/**
 * Injects a fixture mail straight into GreenMail via SMTP, bypassing
 * Roundcube entirely (see fixtures/inject-mail.sh for why that matters
 * for the negative test case).
 */
export function injectFixture(fixture: Fixture): InjectedFixture {
  const output = execFileSync('bash', [SCRIPT, fixture], {
    env: process.env,
    encoding: 'utf8',
  });

  const subjectMatch = output.match(/^FIXTURE_SUBJECT=(.+)$/m);
  if (!subjectMatch) {
    throw new Error(`inject-mail.sh did not report a FIXTURE_SUBJECT line. Output was:\n${output}`);
  }
  const valueMatch = output.match(/^FIXTURE_VALUE=(.*)$/m);
  if (!valueMatch) {
    throw new Error(`inject-mail.sh did not report a FIXTURE_VALUE line. Output was:\n${output}`);
  }

  return { subject: subjectMatch[1], value: valueMatch[1] };
}
