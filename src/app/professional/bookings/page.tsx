import { ResourceScreen } from "@/components/resource-screen";

export default function Page() {
  return (
    <ResourceScreen
      title="Your bookings"
      description="Review appointments, service locations and booking statuses."
      endpoint="/api/professional/bookings?limit=100"
      actions={[{ label: "View booking", href: "/professional/bookings/:id" }]}
      emptyTitle="No bookings yet"
      emptyDescription="When a customer pays for a matched booking, the appointment will appear here."
    />
  );
}
