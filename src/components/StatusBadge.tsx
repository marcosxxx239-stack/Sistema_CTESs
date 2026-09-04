import { Badge } from "./ui";
import { STATUS_META } from "@/lib/constants";
import type { RequestStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: RequestStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge className={`${meta.color} whitespace-nowrap`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </Badge>
  );
}
