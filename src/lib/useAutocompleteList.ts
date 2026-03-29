import { useCallback, useEffect, useMemo, useState } from "react";

type UseAutocompleteListArgs<T> = {
  items: T[];
  query: string;
  isOpen: boolean;
  getSearchText: (item: T) => string;
  onSelect: (item: T) => void;
  hideWhenExactMatch?: boolean;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function useAutocompleteList<T>({
  items,
  query,
  isOpen,
  getSearchText,
  onSelect,
  hideWhenExactMatch = false,
}: UseAutocompleteListArgs<T>) {
  const normalizedQuery = normalize(query);

  const filteredItems = useMemo(() => {
    if (!normalizedQuery) return items;
    return items.filter((item) => normalize(getSearchText(item)).includes(normalizedQuery));
  }, [items, normalizedQuery, getSearchText]);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [normalizedQuery, isOpen, items.length]);

  const isExactMatch = useMemo(() => {
    if (!hideWhenExactMatch || !normalizedQuery || filteredItems.length !== 1) return false;
    return normalize(getSearchText(filteredItems[0])) === normalizedQuery;
  }, [filteredItems, getSearchText, hideWhenExactMatch, normalizedQuery]);

  const isVisible = isOpen && filteredItems.length > 0 && !isExactMatch;

  const selectAt = useCallback((index: number) => {
    const item = filteredItems[index];
    if (!item) return;
    onSelect(item);
  }, [filteredItems, onSelect]);

  const selectActive = useCallback(() => {
    const index = Math.max(0, Math.min(activeIndex, filteredItems.length - 1));
    selectAt(index);
  }, [activeIndex, filteredItems.length, selectAt]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isVisible) return false;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filteredItems.length);
      return true;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
      return true;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      selectActive();
      return true;
    }

    return false;
  }, [filteredItems.length, isVisible, selectActive]);

  return {
    filteredItems,
    activeIndex,
    isVisible,
    setActiveIndex,
    selectAt,
    selectActive,
    handleKeyDown,
  };
}
