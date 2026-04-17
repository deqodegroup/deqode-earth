import { AuthCard } from '@/components/auth/AuthCard'
import { SignInForm } from '@/components/auth/SignInForm'

interface Props {
  searchParams: Promise<{ next?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { next, error } = await searchParams
  return (
    <AuthCard>
      <SignInForm next={next ?? '/dashboard'} />
      {error === 'auth_failed' && (
        <p className="mt-4 font-mono text-[0.6rem] tracking-[0.1em] text-coral text-center">
          Authentication failed. Try again or contact DEQODE.
        </p>
      )}
    </AuthCard>
  )
}
