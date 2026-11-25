// Notices when the studio camera (USB/MTP) or a card reader with a DCIM folder is plugged in or
// removed, and tells listeners (the SSE endpoint) about the change.
//
// - Windows device-change events trigger a full check, debounced because one plug fires many events.
// - Card readers are also polled cheaply (a DCIM folder appearing on a drive letter).
// - The MTP check costs a PowerShell run, so it is only polled when the event source is down,
//   and skipped while an import is running (the device is busy).
export function createDeviceWatcher({ checkMtp, findCards, isBusy = () => false, cardPollMs = 3000,
  mtpPollMs = 20000, debounceMs = 1500, setTimer = setTimeout, clearTimer = clearTimeout, setRepeat = setInterval } = {}) {
  let state = { mtp: null, cards: [] };
  let initialized = false;
  let eventsAlive = false;
  let running = null;
  let again = false;
  let debounce = null;
  let sequence = 0;
  const listeners = new Set();
  const emit = (event) => {
    const full = { ...event, id: ++sequence, at: new Date().toISOString() };
    for (const listener of listeners) { try { listener(full); } catch { /* A broken client must not stop detection. */ } }
  };

  const apply = (next) => {
    if (initialized) {
      for (const p of next.cards) if (!state.cards.includes(p)) emit({ type: "connected", source: "fotobox", path: p, label: `Card reader ${p.slice(0, 2)}` });
      for (const p of state.cards) if (!next.cards.includes(p)) emit({ type: "disconnected", source: "fotobox", path: p });
      if (next.mtp && !state.mtp) emit({ type: "connected", source: "studio", label: next.mtp.deviceName || "Kamera USB" });
      if (!next.mtp && state.mtp) emit({ type: "disconnected", source: "studio" });
    }
    state = next;
    initialized = true;
  };

  const detect = ({ mtp = true } = {}) => {
    if (running) { again = again || mtp; return running; }
    running = (async () => {
      const cards = findCards();
      let device = state.mtp;
      if (mtp && !isBusy()) {
        try {
          const result = await checkMtp();
          device = result?.connected ? { deviceName: result.deviceName } : null;
        } catch { /* Keep the last known state when the check itself fails. */ }
      }
      apply({ mtp: device, cards });
    })().finally(() => {
      running = null;
      if (again) { again = false; detect({ mtp: true }); }
    });
    return running;
  };

  return {
    get state() { return { ...state, initialized }; },
    detect,
    // Called for every raw Windows device-change notification.
    notifyChange() {
      clearTimer(debounce);
      debounce = setTimer(() => { debounce = null; detect({ mtp: true }); }, debounceMs);
    },
    setEventsAlive(alive) { eventsAlive = alive; },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    start() {
      detect({ mtp: true });
      setRepeat(() => detect({ mtp: false }), cardPollMs);
      setRepeat(() => { if (!eventsAlive) detect({ mtp: true }); }, mtpPollMs);
    },
  };
}
