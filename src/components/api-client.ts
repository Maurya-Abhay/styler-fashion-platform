export type ApiEnvelope<T> = {success?:boolean;data?:T;error?:{message?:string;code?:string;details?:unknown};requestId?:string};
export async function apiRequest<T=any>(path:string, init:RequestInit={}) : Promise<T> {
  const headers = new Headers(init.headers || {});
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type","application/json");
  const response = await fetch(path,{...init,headers,credentials:"include",cache:"no-store"});
  const payload = await response.json().catch(()=>({success:false,error:{message:"The server returned an unreadable response."}})) as ApiEnvelope<T>;
  if (!response.ok || payload.success === false) {
    let message=payload.error?.message || `Request failed (${response.status}).`;
    const details=payload.error?.details;
    if (details && typeof details === "object" && "missing" in details && Array.isArray((details as any).missing)) message += ` Missing: ${(details as any).missing.join(", ")}.`;
    if (payload.error?.code === "VALIDATION_ERROR" && Array.isArray(details)) {
      const issues = details
        .map((issue: any) => {
          const field = Array.isArray(issue.path) && issue.path.length ? `${issue.path.join(".")}: ` : "";
          return typeof issue.message === "string" ? `${field}${issue.message}` : "";
        })
        .filter(Boolean);
      if (issues.length) message += ` ${issues.join(" ")}`;
    } else if (payload.error?.code === "VALIDATION_ERROR" && details && typeof details === "object") {
      const issues = Object.entries(details)
        .map(([field, issue]) => `${field}: ${String(issue)}`)
        .join(" ");
      if (issues) message += ` ${issues}`;
    }
    throw new Error(message);
  }
  return (payload && Object.prototype.hasOwnProperty.call(payload,"data") ? payload.data : payload) as T;
}
export const unwrapItems=(data:any):any[]=>Array.isArray(data)?data:Array.isArray(data?.items)?data.items:Array.isArray(data?.data)?data.data:[];
export const money=(paise?:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(Math.max(0,Number(paise||0))/100);
export const humanize=(v:string)=>String(v||"").replace(/([a-z])([A-Z])/g,"$1 $2").replace(/[_-]+/g," ").replace(/\b\w/g,m=>m.toUpperCase());
export const dateTime=(value?:string|Date)=>value?new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value)):"—";
export const shortDate=(value?:string|Date)=>value?new Intl.DateTimeFormat("en-IN",{dateStyle:"medium"}).format(new Date(value)):"—";
export const idOf=(item:any)=>String(item?._id||item?.id||"");
