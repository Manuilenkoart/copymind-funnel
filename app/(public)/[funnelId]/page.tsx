import { redirect } from 'next/navigation';

import { withParams } from '@/app/lib/url';

export default async function FunnelLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ funnelId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { funnelId } = await params;
  const sp = await searchParams;
  redirect(withParams(`/${funnelId}/0`, sp));
}
