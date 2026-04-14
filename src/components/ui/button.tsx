import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-zinc-900 text-zinc-50 shadow-lg shadow-zinc-900/20 hover:shadow-xl hover:shadow-emerald-500/20 hover:bg-zinc-900/90 dark:bg-zinc-50 dark:text-zinc-900 dark:shadow-zinc-950/30 dark:hover:shadow-emerald-500/20 dark:hover:bg-zinc-50/90 focus-visible:ring-emerald-500',
        destructive: 'bg-red-500 text-zinc-50 shadow-sm hover:bg-red-500/90 focus-visible:ring-red-500',
        outline:
          'border border-zinc-200 bg-white shadow-sm hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 focus-visible:ring-zinc-500',
        secondary:
          'bg-zinc-100 text-zinc-900 shadow-sm hover:bg-zinc-100/80 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-800/80 focus-visible:ring-zinc-500',
        ghost: 'hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 focus-visible:ring-zinc-500',
        link: 'text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50 focus-visible:ring-zinc-500',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
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
