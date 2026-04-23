'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Eye, Shield, Activity, BarChart3, AlertTriangle, ArrowRightLeft, Menu, X, ScrollText, Coins, Zap } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { cn } from '@/lib/utils';

const basePath = '/dashboard';

const navItems = (addr: string | null) => {
  const addrParam = addr ? `?address=${addr}` : '';
  return [
    { path: `${basePath}/overview`, href: `${basePath}/overview${addrParam}`, label: 'Overview', icon: <Activity className="w-4 h-4" />, desc: 'Portfolio at a glance' },
    { path: `${basePath}/nodes`, href: `${basePath}/nodes${addrParam}`, label: 'Nodes', icon: <Shield className="w-4 h-4" />, desc: 'Validator status' },
    { path: `${basePath}/rewards`, href: `${basePath}/rewards${addrParam}`, label: 'Rewards', icon: <BarChart3 className="w-4 h-4" />, desc: 'Earnings & APY' },
    { path: `${basePath}/risk`, href: `${basePath}/risk${addrParam}`, label: 'Risk', icon: <AlertTriangle className="w-4 h-4" />, desc: 'Security metrics' },
    { path: `${basePath}/transactions`, href: `${basePath}/transactions${addrParam}`, label: 'Transactions', icon: <ArrowRightLeft className="w-4 h-4" />, desc: 'Bond & unbond' },
    { path: `${basePath}/lp`, href: `${basePath}/lp${addrParam}`, label: 'LP Status', icon: <Coins className="w-4 h-4" />, desc: 'Liquidity positions' },
    { path: `${basePath}/changelogs`, href: `${basePath}/changelogs${addrParam}`, label: 'Changelogs', icon: <ScrollText className="w-4 h-4" />, desc: 'Version history' },
  ];
};

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}
      
      <aside className={cn(
        "fixed md:relative z-50 md:z-0",
        "w-64 h-screen",
        "border-r border-zinc-200/60 dark:border-zinc-800/60",
        "bg-gradient-to-b from-white/90 to-zinc-50/90 dark:from-zinc-900/90 dark:to-zinc-950/90",
        "backdrop-blur-xl",
        "p-4 space-y-2",
        "transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}>
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 md:hidden p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <Link href="/" className="flex items-center gap-3 px-3 py-3 mb-4 font-bold text-zinc-900 dark:text-zinc-100 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500/80 to-amber-600/80 flex items-center justify-center shadow-lg shadow-amber-500/10 group-hover:shadow-amber-500/20 transition-all duration-300 border border-amber-500/20">
            <Eye className="w-5 h-5 text-amber-500" />
          </div>
          <span className="hidden md:inline text-lg tracking-tight font-serif italic uppercase">Heimdall</span>
          <span className="md:hidden">H</span>
        </Link>
        
        <div className="px-3 py-2">
          <ThemeToggle />
        </div>
        
        <div className="pt-2 pb-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
          <p className="px-3 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Navigation</p>
        </div>
        
        {navItems(address).map((item) => {
          const isActive = pathname === item.path;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                "text-zinc-600 dark:text-zinc-400",
                "hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100",
                "group relative overflow-hidden",
                isActive && "bg-zinc-100 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100"
              )}
              aria-label={`Navigate to ${item.label} page`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="relative z-10 flex items-center gap-3">
                <span className={cn(
                  "transition-colors duration-200",
                  isActive ? "text-amber-500" : ""
                )}>{item.icon}</span>
                <span className="hidden md:inline">{item.label}</span>
              </span>
              <span className="hidden lg:flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-500 absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.desc}
              </span>
            </Link>
          );
        })}
        
        <div className="absolute bottom-6 left-4 right-4">
          <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-500/10 to-amber-500/10 dark:from-emerald-500/5 dark:to-amber-500/5 border border-zinc-200/60 dark:border-zinc-800/60">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Live Data</span>
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
              Real-time node health, rewards, and network metrics
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="md:hidden p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
      aria-label="Open menu"
    >
      <Menu className="w-6 h-6" />
    </button>
  );
}
