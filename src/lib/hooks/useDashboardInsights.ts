'use client';

import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';

import { db } from '@/lib/db';
import type {
  Client,
  Project,
  ProjectService,
  ProjectServiceUnit
} from '@/lib/models';

export type DueSoonProjectInsight = {
  project_id: string;
  project_title: string;
  client_name: string;
  est_completion_date: string;
  days_until_due: number;
  summary: string;
};

export type PaidTotalsInsight = {
  client_id: string;
  client_name: string;
  total_paid: number;
  summary: string;
};

export type PaymentTurnaroundInsight = {
  client_id: string;
  client_name: string;
  average_turnaround_days: number;
  summary: string;
};

export type DashboardInsights = {
  due_soon_projects: DueSoonProjectInsight[];
  paid_totals: PaidTotalsInsight[];
  payment_turnaround: PaymentTurnaroundInsight[];
};

const default_insights: DashboardInsights = {
  due_soon_projects: [],
  paid_totals: [],
  payment_turnaround: []
};

const MS_PER_DAY = 86_400_000;

function compute_days_until(date_value: string) {
  const due_date = new Date(date_value);
  const now_date = new Date();
  const due_time = due_date.getTime();
  const now_time = now_date.getTime();
  if (Number.isNaN(due_time)) return Number.POSITIVE_INFINITY;
  const diff_in_days = (due_time - now_time) / MS_PER_DAY;
  return Math.floor(diff_in_days);
}

function compute_turnaround_days(completed_date: string | undefined, paid_date: string | undefined) {
  if (!completed_date || !paid_date) return undefined;
  const completed_time = new Date(completed_date).getTime();
  const paid_time = new Date(paid_date).getTime();
  if (Number.isNaN(completed_time) || Number.isNaN(paid_time)) return undefined;
  const turnaround_diff = (paid_time - completed_time) / MS_PER_DAY;
  return turnaround_diff >= 0 ? turnaround_diff : 0;
}

function format_due_summary(days_until_due: number, est_completion_date: string) {
  if (!Number.isFinite(days_until_due)) {
    return 'No estimated completion date on file.';
  }
  const formatted_date = new Date(est_completion_date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });
  if (days_until_due < 0) {
    return `Overdue by ${Math.abs(days_until_due)} day(s). Expected ${formatted_date}.`;
  }
  if (days_until_due === 0) {
    return `Due today (${formatted_date}).`;
  }
  return `Due in ${days_until_due} day(s) on ${formatted_date}.`;
}

function format_currency(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD'
  }).format(value);
}

function format_turnaround_summary(days: number) {
  const rounded_value = days.toFixed(1);
  return `Average payment in ${rounded_value} day(s) after completion.`;
}

export function useDashboardInsights() {
  const [insights, set_insights] = useState<DashboardInsights>(default_insights);
  const [loading, set_loading] = useState(true);

  useEffect(() => {
    const insights_subscription = liveQuery(async () => {
      const [clients, projects, project_services, project_service_units] = await Promise.all([
        db.clients.toArray(),
        db.projects.toArray(),
        db.projectServices.toArray(),
        db.projectServiceUnits.toArray()
      ]);

      return build_dashboard_insights({
        clients,
        projects,
        project_services,
        project_service_units
      });
    }).subscribe({
      next: (next_insights) => {
        set_insights(next_insights);
        set_loading(false);
      },
      error: (error) => {
        console.error('dashboard insights liveQuery error', error);
      }
    });

    return () => insights_subscription.unsubscribe();
  }, []);

  return { insights, loading };
}

export type BuildDashboardInsightsInput = {
  clients: Client[];
  projects: Project[];
  project_services: ProjectService[];
  project_service_units: ProjectServiceUnit[];
};

export function build_dashboard_insights({
  clients,
  projects,
  project_services,
  project_service_units
}: BuildDashboardInsightsInput): DashboardInsights {
  const client_lookup = new Map(clients.map((client) => [client.id, client]));
  const project_lookup = new Map(projects.map((project) => [project.id, project]));
  const service_lookup = new Map(project_services.map((service) => [service.id, service]));

  const due_candidates: DueSoonProjectInsight[] = [];
  const paid_totals_map = new Map<string, { total: number; client_name: string }>();
  const turnaround_map = new Map<string, { total: number; count: number; client_name: string }>();

  for (const project of projects) {
    if (project.completed_ind) continue;
    const days_until_due = compute_days_until(project.est_completion_date);
    if (days_until_due < 0 || days_until_due > 7) continue;
    if (!Number.isFinite(days_until_due)) continue;
    const client = client_lookup.get(project.client_id);
    if (!client) continue;
    due_candidates.push({
      project_id: project.id,
      project_title: project.title,
      client_name: client.name,
      est_completion_date: project.est_completion_date,
      days_until_due,
      summary: format_due_summary(days_until_due, project.est_completion_date)
    });
  }

  for (const unit of project_service_units) {
    if (!unit.paid_ind) continue;
    if (unit.budget_type !== 'dollar') continue;
    const parent_service = service_lookup.get(unit.project_service_id);
    if (!parent_service) continue;
    const parent_project = project_lookup.get(parent_service.project_id);
    if (!parent_project) continue;
    const client = client_lookup.get(parent_project.client_id);
    if (!client) continue;

    const existing_paid = paid_totals_map.get(client.id);
    const next_total = (existing_paid?.total ?? 0) + unit.budget_amount;
    paid_totals_map.set(client.id, {
      total: next_total,
      client_name: client.name
    });

    const turnaround_days = compute_turnaround_days(unit.completed_date, unit.paid_date);
    if (turnaround_days !== undefined) {
      const existing_turnaround = turnaround_map.get(client.id);
      const next_total_turnaround = (existing_turnaround?.total ?? 0) + turnaround_days;
      const next_count = (existing_turnaround?.count ?? 0) + 1;
      turnaround_map.set(client.id, {
        total: next_total_turnaround,
        count: next_count,
        client_name: client.name
      });
    }
  }

  const due_soon_projects = due_candidates
    .sort((a, b) => a.days_until_due - b.days_until_due)
    .slice(0, 3);

  const paid_totals = Array.from(paid_totals_map.entries())
    .map(([client_id, data]) => ({
      client_id,
      client_name: data.client_name,
      total_paid: data.total,
      summary: `${format_currency(data.total)} collected.`
    }))
    .sort((a, b) => b.total_paid - a.total_paid)
    .slice(0, 3);

  const payment_turnaround = Array.from(turnaround_map.entries())
    .map(([client_id, data]) => {
      const average_turnaround_days = data.count === 0 ? 0 : data.total / data.count;
      return {
        client_id,
        client_name: data.client_name,
        average_turnaround_days,
        summary: format_turnaround_summary(average_turnaround_days)
      };
    })
    .sort((a, b) => b.average_turnaround_days - a.average_turnaround_days)
    .slice(0, 3);

  return { due_soon_projects, paid_totals, payment_turnaround };
}
