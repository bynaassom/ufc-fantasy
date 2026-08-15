import { PageSkeleton } from "@/components/ui/LoadingSkeleton";

export default function ChatLoading() {
  return <PageSkeleton variant="list" lines={4} />;
}
