import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  build_dashboard_insights,
  type BuildDashboardInsightsInput
} from './useDashboardInsights';

const ISO = (value: string) => new Date(value).toISOString();

const base_timestamps = {
  created_at: ISO('2024-01-01T00:00:00Z'),
  updated_at: ISO('2024-12-01T00:00:00Z')
};

const make_client = (id: string, name: string) => ({
  id,
  name,
  description: '',
  created_at: base_timestamps.created_at,
  updated_at: base_timestamps.updated_at
});

const make_project = (partial: Partial<BuildDashboardInsightsInput['projects'][number]>) => ({
  id: '00000000-0000-0000-0000-000000000000',
  client_id: '00000000-0000-0000-0000-000000000000',
  title: 'Project',
  description: '',
  est_completion_date: ISO('2025-01-02T00:00:00Z'),
  completed_ind: false,
  completed_date: '',
  updated_at: base_timestamps.updated_at,
  ...partial
});

const make_service = (
  partial: Partial<BuildDashboardInsightsInput['project_services'][number]>
) => ({
  id: '10000000-0000-0000-0000-000000000000',
  project_id: '00000000-0000-0000-0000-000000000000',
  service_id: '20000000-0000-0000-0000-000000000000',
  budget_type: 'dollar' as const,
  budget_amount: 0,
  est_completion_date: ISO('2025-01-02T00:00:00Z'),
  approved_ind: false,
  approved_date: '',
  completed_ind: false,
  completed_date: '',
  paid_ind: false,
  paid_date: '',
  updated_at: base_timestamps.updated_at,
  ...partial
});

const make_unit = (partial: Partial<BuildDashboardInsightsInput['project_service_units'][number]>) => ({
  id: '30000000-0000-0000-0000-000000000000',
  project_service_id: '10000000-0000-0000-0000-000000000000',
  title: 'Unit',
  description: '',
  budget_type: 'dollar' as const,
  budget_amount: 0,
  est_completion_date: ISO('2025-01-02T00:00:00Z'),
  approved_ind: false,
  approved_date: '',
  completed_ind: false,
  completed_date: '',
  paid_ind: false,
  paid_date: '',
  updated_at: base_timestamps.updated_at,
  ...partial
});

describe('build_dashboard_insights', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the most urgent active projects due within seven days', () => {
    const alpha_client = make_client('11111111-1111-1111-1111-111111111111', 'Alpha Co');

    const insights = build_dashboard_insights({
      clients: [alpha_client],
      projects: [
        make_project({
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
          client_id: alpha_client.id,
          title: 'Due Tomorrow',
          est_completion_date: ISO('2025-01-02T00:00:00Z')
        }),
        make_project({
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
          client_id: alpha_client.id,
          title: 'Due in Three Days',
          est_completion_date: ISO('2025-01-04T00:00:00Z')
        }),
        make_project({
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
          client_id: alpha_client.id,
          title: 'Due in Seven Days',
          est_completion_date: ISO('2025-01-08T00:00:00Z')
        }),
        make_project({
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
          client_id: alpha_client.id,
          title: 'Due in Eight Days',
          est_completion_date: ISO('2025-01-09T00:00:00Z')
        }),
        make_project({
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5',
          client_id: alpha_client.id,
          title: 'Already past due',
          est_completion_date: ISO('2024-12-28T00:00:00Z')
        })
      ],
      project_services: [],
      project_service_units: []
    });

    expect(insights.due_soon_projects).toHaveLength(3);
    expect(insights.due_soon_projects.map((project) => project.project_id)).toEqual([
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'
    ]);
    expect(insights.due_soon_projects[0].summary).toContain('Due in 1 day');
    expect(insights.due_soon_projects[2].summary).toContain('Due in 7 day');
  });

  it('aggregates paid totals and payment turnaround metrics per client', () => {
    const alpha_client = make_client('11111111-1111-1111-1111-111111111111', 'Alpha Co');
    const bravo_client = make_client('22222222-2222-2222-2222-222222222222', 'Bravo Ventures');
    const charlie_client = make_client('33333333-3333-3333-3333-333333333333', 'Charlie Labs');

    const alpha_project = make_project({
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
      client_id: alpha_client.id
    });
    const bravo_project = make_project({
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
      client_id: bravo_client.id
    });
    const charlie_project = make_project({
      id: 'cccccccc-cccc-cccc-cccc-ccccccccccc1',
      client_id: charlie_client.id
    });

    const alpha_service = make_service({
      id: '11111111-aaaa-aaaa-aaaa-111111111111',
      project_id: alpha_project.id
    });
    const bravo_service = make_service({
      id: '22222222-aaaa-aaaa-aaaa-222222222222',
      project_id: bravo_project.id
    });
    const charlie_service = make_service({
      id: '33333333-aaaa-aaaa-aaaa-333333333333',
      project_id: charlie_project.id
    });

    const insights = build_dashboard_insights({
      clients: [alpha_client, bravo_client, charlie_client],
      projects: [alpha_project, bravo_project, charlie_project],
      project_services: [alpha_service, bravo_service, charlie_service],
      project_service_units: [
        make_unit({
          id: 'aaaa1111-1111-1111-1111-111111111111',
          project_service_id: alpha_service.id,
          paid_ind: true,
          budget_amount: 200,
          completed_ind: true,
          completed_date: ISO('2024-12-20T00:00:00Z'),
          paid_date: ISO('2024-12-25T00:00:00Z')
        }),
        make_unit({
          id: 'aaaa2222-2222-2222-2222-222222222222',
          project_service_id: alpha_service.id,
          paid_ind: true,
          budget_amount: 150,
          completed_ind: true,
          completed_date: ISO('2024-12-24T00:00:00Z'),
          paid_date: ISO('2024-12-30T00:00:00Z')
        }),
        make_unit({
          id: 'aaaa3333-3333-3333-3333-333333333333',
          project_service_id: alpha_service.id,
          paid_ind: false,
          budget_amount: 400,
          completed_ind: true,
          completed_date: ISO('2024-12-24T00:00:00Z'),
          paid_date: ISO('2024-12-30T00:00:00Z')
        }),
        make_unit({
          id: 'aaaa4444-4444-4444-4444-444444444444',
          project_service_id: alpha_service.id,
          paid_ind: true,
          budget_type: 'percent',
          budget_amount: 10,
          completed_ind: true,
          completed_date: ISO('2024-12-20T00:00:00Z'),
          paid_date: ISO('2024-12-22T00:00:00Z')
        }),
        make_unit({
          id: 'bbbb1111-1111-1111-1111-111111111111',
          project_service_id: bravo_service.id,
          paid_ind: true,
          budget_amount: 500,
          completed_ind: true,
          completed_date: ISO('2024-12-10T00:00:00Z'),
          paid_date: ISO('2024-12-13T00:00:00Z')
        }),
        make_unit({
          id: 'cccc1111-1111-1111-1111-111111111111',
          project_service_id: charlie_service.id,
          paid_ind: true,
          budget_amount: 275,
          completed_ind: true,
          completed_date: ISO('2024-12-05T00:00:00Z'),
          paid_date: ISO('2024-12-15T00:00:00Z')
        })
      ]
    });

    expect(insights.paid_totals.map((client) => ({
      name: client.client_name,
      total: client.total_paid
    }))).toEqual([
      { name: 'Bravo Ventures', total: 500 },
      { name: 'Alpha Co', total: 350 },
      { name: 'Charlie Labs', total: 275 }
    ]);
    expect(insights.paid_totals[0].summary).toContain('500');

    expect(insights.payment_turnaround.map((client) => ({
      name: client.client_name,
      average: Number(client.average_turnaround_days.toFixed(1))
    }))).toEqual([
      { name: 'Charlie Labs', average: 10.0 },
      { name: 'Alpha Co', average: 5.5 },
      { name: 'Bravo Ventures', average: 3.0 }
    ]);
    expect(insights.payment_turnaround[1].summary).toBe(
      'Average payment in 5.5 day(s) after completion.'
    );
  });
});
