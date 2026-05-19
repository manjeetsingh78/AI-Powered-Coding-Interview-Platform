import { Button, Card } from "../ui";

export default function SlotPicker({ slots = [], onPick, selectedId }) {
  return (
    <Card>
      <h3>Available Slots</h3>
      <div className="slot-grid">
        {slots.map((slot) => (
          <Button
            key={slot.id}
            variant={selectedId === slot.id ? "primary" : "outline"}
            onClick={() => onPick?.(slot)}
          >
            {slot.label || `${slot.date} ${slot.start_time}`}
          </Button>
        ))}
      </div>
    </Card>
  );
}
