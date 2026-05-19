import { useEffect, useState } from "react";

import {
  createAdminCompany,
  deleteAdminCompany,
  listAdminCompanies,
  updateAdminCompany,
} from "../../api/admin.api";
import "../../assets/styles/app-shell.css";
import { Button, EmptyState, Input, Select, Spinner, Toast } from "../../components/ui";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [draftById, setDraftById] = useState({});
  const [createForm, setCreateForm] = useState({
    name: "",
    domain: "",
    website: "",
    is_active: true,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const result = await listAdminCompanies();
    if (!result.ok) {
      setError(result.data?.error || "Failed to load companies.");
      setLoading(false);
      return;
    }

    const rows = result.data?.companies || [];
    setCompanies(rows);
    const nextDraft = {};
    rows.forEach((company) => {
      nextDraft[company.id] = {
        name: company.name,
        domain: company.domain,
        website: company.website,
        is_active: company.is_active,
      };
    });
    setDraftById(nextDraft);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const onCreate = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    const result = await createAdminCompany(createForm);
    if (!result.ok) {
      setError(result.data?.error || "Failed to create company.");
      return;
    }
    setSuccess("Company created.");
    setCreateForm({ name: "", domain: "", website: "", is_active: true });
    await load();
  };

  const onUpdate = async (companyId) => {
    setError("");
    setSuccess("");
    const result = await updateAdminCompany(companyId, draftById[companyId]);
    if (!result.ok) {
      setError(result.data?.error || "Failed to update company.");
      return;
    }
    setSuccess("Company updated.");
    await load();
  };

  const onDelete = async (companyId) => {
    setError("");
    setSuccess("");
    const result = await deleteAdminCompany(companyId);
    if (!result.ok) {
      setError(result.data?.error || "Failed to delete company.");
      return;
    }
    setSuccess("Company deleted.");
    await load();
  };

  const filteredCompanies = companies.filter((company) => {
    const haystack = `${company.name} ${company.domain || ""} ${company.website || ""}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  return (
    <div className="app-shell dashboard-shell">
      <section className="app-hero">
        <h2>Company Management</h2>
        <p>Maintain company records and control active organization listings.</p>
      </section>

      <Toast tone="error" message={error} />
      <Toast tone="success" message={success} />

      <section className="app-grid">
        <article className="panel">
          <h3>Create Company</h3>
          <form className="admin-form" onSubmit={onCreate}>
            <Input
              label="Name"
              value={createForm.name}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <div className="admin-form-row">
              <Input
                label="Domain"
                value={createForm.domain}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, domain: event.target.value }))}
                placeholder="Fintech"
              />
              <Input
                label="Website"
                value={createForm.website}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, website: event.target.value }))}
                placeholder="https://example.com"
              />
            </div>
            <Select
              label="Status"
              value={String(createForm.is_active)}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, is_active: event.target.value === "true" }))}
              options={[
                { label: "Active", value: "true" },
                { label: "Inactive", value: "false" },
              ]}
            />
            <Button type="submit">Create Company</Button>
          </form>
        </article>

        <article className="panel">
          <h3>Company Directory</h3>
          <div className="app-toolbar" style={{ marginBottom: 12 }}>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by company name, domain, website"
            />
            <div></div>
            <span className="badge">{filteredCompanies.length} companies</span>
          </div>
          <div className="problem-list-grid">
            {loading ? <Spinner /> : null}
            {filteredCompanies.map((company) => (
              <article key={company.id} className="problem-item">
                <h4>{company.name}</h4>
                <div className="badge-row">
                  <span className="badge">{company.domain || "No domain"}</span>
                  <span className="badge">{company.recruiter_count} recruiters</span>
                </div>

                <div className="admin-form-row">
                  <Input
                    label="Name"
                    value={draftById[company.id]?.name || ""}
                    onChange={(event) =>
                      setDraftById((prev) => ({
                        ...prev,
                        [company.id]: { ...prev[company.id], name: event.target.value },
                      }))
                    }
                  />
                  <Input
                    label="Domain"
                    value={draftById[company.id]?.domain || ""}
                    onChange={(event) =>
                      setDraftById((prev) => ({
                        ...prev,
                        [company.id]: { ...prev[company.id], domain: event.target.value },
                      }))
                    }
                  />
                </div>

                <div className="admin-form-row">
                  <Input
                    label="Website"
                    value={draftById[company.id]?.website || ""}
                    onChange={(event) =>
                      setDraftById((prev) => ({
                        ...prev,
                        [company.id]: { ...prev[company.id], website: event.target.value },
                      }))
                    }
                  />
                  <Select
                    label="Status"
                    value={String(draftById[company.id]?.is_active ?? true)}
                    onChange={(event) =>
                      setDraftById((prev) => ({
                        ...prev,
                        [company.id]: { ...prev[company.id], is_active: event.target.value === "true" },
                      }))
                    }
                    options={[
                      { label: "Active", value: "true" },
                      { label: "Inactive", value: "false" },
                    ]}
                  />
                </div>

                <div className="admin-form-row">
                  <Button type="button" onClick={() => onUpdate(company.id)}>Save Changes</Button>
                  <Button type="button" variant="danger" onClick={() => onDelete(company.id)}>Delete Company</Button>
                </div>
              </article>
            ))}
            {!loading && !filteredCompanies.length ? <EmptyState title="No companies found" description="Create your first company record." /> : null}
          </div>
        </article>
      </section>
    </div>
  );
}
