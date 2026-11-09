import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "delete orphan uploads",
  { hourUTC: 3, minuteUTC: 30 },
  internal.storageCleanup.deleteOrphanUploads,
  {}
);

crons.daily(
  "trim rate-limit counters older than a day",
  { hourUTC: 3, minuteUTC: 45 },
  internal.cleanup.trimRateLimits,
  {}
);

crons.daily(
  "trim handled webhook events",
  { hourUTC: 4, minuteUTC: 0 },
  internal.cleanup.trimWebhookEvents,
  {}
);

export default crons;
