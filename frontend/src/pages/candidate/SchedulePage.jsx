import { useEffect, useMemo, useState } from "react";

import { bookSlot, cancelSlot, listSlots } from "../../api/workflows.api";
import "../../assets/styles/app-shell.css";
import SlotPicker from "../../components/scheduling/SlotPicker";
import VideoJoinButton from "../../components/scheduling/VideoJoinButton";
import { Button, EmptyState, Spinner, Toast } from "../../components/ui";
import useAuth from "../../hooks/useAuth";

export default function SchedulePage() {
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedAvailable, setSelectedAvailable] = useState(null);

  const loadSlots = async () => {
    setLoading(true);
    const result = await listSlots();
    if (!result.ok) {
      setError(result.data?.error || "Unable to load schedule.");
      setLoading(false);
      return;
    }
    setSlots(result.data?.slots || []);
    setLoading(false);
  };

  useEffect(() => {
    loadSlots();
  }, []);

  const available = useMemo(
    () => slots.filter((slot) => !slot.is_booked),
    [slots]
  );

  const bookedSlots = useMemo(
    () => slots.filter((slot) => Number(slot.booked_by_id) === Number(user?.id)),
    [slots, user?.id]
  );

  const onBookSlot = async (slotId) => {
    setMessage("");
    setError("");
    const result = await bookSlot(slotId);
    if (!result.ok) {
      setError(result.data?.error || "Unable to book slot.");
      return;
    }
    setMessage("Slot booked successfully.");
    await loadSlots();
  };

  const onCancelSlot = async (slotId) => {
    setMessage("");
    setError("");
    const result = await cancelSlot(slotId);
    if (!result.ok) {
      setError(result.data?.error || "Unable to cancel slot.");
      return;
    }
    setMessage("Booked slot cancelled.");
    await loadSlots();
  };

  return (
    <div className="app-shell dashboard-shell">
      <section className="app-hero">
        <h2>Interview Scheduling</h2>
        <p>Book your preferred interview window and manage your upcoming sessions.</p>
      </section>
      <Toast tone="success" message={message} />
      <Toast tone="error" message={error} />

      <section className="app-grid">
        <article className="panel">
          <h3>Available Slots</h3>
          <SlotPicker
            slots={available.map((slot) => ({
              ...slot,
              label: slot.label || `${slot.date} ${slot.start_time}`,
            }))}
            selectedId={selectedAvailable?.id}
            onPick={setSelectedAvailable}
          />
          {selectedAvailable ? (
            <div style={{ marginTop: 10 }}>
              <Button type="button" onClick={() => onBookSlot(selectedAvailable.id)}>
                Book Selected Slot
              </Button>
            </div>
          ) : null}
          <div className="problem-list-grid">
            {loading ? <Spinner /> : null}
            {available.map((slot) => (
              <article key={slot.id} className="problem-item">
                <h4>{slot.label}</h4>
                <p>Hosted by {slot.recruiter_name}</p>
                <Button type="button" onClick={() => onBookSlot(slot.id)}>Book Slot</Button>
              </article>
            ))}
            {!loading && !available.length ? (
              <EmptyState title="No slots available" description="Recruiters have not published new slots yet." />
            ) : null}
          </div>
        </article>

        <article className="panel">
          <h3>Booked Slots</h3>
          <div className="problem-list-grid">
            {bookedSlots.map((slot) => (
              <article key={slot.id} className="problem-item">
                <h4>{slot.label}</h4>
                <p>Hosted by {slot.recruiter_name}</p>
                <VideoJoinButton url={slot.video_join_url || slot.join_url} />
                <Button type="button" variant="secondary" onClick={() => onCancelSlot(slot.id)}>
                  Cancel Booking
                </Button>
              </article>
            ))}
            {!loading && !bookedSlots.length ? (
              <EmptyState title="No bookings yet" description="Book a slot to reserve your interview session." />
            ) : null}
          </div>
        </article>
      </section>
    </div>
  );
}
