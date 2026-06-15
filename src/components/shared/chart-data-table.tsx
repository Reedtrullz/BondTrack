interface ChartDataTableProps {
  caption: string;
  columns: string[];
  rows: Array<Array<string | number>>;
}

export function ChartDataTable({ caption, columns, rows }: ChartDataTableProps) {
  if (rows.length === 0) return null;

  return (
    <div className="sr-only">
      <div role="table" aria-label={caption} className="w-px max-w-px overflow-hidden">
        <div role="rowgroup" className="w-px max-w-px overflow-hidden">
          <div role="row" className="w-px max-w-px overflow-hidden">
            {columns.map((column) => (
              <span key={column} role="columnheader" className="block w-px max-w-px overflow-hidden">
                {column}
              </span>
            ))}
          </div>
        </div>
        <div role="rowgroup" className="w-px max-w-px overflow-hidden">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} role="row" className="w-px max-w-px overflow-hidden">
              {row.map((cell, cellIndex) => (
                <span key={cellIndex} role="cell" className="block w-px max-w-px overflow-hidden">
                  {cell}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
