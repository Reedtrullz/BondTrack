'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Eye, Shield, BarChart3, AlertTriangle, ArrowRightLeft, Menu, X, ScrollText, Coins, PieChart, Wallet } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { BifrostStatus } from './bifrost-status';
import { cn } from '@/lib/utils';

const basePath = '/dashboard';

const navItems = (addr: string | null) => {
  const addrParam = addr ? `?address=${addr}` : '';
  return [
    { path: `${basePath}/portfolio`, href: `${basePath}/portfolio${addrParam}`, label: 'Portfolio', icon: <Wallet className="w-4 h-4" />, desc: 'Unified portfolio view' },
    { path: `${basePath}/nodes`, href: `${basePath}/nodes${addrParam}`, label: 'Nodes', icon: <Shield className="w-4 h-4" />, desc: 'Validator status' },
    { path: `${basePath}/rewards`, href: `${basePath}/rewards${addrParam}`, label: 'Rewards', icon: <BarChart3 className="w-4 h-4" />, desc: 'Earnings & APY' },
    { path: `${basePath}/lp`, href: `${basePath}/lp${addrParam}`, label: 'LP Status', icon: <Coins className="w-4 h-4" />, desc: 'Liquidity positions' },
    { path: `${basePath}/risk`, href: `${basePath}/risk${addrParam}`, label: 'Risk', icon: <AlertTriangle className="w-4 h-4" />, desc: 'Security metrics' },
    { path: `${basePath}/transactions`, href: `${basePath}/transactions${addrParam}`, label: 'Transactions', icon: <ArrowRightLeft className="w-4 h-4" />, desc: 'Bond & unbond' },
    { path: `${basePath}/changelogs`, href: `${basePath}/changelogs${addrParam}`, label: 'Changelogs', icon: <ScrollText className="w-4 h-4" />, desc: 'Version history' },
    { path: `${basePath}/settings/notifications`, href: `${basePath}/settings/notifications${addrParam}`, label: 'Settings', icon: <PieChart className="w-4 h-4" />, desc: 'Notification preferences' },
  ];
};

interface SidebarProps {
  isOpen?: boolean;
  onCloseAction?: () => void;
}

export function Sidebar({ isOpen = false, onCloseAction }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onCloseAction}
        />
      )}
      
      <aside className={cn(
        "fixed md:relative z-50 md:z-0",
        "w-64 h-screen shrink-0 flex flex-col",
        "border-r border-zinc-200/60 dark:border-zinc-800/60",
        "bg-gradient-to-b from-white/90 to-zinc-50/90 dark:from-zinc-900/90 dark:to-zinc-950/90",
        "backdrop-blur-xl",
        "transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}>
        <button 
          onClick={onCloseAction}
          className="absolute top-4 right-4 md:hidden p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          <Link href="/" className="flex items-center gap-3 px-3 py-3 mb-4 font-bold text-zinc-900 dark:text-zinc-100 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500/80 to-amber-600/80 flex items-center justify-center shadow-lg shadow-amber-500/10 group-hover:shadow-amber-500/20 transition-all duration-300 border border-amber-500/20">
              <Eye className="w-5 h-5 text-amber-500" />
            </div>
            <span className="hidden md:flex flex-col leading-tight">
              <span className="text-lg tracking-tight font-serif italic uppercase">Heimdall</span>
              <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Heimdall</span>
            </span>
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
                onClick={onCloseAction}
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
        </div>
        
        <div className="p-4 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-200/60 dark:border-zinc-800/60 space-y-3">
          <BifrostStatus />
          <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-500/10 to-amber-500/10 dark:from-emerald-500/5 dark:to-amber-500/5 border border-zinc-200/60 dark:border-zinc-800/60">
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
              Heimdall stands watch. Real-time node health and network metrics are synchronized.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

export function MobileMenuButton({ onClickAction }: { onClickAction: () => void }) {
  return (
    <button
      onClick={onClickAction}
      className="md:hidden p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
      aria-label="Open menu"
    >
      <Menu className="w-6 h-6" />
    </button>
  );
}
