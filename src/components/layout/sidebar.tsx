'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Shield, Activity, BarChart3, AlertTriangle, ArrowRightLeft, Menu, X, ScrollText, Coins } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';

const basePath = '/dashboard';

const navItems = (addr: string | null) => [
  { href: `${basePath}/overview?address=${addr}`, label: 'Overview', icon: <Activity className="w-4 h-4" /> },
  { href: `${basePath}/nodes?address=${addr}`, label: 'Nodes', icon: <Shield className="w-4 h-4" /> },
  { href: `${basePath}/rewards?address=${addr}`, label: 'Rewards', icon: <BarChart3 className="w-4 h-4" /> },
  { href: `${basePath}/risk?address=${addr}`, label: 'Risk', icon: <AlertTriangle className="w-4 h-4" /> },
   { href: `${basePath}/transactions?address=${addr}`, label: 'Transactions', icon: <ArrowRightLeft className="w-4 h-4" /> },
   { href: `${basePath}/lp?address=${addr}`, label: 'LP Status', icon: <Coins className="w-4 h-4" /> },
   { href: `${basePath}/changelogs?address=${addr}`, label: 'Changelogs', icon: <ScrollText className="w-4 h-4" /> },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}
      
      <aside className={`
        fixed md:relative z-50 md:z-0
        w-56 h-screen
        border-r border-zinc-200 dark:border-zinc-800 
        bg-white dark:bg-zinc-950 
        p-4 space-y-1
        transform transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 md:hidden p-1 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          <X className="w-5 h-5" />
        </button>

        <Link href="/" className="flex items-center gap-2 px-3 py-2 mb-4 font-semibold text-zinc-900 dark:text-zinc-100">
          <Shield className="w-5 h-5 text-blue-600" />
          <span className="hidden md:inline">THORNode Watcher</span>
          <span className="md:hidden">Watcher</span>
        </Link>
        
        <div className="px-3 py-2">
          <ThemeToggle />
        </div>
        
        {navItems(address).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
            aria-label={`Navigate to ${item.label} page`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </aside>
    </>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="md:hidden p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
      aria-label="Open menu"
    >
      <Menu className="w-6 h-6" />
    </button>
  );
}
