import { Download } from 'lucide-react';
import { downloadBondCsv } from '@/lib/utils/bond-export';
import type { BondPosition } from '@/lib/types/node';
import { Button } from '@/components/ui/button';

export function ExportButton({ bondPositions }: { bondPositions: BondPosition[] }) {
  const handleExport = () => {
    try {
      downloadBondCsv(bondPositions);
    } catch (error) {
      console.error('Error generating CSV:', error);
    }
  };

  return (
    <Button
      onClick={handleExport}
      variant="outline"
      size="sm"
    >
      <Download className="mr-2 h-4 w-4" />
      Export CSV
    </Button>
  );
}
