import { BookingDetail } from "@/components/customer-screens";
export default async function Page({params}:{params:Promise<{bookingId:string}>}){const {bookingId}=await params;return <BookingDetail id={bookingId} backHref="/admin/bookings"/>;}
