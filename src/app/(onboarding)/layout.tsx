import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/** Signed-in sellers who are not approved yet. No portal sidebar here. */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  if (!cookies().get("token")?.value) redirect("/login");
  return <>{children}</>;
}
