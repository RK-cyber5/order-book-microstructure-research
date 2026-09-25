import { Suspense } from "react";
import { QueryProvider } from "@/components/providers";
import { ResearchTerminal } from "@/components/research/research-terminal";

export const metadata = {
  title: "Research Lab — Order Book Microstructure Lab",
  description:
    "Interactive quantitative research terminal: reconstructed order-book replay, signal analysis, cross-session generalization, and modeled execution economics.",
};

export default function ResearchPage() {
  return (
    <QueryProvider>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[#fafbfd]">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
              Initializing research terminal…
            </p>
          </div>
        }
      >
        <ResearchTerminal />
      </Suspense>
    </QueryProvider>
  );
}
