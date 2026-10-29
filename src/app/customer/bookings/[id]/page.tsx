import { BookingDetail } from "@/components/customer-screens";
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <BookingDetail id={id} backHref="/customer/bookings"/>;}
