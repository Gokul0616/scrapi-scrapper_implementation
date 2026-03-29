import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

function Loading({
  className,
  ...props
}) {
  return (
    <div
      className={cn("flex items-center justify-center p-8 w-full", className)}
      {...props}
    >
      <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
    </div>
  );
}

export { Loading }
