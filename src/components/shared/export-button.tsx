'use client';

import { useId, useState } from 'react';
import { AlertCircle, Download } from 'lucide-react';
import { downloadBondCsv } from '@/lib/utils/bond-export';
import type { BondPosition } from '@/lib/types/node';
import { Button } from '@/components/ui/button';

const BOND_CSV_EXPORT_FAILURE =
  'Bond CSV export failed. No file was downloaded. Try again after source data is available.';

export function ExportButton({ bondPositions }: { bondPositions: BondPosition[] }) {
  const [exportError, setExportError] = useState<string | null>(null);
  const errorId = useId();

  const handleExport = () => {
    setExportError(null);

    try {
      downloadBondCsv(bondPositions);
    } catch {
      setExportError(BOND_CSV_EXPORT_FAILURE);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <Button
        onClick={handleExport}
        variant="outline"
        size="sm"
        aria-describedby={exportError ? errorId : undefined}
      >
        <Download className="mr-2 h-4 w-4" />
        Export CSV
      </Button>
      {exportError ? (
        <p
          id={errorId}
          role="alert"
          className="flex max-w-xs items-start gap-2 text-xs text-red-600 dark:text-red-400"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden="true" />
          <span>{exportError}</span>
        </p>
      ) : null}
    </div>
  );
}
