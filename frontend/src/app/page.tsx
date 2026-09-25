import { LandingPage } from "@/components/landing/landing-page";
import { QueryProvider } from "@/components/providers";

export default function Page() {
  return (
    <QueryProvider>
      <LandingPage />
    </QueryProvider>
  );
}
