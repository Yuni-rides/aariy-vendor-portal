"use client";

import BrandProfilePage from "@/features/brand-profile/components/BrandProfilePage";
import { useAuthStore } from "@/features/auth/auth.store";
import { isLiveSeller } from "@/features/auth/seller-access";
import SellerProfilePage from "./SellerProfilePage";

/**
 * Not live yet (isLive false): the seller fills in their details (GET/PUT /v1/seller/onboarding).
 * Live: the brand management page.
 */
export default function BrandProfileSwitch() {
  const user = useAuthStore((s) => s.user);
  return isLiveSeller(user) ? <BrandProfilePage /> : <SellerProfilePage />;
}
