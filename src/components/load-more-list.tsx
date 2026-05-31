"use client";

import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { PLAYERS_LIST_PAGE_SIZE } from "@/lib/pagination";

interface LoadMoreListProps<T> {
  items: T[];
  pageSize?: number;
  renderItem: (item: T) => ReactNode;
  getKey: (item: T) => string | number;
  className?: string;
}

export function LoadMoreList<T>({
  items,
  pageSize = PLAYERS_LIST_PAGE_SIZE,
  renderItem,
  getKey,
  className,
}: LoadMoreListProps<T>) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const visibleItems = items.slice(0, visibleCount);
  const remaining = items.length - visibleCount;

  return (
    <div className={className}>
      {visibleItems.map((item) => (
        <div key={getKey(item)}>{renderItem(item)}</div>
      ))}

      {remaining > 0 && (
        <Button
          type="button"
          variant="outline"
          className="mt-2 w-full"
          onClick={() => setVisibleCount((count) => count + pageSize)}
        >
          Load more ({remaining} remaining)
        </Button>
      )}
    </div>
  );
}
