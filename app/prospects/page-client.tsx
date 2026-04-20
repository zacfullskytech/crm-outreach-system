"use client";

import Link from "next/link";
import { useState } from "react";
import { ProspectForm } from "@/components/prospect-form";
import { AppShell } from "@/components/app-shell";
import type { Prospect, ProspectCandidate, ProspectSearchJob } from "@prisma/client";

type CandidateEvidence = { kind?: string; value?: unknown; note?: string };

type SearchJob = ProspectSearchJob & {
  _count?: {
    candidates: number;
    prospects: number;
  };
};

function readJobSummary(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function splitCsv(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function readEvidence(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as CandidateEvidence[];
  }

  return value.filter((item): item is CandidateEvidence => Boolean(item) && typeof item === "object");
}

function renderEvidenceValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(", ");
  }

  if (typeof value === "string") {
    return value;
  }

  if (value == null) {
    return "";
  }

  return JSON.stringify(value);
}

export function ProspectsPageClient({
  initialProspects,
  initialJobs,
  initialCandidates,
  isAdmin,
}: {
  initialProspects: Prospect[];
  initialJobs: SearchJob[];
  initialCandidates: ProspectCandidate[];
  isAdmin: boolean;
}) {
  const [prospects, setProspects] = useState(initialProspects);
  const [jobs, setJobs] = useState(initialJobs);
  const [candidates, setCandidates] = useState(initialCandidates);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [candidateFilter, setCandidateFilter] = useState("ALL");
  const [prospectView, setProspectView] = useState("ALL");
  const [jobMessage, setJobMessage] = useState<string | null>(null);
  const [candidateMessage, setCandidateMessage] = useState<string | null>(null);
  const [pendingJob, setPendingJob] = useState(false);
  const [pendingCandidateId, setPendingCandidateId] = useState<string | null>(null);
  const [pendingRerunJobId, setPendingRerunJobId] = useState<string | null>(null);
  const [pendingProspectId, setPendingProspectId] = useState<string | null>(null);
  const [pendingQueueClear, setPendingQueueClear] = useState(false);
  const [pendingJobClearId, setPendingJobClearId] = useState<string | null>(null);
  const [selectedProspectIds, setSelectedProspectIds] = useState<string[]>([]);
  const [pendingBulkProspects, setPendingBulkProspects] = useState(false);
  const [isJobFormOpen, setIsJobFormOpen] = useState(false);
  const [isJobsOpen, setIsJobsOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(true);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isAcceptedOpen, setIsAcceptedOpen] = useState(true);

  const filteredProspects = prospects.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      (p.companyName || "").toLowerCase().includes(q) ||
      (p.industry || "").toLowerCase().includes(q) ||
      (p.state || "").toLowerCase().includes(q) ||
      (p.matchStatus || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "ALL" || p.qualificationStatus === statusFilter;
    const matchesView =
      prospectView === "ALL" ||
      (prospectView === "CLEAN_NET_NEW" && p.matchStatus === "NEW") ||
      (prospectView === "NEEDS_REVIEW" && p.qualificationStatus === "REVIEWING") ||
      (prospectView === "QUALIFIED" && p.qualificationStatus === "QUALIFIED") ||
      (prospectView === "MATCHED" && p.matchStatus !== "NEW");
    return matchesSearch && matchesStatus && matchesView;
  });

  const filteredCandidates = candidates.filter((candidate) => {
    if (candidateFilter === "ALL") return true;
    if (candidateFilter === "REVIEW") return candidate.matchStatus !== "NEW" || candidate.status === "NEW";
    if (candidateFilter === "MATCHED") return candidate.matchStatus !== "NEW";
    return candidate.status === candidateFilter;
  });

  const matchBadgeClass = (status: string) => {
    switch (status) {
      case "EXISTING_COMPANY":
      case "EXISTING_CONTACT":
        return "badge badge-red";
      case "POSSIBLE_MATCH":
        return "badge badge-yellow";
      default:
        return "badge badge-green";
    }
  };

  async function createSearchJob(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingJob(true);
    setJobMessage(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") || "").trim(),
      industry: String(form.get("industry") || "").trim() || null,
      geography: splitCsv(String(form.get("geography") || "")),
      includeKeywords: splitCsv(String(form.get("includeKeywords") || "")),
      excludeKeywords: splitCsv(String(form.get("excludeKeywords") || "")),
      companyTypes: splitCsv(String(form.get("companyTypes") || "")),
      notes: String(form.get("notes") || "").trim() || null,
      realDataOnly: form.get("realDataOnly") === "on",
    };

    const response = await fetch("/api/prospecting/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setJobMessage(body.error || "Failed to create prospecting job.");
      setPendingJob(false);
      return;
    }

    const job = body.data as SearchJob & { candidates?: ProspectCandidate[] };
    const nextCandidates = Array.isArray(job.candidates) ? job.candidates : [];
    setJobs((current) => [job, ...current.filter((entry) => entry.id !== job.id)]);
    if (nextCandidates.length > 0) {
      setCandidates((current) => [...nextCandidates, ...current.filter((entry) => !nextCandidates.some((item) => item.id === entry.id))]);
    }
    const summary = readJobSummary(job.resultSummaryJson);
    const discoveryMode = typeof summary.discoveryMode === "string" ? summary.discoveryMode : null;
    const blockedReason = typeof summary.blockedReason === "string" ? summary.blockedReason : null;
    setJobMessage(
      discoveryMode === "blocked"
        ? blockedReason || "Search provider blocked the discovery run."
        : discoveryMode === "empty"
          ? "Prospecting job ran in real-data-only mode and found no candidates."
          : `Prospecting job created with ${job._count?.candidates ?? nextCandidates.length} ${discoveryMode === "seed" ? "fallback" : "discovered"} candidates.`,
    );
    event.currentTarget.reset();
    setPendingJob(false);
  }

  async function rerunJob(job: SearchJob) {
    setPendingRerunJobId(job.id);
    setJobMessage(null);

    const response = await fetch("/api/prospecting/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${job.name} rerun`,
        geography: [],
        includeKeywords: [],
        excludeKeywords: [],
        companyTypes: [],
        rerunJobId: job.id,
        realDataOnly: job.realDataOnly,
      }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setJobMessage(body.error || "Failed to rerun prospecting job.");
      setPendingRerunJobId(null);
      return;
    }

    const rerun = body.data as SearchJob & { candidates?: ProspectCandidate[] };
    const nextCandidates = Array.isArray(rerun.candidates) ? rerun.candidates : [];
    const summary = readJobSummary(rerun.resultSummaryJson);
    const discoveryMode = typeof summary.discoveryMode === "string" ? summary.discoveryMode : null;

    setJobs((current) => [rerun, ...current.filter((entry) => entry.id !== rerun.id)]);
    if (nextCandidates.length > 0) {
      setCandidates((current) => [...nextCandidates, ...current.filter((entry) => !nextCandidates.some((item) => item.id === entry.id))]);
    }
    const blockedReason = typeof summary.blockedReason === "string" ? summary.blockedReason : null;
    setJobMessage(
      discoveryMode === "blocked"
        ? blockedReason || "Search provider blocked the rerun."
        : discoveryMode === "empty"
          ? "Rerun completed in real-data-only mode with no candidates found."
          : `Rerun completed with ${rerun._count?.candidates ?? nextCandidates.length} ${discoveryMode === "seed" ? "fallback" : "discovered"} candidates.`,
    );
    setPendingRerunJobId(null);
  }

  async function clearDiscoveryQueue(onlyReviewed = false, jobId?: string) {
    if (jobId) {
      setPendingJobClearId(jobId);
    } else {
      setPendingQueueClear(true);
    }
    setCandidateMessage(null);

    const searchParams = new URLSearchParams();
    if (onlyReviewed) searchParams.set("onlyReviewed", "true");
    if (jobId) searchParams.set("jobId", jobId);

    const response = await fetch(`/api/prospecting/candidates${searchParams.toString() ? `?${searchParams.toString()}` : ""}`, {
      method: "DELETE",
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setCandidateMessage(body.error || "Failed to clear discovery queue.");
      setPendingQueueClear(false);
      setPendingJobClearId(null);
      return;
    }

    setCandidates((current) =>
      current.filter((candidate) => {
        const matchesJob = jobId ? candidate.searchJobId === jobId : true;
        if (!matchesJob) {
          return true;
        }
        if (onlyReviewed) {
          return candidate.status === "NEW";
        }
        return false;
      }),
    );
    setCandidateMessage(
      jobId
        ? "Candidates cleared for that job."
        : onlyReviewed
          ? "Reviewed candidates cleared from the queue."
          : "Discovery queue cleared.",
    );
    setPendingQueueClear(false);
    setPendingJobClearId(null);
  }

  async function bulkDeleteProspects() {
    if (selectedProspectIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedProspectIds.length} selected prospect${selectedProspectIds.length === 1 ? "" : "s"}?`)) return;

    setPendingBulkProspects(true);
    setCandidateMessage(null);

    const response = await fetch("/api/prospects/bulk", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedProspectIds }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setCandidateMessage(body.error || "Failed to bulk delete prospects.");
      setPendingBulkProspects(false);
      return;
    }

    setProspects((current) => current.filter((prospect) => !selectedProspectIds.includes(prospect.id)));
    setSelectedProspectIds([]);
    setCandidateMessage(`${body.deletedCount || 0} prospects removed.`);
    setPendingBulkProspects(false);
  }

  async function deleteProspect(id: string) {
    setPendingProspectId(id);
    setCandidateMessage(null);

    const response = await fetch(`/api/prospects/${id}`, { method: "DELETE" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setCandidateMessage(body.error || "Failed to delete prospect.");
      setPendingProspectId(null);
      return;
    }

    setProspects((current) => current.filter((prospect) => prospect.id !== id));
    setCandidateMessage("Prospect removed.");
    setPendingProspectId(null);
  }

  async function reviewCandidate(
    id: string,
    status: "APPROVED" | "REJECTED",
    options?: { matchStatus?: "NEW" | "POSSIBLE_MATCH" | "EXISTING_COMPANY" | "EXISTING_CONTACT"; matchReason?: string | null },
  ) {
    setPendingCandidateId(id);
    setCandidateMessage(null);

    const response = await fetch(`/api/prospecting/candidates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...options }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setCandidateMessage(body.error || "Failed to update candidate.");
      setPendingCandidateId(null);
      return;
    }

    if (status === "APPROVED" && body.data?.prospect) {
      setProspects((current) => [body.data.prospect as Prospect, ...current]);
    }

    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === id
          ? {
              ...candidate,
              status: status === "APPROVED" ? "IMPORTED" : "REJECTED",
            }
          : candidate,
      ),
    );

    setCandidateMessage(status === "APPROVED" ? "Candidate approved and added to prospects." : "Candidate rejected.");
    setPendingCandidateId(null);
  }

  return (
    <AppShell isAdmin={isAdmin}>
      <div className="stack prospecting-stack">
        <section className="hero">
          <span className="kicker">Prospecting Studio</span>
          <h2>Search for net-new companies without double-dipping existing clients.</h2>
          <p>
            Define geography and industry focus, review discovered candidates with evidence, and only promote clean records into your working prospect pool.
          </p>
        </section>

        <section className="stat-grid compact-stat-grid">
          <article className="stat-card compact-stat-card">
            <div className="stat-body">
              <div className="stat-value">{jobs.length}</div>
              <div className="stat-label">Search Jobs</div>
              <div className="stat-desc">Saved search intents for industries and geographies.</div>
            </div>
          </article>
          <article className="stat-card compact-stat-card">
            <div className="stat-body">
              <div className="stat-value">{candidates.filter((candidate) => candidate.status === "NEW").length}</div>
              <div className="stat-label">Review Queue</div>
              <div className="stat-desc">Candidates awaiting approval or rejection.</div>
            </div>
          </article>
          <article className="stat-card compact-stat-card">
            <div className="stat-body">
              <div className="stat-value">{candidates.filter((candidate) => candidate.matchStatus !== "NEW").length}</div>
              <div className="stat-label">Duplicate Flags</div>
              <div className="stat-desc">Discovered candidates that may overlap with current CRM records.</div>
            </div>
          </article>
          <article className="stat-card compact-stat-card">
            <div className="stat-body">
              <div className="stat-value">{prospects.filter((prospect) => prospect.matchStatus === "NEW").length}</div>
              <div className="stat-label">Clean Net-New</div>
              <div className="stat-desc">Prospects that do not currently match existing CRM records.</div>
            </div>
          </article>
          <article className="stat-card compact-stat-card">
            <div className="stat-body">
              <div className="stat-value">{prospects.filter((prospect) => prospect.qualificationStatus === "QUALIFIED").length}</div>
              <div className="stat-label">Qualified</div>
              <div className="stat-desc">Accepted prospects ready for conversion or next-step outreach.</div>
            </div>
          </article>
          <article className="stat-card compact-stat-card">
            <div className="stat-body">
              <div className="stat-value">{[...candidates, ...prospects].filter((item) => item.matchStatus !== "NEW").length}</div>
              <div className="stat-label">Protected Matches</div>
              <div className="stat-desc">Records flagged as possible duplicates, existing contacts, or existing companies.</div>
            </div>
          </article>
        </section>

        <section className="card form-section collapsible-card">
          <div className="card-header collapsible-header">
            <div>
              <h3>New Search Job</h3>
              <p className="help">Launch a fresh discovery run only when you need more leads. Existing jobs and the review queue stay below.</p>
            </div>
            <button className="button secondary" type="button" onClick={() => setIsJobFormOpen((value) => !value)}>
              {isJobFormOpen ? "Collapse" : "Expand"}
            </button>
          </div>
          {isJobFormOpen ? <form onSubmit={createSearchJob} className="inline-grid">
            <div className="form-grid">
              <div className="field">
                <label htmlFor="prospecting-job-name">Job name</label>
                <input id="prospecting-job-name" name="name" placeholder="Dallas veterinary hospitals" required />
              </div>
              <div className="field">
                <label htmlFor="prospecting-job-industry">Industry</label>
                <input id="prospecting-job-industry" name="industry" placeholder="Veterinary" />
              </div>
              <div className="field prospecting-span-2">
                <label htmlFor="prospecting-job-geography">Geography</label>
                <input id="prospecting-job-geography" name="geography" placeholder="Dallas, TX, Fort Worth, TX, Plano, TX" required />
              </div>
              <div className="field">
                <label htmlFor="prospecting-job-keywords">Include keywords</label>
                <input id="prospecting-job-keywords" name="includeKeywords" placeholder="animal hospital, emergency vet" />
              </div>
              <div className="field">
                <label htmlFor="prospecting-job-exclude">Exclude keywords</label>
                <input id="prospecting-job-exclude" name="excludeKeywords" placeholder="banfield, chain" />
              </div>
              <div className="field prospecting-span-2">
                <label htmlFor="prospecting-job-company-types">Company types</label>
                <input id="prospecting-job-company-types" name="companyTypes" placeholder="Independent Clinic, Specialty Practice" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="prospecting-job-notes">Notes</label>
              <textarea id="prospecting-job-notes" name="notes" placeholder="Target owner-led hospitals and avoid existing client groups." />
            </div>
            <div className="field">
              <label className="checkbox-label">
                <input type="checkbox" name="realDataOnly" />
                <span>Real data only</span>
              </label>
              <p className="help">Disable seeded fallback and return zero candidates if web discovery finds nothing.</p>
            </div>
            <div className="actions">
              <button className="button primary" type="submit" disabled={pendingJob}>
                {pendingJob ? "Creating..." : "Create Search Job"}
              </button>
              {jobMessage ? <span className="help">{jobMessage}</span> : null}
            </div>
          </form> : null}
        </section>

        <section className="grid prospecting-grid">
          <article className="card collapsible-card">
            <div className="card-header collapsible-header">
              <div>
                <h3>Search Jobs</h3>
                <p className="help">Saved search definitions and discovery output counts.</p>
              </div>
              <button className="button secondary" type="button" onClick={() => setIsJobsOpen((value) => !value)}>
                {isJobsOpen ? "Collapse" : "Expand"}
              </button>
            </div>
            {isJobsOpen ? jobs.length === 0 ? (
              <div className="empty-state"><p>No prospecting jobs yet.</p></div>
            ) : (
              <div className="prospecting-list">
                {jobs.map((job) => {
                  const summary = readJobSummary(job.resultSummaryJson);
                  const discoveryMode = typeof summary.discoveryMode === "string" ? summary.discoveryMode : null;

                  const blockedReason = typeof summary.blockedReason === "string" ? summary.blockedReason : null;

                  return (
                    <div key={job.id} className="prospecting-list-item">
                      <div className="record-summary-main">
                        <div className="record-summary-topline">
                          <strong>{job.name}</strong>
                          <span className="badge badge-blue">{job.status}</span>
                        </div>
                        <p className="help">{job.industry || "General search"} · {job.realDataOnly ? "real-data-only" : discoveryMode === "seed" ? "seed fallback used" : discoveryMode === "blocked" ? "search provider blocked" : "web discovery"}</p>
                        {blockedReason ? <p className="help">{blockedReason}</p> : null}
                        {discoveryMode === "web" ? <p className="help">Provider: Brave Search</p> : null}
                      </div>
                      <div className="prospecting-metrics">
                        <span>{job._count?.candidates ?? 0} candidates</span>
                        <span>{job._count?.prospects ?? 0} imported</span>
                        <button
                          className="button secondary"
                          type="button"
                          disabled={pendingRerunJobId === job.id}
                          onClick={() => void rerunJob(job)}
                        >
                          {pendingRerunJobId === job.id ? "Rerunning..." : "Rerun"}
                        </button>
                        <button
                          className="button secondary"
                          type="button"
                          disabled={pendingJobClearId === job.id}
                          onClick={() => void clearDiscoveryQueue(false, job.id)}
                        >
                          {pendingJobClearId === job.id ? "Clearing..." : "Clear Job Queue"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </article>

          <article className="card collapsible-card">
            <div className="card-header collapsible-header">
              <div>
                <h3>Discovery Queue</h3>
                <p className="help">Approve, reject, or clear discovered candidates before they become working prospects.</p>
              </div>
              <div className="actions">
                <select className="filter-select" value={candidateFilter} onChange={(event) => setCandidateFilter(event.target.value)}>
                  <option value="ALL">All candidates</option>
                  <option value="REVIEW">Needs review</option>
                  <option value="MATCHED">Duplicate flags</option>
                  <option value="IMPORTED">Imported</option>
                  <option value="REJECTED">Rejected</option>
                </select>
                <button className="button secondary" type="button" disabled={pendingQueueClear} onClick={() => void clearDiscoveryQueue(true)}>
                  Clear Reviewed Queue
                </button>
                <button className="button secondary" type="button" disabled={pendingQueueClear} onClick={() => void clearDiscoveryQueue(false)}>
                  Clear Entire Queue
                </button>
                <button className="button secondary" type="button" onClick={() => setIsQueueOpen((value) => !value)}>
                  {isQueueOpen ? "Collapse" : "Expand"}
                </button>
              </div>
            </div>
            {candidateMessage ? <p className="help">{candidateMessage}</p> : null}
            {isQueueOpen ? filteredCandidates.length === 0 ? (
              <div className="empty-state"><p>No candidates in this view.</p></div>
            ) : (
              <div className="prospecting-list">
                {filteredCandidates.map((candidate) => {
                  const evidence = readEvidence(candidate.evidenceJson);

                  return (
                    <div key={candidate.id} className="prospecting-candidate">
                      <div className="prospecting-candidate-head">
                        <div className="record-summary-main">
                          <div className="record-summary-topline">
                            <strong>{candidate.companyName}</strong>
                            <span className={matchBadgeClass(candidate.matchStatus)}>{candidate.matchStatus}</span>
                          </div>
                          <p className="help">{candidate.contactName || "No contact found"} · {candidate.industry || "Unknown industry"}</p>
                          <div className="record-meta-row">
                            <span>{candidate.city || "Unknown city"}{candidate.state ? `, ${candidate.state}` : ""}</span>
                            <span>score {candidate.score ?? 0}</span>
                            <span>{candidate.status}</span>
                          </div>
                        </div>
                      </div>
                      <p className="help">
                        Data source: {candidate.source === "AI prospecting seed" ? "Fallback seeded placeholder" : candidate.source || "Unknown"}
                      </p>
                      {candidate.sourceUrl ? (
                        <p className="help">
                          Source: <a href={candidate.sourceUrl} target="_blank" rel="noreferrer">{candidate.sourceUrl}</a>
                        </p>
                      ) : null}
                      {candidate.matchReason ? <p className="help">{candidate.matchReason}</p> : null}
                      {evidence.length > 0 ? (
                        <div className="prospecting-evidence">
                          {evidence.slice(0, 5).map((entry, index) => {
                            const value = renderEvidenceValue(entry.value ?? entry.note);
                            if (!value) {
                              return null;
                            }

                            return (
                              <div key={`${candidate.id}-evidence-${index}`} className="prospecting-evidence-item">
                                <span className="prospecting-evidence-label">{entry.kind || "evidence"}</span>
                                <span className="prospecting-evidence-value">{value}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                      <div className="actions action-bar-tight">
                        <button
                          className="button primary"
                          type="button"
                          disabled={pendingCandidateId === candidate.id || candidate.status !== "NEW"}
                          onClick={() => void reviewCandidate(candidate.id, "APPROVED")}
                        >
                          {pendingCandidateId === candidate.id ? "Working..." : candidate.status === "IMPORTED" ? "Imported" : "Approve"}
                        </button>
                        {candidate.matchStatus === "POSSIBLE_MATCH" ? (
                          <button
                            className="button secondary"
                            type="button"
                            disabled={pendingCandidateId === candidate.id || candidate.status !== "NEW"}
                            onClick={() => void reviewCandidate(candidate.id, "APPROVED", {
                              matchStatus: "NEW",
                              matchReason: "Approved by operator after duplicate review.",
                            })}
                          >
                            Approve Anyway
                          </button>
                        ) : null}
                        <button
                          className="button secondary"
                          type="button"
                          disabled={pendingCandidateId === candidate.id || candidate.status !== "NEW"}
                          onClick={() => void reviewCandidate(candidate.id, "REJECTED")}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </article>
        </section>

        <section className="card form-section collapsible-card">
          <div className="card-header collapsible-header">
            <div>
              <h3>Manual Prospect Entry</h3>
              <p className="help">Use this only for direct adds. Manual entries still go through the same match protection.</p>
            </div>
            <button className="button secondary" type="button" onClick={() => setIsManualOpen((value) => !value)}>
              {isManualOpen ? "Collapse" : "Expand"}
            </button>
          </div>
          {isManualOpen ? <ProspectForm onSaved={(prospect) => setProspects((current) => [prospect as Prospect, ...current])} /> : null}
        </section>

        <section className="card collapsible-card">
          <div className="card-header collapsible-header">
            <h3>Accepted Prospects</h3>
            <div className="filter-row">
              <button className="button secondary" type="button" disabled={pendingBulkProspects || selectedProspectIds.length === 0} onClick={() => void bulkDeleteProspects()}>
                {pendingBulkProspects ? "Deleting..." : `Delete Selected${selectedProspectIds.length > 0 ? ` (${selectedProspectIds.length})` : ""}`}
              </button>
              <div className="search-wrap">
                <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="search"
                  placeholder="Search company, industry, state, match…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="search-input"
                />
              </div>
              <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="ALL">All statuses</option>
                <option value="NEW">New</option>
                <option value="REVIEWING">Reviewing</option>
                <option value="QUALIFIED">Qualified</option>
                <option value="REJECTED">Rejected</option>
                <option value="CONVERTED">Converted</option>
              </select>
              <select className="filter-select" value={prospectView} onChange={(e) => setProspectView(e.target.value)}>
                <option value="ALL">All prospect views</option>
                <option value="CLEAN_NET_NEW">Clean net-new</option>
                <option value="NEEDS_REVIEW">Needs review</option>
                <option value="QUALIFIED">Qualified</option>
                <option value="MATCHED">Protected matches</option>
              </select>
              <button className="button secondary" type="button" onClick={() => setIsAcceptedOpen((value) => !value)}>
                {isAcceptedOpen ? "Collapse" : "Expand"}
              </button>
            </div>
          </div>

          {isAcceptedOpen ? filteredProspects.length === 0 ? (
            <div className="empty-state">
              <p>{search || statusFilter !== "ALL" ? "No prospects match your filters." : "No accepted prospects yet."}</p>
            </div>
          ) : (
            <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Company</th>
                    <th>Industry</th>
                    <th>Location</th>
                    <th>Qualification</th>
                    <th>CRM Match</th>
                    <th>Score</th>
                    <th>Source</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProspects.map((prospect) => (
                    <tr key={prospect.id}>
                      <td><input type="checkbox" checked={selectedProspectIds.includes(prospect.id)} onChange={(event) => setSelectedProspectIds((current) => event.target.checked ? [...current, prospect.id] : current.filter((id) => id !== prospect.id))} /></td>
                      <td className="primary-cell">{prospect.companyName}</td>
                      <td>{prospect.industry || <span className="muted">—</span>}</td>
                      <td>{[prospect.city, prospect.state].filter(Boolean).join(", ") || <span className="muted">Unknown</span>}</td>
                      <td><span className="badge badge-blue">{prospect.qualificationStatus}</span></td>
                      <td>
                        <span className={matchBadgeClass(prospect.matchStatus)}>{prospect.matchStatus}</span>
                        {prospect.matchReason ? <div className="help">{prospect.matchReason}</div> : null}
                      </td>
                      <td><span className="score-badge">{prospect.score ?? 0}</span></td>
                      <td>{prospect.source || <span className="muted">Manual</span>}</td>
                      <td>
                        <div className="actions action-bar-tight">
                          <Link
                            className="button secondary"
                            href={`/pipeline?name=${encodeURIComponent(`${prospect.companyName} Opportunity`)}&opportunityType=NEW_SALE&serviceLine=${encodeURIComponent(prospect.industry || "")}&notes=${encodeURIComponent([prospect.notes || "Created from accepted prospect", prospect.city || prospect.state ? `Location: ${[prospect.city, prospect.state].filter(Boolean).join(", ")}` : null, prospect.source ? `Source: ${prospect.source}` : null].filter(Boolean).join("\n"))}`}
                          >
                            Create Opportunity
                          </Link>
                          <button className="button secondary" type="button" disabled={pendingProspectId === prospect.id} onClick={() => void deleteProspect(prospect.id)}>
                            {pendingProspectId === prospect.id ? "Removing..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="inline-grid mobile-card-list">
              {filteredProspects.map((prospect) => (
                <div key={`${prospect.id}-mobile`} className="dashboard-list-row mobile-record-card">
                  <label className="help" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <input type="checkbox" checked={selectedProspectIds.includes(prospect.id)} onChange={(event) => setSelectedProspectIds((current) => event.target.checked ? [...current, prospect.id] : current.filter((id) => id !== prospect.id))} />
                    Select for bulk delete
                  </label>
                  <div className="record-summary-main">
                    <div className="record-summary-topline">
                      <strong>{prospect.companyName}</strong>
                      <span className="badge badge-blue">{prospect.qualificationStatus}</span>
                    </div>
                    <div className="record-meta-row">
                      <span>{prospect.industry || "Unknown industry"}</span>
                      <span>{[prospect.city, prospect.state].filter(Boolean).join(", ") || "Unknown location"}</span>
                      <span>Score {prospect.score ?? 0}</span>
                    </div>
                    <div className="record-meta-row">
                      <span className={matchBadgeClass(prospect.matchStatus)}>{prospect.matchStatus}</span>
                      <span>{prospect.source || "Manual"}</span>
                    </div>
                    <div className="actions">
                      <Link
                        className="button secondary"
                        href={`/pipeline?name=${encodeURIComponent(`${prospect.companyName} Opportunity`)}&opportunityType=NEW_SALE&serviceLine=${encodeURIComponent(prospect.industry || "")}&notes=${encodeURIComponent([prospect.notes || "Created from accepted prospect", prospect.city || prospect.state ? `Location: ${[prospect.city, prospect.state].filter(Boolean).join(", ")}` : null, prospect.source ? `Source: ${prospect.source}` : null].filter(Boolean).join("\n"))}`}
                      >
                        Create Opportunity
                      </Link>
                      <button className="button secondary" type="button" disabled={pendingProspectId === prospect.id} onClick={() => void deleteProspect(prospect.id)}>
                        {pendingProspectId === prospect.id ? "Removing..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </>
          ) : null}
          {filteredProspects.length > 0 && (
            <p className="results-count">{filteredProspects.length} prospect{filteredProspects.length !== 1 ? "s" : ""} in view</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
