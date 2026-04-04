import { Download } from 'lucide-react';
import { useState } from 'react';
import { bondPositionsToCsv } from '@/lib/utils/export';
import type { BondPosition } from '@/lib/types/node';
import { Button } from '@/components/ui/button';

export function ExportButton({ bondPositions }: { bondPositions: BondPosition[] }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = () => {
    if (!bondPositions || bondPositions.length === 0) {
      alert('No bond positions to export');
      return;
    }

    setIsLoading(true);

    try {
      const csvData = bondPositionsToCsv(bondPositions);
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', 'thornode-watcher-export-' + new Date().toISOString().split('T')[0] + '.csv');
      link.setAttribute('style', 'display: none');
      document.body.appendChild(link);

      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Error generating CSV:', error);
      alert('Error generating export file');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isLoading}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      <Download className="h-4 w-4" />
      {isLoading ? 'Exporting...' : 'Export CSV'}
    </Button>
  );
}
