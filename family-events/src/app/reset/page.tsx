import { Suspense } from 'react';
import ResetForm from '@/components/ResetForm';

export default function ResetPage({ searchParams }: { searchParams?: { token?: string } }) {
  const token = searchParams?.token ?? '';
  return (
    <Suspense>
      <ResetForm token={token} />
    </Suspense>
  );
}

