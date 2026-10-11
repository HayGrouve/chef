import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "delete orphan uploads",
  { hourUTC: 3, minuteUTC: 30 },
  internal.storageCleanup.deleteOrphanUploads,
  {}
);

export default crons;
