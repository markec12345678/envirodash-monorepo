import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import EmailProvider from 'next-auth/providers/email'

/**
 * EnviroDash Auth Configuration
 *
 * Supports multiple authentication methods:
 *   1. Credentials (demo + any email with password "demo")
 *   2. Google OAuth (requires GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET)
 *   3. GitHub OAuth (requires GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET)
 *   4. Email/Magic Link (requires SMTP config + database adapter)
 *   5. SAML/SSO (via @auth/saml-provider — see Enterprise SSO section below)
 *
 * Multi-tenant fields in JWT/session:
 *   - role: 'admin' | 'user'
 *   - tenantId: per-user tenant identifier
 *   - plan: 'free' | 'pro' | 'enterprise'
 *
 * Demo credentials:
 *   Email: demo@envirodash.si
 *   Password: envirodash
 *   (Any email + password "demo" also works)
 *
 * To enable OAuth providers:
 *   1. Google: https://console.cloud.google.com/apis/credentials
 *      - Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env
 *      - Authorized redirect: http://localhost:3000/api/auth/callback/google
 *   2. GitHub: https://github.com/settings/developers
 *      - Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env
 *      - Authorization callback URL: http://localhost:3000/api/auth/callback/github
 *   3. SAML/SSO Enterprise:
 *      - Install: bun add @auth/saml-provider
 *      - Import SAMLProvider from '@auth/saml-provider'
 *      - Configure with SAML_IDP_METADATA_URL or SAML_IDP_CERT + SAML_IDP_ENTITY_ID
 *      - See: https://next-auth.js.org/providers/saml
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

// Build providers array — only include OAuth providers if env vars are set
const providers: any[] = [
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

      // Demo authentication
      if (
        credentials.email === DEMO_USER.email &&
        credentials.password === 'envirodash'
      ) {
        return DEMO_USER as any
      }

      // Any email with password "demo"
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
]

// Google OAuth (activates automatically if env vars are set)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          scope: 'openid email profile',
        },
      },
    })
  )
  console.log('[Auth] Google OAuth enabled')
}

// GitHub OAuth (activates automatically if env vars are set)
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      authorization: {
        params: { scope: 'read:user user:email' },
      },
    })
  )
  console.log('[Auth] GitHub OAuth enabled')
}

// Email/Magic Link (activates if SMTP is configured)
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  providers.push(
    EmailProvider({
      server: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: parseInt(process.env.SMTP_PORT || '587') === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      },
      from: process.env.SMTP_FROM || 'EnviroDash <noreply@envirodash.si>',
      // In production, add a database adapter to store verification tokens:
      // adapter: PrismaAdapter(prisma),
    })
  )
  console.log('[Auth] Email/Magic Link enabled')
}

// SAML/SSO Enterprise (requires @auth/saml-provider package)
// To enable:
//   1. bun add @auth/saml-provider
//   2. Uncomment the code below
//   3. Set SAML_IDP_METADATA_URL or SAML_IDP_CERT + SAML_IDP_ENTITY_ID
//
// if (process.env.SAML_IDP_METADATA_URL || process.env.SAML_IDP_CERT) {
//   const SAMLProvider = (await import('@auth/saml-provider')).default
//   providers.push(
//     SAMLProvider({
//       id: 'saml',
//       name: 'Enterprise SSO',
//       // Option A: Identity Provider metadata URL (recommended)
//       metadataUrl: process.env.SAML_IDP_METADATA_URL,
//       // Option B: Manual configuration
//       idpEntityId: process.env.SAML_IDP_ENTITY_ID,
//       idpCert: process.env.SAML_IDP_CERT,
//       idpSsoUrl: process.env.SAML_IDP_SSO_URL,
//       spEntityId: process.env.SAML_SP_ENTITY_ID || 'https://envirodash.si',
//       // Attribute mapping
//       // emailAttribute: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
//       // nameAttribute: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
//     })
//   )
//   console.log('[Auth] SAML/SSO Enterprise enabled')
// }

export const authOptions: NextAuthOptions = {
  providers,

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign-in
      if (user) {
        token.role = (user as any).role || 'user'
        token.tenantId = (user as any).tenantId || `tenant-${Date.now()}`
        token.plan = (user as any).plan || 'free'

        // For OAuth providers, set up user from provider data
        if (account?.provider && account.provider !== 'credentials') {
          token.provider = account.provider
          // In production, look up or create user in database here
          // const dbUser = await prisma.user.upsert({
          //   where: { email: user.email! },
          //   create: { email: user.email!, name: user.name, image: user.image, tenantId: ... },
          //   update: { name: user.name, image: user.image },
          // })
          // token.role = dbUser.role
          // token.tenantId = dbUser.tenantId
          // token.plan = dbUser.plan
        }
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.sub
        ;(session.user as any).role = token.role
        ;(session.user as any).tenantId = token.tenantId
        ;(session.user as any).plan = token.plan
        ;(session.user as any).provider = token.provider
      }
      return session
    },
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
}
