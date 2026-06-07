import { redirect } from 'next/navigation';

export default async function DashboardPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const addressParam = searchParams.address;
  const address = Array.isArray(addressParam) ? addressParam[0] : addressParam;
  const qs = address ? `?address=${encodeURIComponent(address)}` : '';

  redirect(`/dashboard/portfolio${qs}`);
}
