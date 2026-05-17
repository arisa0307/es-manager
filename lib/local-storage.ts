import type { CompanyLocalData } from "@/types";

const PREFIX = "at-company-local-";

export function getCompanyLocalData(companyId: string): CompanyLocalData {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(`${PREFIX}${companyId}`);
    return raw ? (JSON.parse(raw) as CompanyLocalData) : {};
  } catch {
    return {};
  }
}

export function setCompanyLocalData(
  companyId: string,
  data: CompanyLocalData
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${PREFIX}${companyId}`, JSON.stringify(data));
}

export function removeCompanyLocalData(companyId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${PREFIX}${companyId}`);
}
