export default function AdminOverviewPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Admin Overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <OverviewCard href="/admin/team" title="Team View"
          description="See all caseworkers' time entries across the organization." />
        <OverviewCard href="/admin/corrections" title="Corrections"
          description="Review and approve correction requests from caseworkers." />
        <OverviewCard href="/admin/audit-log" title="Audit Log"
          description="Immutable record of every time entry change." />
        <OverviewCard href="/admin/grants" title="Grants"
          description="Create and manage funding grants available to caseworkers." />
        <OverviewCard href="/admin/activity-types" title="Activity Types"
          description="Define the categories of work caseworkers log time against." />
        <OverviewCard href="/admin/export" title="Export"
          description="Download time log data as CSV or Excel for reporting." />
        <OverviewCard href="/admin/settings" title="Settings"
          description="Configure work day hours, time slot granularity, and entry lock window." />
      </div>
    </div>
  );
}

import Link from "next/link";

function OverviewCard({ title, description, href }: {
  title: string; description: string; href: string;
}) {
  return (
    <Link href={href}
      className="block rounded-lg border border-border bg-card p-5 transition-colors hover:bg-muted/50">
      <h2 className="mb-1 font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}
