import "@tanstack/react-table";

declare module "@tanstack/react-table" {
  // biome-ignore lint/correctness/noUnusedVariables: ...
  interface ColumnMeta<TData, TValue> {
    label?: string;
  }
}
