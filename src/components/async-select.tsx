"use client";

import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface AsyncSelectItem {
  id: string | number | null;
  label?: string;
  // biome-ignore lint/suspicious/noExplicitAny: ...
  [key: string]: any;
}

interface AsyncSelectProps<T extends AsyncSelectItem> {
  open: boolean;
  setOpen: (value: boolean) => void;

  selected: T | null;
  onSelect: (item: T | null) => void;

  search: string;
  setSearch: (value: string) => void;

  isLoading: boolean;
  items: T[];

  placeholderEmptySelected?: string;
  placeholderSearch?: string;
  getLabel: (item: T) => string;
  doingSearchText?: string;
  emptySearchText?: string;
  customLabel?: (item: T) => React.ReactNode;
}

export function AsyncSelect<T extends AsyncSelectItem>({
  open,
  setOpen,
  selected,
  search,
  setSearch,
  isLoading,
  items,
  onSelect,
  placeholderEmptySelected = "Select...",
  placeholderSearch = "Search...",
  getLabel = (item) => item.label ?? "",
  emptySearchText = "Not found",
  doingSearchText = "Searching...",
  customLabel,
}: AsyncSelectProps<T>) {
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between bg-transparent py-5"
        >
          <span>
            {selected
              ? (customLabel?.(selected) ?? getLabel(selected))
              : placeholderEmptySelected}
          </span>
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="min-w-full p-0 md:min-w-md lg:min-w-lg"
        align="start"
      >
        <Command>
          <CommandInput
            placeholder={placeholderSearch}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList
            className="max-h-[200px] overflow-y-auto"
            onWheel={(e) => {
              const el = e.currentTarget as HTMLElement;
              if (el.scrollHeight > el.clientHeight) {
                el.scrollTop += e.deltaY;
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          >
            {isLoading && <CommandEmpty>{doingSearchText}</CommandEmpty>}
            {!isLoading && items.length === 0 && (
              <CommandEmpty>{emptySearchText}</CommandEmpty>
            )}

            <CommandGroup>
              {/* None Option */}
              <CommandItem
                onSelect={() => onSelect(null)}
                className="cursor-pointer"
              >
                <CheckIcon
                  className={cn(
                    "mr-2 h-4 w-4",
                    !selected ? "opacity-100" : "opacity-0",
                  )}
                />
                <span>{placeholderEmptySelected}</span>
              </CommandItem>

              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={getLabel(item)}
                  onSelect={() => onSelect(item)}
                  className="cursor-pointer"
                >
                  <CheckIcon
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected?.id === item.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {/* biome-ignore lint/a11y/useKeyWithClickEvents: ...
                  biome-ignore lint/a11y/noStaticElementInteractions: ... */}
                  <div key={item.id} onClick={() => onSelect(item)}>
                    {customLabel
                      ? customLabel(item)
                      : getLabel
                        ? getLabel(item)
                        : (item.label ?? item.id)}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
