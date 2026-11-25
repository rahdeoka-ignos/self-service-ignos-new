// One camera connection at a time: the X-S10 over MTP fails (thumbnail extraction, stream reads)
// when two operations overlap. Jobs run one by one.
//
// - "high" jobs (device check, scan, the staff's import) always run before "low" background jobs
//   (grid thumbnails, large previews), so a scan never waits behind a screen full of thumbnails.
// - A job whose `cancelled()` returns true when its turn comes is dropped without touching the
//   device (thumbnails of a scan that was replaced by a newer scan).
export function createMtpQueue(execute) {
  const high = [];
  const low = [];
  let running = false;
  const pump = () => {
    if (running) return;
    const job = high.shift() || low.shift();
    if (!job) return;
    if (job.cancelled?.()) {
      job.reject(new Error("Dibatalkan karena ada scan yang lebih baru."));
      pump();
      return;
    }
    running = true;
    Promise.resolve()
      .then(() => execute(job.args, job.options))
      .then(job.resolve, job.reject)
      .finally(() => { running = false; pump(); });
  };
  return {
    run(args, options = {}) {
      return new Promise((resolve, reject) => {
        (options.priority === "low" ? low : high).push({ args, options, cancelled: options.cancelled, resolve, reject });
        pump();
      });
    },
    get pending() { return high.length + low.length; },
    get running() { return running; },
  };
}
