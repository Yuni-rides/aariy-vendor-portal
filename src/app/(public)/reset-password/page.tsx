import { Suspense } from "react";
import ResetPasswordPage from "@/features/auth/components/ResetPasswordPage";

export default function Page() {
  // Reads ?token= from the URL, which needs a Suspense boundary.
  return (
    <Suspense>
      <ResetPasswordPage />
    </Suspense>
  );
}
