import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

/**
 * EnviroDash Auth Configuration
 *
 * For v1 we use a Credentials provider with a hardcoded demo user.
 * In production, replace with:
 *   - Google OAuth provider
 *   - GitHub OAuth provider
 *   - Email/Magic link provider
 *   - Database adapter (Prisma + PostgreSQL)
 *
 * Demo credentials:
 *   Email: demo@envirodash.si
 *   Password: envirodash
 */

const DEMO_USER = {
  id: '1',
  email: 'demo@envirodash.si',
  name: 'Demo User',
  image: null,
  role: 'admin' as const,
  tenantId: 'demo-tenant',
  plan: 'free' as const,
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'demo@envirodash.si' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Demo authentication — replace with real DB lookup in production
        if (
          credentials.email === DEMO_USER.email &&
          credentials.password === 'envirodash'
        ) {
          return DEMO_USER as any
        }

        // For demo: also accept any email with password "demo"
        if (credentials.password === 'demo') {
          return {
            ...DEMO_USER,
            id: '2',
            email: credentials.email,
            name: credentials.email.split('@')[0] || 'User',
            role: 'user' as const,
            tenantId: `tenant-${credentials.email.split('@')[0]}`,
            plan: 'free' as const,
          } as any
        }

        return null
      },
    }),

    // Uncomment these in production with real OAuth credentials:

    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // }),

    // GitHubProvider({
    //   clientId: process.env.GITHUB_CLIENT_ID!,
    //   clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    // }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role || 'user'
        token.tenantId = (user as any).tenantId
        token.plan = (user as any).plan || 'free'
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.sub
        ;(session.user as any).role = token.role
        ;(session.user as any).tenantId = token.tenantId
        ;(session.user as any).plan = token.plan
      }
      return session
    },
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
}
