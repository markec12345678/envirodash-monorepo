import * as Sentry from '@sentry/nextjs'

/**
 * Sentry Edge runtime configuration.
 * Activates only if SENTRY_DSN is set.
 */

const SENTRY_DSN = process.env.SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.5 : 1.0,
    release: process.env.NEXT_PUBLIC_APP_VERSION || 'envirodash@1.0.0',
    environment: process.env.NODE_ENV || 'development',
  })
}
