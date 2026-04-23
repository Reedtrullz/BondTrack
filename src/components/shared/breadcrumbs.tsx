'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

export function Breadcrumbs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  const addressParam = address ? `?address=${address}` : '';

  const segments = pathname.split('/').filter(Boolean);
  
  // Skip the 'dashboard' segment as it's our base
  const breadcrumbItems = segments
    .filter(segment => segment !== 'dashboard')
    .map((segment, index, array) => {
      const href = `/dashboard/${array.slice(0, index + 1).join('/')}${addressParam}`;
      const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
      const isLast = index === array.length - 1;

      return {
        label,
        href,
        isLast
      };
    });

  if (breadcrumbItems.length === 0) return null;

  return (
    <nav className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-400 dark:text-zinc-500 mb-2 overflow-x-auto no-scrollbar whitespace-nowrap">
      <Link 
        href={`/dashboard/overview${addressParam}`}
        className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
      >
        <Home className="w-3 h-3" />
        <span>Dashboard</span>
      </Link>
      
      {breadcrumbItems.map((item) => (
        <div key={item.href} className="flex items-center gap-1.5">
          <ChevronRight className="w-3 h-3 opacity-50" />
          {item.isLast ? (
            <span className="text-zinc-900 dark:text-zinc-100 font-semibold truncate max-w-[120px]">
              {item.label}
            </span>
          ) : (
            <Link 
              href={item.href}
              className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
