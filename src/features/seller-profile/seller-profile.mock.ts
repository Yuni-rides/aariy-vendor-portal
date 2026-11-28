// TEMPORARY: used only in test mode (NEXT_PUBLIC_AUTH_BYPASS=true). Same shape as GET /v1/seller/onboarding.
import type { SellerProfileResponse } from "./seller-profile.types";



export const SELLER_PROFILE_MOCK: SellerProfileResponse = {
  sellerId: "dev-seller",
  status: "ONBOARDING",
  editable: true,
  deadline: {
    submitBy: new Date(Date.now() + 6 * 86400000).toISOString(),
    daysLeft: 6,
    message: "Submit the form before the deadline or the account is suspended.",
  },
  suspensionReason: null,
  review: null,
  rejectedDocuments: [],
  requiredDocuments: [],
  missingDocuments: [],
  prefill: {
    owner: { fullName: "Test Seller", email: "owner@example.test", phone: "+923001234567" },
    country: null,
    businessTypeCode: null,
    business: {
      countryId: null,
      registeredName: null,
      tradingName: "Test Studio",
      regionCode: null,
      provinceId: null,
      provinceName: null,
      dispatchCityId: null,
      dispatchCityName: null,
      avgDispatchDays: null,
      contactEmail: "owner@example.test",
      address: null,
    },
    taxSaved: false,
    taxStatus: "UNREGISTERED",
    bankSaved: false,
    onFile: { cnic: null, ntn: null, bankName: null, accountTitle: null, accountNumber: null, bankStatus: null, hasIban: false },
    brands: [],
    documents: [],
    declaration: null,
  },
  options: {
    // Countries and cities come from GET /countries and GET /cities.
    countries: [],
    businessTypes: [
      {
        code: "SOLE_PROPRIETOR",
        label: "Sole proprietor",
        requiredDocuments: ["NATIONAL_ID_FRONT", "NATIONAL_ID_BACK", "BANK_PROOF", "BRAND_AUTHORISATION"],
      },
      {
        code: "AOP",
        label: "Association of persons (partnership)",
        requiredDocuments: [
          "NATIONAL_ID_FRONT",
          "NATIONAL_ID_BACK",
          "BANK_PROOF",
          "BRAND_AUTHORISATION",
          "PARTNERSHIP_DEED",
          "TAX_CERTIFICATE",
        ],
      },
      {
        code: "COMPANY",
        label: "Company",
        requiredDocuments: [
          "NATIONAL_ID_FRONT",
          "NATIONAL_ID_BACK",
          "BANK_PROOF",
          "BRAND_AUTHORISATION",
          "COMPANY_REGISTRATION",
          "TAX_CERTIFICATE",
        ],
      },
    ],
    taxStatuses: ["REGISTERED", "UNREGISTERED"],
    documentTypes: [
      "NATIONAL_ID_FRONT",
      "NATIONAL_ID_BACK",
      "TAX_CERTIFICATE",
      "SALES_TAX_CERTIFICATE",
      "BANK_PROOF",
      "BRAND_AUTHORISATION",
      "COMPANY_REGISTRATION",
      "PARTNERSHIP_DEED",
      "OTHER",
    ],
    agreement: { policyDocumentId: "dev-policy", version: "1.0" },
  },
};
