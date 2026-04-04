import { redirect } from 'next/navigation';

export default function DashboardPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = props.searchParams;
  const address = searchParams.then(s => s.address);

  return address.then(addr => {
    const qs = addr ? `?address=${encodeURIComponent(addr as string)}` : '';
    redirect(`/dashboard/overview${qs}`);
  });
}
