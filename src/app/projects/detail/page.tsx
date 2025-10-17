'use client';

import { ArrowLeft, MoreHorizontal, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ProjectServiceWithChildren } from '@/lib/actions/projects';
import { useLiveServices } from '@/lib/hooks/useLiveServices';
import { useProjectDetail } from '@/lib/hooks/useProjectDetail';
import { useProjectEventsQuery } from '@/lib/hooks/useProjectEventsQuery';
import { useProjectServicesQuery } from '@/lib/hooks/useProjectServicesQuery';
import { DeleteProjectDialog, UpdateProjectDialog } from '../form';

import { ProjectEventsTab } from './project-events-tab';
import { ProjectServiceDeleteDialog } from './project-service-delete-dialog';
import { ProjectServiceDetailPanel } from './project-service-detail-panel';
import { ProjectServiceDialog } from './project-service-dialog';
import { ProjectServicesTab } from './project-services-tab';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});

export default function ProjectDetailPage() {
  return (
    <Suspense
      fallback={
        <div className='flex min-h-[60vh] items-center justify-center'>
          <Spinner className='h-6 w-6 animate-spin text-muted-foreground' />
        </div>
      }
    >
      <ProjectDetailContent />
    </Suspense>
  );
}

function ProjectDetailContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId') ?? '';

  const { project, client, loading: detailLoading } = useProjectDetail(projectId);
  const servicesQuery = useProjectServicesQuery(projectId);
  const eventsQuery = useProjectEventsQuery(projectId);
  const { data: allServices } = useLiveServices();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedService, setSelectedService] = useState<ProjectServiceWithChildren | null>(null);

  const [serviceDeleteOpen, setServiceDeleteOpen] = useState(false);
  const [serviceDeleteTarget, setServiceDeleteTarget] = useState<ProjectServiceWithChildren | null>(
    null
  );
  const [activeServiceId, setActiveServiceId] = useState<string | null>(null);
  const [projectUpdateOpen, setProjectUpdateOpen] = useState(false);
  const [projectDeleteOpen, setProjectDeleteOpen] = useState(false);

  const availableServicesLookup = useMemo(
    () => new Map((allServices ?? []).map((service) => [service.id, service.name])),
    [allServices]
  );

  const activeService = useMemo(() => {
    if (!activeServiceId) return null;
    return (servicesQuery.data ?? []).find((service) => service.id === activeServiceId) ?? null;
  }, [activeServiceId, servicesQuery.data]);

  const activeServiceName = useMemo(() => {
    if (!activeService) return undefined;
    return availableServicesLookup.get(activeService.service_id);
  }, [activeService, availableServicesLookup]);

  useEffect(() => {
    if (!activeServiceId) return;
    const services = servicesQuery.data ?? [];
    if (services.length === 0) return;
    const exists = services.some((service) => service.id === activeServiceId);
    if (!exists) {
      setActiveServiceId(null);
    }
  }, [activeServiceId, servicesQuery.data]);

  useEffect(() => {
    if (!project) {
      setProjectUpdateOpen(false);
      setProjectDeleteOpen(false);
    }
  }, [project]);

  const projectActionsDisabled = detailLoading || !project;

  const handleProjectSend = () => {
    if (!project) return;
  };

  const handleProjectUpdate = () => {
    if (!project) return;
    setProjectUpdateOpen(true);
  };

  const handleProjectDelete = () => {
    if (!project) return;
    setProjectDeleteOpen(true);
  };

  if (!projectId) {
    return (
      <div className='flex flex-col gap-3'>
        <Button asChild variant='ghost' className='w-fit gap-2'>
          <Link href='/projects'>
            <ArrowLeft className='h-4 w-4' />
            Back to Projects
          </Link>
        </Button>
        <p className='text-sm text-muted-foreground'>
          We could not determine which project to show.
        </p>
      </div>
    );
  }

  if (!detailLoading && !project) {
    return (
      <div className='flex flex-col gap-3'>
        <Button asChild variant='ghost' className='w-fit gap-2'>
          <Link href='/projects'>
            <ArrowLeft className='h-4 w-4' />
            Back to Projects
          </Link>
        </Button>
        <p className='text-sm text-muted-foreground'>We could not find that project.</p>
      </div>
    );
  }

  const handleCreateClick = () => {
    if (!allServices || allServices.length === 0) {
      toast.error('Add at least one service before linking it to a project.');
      return;
    }
    setSelectedService(null);
    setDialogMode('create');
    setDialogOpen(true);
  };

  const handleModify = (service: ProjectServiceWithChildren) => {
    setSelectedService(service);
    setDialogMode('edit');
    setDialogOpen(true);
    setActiveServiceId(service.id);
  };

  const handleDelete = (service: ProjectServiceWithChildren) => {
    setServiceDeleteTarget(service);
    setServiceDeleteOpen(true);
  };

  const handlePrint = (service: ProjectServiceWithChildren) => {
    void service;
  };

  const handleServiceSelect = (service: ProjectServiceWithChildren) => {
    setActiveServiceId(service.id);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedService(null);
      setDialogMode('create');
    }
    setDialogOpen(open);
  };

  const handleServiceDeleteOpenChange = (open: boolean) => {
    if (!open) {
      setServiceDeleteTarget(null);
    }
    setServiceDeleteOpen(open);
  };

  return (
    <div className='flex flex-col gap-8 pb-28'>
      <header className='flex flex-col gap-4'>
        <div className='flex items-center justify-between gap-3'>
          <Button asChild variant='ghost' size='sm' className='w-fit gap-2 px-0 text-sm'>
            <Link href='/projects'>
              <ArrowLeft className='h-4 w-4' />
              Back
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type='button'
                variant='ghost'
                size='icon-sm'
                className='text-muted-foreground hover:text-foreground'
                disabled={projectActionsDisabled}
                aria-label='Project actions'
              >
                <MoreHorizontal className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-44'>
              <DropdownMenuItem onClick={handleProjectSend} className='gap-2'>
                <Send className='h-4 w-4' />
                Send...
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleProjectUpdate} className='gap-2' disabled={!project}>
                <Pencil className='h-4 w-4' />
                Update
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleProjectDelete}
                className='gap-2 text-destructive focus:text-destructive'
                disabled={!project}
              >
                <Trash2 className='h-4 w-4' />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className='flex flex-col gap-2'>
          <h1 className='text-2xl font-semibold tracking-tight'>
            {project?.title ?? 'Loading project…'}
          </h1>
          <div className='flex flex-wrap items-center gap-4 text-sm text-muted-foreground'>
            {project?.description && (
              <span className='block max-w-full overflow-hidden text-ellipsis whitespace-nowrap sm:inline sm:max-w-none sm:overflow-visible sm:text-clip sm:whitespace-normal'>
                {project.description}
              </span>
            )}
            {typeof project?.budget === 'number' && (
              <span>Budget: {currencyFormatter.format(project.budget)}</span>
            )}
            {project?.est_completion_date && (
              <span>
                Est. completion:{' '}
                {formatDateDisplay(project.est_completion_date) ?? project.est_completion_date}
              </span>
            )}
            {client?.name && <span>Client: {client.name}</span>}
          </div>
        </div>
      </header>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className='flex flex-col gap-6'
      >
        <Tabs defaultValue='services' className='flex flex-col gap-4'>
          <TabsList>
            <TabsTrigger value='services'>Services</TabsTrigger>
            <TabsTrigger value='events'>Events</TabsTrigger>
          </TabsList>
          <TabsContent value='services'>
            <ProjectServicesTab
              services={servicesQuery.data ?? []}
              serviceLookup={availableServicesLookup}
              loading={servicesQuery.isLoading || servicesQuery.isFetching}
              onSelect={handleServiceSelect}
            />
          </TabsContent>
          <TabsContent value='events'>
            <ProjectEventsTab events={eventsQuery.data ?? []} loading={eventsQuery.isLoading} />
          </TabsContent>
        </Tabs>
      </motion.section>

      <ProjectServiceDialog
        projectId={projectId}
        open={dialogOpen}
        mode={dialogMode}
        onOpenChange={handleDialogOpenChange}
        initialService={selectedService ?? undefined}
        serviceOptions={allServices ?? []}
        onCompleted={(serviceId) => {
          setActiveServiceId(serviceId);
        }}
      />

      <ProjectServiceDeleteDialog
        open={serviceDeleteOpen}
        onOpenChange={handleServiceDeleteOpenChange}
        service={serviceDeleteTarget}
        serviceLookup={availableServicesLookup}
      />

      {project && (
        <UpdateProjectDialog
          project={project}
          clientName={client?.name}
          open={projectUpdateOpen}
          onOpenChange={setProjectUpdateOpen}
        />
      )}

      <DeleteProjectDialog
        project={projectDeleteOpen && project ? project : null}
        open={projectDeleteOpen}
        onOpenChange={setProjectDeleteOpen}
      />

      <Button
        size='icon-lg'
        className='fixed bottom-28 right-6 z-40 rounded-full shadow-lg'
        style={{
          boxShadow: '0 10px 30px -15px color-mix(in srgb, var(--primary) 55%, transparent)'
        }}
        aria-label='Link service to project'
        onClick={handleCreateClick}
      >
        <Plus className='h-5 w-5' aria-hidden />
      </Button>

      <AnimatePresence>
        {activeServiceId && (
          <ProjectServiceDetailPanel
            key={activeServiceId}
            service={activeService}
            serviceName={activeServiceName}
            open={Boolean(activeServiceId)}
            onClose={() => setActiveServiceId(null)}
            onEdit={() => {
              if (activeService) {
                handleModify(activeService);
              }
            }}
            onDelete={() => {
              if (activeService) {
                handleDelete(activeService);
              }
            }}
            onPrint={() => {
              if (activeService) {
                handlePrint(activeService);
              }
            }}
            loading={!activeService}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function formatDateDisplay(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return dateFormatter.format(date);
}
