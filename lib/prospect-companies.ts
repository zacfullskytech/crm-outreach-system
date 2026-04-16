import { prisma } from "@/lib/db";
import { normalizeEmail, normalizeWebsite, splitName } from "@/lib/utils";
import type { Prospect } from "@prisma/client";

export async function upsertCompanyFromProspect(prospect: Prospect) {
  const normalizedDomain = normalizeWebsite(prospect.website);
  const normalizedEmailValue = normalizeEmail(prospect.email);
  const hasNamedContact = Boolean(prospect.contactName && prospect.contactName.trim());
  const shouldUseCompanyEmail = Boolean(normalizedEmailValue && !hasNamedContact);

  const existingCompany = normalizedDomain
    ? await prisma.company.findFirst({
        where: {
          OR: [
            { emailDomain: normalizedDomain },
            { website: { contains: normalizedDomain, mode: "insensitive" } },
            { name: { equals: prospect.companyName, mode: "insensitive" } },
          ],
        },
      })
    : await prisma.company.findFirst({
        where: { name: { equals: prospect.companyName, mode: "insensitive" } },
      });

  const company = existingCompany
    ? await prisma.company.update({
        where: { id: existingCompany.id },
        data: {
          industry: existingCompany.industry || prospect.industry,
          businessType: existingCompany.businessType || prospect.businessType,
          website: existingCompany.website || prospect.website,
          emailDomain: existingCompany.emailDomain || normalizedDomain,
          email: existingCompany.email || (shouldUseCompanyEmail ? normalizedEmailValue : null),
          phone: existingCompany.phone || prospect.phone,
          addressLine1: existingCompany.addressLine1 || prospect.addressLine1,
          city: existingCompany.city || prospect.city,
          state: existingCompany.state || prospect.state,
          postalCode: existingCompany.postalCode || prospect.postalCode,
          country: existingCompany.country || prospect.country,
          latitude: existingCompany.latitude || prospect.latitude,
          longitude: existingCompany.longitude || prospect.longitude,
          employeeEstimate: existingCompany.employeeEstimate || prospect.employeeEstimate,
          source: existingCompany.source || prospect.source,
          notes: existingCompany.notes || prospect.notes,
          status: existingCompany.status,
        },
      })
    : await prisma.company.create({
        data: {
          name: prospect.companyName,
          industry: prospect.industry,
          businessType: prospect.businessType,
          website: prospect.website,
          emailDomain: normalizedDomain,
          email: shouldUseCompanyEmail ? normalizedEmailValue : null,
          phone: prospect.phone,
          addressLine1: prospect.addressLine1,
          city: prospect.city,
          state: prospect.state,
          postalCode: prospect.postalCode,
          country: prospect.country,
          latitude: prospect.latitude,
          longitude: prospect.longitude,
          employeeEstimate: prospect.employeeEstimate,
          status: "LEAD",
          source: prospect.source,
          notes: prospect.notes,
        },
      });

  let contact = null;
  if (prospect.contactName || (prospect.phone && hasNamedContact) || (normalizedEmailValue && hasNamedContact)) {
    const existingContact = normalizedEmailValue
      ? await prisma.contact.findFirst({ where: { email: normalizedEmailValue } })
      : null;

    if (!existingContact) {
      const name = splitName(prospect.contactName);
      contact = await prisma.contact.create({
        data: {
          companyId: company.id,
          firstName: name.firstName,
          lastName: name.lastName,
          fullName: name.fullName,
          email: normalizedEmailValue,
          phone: prospect.phone,
          source: prospect.source,
          status: normalizedEmailValue ? "ACTIVE" : "DO_NOT_CONTACT",
        },
      });
    } else if (!existingContact.companyId) {
      contact = await prisma.contact.update({
        where: { id: existingContact.id },
        data: { companyId: company.id },
      });
    } else {
      contact = existingContact;
    }
  }

  return { company, contact, wasExistingCompany: Boolean(existingCompany) };
}
