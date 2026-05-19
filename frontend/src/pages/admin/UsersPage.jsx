import { useEffect, useState } from "react";

import {
  createAdminUser,
  deleteAdminUser,
  listAdminUsers,
  listAdminCompanies,
  updateAdminUser,
} from "../../api/admin.api";
import "../../assets/styles/app-shell.css";
import { Button, EmptyState, Input, Select, Spinner, Toast } from "../../components/ui";

const ROLE_OPTIONS = ["candidate", "recruiter", "admin"];

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [draftById, setDraftById] = useState({});
  const [createForm, setCreateForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "candidate",
    company_id: "",
    is_active: true,
  });
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const [usersResult, companiesResult] = await Promise.all([
      listAdminUsers(),
      listAdminCompanies(),
    ]);

    if (usersResult.ok) {
      const data = usersResult.data?.users || [];
      setUsers(data);
      const nextDraft = {};
      data.forEach((user) => {
        nextDraft[user.id] = {
          role: user.role,
          is_active: user.is_active,
          is_verified: user.is_verified,
          company_id: "",
        };
      });
      setDraftById(nextDraft);
    } else {
      setError(usersResult.data?.error || "Failed to load users.");
    }

    if (companiesResult.ok) {
      setCompanies(companiesResult.data?.companies || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const onCreate = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const payload = {
      ...createForm,
      company_id: createForm.company_id ? Number(createForm.company_id) : null,
    };

    const result = await createAdminUser(payload);
    if (!result.ok) {
      setError(result.data?.error || "Failed to create user.");
      return;
    }

    setSuccess("User created successfully.");
    setCreateForm({
      username: "",
      email: "",
      password: "",
      role: "candidate",
      company_id: "",
      is_active: true,
    });
    await load();
  };

  const onUpdate = async (userId) => {
    setError("");
    setSuccess("");

    const draft = draftById[userId];
    const payload = {
      role: draft.role,
      is_active: Boolean(draft.is_active),
      is_verified: Boolean(draft.is_verified),
      company_id: draft.company_id ? Number(draft.company_id) : "",
    };

    const result = await updateAdminUser(userId, payload);
    if (!result.ok) {
      setError(result.data?.error || "Failed to update user.");
      return;
    }

    setSuccess("User updated.");
    await load();
  };

  const onDelete = async (userId) => {
    setError("");
    setSuccess("");

    const result = await deleteAdminUser(userId);
    if (!result.ok) {
      setError(result.data?.error || "Failed to delete user.");
      return;
    }

    setSuccess("User deleted.");
    await load();
  };

  const filteredUsers = users.filter((user) => {
    const haystack = `${user.username} ${user.email} ${user.role} ${user.company_name || ""}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  return (
    <div className="app-shell dashboard-shell">
      <section className="app-hero">
        <h2>User Management</h2>
        <p>Create, review, and update platform users with role and verification controls.</p>
      </section>

      <Toast tone="error" message={error} />
      <Toast tone="success" message={success} />

      <section className="app-grid">
        <article className="panel">
          <h3>Create User</h3>
          <form className="admin-form" onSubmit={onCreate}>
            <div className="admin-form-row">
              <Input
                label="Username"
                value={createForm.username}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, username: event.target.value }))}
                required
              />
              <Input
                label="Email"
                type="email"
                value={createForm.email}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
                required
              />
            </div>

            <div className="admin-form-row">
              <Input
                label="Password"
                type="password"
                value={createForm.password}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))}
                required
              />
              <Select
                label="Role"
                value={createForm.role}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, role: event.target.value }))}
                options={ROLE_OPTIONS.map((role) => ({ label: role, value: role }))}
              />
            </div>

            <div className="admin-form-row">
              <Select
                label="Company (optional)"
                value={createForm.company_id}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, company_id: event.target.value }))}
                options={[
                  { label: "No company", value: "" },
                  ...companies.map((company) => ({ label: company.name, value: company.id })),
                ]}
              />

              <Select
                label="Active"
                value={String(createForm.is_active)}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, is_active: event.target.value === "true" }))}
                options={[
                  { label: "Active", value: "true" },
                  { label: "Inactive", value: "false" },
                ]}
              />
            </div>

            <Button type="submit">Create User</Button>
          </form>
        </article>

        <article className="panel">
          <h3>User Directory</h3>
          <div className="app-toolbar" style={{ marginBottom: 12 }}>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by username, email, role, company"
            />
            <div></div>
            <span className="badge">{filteredUsers.length} users</span>
          </div>
          <div className="problem-list-grid">
            {loading ? <Spinner /> : null}
            {filteredUsers.map((user) => (
              <article key={user.id} className="problem-item">
                <h4>{user.username}</h4>
                <div className="badge-row">
                  <span className="badge">{user.email}</span>
                  <span className="badge">{user.company_name || "No company"}</span>
                </div>

                <div className="admin-form-row">
                  <Select
                    label="Role"
                    value={draftById[user.id]?.role || user.role}
                    onChange={(event) =>
                      setDraftById((prev) => ({
                        ...prev,
                        [user.id]: { ...prev[user.id], role: event.target.value },
                      }))
                    }
                    options={ROLE_OPTIONS.map((role) => ({ label: role, value: role }))}
                  />

                  <Select
                    label="Company"
                    value={draftById[user.id]?.company_id || ""}
                    onChange={(event) =>
                      setDraftById((prev) => ({
                        ...prev,
                        [user.id]: { ...prev[user.id], company_id: event.target.value },
                      }))
                    }
                    options={[
                      { label: "No company", value: "" },
                      ...companies.map((company) => ({ label: company.name, value: company.id })),
                    ]}
                  />
                </div>

                <div className="admin-form-row">
                  <Select
                    label="Active"
                    value={String(draftById[user.id]?.is_active ?? user.is_active)}
                    onChange={(event) =>
                      setDraftById((prev) => ({
                        ...prev,
                        [user.id]: { ...prev[user.id], is_active: event.target.value === "true" },
                      }))
                    }
                    options={[
                      { label: "Active", value: "true" },
                      { label: "Inactive", value: "false" },
                    ]}
                  />

                  <Select
                    label="Verified"
                    value={String(draftById[user.id]?.is_verified ?? user.is_verified)}
                    onChange={(event) =>
                      setDraftById((prev) => ({
                        ...prev,
                        [user.id]: { ...prev[user.id], is_verified: event.target.value === "true" },
                      }))
                    }
                    options={[
                      { label: "Verified", value: "true" },
                      { label: "Unverified", value: "false" },
                    ]}
                  />
                </div>

                <div className="admin-form-row">
                  <Button type="button" onClick={() => onUpdate(user.id)}>Save Changes</Button>
                  <Button type="button" variant="danger" onClick={() => onDelete(user.id)}>Delete User</Button>
                </div>
              </article>
            ))}
            {!loading && !filteredUsers.length ? <EmptyState title="No users found" description="Create your first user from the form." /> : null}
          </div>
        </article>
      </section>
    </div>
  );
}
