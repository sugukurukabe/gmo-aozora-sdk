# Security Policy

## Supported Versions

Security updates are applied to the **latest published minor** of each package
on npm. Older versions may not receive patches.

| Package | Supported |
|---------|-----------|
| `@sugukuru/gmo-aozora-sdk` | latest |
| `@sugukuru/zengin-format` | latest |
| `@sugukuru/gmo-aozora-webhook` | latest |

## Reporting a Vulnerability

**Do not** open a public GitHub issue for security vulnerabilities.

Please report privately via one of:

1. **GitHub Security Advisories** (preferred): use the "Report a vulnerability"
   button on the repository's Security tab.
2. **Email**: contact the maintainers at the address listed in the repository
   `package.json` author field or organization profile.

Include:

- A description of the issue and potential impact
- Steps to reproduce (proof-of-concept if possible)
- Affected package(s) and version(s)

We aim to acknowledge reports within **5 business days** and coordinate a fix
and disclosure timeline with you.

## Security Practices (Consumers)

When integrating this SDK:

- **Never** commit `client_secret`, refresh tokens, or access tokens to git.
  Use `TokenStorage` with KMS/Vault in production.
- **Never** set `NODE_TLS_REJECT_UNAUTHORIZED=0` or disable TLS verification.
- **Webhook**: verify HMAC with `timingSafeEqual` on the **raw** body buffer
  before parsing JSON.
- **Logging**: do not log full HTTP bodies or tokens. Use the `Logger`
  abstraction; sensitive keys in `meta` are redacted by default in
  `ConsoleLogger` — still avoid logging PII in production.

## Disclosure

After a fix is released, we will publish a GitHub Security Advisory and
CHANGELOG entry. Credit will be given to reporters who wish to be named.
