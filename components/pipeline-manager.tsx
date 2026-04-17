"use client";

import { useEffect, useMemo, useState } from "react";

function slugifyChecklistKey(value: string, fallback: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return slug || fallback;
}
import { AppShell } from "@/components/app-shell";

type SimpleUser = { id: string; email: string; name: string | null };
type SimpleCompany = { id: string; name: string };
type SimpleContact = { id: string; fullName: string | null; email: string | null; companyId: string | null };
type OpportunityTemplateRecord = {
  id: string;
  name: string;
  description: string | null;
  opportunityType: string;
  serviceLine: string | null;
  checklistJson: unknown;
  taskTemplateJson: unknown;
};

type OpportunityTaskRecord = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | Date | null;
  assignee?: { id: string; email: string; name: string | null } | null;
};

type TaskComposer = {
  title: string;
  description: string;
  assigneeUserId: string;
  dueDate: string;
};

type OpportunityRecord = {
  id: string;
  name: string;
  opportunityType: string;
  stage: string;
  status: string;
  deliveryStatus?: string | null;
  serviceLine: string | null;
  valueEstimate: number | null;
  monthlyValue: number | null;
  oneTimeValue: number | null;
  targetCloseDate: string | Date | null;
  notes: string | null;
  checklistJson: unknown;
  company: { id: string; name: string };
  contact?: { id: string; fullName: string | null; email: string | null } | null;
  owner?: { id: string; email: string; name: string | null } | null;
  template?: { id: string; name: string; serviceLine: string | null } | null;
  tasks: OpportunityTaskRecord[];
};

type ChecklistEntry = { key: string; label: string; done?: boolean };
type TaskDraft = { title: string; description?: string | null; assigneeUserId?: string | null; dueDate?: string | null; status?: string; checklistKey?: string | null };

function readChecklist(value: unknown) {
  if (!Array.isArray(value)) return [] as ChecklistEntry[];
  return value.filter((item): item is ChecklistEntry => Boolean(item) && typeof item === "object");
}

function readTaskTemplates(value: unknown) {
  if (!Array.isArray(value)) return [] as TaskDraft[];
  return value.filter((item): item is TaskDraft => Boolean(item) && typeof item === "object");
}

const opportunityTypes = ["NEW_SALE", "UPSELL", "RENEWAL"] as const;
const opportunityStages = ["DISCOVERED", "CONTACTED", "QUALIFIED", "MEETING_SCHEDULED", "PROPOSAL_REQUESTED", "QUOTE_SENT", "FOLLOW_UP", "VERBAL_YES", "CLOSED_WON", "CLOSED_LOST"] as const;
const opportunityStatuses = ["OPEN", "WON", "LOST", "ON_HOLD"] as const;
const deliveryStatuses = ["NOT_STARTED", "KICKOFF_SCHEDULED", "PAPERWORK_COMPLETE", "IMPLEMENTATION_IN_PROGRESS", "INSTALL_SCHEDULED", "LIVE", "FOLLOW_UP_COMPLETE"] as const;
const taskStatuses = ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"] as const;

export function PipelineManager({
  initialOpportunities,
  initialTemplates,
  initialUsers,
  initialCompanies,
  initialContacts,
  initialDraft,
  isAdmin,
}: {
  initialOpportunities: OpportunityRecord[];
  initialTemplates: OpportunityTemplateRecord[];
  initialUsers: SimpleUser[];
  initialCompanies: SimpleCompany[];
  initialContacts: SimpleContact[];
  initialDraft?: {
    name?: string;
    companyId?: string;
    contactId?: string;
    opportunityType?: string;
    serviceLine?: string;
    notes?: string;
  } | null;
  isAdmin: boolean;
}) {
  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [templates, setTemplates] = useState(initialTemplates);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [viewFilter, setViewFilter] = useState("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(true);
  const [isListOpen, setIsListOpen] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [createDraft, setCreateDraft] = useState(initialDraft || null);
  const [taskComposerByOpportunity, setTaskComposerByOpportunity] = useState<Record<string, TaskComposer>>({});
  const [templateSeed, setTemplateSeed] = useState({
    id: "",
    name: "",
    description: "",
    opportunityType: "NEW_SALE",
    serviceLine: "",
    checklistText: "",
    tasksText: "",
  });

  useEffect(() => {
    if (initialDraft) {
      setCreateDraft(initialDraft);
      setIsCreateOpen(true);
    }
  }, [initialDraft]);

  const openOpportunities = opportunities.filter((opportunity) => opportunity.status === "OPEN").length;
  const upsellOpportunities = opportunities.filter((opportunity) => opportunity.opportunityType === "UPSELL").length;
  const followUps = opportunities.filter((opportunity) => opportunity.stage === "FOLLOW_UP").length;
  const overdueTasks = opportunities.reduce((count, opportunity) => count + opportunity.tasks.filter((task) => task.status !== "DONE" && task.dueDate && new Date(task.dueDate).getTime() < Date.now()).length, 0);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return opportunities.filter((opportunity) => {
      const matchesSearch = !q || [opportunity.name, opportunity.company.name, opportunity.serviceLine || "", opportunity.contact?.fullName || "", opportunity.owner?.email || ""].join(" ").toLowerCase().includes(q);
      const matchesStage = stageFilter === "ALL" || opportunity.stage === stageFilter;
      const matchesView =
        viewFilter === "ALL" ||
        (viewFilter === "OPEN" && opportunity.status === "OPEN") ||
        (viewFilter === "UPSELL" && opportunity.opportunityType === "UPSELL") ||
        (viewFilter === "FOLLOW_UP" && opportunity.stage === "FOLLOW_UP") ||
        (viewFilter === "WON" && opportunity.status === "WON") ||
        (viewFilter === "TASKS_DUE" && opportunity.tasks.some((task) => task.status !== "DONE" && task.dueDate && new Date(task.dueDate).getTime() < Date.now()));
      return matchesSearch && matchesStage && matchesView;
    });
  }, [opportunities, search, stageFilter, viewFilter]);

  async function updateOpportunity(opportunity: OpportunityRecord, patch: Partial<OpportunityRecord>) {
    setPending(true);
    setMessage(null);

    const payload = {
      name: patch.name ?? opportunity.name,
      companyId: opportunity.company.id,
      contactId: opportunity.contact?.id ?? null,
      templateId: opportunity.template?.id ?? null,
      ownerUserId: patch.owner?.id ?? opportunity.owner?.id ?? null,
      opportunityType: patch.opportunityType ?? opportunity.opportunityType,
      stage: patch.stage ?? opportunity.stage,
      status: patch.status ?? opportunity.status,
      deliveryStatus: patch.deliveryStatus ?? opportunity.deliveryStatus ?? null,
      serviceLine: patch.serviceLine ?? opportunity.serviceLine,
      valueEstimate: patch.valueEstimate ?? opportunity.valueEstimate,
      monthlyValue: patch.monthlyValue ?? opportunity.monthlyValue,
      oneTimeValue: patch.oneTimeValue ?? opportunity.oneTimeValue,
      targetCloseDate: patch.targetCloseDate ?? opportunity.targetCloseDate ? new Date(patch.targetCloseDate ?? opportunity.targetCloseDate as string).toISOString().slice(0, 10) : null,
      checklist: readChecklist(patch.checklistJson ?? opportunity.checklistJson),
      notes: patch.notes ?? opportunity.notes,
      tasks: (patch.tasks ?? opportunity.tasks).map((task) => ({
        title: task.title,
        description: task.description ?? null,
        assigneeUserId: task.assignee?.id ?? null,
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : null,
        status: task.status,
        checklistKey: null,
      })),
    };

    const response = await fetch(`/api/opportunities/${opportunity.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || "Failed to update opportunity.");
      setPending(false);
      return;
    }

    setOpportunities((current) => current.map((entry) => entry.id === opportunity.id ? body.data as OpportunityRecord : entry));
    setMessage("Opportunity updated.");
    setPending(false);
  }

  function mapUserById(userId: string | null | undefined) {
    return initialUsers.find((user) => user.id === userId) || null;
  }

  function getTaskComposer(opportunityId: string): TaskComposer {
    return taskComposerByOpportunity[opportunityId] || { title: "", description: "", assigneeUserId: "", dueDate: "" };
  }

  function setTaskComposer(opportunityId: string, patch: Partial<TaskComposer>) {
    setTaskComposerByOpportunity((current) => ({
      ...current,
      [opportunityId]: {
        ...getTaskComposer(opportunityId),
        ...patch,
      },
    }));
  }

  async function addTask(opportunity: OpportunityRecord) {
    const draft = getTaskComposer(opportunity.id);
    if (!draft.title.trim()) {
      setMessage("Task title is required.");
      return;
    }

    await updateOpportunity(opportunity, {
      tasks: [
        ...opportunity.tasks,
        {
          id: `temp-${Date.now()}`,
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          status: "TODO",
          dueDate: draft.dueDate || null,
          assignee: mapUserById(draft.assigneeUserId),
        },
      ],
    });

    setTaskComposerByOpportunity((current) => ({
      ...current,
      [opportunity.id]: { title: "", description: "", assigneeUserId: "", dueDate: "" },
    }));
  }

  function hydrateTemplateSeed(template?: OpportunityTemplateRecord | null) {
    if (!template) {
      setTemplateSeed({
        id: "",
        name: "",
        description: "",
        opportunityType: "NEW_SALE",
        serviceLine: "",
        checklistText: "",
        tasksText: "",
      });
      return;
    }

    setTemplateSeed({
      id: template.id,
      name: template.name,
      description: template.description || "",
      opportunityType: template.opportunityType,
      serviceLine: template.serviceLine || "",
      checklistText: readChecklist(template.checklistJson).map((item) => item.label).join("\n"),
      tasksText: readTaskTemplates(template.taskTemplateJson).map((task) => task.title).join("\n"),
    });
  }

  async function createTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const checklist = templateSeed.checklistText
      .split("\n")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((label, index) => ({ key: slugifyChecklistKey(label, `item-${index + 1}`), label, done: false }));
    const taskTemplates = templateSeed.tasksText
      .split("\n")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((title) => ({ title, status: "TODO" }));

    const payload = {
      template: {
        name: templateSeed.name.trim(),
        description: templateSeed.description.trim() || null,
        opportunityType: templateSeed.opportunityType,
        serviceLine: templateSeed.serviceLine.trim() || null,
        checklist,
        taskTemplates,
        isActive: true,
      },
    };

    const response = await fetch(templateSeed.id ? `/api/opportunities/${templateSeed.id}` : "/api/opportunities", {
      method: templateSeed.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || "Failed to save template.");
      setPending(false);
      return;
    }

    setTemplates((current) => {
      const next = [body.data as OpportunityTemplateRecord, ...current.filter((entry) => entry.id !== body.data.id)];
      return next.sort((left, right) => left.name.localeCompare(right.name));
    });
    hydrateTemplateSeed(null);
    setMessage(templateSeed.id ? "Template updated." : "Template created.");
    setPending(false);
  }

  async function archiveTemplate(templateId: string) {
    setPending(true);
    setMessage(null);

    const response = await fetch(`/api/opportunities/${templateId}?entity=template`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setMessage(body.error || "Failed to archive template.");
      setPending(false);
      return;
    }

    setTemplates((current) => current.filter((entry) => entry.id !== templateId));
    if (templateSeed.id === templateId) {
      hydrateTemplateSeed(null);
    }
    setMessage("Template archived.");
    setPending(false);
  }

  async function createOpportunity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const template = templates.find((entry) => entry.id === String(form.get("templateId") || "")) || null;
    const payload = {
      name: String(form.get("name") || "").trim(),
      companyId: String(form.get("companyId") || "").trim(),
      contactId: String(form.get("contactId") || "").trim() || null,
      templateId: String(form.get("templateId") || "").trim() || null,
      ownerUserId: String(form.get("ownerUserId") || "").trim() || null,
      opportunityType: String(form.get("opportunityType") || "NEW_SALE"),
      stage: String(form.get("stage") || "DISCOVERED"),
      status: String(form.get("status") || "OPEN"),
      serviceLine: String(form.get("serviceLine") || "").trim() || template?.serviceLine || null,
      valueEstimate: Number(form.get("valueEstimate") || 0) || null,
      monthlyValue: Number(form.get("monthlyValue") || 0) || null,
      oneTimeValue: Number(form.get("oneTimeValue") || 0) || null,
      targetCloseDate: String(form.get("targetCloseDate") || "").trim() || null,
      notes: String(form.get("notes") || "").trim() || null,
      checklist: readChecklist(template?.checklistJson),
      tasks: readTaskTemplates(template?.taskTemplateJson),
    };

    const response = await fetch("/api/opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || "Failed to create opportunity.");
      setPending(false);
      return;
    }

    setOpportunities((current) => [body.data as OpportunityRecord, ...current.filter((entry) => entry.id !== body.data.id)]);
    setMessage("Opportunity created.");
    event.currentTarget.reset();
    setCreateDraft(null);
    setPending(false);
  }

  return (
    <AppShell isAdmin={isAdmin}>
      <div className="stack">
        <section className="hero">
          <span className="kicker">Pipeline</span>
          <h2>Track real revenue work once a lead becomes an active opportunity.</h2>
          <p>Use repeatable templates, assign owners, and keep checklists and tasks attached to the opportunity instead of losing momentum in notes.</p>
        </section>

        <section className="stat-grid compact-stat-grid">
          <article className="stat-card compact-stat-card"><div className="stat-body"><div className="stat-value">{opportunities.length}</div><div className="stat-label">Opportunities</div><div className="stat-desc">All active and closed pipeline records.</div></div></article>
          <article className="stat-card compact-stat-card"><div className="stat-body"><div className="stat-value">{openOpportunities}</div><div className="stat-label">Open</div><div className="stat-desc">Revenue opportunities still in motion.</div></div></article>
          <article className="stat-card compact-stat-card"><div className="stat-body"><div className="stat-value">{upsellOpportunities}</div><div className="stat-label">Upsells</div><div className="stat-desc">Expansion opportunities inside current accounts.</div></div></article>
          <article className="stat-card compact-stat-card"><div className="stat-body"><div className="stat-value">{followUps}</div><div className="stat-label">Follow Up Stage</div><div className="stat-desc">Opportunities that need direct next-step attention.</div></div></article>
          <article className="stat-card compact-stat-card"><div className="stat-body"><div className="stat-value">{overdueTasks}</div><div className="stat-label">Overdue Tasks</div><div className="stat-desc">Incomplete tasks with due dates in the past.</div></div></article>
        </section>

        <section className="card form-section collapsible-card">
          <div className="card-header collapsible-header">
            <div>
              <h3>Create Opportunity</h3>
              <p className="help">Start from a sale template whenever the workflow is repeatable.</p>
            </div>
            <button className="button secondary" type="button" onClick={() => setIsCreateOpen((value) => !value)}>{isCreateOpen ? "Collapse" : "Expand"}</button>
          </div>
          {isCreateOpen ? (
            <form onSubmit={createOpportunity} className="inline-grid">
              <div className="form-grid">
                <div className="field"><label htmlFor="opportunity-name">Opportunity name</label><input id="opportunity-name" name="name" placeholder="North Ridge Internet Upgrade" defaultValue={createDraft?.name || ""} required /></div>
                <div className="field"><label htmlFor="opportunity-company">Company</label><select id="opportunity-company" name="companyId" defaultValue={createDraft?.companyId || ""} required><option value="">Select company</option>{initialCompanies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></div>
                <div className="field"><label htmlFor="opportunity-contact">Contact</label><select id="opportunity-contact" name="contactId" defaultValue={createDraft?.contactId || ""}><option value="">No contact selected</option>{initialContacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.fullName || contact.email || "Unnamed contact"}</option>)}</select></div>
                <div className="field"><label htmlFor="opportunity-template">Template</label><select id="opportunity-template" name="templateId" defaultValue=""><option value="">No template</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></div>
                <div className="field"><label htmlFor="opportunity-type">Opportunity type</label><select id="opportunity-type" name="opportunityType" defaultValue={createDraft?.opportunityType || "NEW_SALE"}>{opportunityTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
                <div className="field"><label htmlFor="opportunity-stage">Stage</label><select id="opportunity-stage" name="stage" defaultValue="DISCOVERED">{opportunityStages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}</select></div>
                <div className="field"><label htmlFor="opportunity-status">Status</label><select id="opportunity-status" name="status" defaultValue="OPEN">{opportunityStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
                <div className="field"><label htmlFor="opportunity-owner">Owner</label><select id="opportunity-owner" name="ownerUserId"><option value="">Unassigned</option>{initialUsers.map((user) => <option key={user.id} value={user.id}>{user.name || user.email}</option>)}</select></div>
                <div className="field"><label htmlFor="opportunity-service">Service line</label><input id="opportunity-service" name="serviceLine" placeholder="Internet" defaultValue={createDraft?.serviceLine || ""} /></div>
                <div className="field"><label htmlFor="opportunity-value">Value estimate</label><input id="opportunity-value" name="valueEstimate" type="number" placeholder="5000" /></div>
                <div className="field"><label htmlFor="opportunity-mrr">Monthly value</label><input id="opportunity-mrr" name="monthlyValue" type="number" placeholder="450" /></div>
                <div className="field"><label htmlFor="opportunity-onetime">One-time value</label><input id="opportunity-onetime" name="oneTimeValue" type="number" placeholder="1200" /></div>
                <div className="field"><label htmlFor="opportunity-close-date">Target close date</label><input id="opportunity-close-date" name="targetCloseDate" type="date" /></div>
              </div>
              <div className="field"><label htmlFor="opportunity-notes">Notes</label><textarea id="opportunity-notes" name="notes" placeholder="Deal notes, blockers, next call context, and implementation considerations." defaultValue={createDraft?.notes || ""} /></div>
              <div className="actions"><button className="button primary" type="submit" disabled={pending}>{pending ? "Saving..." : "Create Opportunity"}</button>{message ? <span className="help">{message}</span> : null}</div>
            </form>
          ) : null}
        </section>

        <section className="card form-section collapsible-card">
          <div className="card-header collapsible-header">
            <div>
              <h3>Template Builder</h3>
              <p className="help">Draft repeatable sale or upsell templates so common work can be launched consistently.</p>
            </div>
          </div>
          <form onSubmit={createTemplate} className="inline-grid">
            <div className="form-grid">
              <div className="field"><label htmlFor="template-name">Template name</label><input id="template-name" value={templateSeed.name} onChange={(event) => setTemplateSeed((current) => ({ ...current, name: event.target.value }))} placeholder="Firewall Upsell" /></div>
              <div className="field"><label htmlFor="template-type">Opportunity type</label><select id="template-type" value={templateSeed.opportunityType} onChange={(event) => setTemplateSeed((current) => ({ ...current, opportunityType: event.target.value }))}>{opportunityTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
              <div className="field"><label htmlFor="template-service">Service line</label><input id="template-service" value={templateSeed.serviceLine} onChange={(event) => setTemplateSeed((current) => ({ ...current, serviceLine: event.target.value }))} placeholder="Firewall" /></div>
            </div>
            <div className="field"><label htmlFor="template-description">Description</label><textarea id="template-description" value={templateSeed.description} onChange={(event) => setTemplateSeed((current) => ({ ...current, description: event.target.value }))} placeholder="When to use this template and what it covers." /></div>
            <div className="field"><label htmlFor="template-checklist">Checklist items</label><textarea id="template-checklist" value={templateSeed.checklistText} onChange={(event) => setTemplateSeed((current) => ({ ...current, checklistText: event.target.value }))} placeholder="One item per line" /></div>
            <div className="field"><label htmlFor="template-tasks">Task titles</label><textarea id="template-tasks" value={templateSeed.tasksText} onChange={(event) => setTemplateSeed((current) => ({ ...current, tasksText: event.target.value }))} placeholder="One task per line" /></div>
            <div className="actions"><button className="button secondary" type="submit" disabled={pending}>{pending ? "Saving..." : templateSeed.id ? "Update Template" : "Save Template"}</button><button className="button secondary" type="button" disabled={pending} onClick={() => hydrateTemplateSeed(null)}>Clear</button></div>
          </form>
          <div className="inline-grid">
            {templates.map((template) => (
              <div key={template.id} className="dashboard-list-row">
                <div className="record-summary-main">
                  <div className="record-summary-topline">
                    <strong>{template.name}</strong>
                    <span className="badge badge-blue">{template.opportunityType}</span>
                  </div>
                  <div className="record-meta-row">
                    <span>{template.serviceLine || "No service line"}</span>
                    <span>{readChecklist(template.checklistJson).length} checklist items</span>
                    <span>{readTaskTemplates(template.taskTemplateJson).length} task templates</span>
                  </div>
                  {template.description ? <p className="help">{template.description}</p> : null}
                </div>
                <div className="actions action-bar-tight">
                  <button className="button secondary" type="button" disabled={pending} onClick={() => hydrateTemplateSeed(template)}>Edit</button>
                  <button className="button secondary" type="button" disabled={pending} onClick={() => void archiveTemplate(template.id)}>Archive</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card collapsible-card">
          <div className="card-header collapsible-header">
            <div>
              <h3>Pipeline Records</h3>
              <p className="help">{filtered.length} opportunity{filtered.length === 1 ? "" : "ies"} in view.</p>
            </div>
            <button className="button secondary" type="button" onClick={() => setIsListOpen((value) => !value)}>{isListOpen ? "Collapse" : "Expand"}</button>
          </div>
          {isListOpen ? (
            <>
              <div className="filter-row">
                <div className="search-wrap"><svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg><input type="search" placeholder="Search opportunity, company, service, owner..." value={search} onChange={(event) => setSearch(event.target.value)} className="search-input" /></div>
                <select className="filter-select" value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}><option value="ALL">All stages</option>{opportunityStages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}</select>
                <select className="filter-select" value={viewFilter} onChange={(event) => setViewFilter(event.target.value)}><option value="ALL">All views</option><option value="OPEN">Open</option><option value="UPSELL">Upsells</option><option value="FOLLOW_UP">Follow up</option><option value="TASKS_DUE">Tasks due</option><option value="WON">Won</option></select>
              </div>

              {filtered.length === 0 ? <div className="empty-state"><p>No opportunities in this view.</p></div> : (
                <div className="inline-grid">
                  {filtered.map((opportunity) => {
                    const checklist = readChecklist(opportunity.checklistJson);
                    const completedChecklist = checklist.filter((item) => item.done).length;
                    return (
                      <details key={opportunity.id} className="card content-item" open={false}>
                        <summary className="card-header content-item-summary">
                          <div className="record-summary-main">
                            <div className="record-summary-topline">
                              <h3>{opportunity.name}</h3>
                              <span className="badge badge-blue">{opportunity.stage}</span>
                            </div>
                            <p className="help">{opportunity.company.name} · {opportunity.serviceLine || "No service line"} · {opportunity.opportunityType}</p>
                            <div className="record-meta-row">
                              <span>{opportunity.owner?.name || opportunity.owner?.email || "Unassigned owner"}</span>
                              <span>{opportunity.valueEstimate ? `$${opportunity.valueEstimate.toLocaleString()}` : "No value estimate"}</span>
                              <span>{opportunity.tasks.length} task{opportunity.tasks.length === 1 ? "" : "s"}</span>
                              <span>{checklist.length > 0 ? `${completedChecklist}/${checklist.length} checklist complete` : "No checklist"}</span>
                            </div>
                          </div>
                        </summary>
                        <div className="content-item-body inline-grid">
                          <div className="grid">
                            <div className="card">
                              <h4>Account</h4>
                              <p>{opportunity.company.name}</p>
                              <p>{opportunity.contact?.fullName || opportunity.contact?.email || "No linked contact"}</p>
                              <div className="field"><label htmlFor={`pipeline-stage-${opportunity.id}`}>Stage</label><select id={`pipeline-stage-${opportunity.id}`} value={opportunity.stage} disabled={pending} onChange={(event) => void updateOpportunity(opportunity, { stage: event.target.value })}>{opportunityStages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}</select></div>
                              <div className="field"><label htmlFor={`pipeline-status-${opportunity.id}`}>Status</label><select id={`pipeline-status-${opportunity.id}`} value={opportunity.status} disabled={pending} onChange={(event) => void updateOpportunity(opportunity, { status: event.target.value, deliveryStatus: event.target.value === "WON" ? opportunity.deliveryStatus ?? "NOT_STARTED" : null })}>{opportunityStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
                              <div className="field"><label htmlFor={`pipeline-owner-${opportunity.id}`}>Owner</label><select id={`pipeline-owner-${opportunity.id}`} value={opportunity.owner?.id || ""} disabled={pending} onChange={(event) => void updateOpportunity(opportunity, { owner: mapUserById(event.target.value) as OpportunityRecord["owner"] })}><option value="">Unassigned</option>{initialUsers.map((user) => <option key={user.id} value={user.id}>{user.name || user.email}</option>)}</select></div>
                            </div>
                            <div className="card">
                              <h4>Revenue</h4>
                              <div className="form-grid">
                                <div className="field"><label htmlFor={`pipeline-value-${opportunity.id}`}>Value estimate</label><input id={`pipeline-value-${opportunity.id}`} type="number" defaultValue={opportunity.valueEstimate ?? ""} onBlur={(event) => { const raw = event.target.value.trim(); const next = raw ? Number(raw) : null; if (next !== opportunity.valueEstimate) { void updateOpportunity(opportunity, { valueEstimate: next }); } }} /></div>
                                <div className="field"><label htmlFor={`pipeline-mrr-${opportunity.id}`}>Monthly value</label><input id={`pipeline-mrr-${opportunity.id}`} type="number" defaultValue={opportunity.monthlyValue ?? ""} onBlur={(event) => { const raw = event.target.value.trim(); const next = raw ? Number(raw) : null; if (next !== opportunity.monthlyValue) { void updateOpportunity(opportunity, { monthlyValue: next }); } }} /></div>
                                <div className="field"><label htmlFor={`pipeline-onetime-${opportunity.id}`}>One-time value</label><input id={`pipeline-onetime-${opportunity.id}`} type="number" defaultValue={opportunity.oneTimeValue ?? ""} onBlur={(event) => { const raw = event.target.value.trim(); const next = raw ? Number(raw) : null; if (next !== opportunity.oneTimeValue) { void updateOpportunity(opportunity, { oneTimeValue: next }); } }} /></div>
                                <div className="field"><label htmlFor={`pipeline-close-${opportunity.id}`}>Target close</label><input id={`pipeline-close-${opportunity.id}`} type="date" defaultValue={opportunity.targetCloseDate ? new Date(opportunity.targetCloseDate).toISOString().slice(0, 10) : ""} onBlur={(event) => { const next = event.target.value || null; const current = opportunity.targetCloseDate ? new Date(opportunity.targetCloseDate).toISOString().slice(0, 10) : null; if (next !== current) { void updateOpportunity(opportunity, { targetCloseDate: next }); } }} /></div>
                              </div>
                              {opportunity.status === "WON" ? (
                                <div className="field"><label htmlFor={`pipeline-delivery-${opportunity.id}`}>Delivery status</label><select id={`pipeline-delivery-${opportunity.id}`} value={opportunity.deliveryStatus || "NOT_STARTED"} disabled={pending} onChange={(event) => void updateOpportunity(opportunity, { deliveryStatus: event.target.value })}>{deliveryStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
                              ) : null}
                            </div>
                          </div>
                          <div className="card"><h4>Checklist</h4>{checklist.length === 0 ? <p>No checklist items.</p> : <div className="inline-grid">{checklist.map((item) => <label key={item.key} className="dashboard-list-row"><div className="record-summary-main"><div className="record-summary-topline"><strong>{item.label}</strong><input type="checkbox" checked={Boolean(item.done)} disabled={pending} onChange={() => void updateOpportunity(opportunity, { checklistJson: checklist.map((entry) => entry.key === item.key ? { ...entry, done: !entry.done } : entry) })} /></div><p className="help">{item.done ? "Done" : "Open"}</p></div></label>)}</div>}</div>
                          <div className="card"><div className="card-header dashboard-panel-header"><div><h4>Tasks</h4></div><button className="button secondary" type="button" disabled={pending} onClick={() => void addTask(opportunity)}>Add Task</button></div><div className="form-grid"><div className="field"><label htmlFor={`task-new-title-${opportunity.id}`}>Task title</label><input id={`task-new-title-${opportunity.id}`} value={getTaskComposer(opportunity.id).title} onChange={(event) => setTaskComposer(opportunity.id, { title: event.target.value })} placeholder="Schedule kickoff call" /></div><div className="field"><label htmlFor={`task-new-assignee-${opportunity.id}`}>Assignee</label><select id={`task-new-assignee-${opportunity.id}`} value={getTaskComposer(opportunity.id).assigneeUserId} onChange={(event) => setTaskComposer(opportunity.id, { assigneeUserId: event.target.value })}><option value="">Unassigned</option>{initialUsers.map((user) => <option key={user.id} value={user.id}>{user.name || user.email}</option>)}</select></div><div className="field"><label htmlFor={`task-new-due-${opportunity.id}`}>Due date</label><input id={`task-new-due-${opportunity.id}`} type="date" value={getTaskComposer(opportunity.id).dueDate} onChange={(event) => setTaskComposer(opportunity.id, { dueDate: event.target.value })} /></div></div><div className="field"><label htmlFor={`task-new-description-${opportunity.id}`}>Description</label><textarea id={`task-new-description-${opportunity.id}`} value={getTaskComposer(opportunity.id).description} onChange={(event) => setTaskComposer(opportunity.id, { description: event.target.value })} placeholder="Optional task details or handoff notes." /></div>{opportunity.tasks.length === 0 ? <p>No tasks yet.</p> : <div className="inline-grid">{opportunity.tasks.map((task) => <div key={task.id} className="dashboard-list-row"><div className="record-summary-main"><div className="record-summary-topline"><strong>{task.title}</strong><select value={task.status} disabled={pending} onChange={(event) => void updateOpportunity(opportunity, { tasks: opportunity.tasks.map((entry) => entry.id === task.id ? { ...entry, status: event.target.value } : entry) })}>{taskStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></div><div className="field"><label htmlFor={`task-assignee-${opportunity.id}-${task.id}`}>Assignee</label><select id={`task-assignee-${opportunity.id}-${task.id}`} value={task.assignee?.id || ""} disabled={pending} onChange={(event) => void updateOpportunity(opportunity, { tasks: opportunity.tasks.map((entry) => entry.id === task.id ? { ...entry, assignee: mapUserById(event.target.value) } : entry) })}><option value="">Unassigned</option>{initialUsers.map((user) => <option key={user.id} value={user.id}>{user.name || user.email}</option>)}</select></div><div className="field"><label htmlFor={`task-due-${opportunity.id}-${task.id}`}>Due date</label><input id={`task-due-${opportunity.id}-${task.id}`} type="date" value={task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ""} disabled={pending} onChange={(event) => void updateOpportunity(opportunity, { tasks: opportunity.tasks.map((entry) => entry.id === task.id ? { ...entry, dueDate: event.target.value || null } : entry) })} /></div>{task.description ? <p className="help">{task.description}</p> : null}</div></div>)}</div>}</div>
                          <div className="card"><h4>Notes</h4><div className="field"><label htmlFor={`pipeline-notes-${opportunity.id}`}>Opportunity notes</label><textarea id={`pipeline-notes-${opportunity.id}`} defaultValue={opportunity.notes || ""} placeholder="Deal notes, implementation details, blockers, next-step context..." onBlur={(event) => { if ((event.target.value || "") !== (opportunity.notes || "")) { void updateOpportunity(opportunity, { notes: event.target.value.trim() || null }); } }} /></div></div>
                        </div>
                      </details>
                    );
                  })}
                </div>
              )}
            </>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
