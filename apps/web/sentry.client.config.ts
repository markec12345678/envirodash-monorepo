import * as Sentry from '@sentry/nextjs'

/**
 * Sentry client-side configuration.
 *
 * Activates only if NEXT_PUBLIC_SENTRY_DSN is set.
 * Otherwise, no-op (errors just log to console).
 */

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Adjust sampling in production
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    // Ignore common noisy errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered packets',
      // Network errors (not actionable)
      'Network request failed',
      'Failed to fetch',
      // Auth errors (handled by NextAuth)
      'Unauthorized',
    ],

    // Filter out transactions from extensions
    denyUrls: [
      // Browser extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
      /^chrome-extension:\/\//i,
    ],

    // Release tracking
    release: process.env.NEXT_PUBLIC_APP_VERSION || 'envirodash@1.0.0',
    environment: process.env.NODE_ENV || 'development',

    // Replay settings (session replay for debugging)
    replaysSessionSampleRate: 0.1, // 10% of normal sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    integrations: [
      Sentry.replayIntegration({
        // Additional Replay configuration goes in here
        maskAllText: false,
        blockAllMedia: true,
      }),
      Sentry.browserTracingIntegration(),
    ],
  })
}
