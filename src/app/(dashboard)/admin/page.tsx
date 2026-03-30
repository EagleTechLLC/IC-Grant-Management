export default function AdminOverviewPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Admin Overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <OverviewCard
          title="Grants"
          description="Create and manage funding grants available to caseworkers."
          href="/admin/grants"
        />
        <OverviewCard
          title="Activity Types"
          description="Define the categories of work caseworkers can log time against."
          href="/admin/activity-types"
        />
        <OverviewCard
          title="Export"
          description="Download time log data as CSV or Excel for reporting."
          href="/admin/export"
        />
        <OverviewCard
          title="Settings"
          description="Configure work day hours and other organization settings."
          href="/admin/settings"
        />
      </div>
    </div>
  );
}

import Link from "next/link";

function OverviewCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-border bg-card p-5 transition-colors hover:bg-muted/50"
    >
      <h2 className="mb-1 font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}
