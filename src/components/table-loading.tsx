import { Skeleton } from "./ui/skeleton";

export default function TableLoading() {
  return (
    <div className="flex w-full flex-col">
      <Skeleton className="h-64 w-auto" />
    </div>
  );
}
