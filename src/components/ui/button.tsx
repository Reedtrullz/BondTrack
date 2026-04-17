import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 hover:shadow-lg focus-visible:ring-zinc-500',
        primary:
          'bg-amber-500 text-white shadow-md shadow-amber-500/25 hover:bg-amber-600 hover:shadow-xl hover:shadow-amber-500/30 focus-visible:ring-amber-500',
        glow:
          'bg-amber-500 text-white shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:bg-amber-600 focus-visible:ring-amber-500',
        success:
          'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 hover:bg-emerald-600 hover:shadow-xl hover:shadow-emerald-500/30 focus-visible:ring-emerald-500',
        destructive: 'bg-red-500 text-white shadow-md shadow-red-500/25 hover:bg-red-600 hover:shadow-xl hover:shadow-red-500/30 focus-visible:ring-red-500',
        outline:
          'border border-zinc-200 bg-transparent shadow-sm hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 focus-visible:ring-zinc-500',
        glass:
          'bg-white/60 dark:bg-zinc-800/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 shadow-sm hover:bg-white/80 dark:hover:bg-zinc-800/80 focus-visible:ring-zinc-500',
        secondary:
          'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 focus-visible:ring-zinc-500',
        ghost: 'hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 focus-visible:ring-zinc-500',
        link: 'text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100 focus-visible:ring-zinc-500',
      },
      size: {
        default: 'h-10 px-5 py-2.5',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-lg px-8 text-base',
        xl: 'h-14 rounded-lg px-10 text-lg',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
