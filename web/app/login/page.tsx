import { AuthCard } from '@/components/auth/AuthCard'
import { SignInForm } from '@/components/auth/SignInForm'
import { sanitizeRedirectPath } from '@/lib/auth/redirects'

interface Props {
  searchParams: Promise<{ next?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { next, error } = await searchParams
  const errorMessage =
    error === 'invalid_credentials'
      ? 'Invalid email or password.'
      : error === 'missing_credentials'
        ? 'Enter your email and password.'
        : error === 'session_failed'
          ? 'Sign-in could not be completed. Please try again.'
          : error === 'auth_failed'
            ? 'Authentication failed. Try again or contact DEQODE.'
            : null

  return (
    <AuthCard>
      <SignInForm next={sanitizeRedirectPath(next)} />
      {errorMessage && (
        <p className="mt-4 font-mono text-[0.6rem] tracking-[0.1em] text-coral text-center">
          {errorMessage}
        </p>
      )}
    </AuthCard>
  )
}
