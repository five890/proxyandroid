import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => ReactNode;
  className?: string;
  hiddenOnMobile?: boolean;
}

interface ResponsiveTableProps {
  columns: Column[];
  data: any[];
  isLoading?: boolean;
  onRowClick?: (row: any) => void;
  expandedRow?: (row: any) => ReactNode;
  emptyMessage?: string;
}

export function ResponsiveTable({
  columns,
  data,
  isLoading,
  onRowClick,
  expandedRow,
  emptyMessage = "Nenhum dado disponível",
}: ResponsiveTableProps) {
  // Desktop columns (all)
  const desktopColumns = columns;
  
  // Mobile columns (only important ones)
  const mobileColumns = columns.filter(col => !col.hiddenOnMobile);

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin" />
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="p-8">
        <p className="text-center text-muted-foreground">{emptyMessage}</p>
      </Card>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-secondary/30 border-b border-border">
                {desktopColumns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-left text-sm font-semibold text-foreground ${col.className || ""}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-border hover:bg-secondary/20 transition-colors cursor-pointer"
                  onClick={() => onRowClick?.(row)}
                >
                  {desktopColumns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-sm ${col.className || ""}`}
                    >
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {data.map((row, idx) => (
          <Card
            key={idx}
            className="p-4 cursor-pointer hover:bg-secondary/20 transition-colors"
            onClick={() => onRowClick?.(row)}
          >
            <div className="space-y-2">
              {mobileColumns.map((col) => (
                <div key={col.key} className="flex justify-between items-start gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {col.label}
                  </span>
                  <span className="text-sm font-medium text-foreground text-right flex-1">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </span>
                </div>
              ))}
            </div>
            {expandedRow && (
              <div className="mt-3 pt-3 border-t border-border">
                {expandedRow(row)}
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
