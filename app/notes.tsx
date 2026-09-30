"use client";

import { useState, useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("miaki-notes-draft", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("miaki-notes-draft", callback);
  };
}

export default function Notes({ tripId, value, onChange, syncStatus }: {
  tripId: string;
  value: string;
  onChange: (value: string) => void;
  syncStatus: string;
}) {
  const key = `miaki-notes-draft:${tripId || "offline"}`;
  const [localStatus, setLocalStatus] = useState("");
  const draft = useSyncExternalStore(subscribe, () => {
    try { return localStorage.getItem(key); } catch { return null; }
  }, () => null);

  function update(text: string) {
    onChange(text);
    try {
      localStorage.setItem(key, text);
      window.dispatchEvent(new Event("miaki-notes-draft"));
      setLocalStatus("Draft saved in this browser.");
    } catch {
      setLocalStatus("Browser backup unavailable. Keep a copy before leaving.");
    }
  }

  const sharedUnavailable = /unavailable|failed|error|not saved|offline/i.test(syncStatus);
  return <section className="page trip-notes-page" aria-label="Trip notes">
    <div className="card trip-notes-editor">
      <label htmlFor="trip-notes-editor">Write anything you want to remember</label>
      <p id="trip-notes-help">Travel details, ideas, reminders—keep them here for this trip.</p>
      {draft !== null && draft !== value && <div className="notes-recovery">
        <p>A browser draft differs from these notes. Restoring it replaces the editor text.</p>
        <button className="soft" onClick={() => update(draft)}>Restore browser draft</button>
      </div>}
      <textarea id="trip-notes-editor" name="tripNotes" className="resize-none" value={value}
        onChange={(event) => update(event.target.value)} aria-describedby="trip-notes-help trip-notes-status"
        placeholder="Las Vegas airport 8 AM → Anaheim Marriott hotel Hertz 2:30 PM…" rows={14} />
      <div id="trip-notes-status" className="notes-save-status" role="status">
        {sharedUnavailable ? "Shared saving unavailable. " : `${syncStatus}. `}{localStatus}
      </div>
    </div>
  </section>;
}
