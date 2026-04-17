"use client";

import { useMemo, useState } from "react";
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

type OpportunityRecord = {
  id: string;
  name: string;
  opportunityType: string;
  stage: string;
  status: string;
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
  tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    status: string;
    dueDate: string | Date | null;
    assignee?: { id: string; email: string; name: string | null } | null;
  }>;
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
const taskStatuses = ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"] as const;

export function PipelineManager({
  initialOpportunities,
  initialTemplates,
  initialUsers,
  initialCompanies,
  initialContacts,
  isAdmin,
}: {
  initialOpportunities: OpportunityRecord[];
  initialTemplates: OpportunityTemplateRecord[];
  initialUsers: SimpleUser[];
  initialCompanies: SimpleCompany[];
  initialContacts: SimpleContact[];
  isAdmin: boolean;
}) {
  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [templates] = useState(initialTemplates);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [viewFilter, setViewFilter] = useState("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(true);
  const [isListOpen, setIsListOpen] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
                <div className="field"><label htmlFor="opportunity-name">Opportunity name</label><input id="opportunity-name" name="name" placeholder="North Ridge Internet Upgrade" required /></div>
                <div className="field"><label htmlFor="opportunity-company">Company</label><select id="opportunity-company" name="companyId" required><option value="">Select company</option>{initialCompanies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></div>
                <div className="field"><label htmlFor="opportunity-contact">Contact</label><select id="opportunity-contact" name="contactId"><option value="">No contact selected</option>{initialContacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.fullName || contact.email || "Unnamed contact"}</option>)}</select></div>
                <div className="field"><label htmlFor="opportunity-template">Template</label><select id="opportunity-template" name="templateId"><option value="">No template</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></div>
                <div className="field"><label htmlFor="opportunity-type">Opportunity type</label><select id="opportunity-type" name="opportunityType" defaultValue="NEW_SALE">{opportunityTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
                <div className="field"><label htmlFor="opportunity-stage">Stage</label><select id="opportunity-stage" name="stage" defaultValue="DISCOVERED">{opportunityStages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}</select></div>
                <div className="field"><label htmlFor="opportunity-status">Status</label><select id="opportunity-status" name="status" defaultValue="OPEN">{opportunityStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
                <div className="field"><label htmlFor="opportunity-owner">Owner</label><select id="opportunity-owner" name="ownerUserId"><option value="">Unassigned</option>{initialUsers.map((user) => <option key={user.id} value={user.id}>{user.name || user.email}</option>)}</select></div>
                <div className="field"><label htmlFor="opportunity-service">Service line</label><input id="opportunity-service" name="serviceLine" placeholder="Internet" /></div>
                <div className="field"><label htmlFor="opportunity-value">Value estimate</label><input id="opportunity-value" name="valueEstimate" type="number" placeholder="5000" /></div>
                <div className="field"><label htmlFor="opportunity-mrr">Monthly value</label><input id="opportunity-mrr" name="monthlyValue" type="number" placeholder="450" /></div>
                <div className="field"><label htmlFor="opportunity-onetime">One-time value</label><input id="opportunity-onetime" name="oneTimeValue" type="number" placeholder="1200" /></div>
                <div className="field"><label htmlFor="opportunity-close-date">Target close date</label><input id="opportunity-close-date" name="targetCloseDate" type="date" /></div>
              </div>
              <div className="field"><label htmlFor="opportunity-notes">Notes</label><textarea id="opportunity-notes" name="notes" placeholder="Deal notes, blockers, next call context, and implementation considerations." /></div>
              <div className="actions"><button className="button primary" type="submit" disabled={pending}>{pending ? "Saving..." : "Create Opportunity"}</button>{message ? <span className="help">{message}</span> : null}</div>
            </form>
          ) : null}
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
                            <div className="card"><h4>Account</h4><p>{opportunity.company.name}</p><p>{opportunity.contact?.fullName || opportunity.contact?.email || "No linked contact"}</p><p>{opportunity.status}</p></div>
                            <div className="card"><h4>Revenue</h4><p>Value: {opportunity.valueEstimate ? `$${opportunity.valueEstimate.toLocaleString()}` : "—"}</p><p>MRR: {opportunity.monthlyValue ? `$${opportunity.monthlyValue.toLocaleString()}` : "—"}</p><p>One-time: {opportunity.oneTimeValue ? `$${opportunity.oneTimeValue.toLocaleString()}` : "—"}</p></div>
                          </div>
                          <div className="card"><h4>Checklist</h4>{checklist.length === 0 ? <p>No checklist items.</p> : <div className="inline-grid">{checklist.map((item) => <div key={item.key} className="dashboard-list-row"><div className="record-summary-main"><strong>{item.label}</strong><p className="help">{item.done ? "Done" : "Open"}</p></div></div>)}</div>}</div>
                          <div className="card"><h4>Tasks</h4>{opportunity.tasks.length === 0 ? <p>No tasks yet.</p> : <div className="inline-grid">{opportunity.tasks.map((task) => <div key={task.id} className="dashboard-list-row"><div className="record-summary-main"><div className="record-summary-topline"><strong>{task.title}</strong><span className="badge">{task.status}</span></div><div className="record-meta-row"><span>{task.assignee?.name || task.assignee?.email || "Unassigned"}</span><span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}</span></div>{task.description ? <p className="help">{task.description}</p> : null}</div></div>)}</div>}</div>
                          {opportunity.notes ? <div className="card"><h4>Notes</h4><p>{opportunity.notes}</p></div> : null}
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
