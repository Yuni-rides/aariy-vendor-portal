import { Suspense } from "react";
import LoginPage from "@/features/auth/components/LoginPage";

export default function Page() {
  // LoginPage reads ?redirect= from the URL, which needs a Suspense boundary.
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
