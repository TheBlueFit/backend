"use client";
import React, { useEffect, useState } from "react";
import { Search, UserPlus, CheckCircle2, X, Calendar } from "lucide-react";
import { dashboardAPI, CoachClient } from "@/services/api";

interface Props {
  templateId: string;
  templateTitle: string;
  onClose: () => void;
  onAssigned?: (assignmentId: string) => void;
}

export default function AssignTemplateModal({ templateId, templateTitle, onClose, onAssigned }: Props) {
  const [clients, setClients] = useState<CoachClient[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CoachClient | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    dashboardAPI
      .getCoachClients()
      .then((d) => setClients(d.clients))
      .catch(() => setClients([]))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = clients.filter(
    (c) =>
      !query ||
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.id.toLowerCase().includes(query.toLowerCase())
  );

  const handleAssign = async () => {
    if (!selected) return;
    setIsSaving(true);
    setError("");
    try {
      const res = await dashboardAPI.assignTemplateToClient(
        templateId,
        selected.id,
        startDate,
        notes
      );
      setDone(true);
      onAssigned?.(res.assignmentId);
    } catch (err: any) {
      setError(err.message || "Assignment failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    background: "rgb(var(--well-rgb) / 0.75)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
  };

  const modalStyle: React.CSSProperties = {
    background: "rgb(var(--well-rgb) / 0.98)",
    border: "1px solid rgb(var(--ink-rgb) / 0.1)",
    borderRadius: "20px",
    width: "100%",
    maxWidth: "520px",
    maxHeight: "90vh",
    overflowY: "auto",
    padding: "28px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  };

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px" }}>
              Assign Template
            </h2>
            <p style={{ fontSize: "13px", color: "var(--accent-gold)", margin: 0 }}>"{templateTitle}"</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "4px" }}
          >
            <X size={22} />
          </button>
        </div>

        {done ? (
          <div style={{ textAlign: "center", padding: "24px" }}>
            <CheckCircle2 size={40} color="var(--accent-green)" style={{ marginBottom: "14px" }} />
            <p style={{ fontSize: "18px", fontWeight: 700, color: "var(--accent-green)", margin: "0 0 8px" }}>
              Assigned Successfully!
            </p>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "0 0 24px" }}>
              {selected?.name}'s schedule has been updated with this template.
            </p>
            <button
              onClick={onClose}
              style={{
                background: "rgb(var(--green-rgb) / 0.15)",
                border: "1px solid rgb(var(--green-rgb) / 0.4)",
                borderRadius: "12px",
                color: "var(--accent-green)",
                padding: "12px 28px",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "13px",
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Client search */}
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "8px", display: "block" }}>
                Select Client
              </label>
              <div style={{ position: "relative", marginBottom: "10px" }}>
                <Search size={15} color="var(--text-secondary)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or client ID…"
                  style={{
                    width: "100%",
                    padding: "10px 10px 10px 36px",
                    background: "rgb(var(--well-rgb) / 0.4)",
                    border: "1px solid rgb(var(--ink-rgb) / 0.12)",
                    borderRadius: "10px",
                    color: "var(--text-primary)",
                    outline: "none",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {isLoading ? (
                <div style={{ padding: "16px", textAlign: "center", color: "var(--text-secondary)", fontSize: "13px" }}>
                  Loading clients…
                </div>
              ) : (
                <div style={{ maxHeight: "180px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                  {filtered.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => setSelected(c)}
                      style={{
                        padding: "12px 16px",
                        borderRadius: "10px",
                        cursor: "pointer",
                        border: selected?.id === c.id
                          ? "1px solid rgb(var(--green-rgb) / 0.5)"
                          : "1px solid rgb(var(--ink-rgb) / 0.07)",
                        background: selected?.id === c.id
                          ? "rgb(var(--green-rgb) / 0.08)"
                          : "rgb(var(--ink-rgb) / 0.03)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 2px" }}>{c.name}</p>
                        <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: 0 }}>
                          ID: {c.id} · {c.goal}
                        </p>
                      </div>
                      {selected?.id === c.id && <CheckCircle2 size={18} color="var(--accent-green)" />}
                    </div>
                  ))}
                  {filtered.length === 0 && (
                    <p style={{ textAlign: "center", padding: "16px", color: "var(--text-secondary)", fontSize: "13px" }}>
                      No clients match "{query}".
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Schedule details */}
            {selected && (
              <>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Calendar size={13} /> Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "rgb(var(--well-rgb) / 0.4)",
                      border: "1px solid rgb(var(--ink-rgb) / 0.12)",
                      borderRadius: "10px",
                      color: "var(--text-primary)",
                      outline: "none",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "8px", display: "block" }}>
                    Assignment Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Any specific instructions for this client…"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "rgb(var(--well-rgb) / 0.4)",
                      border: "1px solid rgb(var(--ink-rgb) / 0.12)",
                      borderRadius: "10px",
                      color: "var(--text-primary)",
                      outline: "none",
                      fontSize: "13px",
                      resize: "vertical",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </>
            )}

            {error && (
              <p style={{ color: "var(--danger)", fontSize: "13px", margin: 0 }}>{error}</p>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: "14px",
                  background: "transparent",
                  border: "1px solid rgb(var(--ink-rgb) / 0.15)",
                  borderRadius: "12px",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!selected || isSaving}
                style={{
                  flex: 2,
                  padding: "14px",
                  background: selected ? "rgb(var(--blue-rgb) / 0.15)" : "rgb(var(--ink-rgb) / 0.05)",
                  border: selected ? "1px solid rgb(var(--blue-rgb) / 0.4)" : "1px solid rgb(var(--ink-rgb) / 0.1)",
                  borderRadius: "12px",
                  color: selected ? "var(--blue)" : "var(--text-secondary)",
                  cursor: selected ? "pointer" : "not-allowed",
                  fontSize: "13px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <UserPlus size={15} />
                {isSaving ? "Assigning…" : `ASSIGN TO ${selected?.name?.toUpperCase() ?? "CLIENT"}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
