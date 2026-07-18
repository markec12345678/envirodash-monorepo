import * as Sentry from '@sentry/nextjs'

/**
 * Sentry server-side configuration.
 * Activates only if SENTRY_DSN is set.
 */

const SENTRY_DSN = process.env.SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Adjust sampling in production
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.5 : 1.0,

    // Release tracking
    release: process.env.NEXT_PUBLIC_APP_VERSION || 'envirodash@1.0.0',
    environment: process.env.NODE_ENV || 'development',

    // Ignore noisy errors
    ignoreErrors: [
      'Unauthorized',
      'Invalid API key',
      'No active alerts', // Not an error, just no data
    ],
  })
}
