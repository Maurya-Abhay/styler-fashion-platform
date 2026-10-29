import mongoose from "mongoose";
import { withApi } from "@/lib/api-utils";
export const GET = withApi(async () => ({ status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "connected_by_request", timestamp: new Date().toISOString() }));
