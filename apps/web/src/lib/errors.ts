/**
 * Error reporting utility.
 *
 * If Sentry is initialized (SENTRY_DSN env var set), errors are sent to Sentry.
 * Otherwise, they're logged to console with structured format.
 *
 * Usage:
 *   import { reportError } from '@/lib/errors'
 *
 *   try {
 *     await riskyOperation()
 *   } catch (e) {
 *     reportError(e, { context: 'fetching air quality', userId: '123' })
 *   }
 */

interface ErrorContext {
  [key: string]: any
}

export function reportError(error: Error | string | unknown, context: ErrorContext = {}) {
  const err = error instanceof Error ? error : new Error(String(error))

  // Attach context as extra data
  Object.entries(context).forEach(([key, value]) => {
    ;(err as any)[key] = value
  })

  // Try Sentry first (works on both client and server)
  try {
    // Dynamic import to avoid loading Sentry if not installed
    import('@sentry/nextjs')
      .then((Sentry) => {
        if (Sentry.captureException) {
          Sentry.captureException(err, {
            extra: context,
            tags: {
              component: context.component,
              action: context.action,
            },
          })
        }
      })
      .catch(() => {
        // Sentry not available, fall through to console
      })
  } catch {
    // Sentry not available
  }

  // Always log to console with structured format
  console.error('[EnviroDash Error]', {
    message: err.message,
    name: err.name,
    stack: err.stack,
    context,
    timestamp: new Date().toISOString(),
  })

  return err
}

/**
 * Report a message (non-error) to Sentry/console.
 */
export function reportMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context: ErrorContext = {}) {
  try {
    import('@sentry/nextjs')
      .then((Sentry) => {
        if (Sentry.captureMessage) {
          Sentry.captureMessage(message, level)
        }
      })
      .catch(() => {})
  } catch {
    // ignore
  }

  const logFn = level === 'error' ? console.error : level === 'warning' ? console.warn : console.info
  logFn('[EnviroDash]', message, context)
}

/**
 * Wrap an async function with error reporting.
 * Returns the result or null on error.
 */
export function withErrorReporting<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: ErrorContext = {}
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (e) {
      reportError(e, { ...context, args: args.slice(0, 3) })
      throw e
    }
  }) as T
}
