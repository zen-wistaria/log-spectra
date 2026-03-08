import { useEffect, useMemo, useState } from "react";

export function useAsyncSelect<T extends { id: string | number | null }>(
  defaultId: string | number | null,
  queryResult: {
    data?: { data?: T[] };
    isLoading: boolean;
    // biome-ignore lint/suspicious/noExplicitAny: ...
    refetch?: (params?: any) => Promise<any>; // eslint-disable-line
  },
  defaultItem?: T | null,
  findSelected?: (items: T[], id: string | number | null) => T | undefined,
) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<T | null>(null);
  const [manualSelect, setManualSelect] = useState(false);

  const items: T[] = useMemo(() => {
    return queryResult?.data?.data ?? [];
  }, [queryResult?.data]);

  const isLoading = queryResult.isLoading;

  // Autoselect initial
  useEffect(() => {
    if (manualSelect) return;
    if (!selected && defaultId) {
      if (defaultItem && defaultItem.id === defaultId) {
        setSelected(defaultItem);
        return;
      }

      if (items.length > 0) {
        const found = findSelected
          ? findSelected(items, defaultId)
          : items.find((x) => x.id === defaultId);

        if (found) setSelected(found);
      }
    }
  }, [items, defaultId, selected, findSelected, manualSelect, defaultItem]);

  const handleSelect = (item: T | null) => {
    setManualSelect(true);
    setSelected(item);
    setOpen(false);
  };

  return {
    open,
    setOpen,
    selected,
    setSelected,
    items,
    isLoading,
    handleSelect,
  };
}
