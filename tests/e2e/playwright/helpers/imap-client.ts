import { ImapFlow } from 'imapflow';

/**
 * Fetches the raw header block of the most recent message with the given
 * subject, directly via IMAP. Used for the outgoing test: Playwright can
 * drive the Roundcube UI to send a mail, but only IMAP lets us verify the
 * *actual wire header* the plugin's message_before_send hook produced -
 * checking the UI alone wouldn't prove the header exists in the message.
 */
export async function fetchRawHeadersBySubject(
  host: string,
  port: number,
  user: string,
  pass: string,
  subject: string,
): Promise<string> {
  const client = new ImapFlow({
    host,
    port,
    secure: false,
    auth: { user, pass },
    logger: false,
  });

  await client.connect();
  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      // Search newest-first; GreenMail delivers fast, but CI runners can
      // still be slow, so give it a moment before giving up.
      let uid: number | undefined;
      for (let attempt = 0; attempt < 10 && uid === undefined; attempt++) {
        const results = await client.search({ header: { subject } }, { uid: true });
        if (results && results.length > 0) {
          if (results.length > 1) {
            // The whole point of nonce/timestamp-suffixed subjects is that
            // exactly one message should ever match. More than one means
            // that assumption broke somewhere - fail loudly rather than
            // silently trusting "the highest UID is the right one".
            throw new Error(
              `Expected exactly one message with subject "${subject}", found ${results.length} (UIDs: ${results.join(', ')})`,
            );
          }
          uid = results[0];
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (uid === undefined) {
        throw new Error(`No message with subject "${subject}" found in INBOX`);
      }

      const message = await client.fetchOne(uid, { source: true }, { uid: true });
      if (!message || !message.source) {
        throw new Error(`Could not fetch source for message UID ${uid}`);
      }

      const raw = message.source.toString('utf8');
      return raw.slice(0, raw.indexOf('\r\n\r\n') !== -1 ? raw.indexOf('\r\n\r\n') : raw.length);
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}
