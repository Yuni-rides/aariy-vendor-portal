import { BrandProfile } from "./brand-profile.types";

// TODO(api): replace with GET /seller/profile
export const BRAND_PROFILE_MOCK: BrandProfile = {
  live: {
    brandName: "Maria B",
    slug: "maria-b",
    story: "Maria B brings Pakistani craftsmanship to everyday wear, with embroidered lawn and festive pieces made in Lahore.",
    logoUrl: null,
    bannerUrl: null,
  },
  pending: {
    submittedAt: "2026-11-12T10:00:00Z",
    values: {
      story:
        "Maria B brings Pakistani craftsmanship to everyday wear, with embroidered lawn, chiffon and festive pieces made in Lahore since 1999.",
    },
  },
  legal: {
    legalName: "MB Fashions (Pvt) Ltd",
    businessType: "COMPANY",
    ntnMasked: null,
    cnicMasked: "•••••-•••••••-•",
  },
  addresses: [
    {
      id: "addr-main",
      label: "Main store",
      address: "Plot 14, Block 5, Clifton",
      city: "Karachi",
      contactName: "Imran",
      phone: "0300 1234567",
      isDefault: true,
    },
    {
      id: "addr-warehouse",
      label: "Warehouse",
      address: "22 Industrial Estate, Kot Lakhpat",
      city: "Lahore",
      contactName: "Bilal",
      phone: "0321 7654321",
    },
  ],
  bank: {
    bankName: "Meezan Bank",
    accountTitle: "MB Fashions (Pvt) Ltd",
    ibanLast4: "1234",
    status: "NOT_VERIFIED",
  },
};
