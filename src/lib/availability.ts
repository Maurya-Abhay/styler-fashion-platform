import type { ClientSession } from "mongoose";
import Availability from "@/models/Availability";
import ProfessionalProfile, { type ProfessionalProfileDocumentShape } from "@/models/ProfessionalProfile";
import SlotReservation from "@/models/SlotReservation";
import type { AvailabilityDocumentShape } from "@/models/Availability";
import { AppError } from "@/types";

export interface LocalInterval { startMinute: number; endMinute: number; }
export interface AvailableStartInput {
  professionalId: string;
  windowStart: Date;
  windowEnd: Date;
  durationMinutes: number;
  bufferMinutes?: number;
  session?: ClientSession;
  requireAccepting?: boolean;
  /** Optional preloaded schedule to avoid one extra query while matching many services. */
  availabilityRecord?: Record<string, any>;
  maxResults?: number;
}

const DEFAULT_TIME_ZONE = "Asia/Kolkata";

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function safeTimeZone(value: unknown): string {
  return typeof value === "string" && isValidTimeZone(value) ? value : DEFAULT_TIME_ZONE;
}

function dateKeyFromParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function dateKeyInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return dateKeyFromParts(Number(values.year), Number(values.month), Number(values.day));
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    year: Number(values.year), month: Number(values.month), day: Number(values.day),
    hour: Number(values.hour), minute: Number(values.minute), second: Number(values.second),
  };
}

export function localMinuteInTimeZone(date: Date, timeZone: string): number {
  const parts = zonedParts(date, timeZone);
  return parts.hour * 60 + parts.minute;
}

export function weekdayForDateKey(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function addDaysToDateKey(dateKey: string, amount: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return dateKeyFromParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** Converts a wall-clock time in a timezone to an instant without depending on server timezone. */
export function instantFromLocalDateAndMinute(dateKey: string, minute: number, timeZone: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !Number.isInteger(minute) || minute < 0 || minute > 1439) {
    throw new AppError("Invalid local date or time.", 400, "INVALID_LOCAL_TIME");
  }
  const [year, month, day] = dateKey.split("-").map(Number);
  const hour = Math.floor(minute / 60);
  const min = minute % 60;
  const targetUtc = Date.UTC(year, month - 1, day, hour, min, 0);
  let candidate = targetUtc;
  // Iteratively correct for the timezone offset. This also handles non-UTC server environments.
  for (let attempt = 0; attempt < 3; attempt++) {
    const local = zonedParts(new Date(candidate), timeZone);
    const localAsUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
    candidate += targetUtc - localAsUtc;
  }
  return new Date(candidate);
}

function normaliseIntervals(intervals: Array<{ startMinute: number; endMinute: number }> = []): LocalInterval[] {
  return intervals
    .filter((item) => Number.isInteger(item.startMinute) && Number.isInteger(item.endMinute) && item.startMinute >= 0 && item.endMinute <= 1440 && item.endMinute > item.startMinute)
    .map((item) => ({ startMinute: item.startMinute, endMinute: item.endMinute }))
    .sort((a, b) => a.startMinute - b.startMinute);
}

function subtractIntervals(source: LocalInterval[], blocked: LocalInterval[]): LocalInterval[] {
  let result = [...source];
  for (const block of blocked) {
    result = result.flatMap((item) => {
      if (block.endMinute <= item.startMinute || block.startMinute >= item.endMinute) return [item];
      const pieces: LocalInterval[] = [];
      if (block.startMinute > item.startMinute) pieces.push({ startMinute: item.startMinute, endMinute: Math.min(block.startMinute, item.endMinute) });
      if (block.endMinute < item.endMinute) pieces.push({ startMinute: Math.max(block.endMinute, item.startMinute), endMinute: item.endMinute });
      return pieces.filter((piece) => piece.endMinute > piece.startMinute);
    });
  }
  return result.sort((a, b) => a.startMinute - b.startMinute);
}

export function getWorkingIntervalsForDate(
  availability: Pick<AvailabilityDocumentShape, "weeklySchedule" | "exceptions"> | Record<string, any>,
  dateKey: string,
): LocalInterval[] {
  const exception = (availability.exceptions ?? []).find((item: any) => item.date === dateKey);
  if (exception?.type === "closed") return [];
  if (exception?.type === "custom_hours") return normaliseIntervals(exception.intervals ?? []);
  const weekday = weekdayForDateKey(dateKey);
  const scheduleDay = (availability.weeklySchedule ?? []).find((item: any) => item.weekday === weekday);
  let intervals = scheduleDay && !scheduleDay.isClosed ? normaliseIntervals(scheduleDay.intervals ?? []) : [];
  if (exception?.type === "blocked_intervals") intervals = subtractIntervals(intervals, normaliseIntervals(exception.intervals ?? []));
  return intervals;
}

function floorToMinutes(date: Date, minutes: number): Date {
  const ms = minutes * 60_000;
  return new Date(Math.floor(date.getTime() / ms) * ms);
}
function ceilToMinutes(date: Date, minutes: number): Date {
  const ms = minutes * 60_000;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}

export async function isWindowAvailable(input: {
  professionalId: string;
  startAt: Date;
  endAt: Date;
  bufferMinutes?: number;
  session?: ClientSession;
  requireAccepting?: boolean;
}): Promise<boolean> {
  if (!(input.startAt instanceof Date) || !(input.endAt instanceof Date) || !Number.isFinite(input.startAt.getTime()) || !Number.isFinite(input.endAt.getTime()) || input.endAt <= input.startAt) return false;
  if (input.bufferMinutes != null && (!Number.isInteger(input.bufferMinutes) || input.bufferMinutes < 0 || input.bufferMinutes > 240)) return false;
  const query = Availability.findOne({ professionalId: input.professionalId });
  if (input.session) query.session(input.session);
  const availability = await query.lean();
  if (!availability || (input.requireAccepting !== false && !availability.acceptingRequests)) return false;
  const timezone = safeTimeZone(availability.timezone);
  const endWithBuffer = new Date(input.endAt.getTime() + (input.bufferMinutes ?? 0) * 60_000);
  const startKey = dateKeyInTimeZone(input.startAt, timezone);
  const endKey = dateKeyInTimeZone(new Date(endWithBuffer.getTime() - 1), timezone);
  // V1 appointments are same-local-day appointments; overnight appointments are not offered.
  if (startKey !== endKey) return false;
  const startMinute = localMinuteInTimeZone(input.startAt, timezone);
  const endMinute = localMinuteInTimeZone(endWithBuffer, timezone);
  const intervals = getWorkingIntervalsForDate(availability as any, startKey);
  if (!intervals.some((interval) => startMinute >= interval.startMinute && endMinute <= interval.endMinute)) return false;
  const maxAdvanceDays = Number(availability.maxAdvanceBookingDays ?? 30);
  if (input.startAt.getTime() > Date.now() + maxAdvanceDays * 24 * 60 * 60 * 1000) return false;

  const intervalMinutes = Number(availability.slotIntervalMinutes ?? 15);
  const reservationStart = floorToMinutes(input.startAt, intervalMinutes);
  const reservationEnd = ceilToMinutes(endWithBuffer, intervalMinutes);
  const now = new Date();
  const reservationQuery = SlotReservation.findOne({
    professionalId: input.professionalId,
    blockStartAt: { $gte: reservationStart, $lt: reservationEnd },
    $or: [
      { status: "confirmed" },
      { status: "held", expiresAt: { $gt: now } },
    ],
  });
  if (input.session) reservationQuery.session(input.session);
  return !(await reservationQuery.lean());
}

export async function findAvailableStartTimes(input: AvailableStartInput): Promise<Date[]> {
  const startMs = input.windowStart?.getTime?.();
  const endMs = input.windowEnd?.getTime?.();
  const bufferMinutes = input.bufferMinutes ?? 0;
  if (
    !Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs! <= startMs! ||
    !Number.isInteger(input.durationMinutes) || input.durationMinutes < 1 ||
    !Number.isInteger(bufferMinutes) || bufferMinutes < 0 || bufferMinutes > 240
  ) return [];

  let availability = input.availabilityRecord;
  if (!availability) {
    const availabilityQuery = Availability.findOne({ professionalId: input.professionalId });
    if (input.session) availabilityQuery.session(input.session);
    const fetchedAvailability = await availabilityQuery.lean();
    availability = (fetchedAvailability ?? undefined) as Record<string, any> | undefined;
  }
  if (!availability || (input.requireAccepting !== false && !availability.acceptingRequests)) return [];

  const timezone = safeTimeZone(availability.timezone);
  const step = Number(availability.slotIntervalMinutes || 15);
  const totalMinutes = input.durationMinutes + bufferMinutes;
  if (![15, 30, 60].includes(step) || !Number.isInteger(totalMinutes) || totalMinutes <= 0) return [];

  const nowMs = Date.now();
  const maxAdvanceDays = Math.min(Number(availability.maxAdvanceBookingDays ?? 30), 180);
  const latestAllowedStartMs = nowMs + maxAdvanceDays * 24 * 60 * 60 * 1000;
  if (startMs! > latestAllowedStartMs) return [];

  // Read the occupied blocks once rather than issuing a MongoDB query for every
  // 15/30/60-minute candidate. This avoids the worst N+1-query latency during matching.
  const searchStart = floorToMinutes(input.windowStart, step);
  // The requested time window bounds the entire occupied service window, not
  // just the appointment's start. Include travel buffer in that reservation.
  const maxStart = Math.min(endMs! - totalMinutes * 60_000, latestAllowedStartMs);
  if (maxStart < startMs!) return [];
  const reservationEnd = ceilToMinutes(
    new Date(maxStart + totalMinutes * 60_000),
    step,
  );
  const now = new Date();
  const reservationQuery = SlotReservation.find({
    professionalId: input.professionalId,
    blockStartAt: { $gte: searchStart, $lt: reservationEnd },
    $or: [
      { status: "confirmed" },
      { status: "held", expiresAt: { $gt: now } },
    ],
  }).select("blockStartAt");
  if (input.session) reservationQuery.session(input.session);
  const reservations = await reservationQuery.lean();
  const occupiedBlocks = new Set<number>(
    reservations.map((item: any) => new Date(item.blockStartAt).getTime()),
  );

  const results: Date[] = [];
  let dateKey = dateKeyInTimeZone(input.windowStart, timezone);
  const finalDateKey = dateKeyInTimeZone(new Date(maxStart), timezone);
  const blockSizeMs = step * 60_000;
  const maxResults = Math.max(1, Math.min(100, Math.floor(input.maxResults ?? 20)));

  for (let days = 0; days <= maxAdvanceDays && dateKey <= finalDateKey; days++, dateKey = addDaysToDateKey(dateKey, 1)) {
    const intervals = getWorkingIntervalsForDate(availability as any, dateKey);
    for (const interval of intervals) {
      for (let minute = interval.startMinute; minute + totalMinutes <= interval.endMinute; minute += step) {
        const candidate = instantFromLocalDateAndMinute(dateKey, minute, timezone);
        const candidateMs = candidate.getTime();
        if (candidateMs < startMs! || candidateMs > maxStart || candidateMs <= nowMs) continue;

        const candidateEnd = new Date(candidateMs + input.durationMinutes * 60_000);
        const bufferedEnd = new Date(candidateEnd.getTime() + bufferMinutes * 60_000);
        const blockStart = floorToMinutes(candidate, step).getTime();
        const blockEnd = ceilToMinutes(bufferedEnd, step).getTime();
        let occupied = false;
        for (let block = blockStart; block < blockEnd; block += blockSizeMs) {
          if (occupiedBlocks.has(block)) {
            occupied = true;
            break;
          }
        }
        if (!occupied) {
          results.push(candidate);
          if (results.length >= maxResults) return results;
        }
      }
    }
  }
  return results;
}

export async function saveAvailabilitySchedule(input: {
  professionalUserId: string;
  timezone?: string;
  slotIntervalMinutes?: 15 | 30 | 60;
  maxAdvanceBookingDays?: number;
  weeklySchedule: Array<{ weekday: number; isClosed?: boolean; intervals: LocalInterval[] }>;
  exceptions?: Array<{ date: string; type: "closed" | "custom_hours" | "blocked_intervals"; intervals?: LocalInterval[]; note?: string }>;
}) {
  if (new Set(input.weeklySchedule.map((day) => day.weekday)).size !== input.weeklySchedule.length) {
    throw new AppError("Each weekday may appear only once in the weekly schedule.", 400, "DUPLICATE_WEEKDAY");
  }
  if (input.timezone !== undefined && !isValidTimeZone(input.timezone)) {
    throw new AppError("Choose a valid IANA time zone.", 400, "INVALID_TIME_ZONE");
  }
  const assertNoOverlap = (intervals: LocalInterval[], label: string) => {
    const sorted = normaliseIntervals(intervals);
    for (let index = 1; index < sorted.length; index++) {
      if (sorted[index].startMinute < sorted[index - 1].endMinute) {
        throw new AppError(`${label} contains overlapping time intervals.`, 400, "OVERLAPPING_INTERVALS");
      }
    }
  };
  for (const day of input.weeklySchedule) assertNoOverlap(day.intervals ?? [], `Weekday ${day.weekday}`);
  const exceptions = input.exceptions ?? [];
  if (new Set(exceptions.map((item) => item.date)).size !== exceptions.length) {
    throw new AppError("Each exception date may appear only once.", 400, "DUPLICATE_EXCEPTION_DATE");
  }
  for (const exception of exceptions) assertNoOverlap(exception.intervals ?? [], `Exception ${exception.date}`);
  const profile = await ProfessionalProfile.findOne({ userId: input.professionalUserId })
    .select("_id applicationStatus")
    .lean();
  if (!profile) throw new AppError("Create your professional profile before setting availability.", 404, "PROFESSIONAL_PROFILE_NOT_FOUND");
  const setFields: Record<string, unknown> = {
    timezone: input.timezone ?? DEFAULT_TIME_ZONE,
    slotIntervalMinutes: input.slotIntervalMinutes ?? 15,
    maxAdvanceBookingDays: input.maxAdvanceBookingDays ?? 30,
    weeklySchedule: input.weeklySchedule,
    exceptions,
    lastScheduleUpdatedAt: new Date(),
  };
  // Never auto-enable a professional's requests while their application is not approved.
  if (profile.applicationStatus !== "approved") setFields.acceptingRequests = false;
  const updated = await Availability.findOneAndUpdate(
    { professionalId: profile._id },
    {
      $set: setFields,
      $setOnInsert: { professionalId: profile._id },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  if (!updated) throw new Error("Unable to save professional availability.");
  return updated;
}

export async function setAcceptingRequests(professionalId: string, acceptingRequests: boolean) {
  const profile = await ProfessionalProfile.findById(professionalId)
    .select("applicationStatus")
    .lean();
  if (!profile) throw new AppError("Professional profile not found.", 404, "PROFESSIONAL_NOT_FOUND");
  if (acceptingRequests && profile.applicationStatus !== "approved") {
    throw new AppError("Only approved professionals can accept new requests.", 403, "PROFESSIONAL_NOT_APPROVED");
  }
  const current = await Availability.findOne({ professionalId }).select("weeklySchedule").lean();
  if (acceptingRequests && !current?.weeklySchedule?.some((day: any) => !day.isClosed && Array.isArray(day.intervals) && day.intervals.length > 0)) {
    throw new AppError("Add at least one working time interval before accepting requests.", 409, "AVAILABILITY_SCHEDULE_REQUIRED");
  }
  const updated = await Availability.findOneAndUpdate(
    { professionalId },
    { $set: { acceptingRequests, lastScheduleUpdatedAt: new Date() }, $setOnInsert: { professionalId } },
    { new: true, upsert: true, runValidators: true },
  );
  return updated;
}

export async function reserveWindowBlocks(input: {
  professionalId: string; startAt: Date; endAt: Date; bufferMinutes?: number;
  bookingRequestId: string; bookingOfferId: string; bookingId: string; expiresAt: Date; session: ClientSession;
}): Promise<string> {
  const availability = await Availability.findOne({ professionalId: input.professionalId })
    .session(input.session)
    .lean();
  if (!availability) throw new AppError("Professional availability has not been configured.", 409, "AVAILABILITY_NOT_CONFIGURED");
  const intervalMinutes = Number(availability.slotIntervalMinutes || 15);
  const endWithBuffer = new Date(input.endAt.getTime() + (input.bufferMinutes ?? 0) * 60_000);
  const start = floorToMinutes(input.startAt, intervalMinutes);
  const end = ceilToMinutes(endWithBuffer, intervalMinutes);
  const blockDates: Date[] = [];
  for (let cursor = start.getTime(); cursor < end.getTime(); cursor += intervalMinutes * 60_000) blockDates.push(new Date(cursor));
  if (!blockDates.length) throw new AppError("The requested time range is invalid.", 400, "INVALID_TIME_RANGE");
  const reservationId = `${input.bookingRequestId}:${input.bookingOfferId}`;
  const now = new Date();
  // Expired holds may be waiting for the background job. Release matching stale blocks
  // here as well so an on-time retry is not blocked by a delayed scheduler.
  await SlotReservation.updateMany(
    {
      professionalId: input.professionalId,
      blockStartAt: { $in: blockDates },
      status: "held",
      expiresAt: { $lte: now },
    },
    { $set: { status: "expired", releasedAt: now } },
    { session: input.session },
  );
  const conflicts = await SlotReservation.findOne({
    professionalId: input.professionalId,
    blockStartAt: { $in: blockDates },
    $or: [
      { status: "confirmed" },
      { status: "held", expiresAt: { $gt: now } },
    ],
  }).session(input.session).lean();
  if (conflicts) throw new AppError("This time was just booked by another customer. Please try again.", 409, "SLOT_CONFLICT");
  await SlotReservation.insertMany(blockDates.map((blockStartAt) => ({
    reservationId, professionalId: input.professionalId, blockStartAt,
    bookingRequestId: input.bookingRequestId, bookingOfferId: input.bookingOfferId,
    bookingId: input.bookingId, status: "held", expiresAt: input.expiresAt,
  })), { session: input.session, ordered: true });
  return reservationId;
}

export async function releaseReservation(reservationId: string, status: "released" | "expired" = "released", session?: ClientSession): Promise<number> {
  const query = SlotReservation.updateMany(
    { reservationId, status: { $in: ["held", "confirmed"] } },
    { $set: { status, releasedAt: new Date() } },
  );
  if (session) query.session(session);
  const result = await query;
  return result.modifiedCount;
}
