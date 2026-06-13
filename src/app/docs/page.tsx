import { Suspense } from "react";
import DocsPageClient from "./DocsPageClient";

export default function DocsPage() {
  return (
    <Suspense
      fallback={
        <div className="docs-shell flex min-h-screen items-center justify-center bg-[#faf8f4] text-[#7a6a5a]">
          Loading documentation…
        </div>
      }
    >
      <DocsPageClient />
    </Suspense>
  );
}
