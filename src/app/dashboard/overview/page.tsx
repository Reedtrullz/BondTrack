import { redirect } from 'next/navigation';

export default async function OverviewPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, entry));
    } else if (value !== undefined) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  redirect(query ? `/dashboard?${query}` : '/dashboard');
}
