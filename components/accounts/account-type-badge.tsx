import { type Account } from "@/lib/types";

interface AccountTypeBadgeProps {
  account: Account;
}

export function AccountTypeBadge({ account }: AccountTypeBadgeProps) {
  return (
    <div className="flex gap-2">
      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
        {account.type}
      </span>
      {account.isISA && (
        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-700/10">
          ISA
        </span>
      )}
    </div>
  );
}
