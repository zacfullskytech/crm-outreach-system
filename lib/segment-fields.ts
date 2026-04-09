type SegmentFieldOption = {
  value: string;
  label: string;
  entityType: "contact" | "company" | "prospect";
};

const baseFieldOptions: SegmentFieldOption[] = [
  { value: "company.industry", label: "Company industry", entityType: "contact" },
  { value: "company.state", label: "Company state", entityType: "contact" },
  { value: "company.city", label: "Company city", entityType: "contact" },
  { value: "company.businessType", label: "Company business type", entityType: "contact" },
  { value: "status", label: "Contact status", entityType: "contact" },
  { value: "email", label: "Contact email", entityType: "contact" },
  { value: "fullName", label: "Contact full name", entityType: "contact" },
  { value: "industry", label: "Company industry", entityType: "company" },
  { value: "state", label: "Company state", entityType: "company" },
  { value: "city", label: "Company city", entityType: "company" },
  { value: "businessType", label: "Company business type", entityType: "company" },
  { value: "status", label: "Company status", entityType: "company" },
  { value: "name", label: "Company name", entityType: "company" },
  { value: "industry", label: "Prospect industry", entityType: "prospect" },
  { value: "state", label: "Prospect state", entityType: "prospect" },
  { value: "city", label: "Prospect city", entityType: "prospect" },
  { value: "businessType", label: "Prospect business type", entityType: "prospect" },
  { value: "qualificationStatus", label: "Prospect qualification status", entityType: "prospect" },
  { value: "companyName", label: "Prospect company name", entityType: "prospect" },
] as const;

function titleCaseKey(key: string) {
  return key
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildSegmentFieldOptions({
  contactCustomKeys,
  companyCustomKeys,
}: {
  contactCustomKeys: string[];
  companyCustomKeys: string[];
}) {
  const dynamic: SegmentFieldOption[] = [
    ...contactCustomKeys.map((key) => ({
      value: `customFields.${key}`,
      label: `Contact custom: ${titleCaseKey(key)}`,
      entityType: "contact" as const,
    })),
    ...companyCustomKeys.flatMap((key) => [
      {
        value: `company.customFields.${key}`,
        label: `Company custom: ${titleCaseKey(key)}`,
        entityType: "contact" as const,
      },
      {
        value: `customFields.${key}`,
        label: `Company custom: ${titleCaseKey(key)}`,
        entityType: "company" as const,
      },
    ]),
  ];

  return [...baseFieldOptions, ...dynamic];
}

export type { SegmentFieldOption };
