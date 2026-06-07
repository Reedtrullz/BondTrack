import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Learn | Heimdall',
  description: 'Educational resources for THORChain bond providers and LP participants',
};

export default function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {children}
    </div>
  );
}
