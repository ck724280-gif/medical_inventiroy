import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/20">
        <FileQuestion className="h-10 w-10 text-red-600 dark:text-red-500" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight">Record Not Found</h2>
      <p className="max-w-md text-muted-foreground">
        The record you are looking for does not exist, has been deleted, or you do not have permission to view it.
      </p>
      <div className="mt-4 flex gap-4">
        <Link href="/dashboard">
          <Button variant="outline">Go to Dashboard</Button>
        </Link>
        <Button
          variant="primary"
          onClick={() => window.history.back()}
        >
          Go Back
        </Button>
      </div>
    </div>
  );
}
