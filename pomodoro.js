/* StudyHub Pomodoro — adjustable per-account timer, browser-stored prototype. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const user = window.StudyHubAuth?.getSessionUser?.();
  if (!$("pomo-time") || user?.role !== "student") return;
  const KEY = `studyhub-pomodoro-v1-${user.id}`;
  const defaults = { focus: 25, short: 5, long: 15 };
  const names = {
    focus: "FOCUS SESSION",
    short: "SHORT BREAK",
    long: "LONG BREAK",
  };
  const day = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const valid = (v) => Number.isInteger(v) && v >= 1 && v <= 180;
  const duration = (mode) => s.durations[mode] * 60;
  const fresh = () => ({
    mode: "focus",
    remaining: 1500,
    running: false,
    endAt: null,
    sessions: 0,
    minutes: 0,
    day: day(),
    intention: "",
    durations: { ...defaults },
  });
  let s = fresh();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (
      saved &&
      ["focus", "short", "long"].includes(saved.mode) &&
      Number.isFinite(saved.remaining) &&
      saved.remaining >= 0 &&
      Number.isFinite(saved.sessions) &&
      saved.sessions >= 0 &&
      Number.isFinite(saved.minutes) &&
      saved.minutes >= 0
    ) {
      s = { ...fresh(), ...saved, durations: { ...defaults } };
      for (const mode of Object.keys(defaults))
        if (valid(saved.durations?.[mode]))
          s.durations[mode] = saved.durations[mode];
      s.remaining = Math.min(s.remaining, duration(s.mode));
      if (s.day !== day()) {
        s.sessions = 0;
        s.minutes = 0;
        s.day = day();
      }
      if (s.running && !Number.isFinite(s.endAt)) {
        s.running = false;
        s.endAt = null;
      }
    }
  } catch {}
  const message = (text) => {
    $("pomo-message").textContent = text;
  };
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      message("Storage unavailable: timer settings may not persist.");
    }
  }
  function refreshDay() {
    if (s.day !== day()) {
      s.day = day();
      s.sessions = 0;
      s.minutes = 0;
      save();
    }
  }
  function render() {
    refreshDay();
    const m = Math.floor(s.remaining / 60),
      sec = s.remaining % 60;
    $("pomo-time").textContent =
      `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    $("pomo-phase-label").textContent = names[s.mode];
    $("pomo-timer-status").textContent = s.running
      ? "Stay in your flow"
      : s.remaining === 0
        ? "Session finished"
        : "Ready when you are";
    $("pomo-start").textContent = s.running
      ? "Pause timer"
      : s.remaining === 0
        ? "Start again"
        : s.remaining === duration(s.mode)
          ? s.mode === "focus"
            ? "Start focusing"
            : "Start break"
          : "Resume timer";
    $("pomo-clock").style.setProperty(
      "--pomo-progress",
      `${Math.max(0, Math.min(100, 100 * (1 - s.remaining / duration(s.mode))))}%`,
    );
    $("pomo-sessions").textContent = s.sessions;
    $("pomo-minutes").textContent = s.minutes;
    $("pomo-cycle").textContent = `${(s.sessions % 4) + 1} / 4`;
    document
      .querySelectorAll("[data-pomo-mode]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.pomoMode === s.mode)),
      );
    if (document.activeElement !== $("pomo-intention"))
      $("pomo-intention").value = s.intention || "";
    document.title = s.running
      ? `${$("pomo-time").textContent} · StudyHub`
      : "StudyHub";
  }
  function finish() {
    s.running = false;
    s.endAt = null;
    s.remaining = 0;
    if (s.mode === "focus") {
      s.sessions++;
      s.minutes += s.durations.focus;
      message(
        s.sessions % 4 === 0
          ? "Focus complete! Time for a long break."
          : "Focus complete! Take a short break.",
      );
    } else message("Break complete. Ready for another focus session?");
    save();
    render();
  }
  function tick() {
    refreshDay();
    if (!s.running) return;
    s.remaining = Math.max(0, Math.ceil((s.endAt - Date.now()) / 1000));
    if (s.remaining === 0) finish();
    else render();
  }
  function setMode(mode, force = false) {
    if (!(mode in defaults)) return false;
    if (
      !force &&
      s.running &&
      !confirm("Switch timer mode and discard the current countdown?")
    )
      return false;
    s.mode = mode;
    s.remaining = duration(mode);
    s.running = false;
    s.endAt = null;
    save();
    render();
    message(
      mode === "focus"
        ? "Set an intention, then start your focus session."
        : "Take a well-earned break.",
    );
    return true;
  }
  function syncFields() {
    for (const mode of Object.keys(defaults))
      $("pomo-" + mode + "-duration").value = s.durations[mode];
  }
  function applyDurations(next) {
    if (
      s.running &&
      !confirm("Save new durations and restart your current countdown?")
    )
      return false;
    s.durations = { ...next };
    s.running = false;
    s.endAt = null;
    s.remaining = duration(s.mode);
    save();
    render();
    syncFields();
    message("Timer durations saved for your account.");
    return true;
  }
  $("pomo-start").addEventListener("click", () => {
    if (s.running) {
      tick();
      if (!s.running) return;
      s.running = false;
      s.endAt = null;
      save();
      render();
      message("Timer paused.");
      return;
    }
    if (s.remaining <= 0) s.remaining = duration(s.mode);
    s.endAt = Date.now() + s.remaining * 1000;
    s.running = true;
    save();
    render();
    message(
      s.mode === "focus"
        ? "Focus on one thing at a time."
        : "Relax and recharge.",
    );
  });
  $("pomo-reset").addEventListener("click", () => {
    s.running = false;
    s.endAt = null;
    s.remaining = duration(s.mode);
    save();
    render();
    message("Timer reset.");
  });
  $("pomo-skip").addEventListener("click", () => {
    if (
      s.running &&
      !confirm("Skip this session? It will not count as completed.")
    )
      return;
    setMode(
      s.mode === "focus"
        ? s.sessions > 0 && s.sessions % 4 === 0
          ? "long"
          : "short"
        : "focus",
      true,
    );
  });
  document
    .querySelectorAll("[data-pomo-mode]")
    .forEach((b) =>
      b.addEventListener("click", () => setMode(b.dataset.pomoMode)),
    );
  $("pomo-intention").addEventListener("input", (e) => {
    s.intention = e.target.value;
    save();
  });
  $("pomo-settings-toggle").addEventListener("click", () => {
    const f = $("pomo-settings-form");
    f.hidden = !f.hidden;
    $("pomo-settings-toggle").setAttribute("aria-expanded", String(!f.hidden));
    if (!f.hidden) syncFields();
  });
  $("pomo-settings-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const next = {};
    for (const mode of Object.keys(defaults)) {
      const field = $("pomo-" + mode + "-duration");
      const value = Number(field.value);
      if (!valid(value)) {
        field.setCustomValidity("Enter a whole number from 1 to 180.");
        field.reportValidity();
        field.setCustomValidity("");
        return;
      }
      next[mode] = value;
    }
    if (applyDurations(next)) {
      $("pomo-settings-form").hidden = true;
      $("pomo-settings-toggle").setAttribute("aria-expanded", "false");
    }
  });
  $("pomo-defaults").addEventListener("click", () => applyDurations(defaults));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) tick();
  });
  window.addEventListener("pageshow", tick);
  setInterval(tick, 1000);
  syncFields();
  tick();
  render();
})();
