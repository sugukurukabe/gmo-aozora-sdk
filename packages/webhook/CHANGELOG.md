# Changelog

All notable changes to `@sugukuru/gmo-aozora-webhook` are tracked here.

## 0.4.0

### Added

- HMAC-SHA256 webhook signature verification with `crypto.timingSafeEqual`.
- Framework-agnostic `verifyAndParseWebhookEvent()` helper.
- Express middleware with configurable signature header.
- Zod schemas for `va-deposit-transaction` events.
- Boundary tests for tampered bodies, large bodies, unknown events, and encoding mismatch.
- Package README and npm metadata.

### Changed

- Signature format is base64-encoded HMAC-SHA256.
- Default signature header is `x-webhook-signature`.
- Event envelope fields align with GMO Aozora docs: `notificationId`, `eventType`, `eventTime`, `data`.

### Security

- Middleware now rejects non-`Buffer` bodies instead of reconstructing signed bytes with `JSON.stringify`.
