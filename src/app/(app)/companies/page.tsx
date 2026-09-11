import { CompanyColumns } from "@/components/company-columns";
import { listCompanyOverview } from "@/lib/queries";

export default async function CompaniesPage() {
  const companies = await listCompanyOverview();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight text-ink dark:text-muted">
          Companies
        </h1>
        <p className="text-sm text-muted dark:text-muted">
          Companies you plan to apply to, and the ones you already have.
        </p>
      </div>

      <CompanyColumns companies={companies} />
    </div>
  );
}
