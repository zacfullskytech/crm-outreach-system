"use client";

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
  const [jobMessage, setJobMessage] = useState<string | null>(null);
  const [candidateMessage, setCandidateMessage] = useState<string | null>(null);
  const [pendingJob, setPendingJob] = useState(false);
  const [pendingCandidateId, setPendingCandidateId] = useState<string | null>(null);

  const filteredProspects = prospects.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      (p.companyName || "").toLowerCase().includes(q) ||
      (p.industry || "").toLowerCase().includes(q) ||
      (p.state || "").toLowerCase().includes(q) ||
      (p.matchStatus || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "ALL" || p.qualificationStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredCandidates = candidates.filter((candidate) => {
    if (candidateFilter === "ALL") return true;
    if (candidateFilter === "REVIEW") return candidate.matchStatus !== "NEW" || candidate.status === "NEW";
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
    setJobMessage(`Prospecting job created with ${job._count?.candidates ?? nextCandidates.length} discovered candidates.`);
    event.currentTarget.reset();
    setPendingJob(false);
  }

  async function reviewCandidate(id: string, status: "APPROVED" | "REJECTED") {
    setPendingCandidateId(id);
    setCandidateMessage(null);

    const response = await fetch(`/api/prospecting/candidates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
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
            Define geography and industry focus, review AI-seeded candidates, and only promote clean records into your working prospect pool.
          </p>
        </section>

        <section className="stat-grid">
          <article className="stat-card">
            <div className="stat-body">
              <div className="stat-value">{jobs.length}</div>
              <div className="stat-label">Search Jobs</div>
              <div className="stat-desc">Saved search intents for industries and geographies.</div>
            </div>
          </article>
          <article className="stat-card">
            <div className="stat-body">
              <div className="stat-value">{candidates.filter((candidate) => candidate.status === "NEW").length}</div>
              <div className="stat-label">Review Queue</div>
              <div className="stat-desc">Candidates awaiting approval or rejection.</div>
            </div>
          </article>
          <article className="stat-card">
            <div className="stat-body">
              <div className="stat-value">{prospects.filter((prospect) => prospect.matchStatus === "NEW").length}</div>
              <div className="stat-label">Clean Net-New</div>
              <div className="stat-desc">Prospects that do not currently match existing CRM records.</div>
            </div>
          </article>
          <article className="stat-card">
            <div className="stat-body">
              <div className="stat-value">{[...candidates, ...prospects].filter((item) => item.matchStatus !== "NEW").length}</div>
              <div className="stat-label">Protected Matches</div>
              <div className="stat-desc">Records flagged as possible duplicates, existing contacts, or existing companies.</div>
            </div>
          </article>
        </section>

        <section className="card form-section">
          <div className="card-header">
            <div>
              <h3>Create Prospecting Job</h3>
              <p className="help">Phase 1 runs public web discovery from your search intent, captures evidence, and immediately cross-checks current CRM records.</p>
            </div>
          </div>
          <form onSubmit={createSearchJob} className="inline-grid">
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
            <div className="actions">
              <button className="button primary" type="submit" disabled={pendingJob}>
                {pendingJob ? "Creating..." : "Create Search Job"}
              </button>
              {jobMessage ? <span className="help">{jobMessage}</span> : null}
            </div>
          </form>
        </section>

        <section className="grid prospecting-grid">
          <article className="card">
            <div className="card-header">
              <div>
                <h3>Search Jobs</h3>
                <p className="help">Saved search definitions and discovery output counts.</p>
              </div>
            </div>
            {jobs.length === 0 ? (
              <div className="empty-state"><p>No prospecting jobs yet.</p></div>
            ) : (
              <div className="prospecting-list">
                {jobs.map((job) => (
                  <div key={job.id} className="prospecting-list-item">
                    <div>
                      <strong>{job.name}</strong>
                      <p className="help">{job.industry || "General search"} · {job.status}</p>
                    </div>
                    <div className="prospecting-metrics">
                      <span>{job._count?.candidates ?? 0} candidates</span>
                      <span>{job._count?.prospects ?? 0} imported</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="card">
            <div className="card-header">
              <div>
                <h3>Discovery Queue</h3>
                <p className="help">Review discovered candidates before they enter accepted prospects.</p>
              </div>
              <select className="filter-select" value={candidateFilter} onChange={(event) => setCandidateFilter(event.target.value)}>
                <option value="ALL">All candidates</option>
                <option value="REVIEW">Needs review</option>
                <option value="IMPORTED">Imported</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            {candidateMessage ? <p className="help">{candidateMessage}</p> : null}
            {filteredCandidates.length === 0 ? (
              <div className="empty-state"><p>No candidates in this view.</p></div>
            ) : (
              <div className="prospecting-list">
                {filteredCandidates.map((candidate) => {
                  const evidence = readEvidence(candidate.evidenceJson);

                  return (
                    <div key={candidate.id} className="prospecting-candidate">
                      <div className="prospecting-candidate-head">
                        <div>
                          <strong>{candidate.companyName}</strong>
                          <p className="help">{candidate.contactName || "No contact found"} · {candidate.industry || "Unknown industry"}</p>
                        </div>
                        <span className={matchBadgeClass(candidate.matchStatus)}>{candidate.matchStatus}</span>
                      </div>
                      <p className="help">{candidate.city || "Unknown city"}{candidate.state ? `, ${candidate.state}` : ""} · score {candidate.score ?? 0}</p>
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
                      <div className="actions">
                        <button
                          className="button primary"
                          type="button"
                          disabled={pendingCandidateId === candidate.id || candidate.status !== "NEW"}
                          onClick={() => void reviewCandidate(candidate.id, "APPROVED")}
                        >
                          {pendingCandidateId === candidate.id ? "Working..." : candidate.status === "IMPORTED" ? "Imported" : "Approve"}
                        </button>
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
            )}
          </article>
        </section>

        <section className="card form-section">
          <div className="card-header">
            <div>
              <h3>Manual Prospect Entry</h3>
              <p className="help">Manual adds still run through the same match protection layer.</p>
            </div>
          </div>
          <ProspectForm />
        </section>

        <section className="card">
          <div className="card-header">
            <h3>Accepted Prospects</h3>
            <div className="filter-row">
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
            </div>
          </div>

          {filteredProspects.length === 0 ? (
            <div className="empty-state">
              <p>{search || statusFilter !== "ALL" ? "No prospects match your filters." : "No accepted prospects yet."}</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Industry</th>
                    <th>Location</th>
                    <th>Qualification</th>
                    <th>CRM Match</th>
                    <th>Score</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProspects.map((prospect) => (
                    <tr key={prospect.id}>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {filteredProspects.length > 0 && (
            <p className="results-count">{filteredProspects.length} prospect{filteredProspects.length !== 1 ? "s" : ""}</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
