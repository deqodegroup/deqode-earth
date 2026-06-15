import { AuthCard } from '@/components/auth/AuthCard'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next: rawNext } = await searchParams
  const next =
    rawNext?.startsWith('/') && !rawNext.startsWith('//')
      ? rawNext
      : '/dashboard'

  return (
    <AuthCard>
      <ResetPasswordForm next={next} />
    </AuthCard>
  )
}
