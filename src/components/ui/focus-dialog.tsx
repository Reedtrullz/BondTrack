'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface FocusDialogProps {
  open: boolean;
  titleId: string;
  children: ReactNode;
  onClose: () => void;
  descriptionId?: string;
  className?: string;
  overlayClassName?: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

export function FocusDialog({
  open,
  titleId,
  descriptionId,
  children,
  onClose,
  className,
  overlayClassName,
  initialFocusRef,
}: FocusDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const [portalNode, setPortalNode] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = document.createElement('div');
    node.setAttribute('data-focus-dialog-root', 'true');
    setPortalNode(node);

    return () => {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
      setPortalNode(null);
    };
  }, []);

  useEffect(() => {
    if (!open || !portalNode) return;

    if (!portalNode.parentNode) {
      document.body.appendChild(portalNode);
    }
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const inertedElements: Array<{ element: HTMLElement; ariaHidden: string | null; inert: boolean }> = [];
    Array.from(document.body.children).forEach((child) => {
      if (child === portalNode || !(child instanceof HTMLElement)) return;
      inertedElements.push({
        element: child,
        ariaHidden: child.getAttribute('aria-hidden'),
        inert: child.inert,
      });
      child.setAttribute('aria-hidden', 'true');
      child.inert = true;
    });

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTarget = initialFocusRef?.current ?? dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ?? dialogRef.current;
    window.setTimeout(() => focusTarget?.focus(), 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((element) => !element.hasAttribute('disabled') && element.offsetParent !== null);

      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      inertedElements.forEach(({ element, ariaHidden, inert }) => {
        if (ariaHidden === null) {
          element.removeAttribute('aria-hidden');
        } else {
          element.setAttribute('aria-hidden', ariaHidden);
        }
        element.inert = inert;
      });
      if (portalNode.parentNode) {
        portalNode.parentNode.removeChild(portalNode);
      }
      previouslyFocusedRef.current?.focus();
    };
  }, [initialFocusRef, onClose, open, portalNode]);

  if (!open || !portalNode) return null;

  return createPortal(
    <div className={cn('fixed inset-0 z-50 flex items-center justify-center', className)}>
      <button
        type="button"
        aria-label="Close dialog"
        className={cn('absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm', overlayClassName)}
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="relative z-10 outline-none"
      >
        {children}
      </div>
    </div>,
    portalNode
  );
}
