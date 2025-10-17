'use client';

import type { ComponentType, SVGProps } from 'react';
import { CalendarClock, CircleDollarSign, Timer } from 'lucide-react';
import { motion } from 'motion/react';

import { Card } from '@/components/ui/card';
import { useDashboardInsights } from '@/lib/hooks/useDashboardInsights';

type MetricItem = {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
};

type MetricSection = {
  key: string;
  title: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  items: MetricItem[];
  empty_label: string;
};

export default function HomeScreen() {
  const { insights, loading } = useDashboardInsights();

  const metric_sections: MetricSection[] = [
    {
      key: 'due_soon',
      title: 'Projects due soon',
      description: 'Upcoming deadlines within the next 7 days.',
      icon: CalendarClock,
      items: insights.due_soon_projects.map((project) => ({
        id: project.project_id,
        title: project.project_title,
        subtitle: project.client_name,
        summary: project.summary
      })),
      empty_label: loading ? 'Loading metrics…' : 'No projects are due in the next 7 days.'
    },
    {
      key: 'payments',
      title: 'Top paying clients',
      description: 'Total paid service unit budgets, highest to lowest.',
      icon: CircleDollarSign,
      items: insights.paid_totals.map((client) => ({
        id: client.client_id,
        title: client.client_name,
        subtitle: 'Paid to date',
        summary: client.summary
      })),
      empty_label: loading ? 'Loading metrics…' : 'No paid service units recorded yet.'
    },
    {
      key: 'turnaround',
      title: 'Payment turnaround',
      description: 'Average time to collect payment after completion.',
      icon: Timer,
      items: insights.payment_turnaround.map((client) => ({
        id: client.client_id,
        title: client.client_name,
        subtitle: 'Average turnaround',
        summary: client.summary
      })),
      empty_label: loading ? 'Loading metrics…' : 'No payment turnaround data yet.'
    }
  ];

  return (
    <div className='flex flex-col gap-6'>
      <section
        className='flex items-center gap-3 rounded-2xl border px-4 py-3'
        style={{
          borderColor: 'color-mix(in srgb, var(--border) 75%, transparent)',
          backgroundColor: 'color-mix(in srgb, var(--background) 92%, transparent)'
        }}
      >
        <div
          className='flex h-10 w-10 items-center justify-center rounded-full text-primary-foreground'
          style={{
            backgroundColor: 'color-mix(in srgb, var(--primary) 20%, transparent)'
          }}
        >
          <CalendarClock className='h-5 w-5' aria-hidden />
        </div>
        <div>
          <h1 className='text-lg font-semibold tracking-tight'>Dashboard</h1>
          <p className='text-sm text-muted-foreground'>
            Time-sensitive work, financial momentum, and payment velocity at a glance.
          </p>
        </div>
      </section>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'
      >
        {metric_sections.map((section) => (
          <Card key={section.key} className='flex flex-col gap-4 p-6'>
            <div className='flex items-start gap-3'>
              <div
                className='flex h-10 w-10 items-center justify-center rounded-full border text-primary'
                style={{
                  borderColor: 'color-mix(in srgb, var(--primary) 20%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--primary) 7%, transparent)'
                }}
              >
                <section.icon className='h-5 w-5' aria-hidden />
              </div>
              <div>
                <h2 className='text-base font-semibold'>{section.title}</h2>
                <p className='text-sm text-muted-foreground'>{section.description}</p>
              </div>
            </div>

            <ol className='space-y-3'>
              {section.items.length > 0 ? (
                section.items.map((item, index) => (
                  <li key={item.id} className='rounded-xl border bg-card px-4 py-3'>
                    <div className='flex items-center justify-between gap-3'>
                      <div>
                        <p className='text-sm font-medium leading-none'>{item.title}</p>
                        <p className='text-xs text-muted-foreground'>{item.subtitle}</p>
                      </div>
                      <span className='text-xs font-semibold text-muted-foreground'>#{index + 1}</span>
                    </div>
                    <p className='mt-2 text-sm text-muted-foreground'>{item.summary}</p>
                  </li>
                ))
              ) : (
                <li className='rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground'>
                  {section.empty_label}
                </li>
              )}
            </ol>
          </Card>
        ))}
      </motion.div>
    </div>
  );
}
