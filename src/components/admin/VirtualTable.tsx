import { useRef, memo, ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Table, TableHeader, TableRow, TableHead, TableBody } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';

interface Column {
  key: string;
  header: string;
  width?: string;
  className?: string;
}

interface VirtualTableProps<T> {
  data: T[];
  columns: Column[];
  renderRow: (item: T, index: number) => ReactNode;
  rowHeight?: number;
  maxHeight?: string;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  emptyMessage?: string;
}

function VirtualTableInner<T>({
  data,
  columns,
  renderRow,
  rowHeight = 60,
  maxHeight = '600px',
  isLoading = false,
  hasMore = false,
  onLoadMore,
  emptyMessage = 'No data found',
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  const items = virtualizer.getVirtualItems();

  // Handle scroll to bottom for infinite loading
  const handleScroll = () => {
    if (!parentRef.current || !onLoadMore || !hasMore || isLoading) return;
    
    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      onLoadMore();
    }
  };

  if (data.length === 0 && !isLoading) {
    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className} style={{ width: col.width }}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        </Table>
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key} className={col.className} style={{ width: col.width }}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
      </Table>
      
      <div
        ref={parentRef}
        onScroll={handleScroll}
        className="overflow-auto"
        style={{ maxHeight }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          <Table>
            <TableBody>
              {items.map((virtualRow) => {
                const item = data[virtualRow.index];
                return (
                  <TableRow
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {renderRow(item, virtualRow.index)}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}

export const VirtualTable = memo(VirtualTableInner) as typeof VirtualTableInner;
