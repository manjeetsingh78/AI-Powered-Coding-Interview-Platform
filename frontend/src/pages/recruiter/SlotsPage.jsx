import { useEffect, useMemo, useState } from "react";

import { cancelSlot, createSlot, deleteSlot, listSlots } from "../../api/workflows.api";
import "../../assets/styles/app-shell.css";
import { Button, EmptyState, Input, Spinner, Toast } from "../../components/ui";
import useAuth from "../../hooks/useAuth";

export default function SlotsPage() {
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [slotText, setSlotText] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const templates = ["Monday 10:00 AM", "Wednesday 2:30 PM", "Friday 5:00 PM"];

  const loadSlots = async () => {
    setLoading(true);
    const result = await listSlots();
    if (!result.ok) {
      setError(result.data?.error || "Unable to load slots.");
      setLoading(false);
      return;
    }
    setSlots(result.data?.slots || []);
    setLoading(false);
  };

  useEffect(() => {
    loadSlots();
  }, []);

  const ownSlots = useMemo(
    () => slots.filter((slot) => Number(slot.recruiter_id) === Number(user?.id)),
    [slots, user?.id]
  );

  const addSlot = async () => {
    if (!slotText.trim()) return;

    setMessage("");
    setError("");
    const result = await createSlot({ label: slotText.trim() });
    if (!result.ok) {
      setError(result.data?.error || "Unable to create slot.");
      return;
    }

    setMessage("Slot created.");
    setSlotText("");
    await loadSlots();
  };

  const removeSlot = async (id) => {
    setMessage("");
    setError("");
    const result = await deleteSlot(id);
    if (!result.ok) {
      setError(result.data?.error || "Unable to delete slot.");
      return;
    }
    setMessage("Slot deleted.");
    await loadSlots();
  };

  const clearBooking = async (id) => {
    setMessage("");
    setError("");
    const result = await cancelSlot(id);
    if (!result.ok) {
      setError(result.data?.error || "Unable to cancel booking.");
      return;
    }
    setMessage("Booking cancelled.");
    await loadSlots();
  };

  return (
    <div className="app-shell dashboard-shell">
      <section className="app-hero">
        <h2>Interview Slot Planner</h2>
        <p>Create interview windows and keep track of booked availability.</p>
      </section>
      <Toast tone="success" message={message} />
      <Toast tone="error" message={error} />

      <section className="panel">
        <h3>Create New Slot</h3>
        <div className="app-toolbar">
          <Input
            value={slotText}
            onChange={(event) => setSlotText(event.target.value)}
            placeholder="Example: Tuesday 3:30 PM"
          />
          <div className="badge-row">
            {templates.map((template) => (
              <Button key={template} type="button" variant="secondary" onClick={() => setSlotText(template)}>{template}</Button>
            ))}
          </div>
          <Button type="button" onClick={addSlot}>Add Slot</Button>
        </div>
      </section>

      <section className="panel">
        <h3>Your Slots</h3>
        <div className="problem-list-grid">
          {loading ? <Spinner /> : null}
          {ownSlots.map((slot) => (
            <article key={slot.id} className="problem-item">
              <h4>{slot.label}</h4>
              <div className="badge-row">
                <span className="badge">{slot.is_booked ? "Booked" : "Available"}</span>
                {slot.booked_by_name ? <span className="badge">By {slot.booked_by_name}</span> : null}
              </div>
              <div className="admin-form-row">
                <Button type="button" variant="secondary" onClick={() => clearBooking(slot.id)} disabled={!slot.is_booked}>
                  Cancel Booking
                </Button>
                <Button type="button" variant="danger" onClick={() => removeSlot(slot.id)}>Remove</Button>
              </div>
            </article>
          ))}
          {!loading && !ownSlots.length ? <EmptyState title="No slots created" description="Add your first interview slot above." /> : null}
        </div>
      </section>
    </div>
  );
}
