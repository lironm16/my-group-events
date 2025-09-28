import { Suspense } from 'react';
import SignupForm from '@/components/SignupForm';

export default function SignupPage({ searchParams }: { searchParams?: { code?: string } }) {
  const code = searchParams?.code ?? '';
  return (
    <Suspense>
      <SignupForm initialCode={code} />
    </Suspense>
  );
}

