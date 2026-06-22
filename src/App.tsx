import React, { useState, useEffect } from "react";
import { 
  Terminal, 
  Database, 
  Send, 
  PlusCircle, 
  History, 
  Activity, 
  ShieldAlert, 
  CheckCircle, 
  Clock, 
  ArrowRight,
  RefreshCw,
  Sliders,
  Trash2,
  Lock,
  Download,
  Cpu,
  Search,
  X,
  Zap,
  List,
  GitCompare,
  Archive,
  MessageSquare,
  Edit3
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  ReferenceLine
} from "recharts";

interface Trace {
  trace_id: string;
  goal: string;
  status: string;
  outcome: string | null;
  start_time: string;
  end_time: string | null;
  metrics: Record<string, any>;
  created_at: string;
}

interface EventItem {
  event_id: string;
  trace_id: string;
  parent_event_id: string | null;
  actor: string;
  event_type: string;
  payload: Record<string, any>;
  timestamp: string;
  created_at: string;
}

export default function App() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [activeTraceId, setActiveTraceId] = useState<string | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<EventItem[]>([]);
  
  // Forms and actions
  const [newGoal, setNewGoal] = useState("");
  const [followUpMsg, setFollowUpMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Selected inspection target
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  
  // Immutability sandbox simulation variables
  const [tamperError, setTamperError] = useState<string | null>(null);
  const [tamperSuccess, setTamperSuccess] = useState<string | null>(null);
  const [databaseMode, setDatabaseMode] = useState<"PostgreSQL" | "Local JSON">("Local JSON");
  const [showAnalytics, setShowAnalytics] = useState(true);

  // Timeline stream search/filter state
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [filterActor, setFilterActor] = useState("all");
  const [systemLogsOnly, setSystemLogsOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"timeline" | "compact">("timeline");
  const [inspectorTab, setInspectorTab] = useState<"formatted" | "raw">("formatted");

  // Live Refresh interval block
  const [liveRefresh, setLiveRefresh] = useState(false);

  // Latency standard deviation bottleneck multiplier
  const [stdDevMultiplier, setStdDevMultiplier] = useState<number>(2);

  // Archived states
  const [archivedTraceIds, setArchivedTraceIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("aeon_archived_traces");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showArchived, setShowArchived] = useState<boolean>(false);

  // Annotation states
  const [eventAnnotations, setEventAnnotations] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("aeon_event_annotations");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState<string>("");

  useEffect(() => {
    localStorage.setItem("aeon_event_annotations", JSON.stringify(eventAnnotations));
  }, [eventAnnotations]);

  useEffect(() => {
    localStorage.setItem("aeon_archived_traces", JSON.stringify(archivedTraceIds));
  }, [archivedTraceIds]);

  // Trace Comparison modal state
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [traceId1, setTraceId1] = useState<string>("");
  const [traceId2, setTraceId2] = useState<string>("");
  const [events1, setEvents1] = useState<EventItem[]>([]);
  const [events2, setEvents2] = useState<EventItem[]>([]);
  const [loadingCompare1, setLoadingCompare1] = useState(false);
  const [loadingCompare2, setLoadingCompare2] = useState(false);

  // Load trace history on mount
  useEffect(() => {
    fetchTraces();
    checkDatabaseMode();
  }, []);

  // Fetch all events when active trace changes
  useEffect(() => {
    if (activeTraceId) {
      fetchEvents(activeTraceId);
    } else {
      setTimelineEvents([]);
    }
    setSelectedEvent(null);
    setEventSearchQuery("");
    setFilterActor("all");
    setSystemLogsOnly(false);
  }, [activeTraceId]);

  // Handle active background live-refresh polling
  useEffect(() => {
    if (!liveRefresh) return;
    const interval = setInterval(() => {
      fetchTraces(true);
      if (activeTraceId) {
        fetchEvents(activeTraceId);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [liveRefresh, activeTraceId]);

  const checkDatabaseMode = async () => {
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        // Simple heuristic: if Postgres is successfully loaded we display it
        setDatabaseMode("Local JSON"); 
      }
    } catch (e) {
      // Ignored
    }
  };

  const fetchTraces = async (quiet: boolean = false) => {
    if (!quiet) setIsLoading(true);
    try {
      const res = await fetch("/api/traces");
      if (res.ok) {
        const data = await res.json();
        setTraces(data);
        if (data.length > 0 && !activeTraceId) {
          setActiveTraceId(data[0].trace_id);
        }
      }
    } catch (err) {
      console.error("Failed to load traces:", err);
      if (!quiet) {
        setErrorMessage("Could not connect to AEON core service. Make sure server is running.");
      }
    } finally {
      if (!quiet) setIsLoading(false);
    }
  };

  const fetchEvents = async (traceId: string) => {
    try {
      const res = await fetch(`/api/traces/${traceId}/events`);
      if (res.ok) {
        const data = await res.json();
        setTimelineEvents(data);
      }
    } catch (err) {
      console.error("Error loading events:", err);
    }
  };

  // POST /chat with traceId = null is equivalent to initializing a trace
  const handleCreateTrace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: newGoal,
          traceId: null,
          metadata: { depth: "high" }
        })
      });

      if (!res.ok) {
        throw new Error("Failed to initialize trace");
      }

      const data = await res.json();
      setNewGoal("");
      
      // Reload traces, select new one
      await fetchTraces();
      setActiveTraceId(data.traceId);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to trigger AEON operating event spine.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpMsg.trim() || !activeTraceId) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: followUpMsg,
          traceId: activeTraceId,
        })
      });

      if (res.ok) {
        setFollowUpMsg("");
        await fetchEvents(activeTraceId);
        await fetchTraces(); // update metrics / timing if mutated
      } else {
        throw new Error("Failed to send message to active trace");
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportJSON = () => {
    if (timelineEvents.length === 0) return;
    try {
      const dataStr = JSON.stringify(timelineEvents, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `aeon-trace-${activeTraceId || "export"}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Export error:", err);
      setErrorMessage("Failed to generate export file.");
    }
  };

  const getEventDistribution = () => {
    const distribution: Record<string, number> = {};
    timelineEvents.forEach(evt => {
      const type = evt.event_type || "unknown";
      distribution[type] = (distribution[type] || 0) + 1;
    });
    return Object.entries(distribution).map(([name, count]) => ({
      name: name.replace(/_/g, " ").toUpperCase(),
      count,
      rawType: name
    }));
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case "trace_created":
        return "#3b82f6"; // Blue 500
      case "user_message":
        return "#10b981"; // Emerald 500
      case "assistant_message":
        return "#8b5cf6"; // Violet 500
      case "plan_created":
      case "plans":
        return "#ec4899"; // Pink 500
      case "tool_calls":
      case "tool_call":
        return "#f59e0b"; // Amber 500
      default:
        return "#64748b"; // Slate 500
    }
  };

  const getBottleneckAnalysis = () => {
    if (timelineEvents.length === 0) return null;
    const counts: Record<string, number> = {};
    timelineEvents.forEach(evt => {
      counts[evt.event_type] = (counts[evt.event_type] || 0) + 1;
    });

    const userMsgs = counts["user_message"] || 0;
    const assistantMsgs = counts["assistant_message"] || 0;
    const total = timelineEvents.length;

    if (total <= 3) {
      return {
        vibe: "idle",
        status: "Goal Initiated",
        description: "The operating spine registered initial sequence. Ready for downstream execution traces (plans, tool calls, verifiers)."
      };
    }

    if (userMsgs > assistantMsgs * 1.5) {
      return {
        vibe: "operator-heavy",
        status: "Operator Bound",
        description: "Operational throughput is dependent on user chat confirmation logs. High frequency of user inputs relative to system loops."
      };
    }

    if (assistantMsgs > userMsgs * 1.5) {
      return {
        vibe: "agent-heavy",
        status: "Autonomous Load Active",
        description: "System processes are streaming automatically. Check event log payloads to guarantee append auditing is intact."
      };
    }

    return {
      vibe: "balanced",
      status: "Symmetric Cycle",
      description: "Balanced turn-taking sequence. Event progression indicates stable operational flow without immediate pipeline bottlenecks."
    };
  };

  const getDurationText = () => {
    if (!selectedTrace) return "—";
    const start = new Date(selectedTrace.start_time || selectedTrace.created_at).getTime();
    const end = selectedTrace.end_time 
      ? new Date(selectedTrace.end_time).getTime() 
      : (timelineEvents.length > 0 
          ? Math.max(...timelineEvents.map(e => new Date(e.timestamp).getTime())) 
          : start);
    
    const diffMs = end - start;
    if (diffMs <= 0) return "0ms";
    if (diffMs < 1000) return `${diffMs}ms`;
    const seconds = (diffMs / 1000).toFixed(1);
    return `${seconds}s`;
  };

  const getAverageTimePerStep = () => {
    if (!selectedTrace || timelineEvents.length === 0) return "—";
    const start = new Date(selectedTrace.start_time || selectedTrace.created_at).getTime();
    const end = selectedTrace.end_time 
      ? new Date(selectedTrace.end_time).getTime() 
      : (timelineEvents.length > 0 
          ? Math.max(...timelineEvents.map(e => new Date(e.timestamp).getTime())) 
          : start);
    
    const diffMs = Math.max(0, end - start);
    const avgMs = diffMs / timelineEvents.length;
    if (avgMs < 1000) return `${avgMs.toFixed(0)}ms`;
    const avgSeconds = avgMs / 1000;
    return `${avgSeconds.toFixed(2)}s`;
  };

  const getStateSplit = () => {
    if (!timelineEvents || timelineEvents.length < 2) {
      return { activeMs: 0, idleMs: 0, activePct: 100, idlePct: 0 };
    }
    const sorted = [...timelineEvents].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    let activeMs = 0;
    let idleMs = 0;
    const idleThresholdMs = 10000; // 10s split threshold

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const diff = Math.max(0, new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime());
      
      if (diff > idleThresholdMs) {
        activeMs += idleThresholdMs;
        idleMs += (diff - idleThresholdMs);
      } else {
        activeMs += diff;
      }
    }
    
    const total = activeMs + idleMs;
    if (total === 0) {
      return { activeMs: 0, idleMs: 0, activePct: 100, idlePct: 0 };
    }
    
    return {
      activeMs,
      idleMs,
      activePct: Math.round((activeMs / total) * 100),
      idlePct: Math.round((idleMs / total) * 105) > 100 ? 100 - Math.round((activeMs / total) * 100) : Math.round((idleMs / total) * 100)
    };
  };

  const getEventPayloadWithAnnotation = (evt: any) => {
    if (!evt) return {};
    const note = eventAnnotations[evt.event_id];
    if (note && note.trim() !== "") {
      return {
        ...evt.payload,
        annotation: note,
      };
    }
    return evt.payload;
  };

  const getFirstAnomalyEvent = () => {
    if (!timelineEvents || timelineEvents.length < 2) return null;
    const timeline = getLatencyTimeline();
    const latenciesSec = timeline.slice(1).map(t => t.latencySec);
    const meanSec = latenciesSec.length > 0 ? latenciesSec.reduce((s, x) => s + x, 0) / latenciesSec.length : 0;
    const variance = latenciesSec.length > 0 ? latenciesSec.reduce((s, x) => s + Math.pow(x - meanSec, 2), 0) / latenciesSec.length : 0;
    const stdDevSec = Math.sqrt(variance);
    const thresholdSec = meanSec + stdDevMultiplier * stdDevSec;

    if (stdDevSec <= 0.02) return null;

    // Find the first event item that crosses the threshold
    const sortedEvents = [...timelineEvents].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const anomalyItem = timeline.find((t, i) => i > 0 && t.latencySec >= thresholdSec);
    if (!anomalyItem) return null;

    const originalEvent = sortedEvents[anomalyItem.index - 1];
    return originalEvent || null;
  };

  const scrollToFirstAnomaly = () => {
    const anomaly = getFirstAnomalyEvent();
    if (!anomaly) return;

    // Reset filters to guarantee the event is visible
    setEventSearchQuery("");
    setFilterActor("all");
    setSystemLogsOnly(false);
    setSelectedEvent(anomaly);

    // Give React brief moments to render changes in the DOM
    setTimeout(() => {
      const el = document.getElementById(`event-row-${anomaly.event_id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-rose-500", "scale-[1.01]", "transition-all");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-rose-500", "scale-[1.01]");
        }, 2000);
      }
    }, 100);
  };

  const getEstimatedTokens = () => {
    if (!selectedTrace) return 0;
    let charCount = selectedTrace.goal?.length || 0;
    timelineEvents.forEach(evt => {
      if (evt.payload) {
        charCount += JSON.stringify(evt.payload).length;
      }
      charCount += (evt.actor || "").length;
      charCount += (evt.event_type || "").length;
    });
    // Rule of thumb: 1 token is roughly 4 characters
    return Math.ceil(charCount / 4);
  };

  const getLatencyTimeline = () => {
    if (!timelineEvents || timelineEvents.length === 0) return [];
    // Sort events by timestamp
    const sorted = [...timelineEvents].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    return sorted.map((evt, index) => {
      let latencyMs = 0;
      if (index > 0) {
        const prev = sorted[index - 1];
        latencyMs = Math.max(0, new Date(evt.timestamp).getTime() - new Date(prev.timestamp).getTime());
      }
      const sec = parseFloat((latencyMs / 1000).toFixed(2));
      
      // Format timestamp smoothly
      let timeFormatted = "";
      try {
        timeFormatted = new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      } catch (e) {
        timeFormatted = "N/A";
      }
      
      return {
        index: index + 1,
        name: evt.event_type.replace(/_/g, " ").toUpperCase(),
        latencyMs,
        latencySec: sec,
        time: timeFormatted,
        actor: evt.actor,
        stepLabel: `#${index + 1} (${evt.event_type.replace(/_/g, " ").toUpperCase()})`
      };
    });
  };

  const getFilteredEvents = () => {
    return timelineEvents.filter(evt => {
      const q = eventSearchQuery.trim().toLowerCase();
      const matchesSearch = !q || 
        evt.event_type.toLowerCase().includes(q) ||
        evt.actor.toLowerCase().includes(q) ||
        (evt.payload?.message && String(evt.payload.message).toLowerCase().includes(q)) ||
        (evt.payload?.goal && String(evt.payload.goal).toLowerCase().includes(q));
      
      const matchesActor = filterActor === "all" || evt.actor.toLowerCase() === filterActor.toLowerCase();
      
      const isSystemEvent = evt.event_type !== "user_message" && evt.event_type !== "assistant_message";
      const matchesSystemToggle = !systemLogsOnly || isSystemEvent;
      
      return matchesSearch && matchesActor && matchesSystemToggle;
    });
  };

  const getUniqueActors = () => {
    const actors = new Set<string>();
    timelineEvents.forEach(evt => {
      if (evt.actor) actors.add(evt.actor);
    });
    return Array.from(actors);
  };

  const getEfficiencyRating = () => {
    const userCount = timelineEvents.filter(e => e.event_type === "user_message").length;
    const assistantCount = timelineEvents.filter(e => e.event_type === "assistant_message").length;
    
    if (userCount === 0 && assistantCount === 0) {
      return {
        percentage: 0,
        badgeBg: "bg-zinc-100 border-zinc-250 text-zinc-550",
        label: "N/A",
        description: "No dialog cycles logged"
      };
    }
    
    const percentage = userCount === 0 ? assistantCount * 100 : Math.round((assistantCount / userCount) * 100);
    
    let badgeBg = "";
    let label = "";
    let description = "";
    
    if (percentage >= 80 && percentage <= 120) {
      badgeBg = "bg-emerald-50 border-emerald-250 text-emerald-700";
      label = "OPTIMAL (1:1)";
      description = "Direct 1:1 dialog parity ratio";
    } else if (percentage > 120 && percentage <= 200) {
      badgeBg = "bg-blue-50 border-blue-200 text-blue-700";
      label = "EFFICIENT RESPONSE";
      description = "High autonomous reaction loops";
    } else if (percentage > 200) {
      badgeBg = "bg-purple-50 border-purple-250 text-purple-700 font-bold animate-pulse";
      label = "INTENSIVE PROCESSING";
      description = "Heavy autonomous iteration loops";
    } else if (percentage > 0 && percentage < 80) {
      badgeBg = "bg-amber-50 border-amber-250 text-amber-700";
      label = "UNDER-RESPONSE";
      description = "User requests outpace assistant feedback";
    } else {
      badgeBg = "bg-rose-50 border-rose-200 text-rose-700 font-bold";
      label = "STALLED DIALOG";
      description = "Zero assistant blocks appended";
    }
    
    return {
      percentage,
      badgeBg,
      label,
      description,
      userCount,
      assistantCount
    };
  };

  const highlightJson = (obj: any): React.ReactNode => {
    const jsonString = JSON.stringify(obj, null, 2);
    const lines = jsonString.split("\n");
    return (
      <div className="font-mono">
        {lines.map((line, i) => {
          let renderedLine: React.ReactNode = line;
          const keyMatch = line.match(/^(\s*)"([^"]+)"(\s*:\s*)(.*)$/);
          if (keyMatch) {
            const indent = keyMatch[1];
            const key = keyMatch[2];
            const colon = keyMatch[3];
            const val = keyMatch[4];
            
            let valNode: React.ReactNode = val;
            if (val.trim()) {
              if (val.trim().startsWith('"')) {
                valNode = <span className="text-emerald-700 font-mono">{val}</span>;
              } else if (val.trim().match(/^(true|false|null)/)) {
                valNode = <span className="text-amber-700 font-semibold font-mono">{val}</span>;
              } else if (!isNaN(Number(val.trim().replace(/,$/, '')))) {
                valNode = <span className="text-blue-700 font-mono">{val}</span>;
              }
            }
            
            renderedLine = (
              <span>
                {indent}
                <span className="text-purple-650 font-semibold font-mono">"{key}"</span>
                {colon}
                {valNode}
              </span>
            );
          } else {
            renderedLine = <span className="text-zinc-400 font-mono">{line}</span>;
          }
          
          return (
            <div key={i} className="min-h-[1.2rem]">
              {renderedLine}
            </div>
          );
        })}
      </div>
    );
  };

  const renderFormattedPayload = (payload: any) => {
    if (!payload || typeof payload !== "object") {
      return <div className="text-zinc-500 italic text-[11px] font-mono">No data properties found in payload.</div>;
    }

    const keys = Object.keys(payload);
    const matchedElements: React.ReactNode[] = [];

    // 1) "plan" or "plans" or "checklist"
    const planKey = keys.find(k => ["plan", "plans", "checklist", "steps"].includes(k.toLowerCase()));
    if (planKey) {
      const planVal = payload[planKey];
      let steps: string[] = [];
      if (typeof planVal === "string") {
        steps = planVal.split(/[•\n]+/).map(s => s.replace(/^\s*[-*0-9.]+\s*/, "").trim()).filter(Boolean);
      } else if (Array.isArray(planVal)) {
        steps = planVal.map(s => typeof s === "object" ? JSON.stringify(s) : String(s));
      }
      
      if (steps.length > 0) {
        matchedElements.push(
          <div key="plan" className="border border-indigo-150 rounded-lg p-3 bg-indigo-50/30 text-xs flex flex-col gap-2">
            <div className="flex items-center gap-1.5 font-bold font-mono text-[10px] text-indigo-750 uppercase tracking-wider">
              <span>📋 Operational Execution Plan</span>
            </div>
            <div className="space-y-1.5 font-sans">
              {steps.map((step, idx) => (
                <div key={idx} className="flex gap-2 items-start text-zinc-700 text-xs leading-relaxed">
                  <span className="w-4 h-4 rounded-full bg-indigo-100 text-[9px] font-mono font-bold text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="flex-1">{step}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }
    }

    // 2) "thought" or "thoughts" or "reasoning"
    const thoughtKey = keys.find(k => ["thought", "thoughts", "reasoning", "rationale"].includes(k.toLowerCase()));
    if (thoughtKey) {
      const thoughtVal = payload[thoughtKey];
      matchedElements.push(
        <div key="thought" className="border border-amber-150 rounded-lg p-3 bg-amber-50/20 text-xs flex flex-col gap-1.5 animate-pulse-slow">
          <div className="flex items-center gap-1.5 font-bold font-mono text-[10px] text-amber-700 uppercase tracking-wider">
            <span>🧠 Cognitive Process Stream</span>
          </div>
          <p className="font-sans text-zinc-700 leading-relaxed italic pr-2">
            "{typeof thoughtVal === "object" ? JSON.stringify(thoughtVal, null, 2) : String(thoughtVal)}"
          </p>
        </div>
      );
    }

    // 3) "tool" or "tool_calls" or "toolCall" or "executed_tool"
    const toolKey = keys.find(k => ["tool", "tools", "tool_calls", "toolcall", "executed_tool", "command"].includes(k.toLowerCase()));
    if (toolKey) {
      const toolVal = payload[toolKey];
      matchedElements.push(
        <div key="tool" className="border border-blue-150 rounded-lg p-3 bg-blue-50/20 text-xs flex flex-col gap-2">
          <div className="flex items-center gap-1.5 font-bold font-mono text-[10px] text-blue-750 uppercase tracking-wider">
            <span>🔧 Executed Tool Node</span>
          </div>
          <div className="bg-white/80 border border-blue-100 rounded-md p-2 font-mono text-[10px] text-blue-900 leading-tight">
            {typeof toolVal === "object" ? (
              <pre className="whitespace-pre overflow-x-auto max-h-[140px] leading-relaxed">
                {JSON.stringify(toolVal, null, 2)}
              </pre>
            ) : (
              <span className="font-bold">{String(toolVal)}</span>
            )}
          </div>
        </div>
      );
    }

    // 4) "error" or "failure" or "fault" or "exception"
    const errorKey = keys.find(k => ["error", "failure", "fault", "exception", "rollback"].includes(k.toLowerCase()));
    if (errorKey) {
      const errorVal = payload[errorKey];
      matchedElements.push(
        <div key="error" className="border border-rose-150 rounded-lg p-3 bg-rose-50/30 text-xs flex flex-col gap-1.5 animate-pulse">
          <div className="flex items-center gap-1.5 font-bold font-mono text-[10px] text-rose-700 uppercase tracking-wider">
            <span>🚨 Error Warning Diagnostic</span>
          </div>
          <p className="font-mono text-rose-800 font-medium">
            {typeof errorVal === "object" ? JSON.stringify(errorVal, null, 2) : String(errorVal)}
          </p>
        </div>
      );
    }

    // Render rest of keys that were not styled explicitly
    const usedKeys = [planKey, thoughtKey, toolKey, errorKey].filter(Boolean) as string[];
    const restKeys = keys.filter(k => !usedKeys.includes(k));

    if (restKeys.length > 0) {
      matchedElements.push(
        <div key="meta" className="flex flex-col gap-1.5">
          <div className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Payload Metadata</div>
          <div className="grid grid-cols-1 gap-1.5">
            {restKeys.map(k => {
              const v = payload[k];
              const isObject = typeof v === "object" && v !== null;
              return (
                <div key={k} className="flex flex-col sm:flex-row sm:items-start gap-1 justify-between bg-zinc-50 border border-zinc-150/80 rounded-lg p-2 text-xs">
                  <span className="font-mono font-semibold text-zinc-650 min-w-[70px] shrink-0 text-[10px] break-all">{k}</span>
                  <span className="font-sans text-zinc-650 flex-1 break-all text-right sm:text-right font-mono text-[10px]">
                    {isObject ? (
                      <pre className="text-left font-mono text-[9px] bg-white border border-zinc-150 rounded p-1.5 max-h-[140px] overflow-auto whitespace-pre">
                        {JSON.stringify(v, null, 2)}
                      </pre>
                    ) : (
                      String(v)
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return <div className="space-y-3 pb-2">{matchedElements}</div>;
  };

  const handleSelectTrace1 = async (tid: string) => {
    setTraceId1(tid);
    if (!tid) {
      setEvents1([]);
      return;
    }
    setLoadingCompare1(true);
    try {
      const res = await fetch(`/api/traces/${tid}/events`);
      if (res.ok) {
        const data = await res.json();
        setEvents1(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCompare1(false);
    }
  };

  const handleSelectTrace2 = async (tid: string) => {
    setTraceId2(tid);
    if (!tid) {
      setEvents2([]);
      return;
    }
    setLoadingCompare2(true);
    try {
      const res = await fetch(`/api/traces/${tid}/events`);
      if (res.ok) {
        const data = await res.json();
        setEvents2(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCompare2(false);
    }
  };

  const calculateTokensForComparison = (trace: Trace | undefined, events: EventItem[]) => {
    if (!trace) return 0;
    let charCount = trace.goal?.length || 0;
    events.forEach(evt => {
      if (evt.payload) {
        charCount += JSON.stringify(evt.payload).length;
      }
      charCount += (evt.actor || "").length;
      charCount += (evt.event_type || "").length;
    });
    return Math.ceil(charCount / 4);
  };

  const calculateDurationText = (trace: Trace | undefined, events: EventItem[]) => {
    if (!trace) return "—";
    const start = new Date(trace.start_time || trace.created_at).getTime();
    const end = trace.end_time 
      ? new Date(trace.end_time).getTime() 
      : (events.length > 0 
          ? Math.max(...events.map(e => new Date(e.timestamp).getTime())) 
          : start);
    
    const diffMs = end - start;
    if (diffMs <= 0) return "0ms";
    if (diffMs < 1000) return `${diffMs}ms`;
    const seconds = (diffMs / 1000).toFixed(1);
    return `${seconds}s`;
  };

  const openCompareModal = () => {
    setCompareModalOpen(true);
    if (activeTraceId) {
      setTraceId1(activeTraceId);
      setEvents1(timelineEvents);
    } else if (traces.length > 0) {
      setTraceId1(traces[0].trace_id);
      handleSelectTrace1(traces[0].trace_id);
    }
    
    // Set trace 2 as the second trace in the list, or empty
    const otherTraces = traces.filter(t => t.trace_id !== (activeTraceId || ""));
    if (otherTraces.length > 0) {
      setTraceId2(otherTraces[0].trace_id);
      handleSelectTrace2(otherTraces[0].trace_id);
    } else {
      setTraceId2("");
      setEvents2([]);
    }
  };

  // Strict immutability prove action
  const triggerTamperSimulation = async (type: "update" | "delete") => {
    setTamperError(null);
    setTamperSuccess(null);
    
    if (timelineEvents.length === 0) {
      setTamperError("No active event loaded. Spawn a trace first!");
      return;
    }

    const testTarget = timelineEvents[0];

    try {
      // Simulate attempting to update/delete through API which rejects
      const endpoint = `/api/events/${testTarget.event_id}`;
      const res = await fetch(endpoint, {
        method: type === "update" ? "PUT" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_type: "tampered_payload_hack" })
      });

      const responseData = await res.json();
      if (res.status === 405 || responseData.error) {
        setTamperError(`BLOCKED: ${responseData.error || "Mutation rejected"} — ${responseData.message || "events table is append-only"}`);
      } else {
        setTamperSuccess("Simulation finished");
      }
    } catch (err: any) {
      setTamperError(`EXCEPTION THROWN: ${err.message || "events table is append-only"}`);
    }
  };  const getActorBadgeStyles = (actor: string) => {
    switch(actor) {
      case "user":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "assistant":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "system":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-zinc-100 text-zinc-600 border-zinc-200";
    }
  };

  const selectedTrace = traces.find((t) => t.trace_id === activeTraceId);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans flex flex-col antialiased">
      {/* Upper Tech Banner / Top Header */}
      <header className="border-b border-zinc-200 bg-white/85 backdrop-blur sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-100 shadow-[0_2px_10px_rgba(59,130,246,0.05)]">
            <Terminal className="w-5 h-5 text-blue-600 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold font-mono tracking-tight text-zinc-900 uppercase">AEON v0.1</h1>
              <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold px-2 py-0.5 rounded font-mono uppercase">
                Operating Spine
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">Event-Sourced, Verifier-Driven Autonomous Intelligence</p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs font-mono">
          <div className="flex items-center gap-2 bg-zinc-100 px-3.5 py-1.5 rounded-full border border-zinc-200/60">
            <Database className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-zinc-500">Log Store:</span>
            <span className="text-emerald-700 font-medium">Auto Dual-Mode (PG/JSON)</span>
          </div>
          <div className="flex items-center gap-2 bg-zinc-100 px-3 py-1.5 rounded-full border border-zinc-200/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-zinc-600">STATELESS AUDITING ENABLED</span>
          </div>
        </div>
      </header>

      {/* Main Workspace Cockpit Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Trace Metrics Card */}
        <div className="lg:col-span-12 bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold font-mono tracking-wide text-zinc-700 uppercase flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                Active Trace Operational Metrics
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">Real-time telemetrics for the currently loaded operating spine</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
              {/* Live Refresh Toggle */}
              <label 
                className="flex items-center gap-2 px-3 py-1 bg-zinc-50 border border-zinc-200 hover:border-zinc-305 rounded-lg cursor-pointer transition select-none"
                title="Automatically fetch traces and events every 5 seconds"
              >
                <input
                  type="checkbox"
                  checked={liveRefresh}
                  onChange={(e) => setLiveRefresh(e.target.checked)}
                  className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer accent-indigo-650"
                  id="toggle-live-refresh"
                />
                <span className="text-[10px] font-mono font-bold text-zinc-650 uppercase flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${liveRefresh ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"}`} />
                  Live Refresh (5s)
                </span>
              </label>

              {selectedTrace && (
                <div className="text-[10px] font-mono text-zinc-400 bg-zinc-50 px-2.5 py-1.5 rounded border border-zinc-200 flex items-center gap-1.5">
                  LATEST TRANSACTION: <span className="text-zinc-700 font-bold font-mono">{timelineEvents[timelineEvents.length - 1]?.event_id?.substring(0, 8) || "N/A"}</span>
                </div>
              )}

              {selectedTrace && getFirstAnomalyEvent() && (
                <button
                  type="button"
                  onClick={scrollToFirstAnomaly}
                  className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-bold text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-650 rounded-lg transition shadow-sm animate-pulse"
                  title="Find and focus the first latency bottleneck in the Event Timeline"
                >
                  <Zap className="w-3.5 h-3.5" />
                  JUMP TO ANOMALY
                </button>
              )}
            </div>
          </div>

          {selectedTrace ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 mt-5 pt-4 border-t border-zinc-150">
              {/* Metric 1: Current Status */}
              <div className="bg-zinc-50/50 border border-zinc-150 rounded-lg p-4 flex items-center justify-between shadow-xs">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">Spine Status</span>
                  <span className="text-sm font-bold text-zinc-800 mt-1 uppercase flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${selectedTrace.status === "running" ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"}`} />
                    {selectedTrace.status}
                  </span>
                </div>
                <div className={`p-2.5 rounded-lg border ${selectedTrace.status === "running" ? "bg-emerald-50 border-emerald-100 text-emerald-600 shadow-xs" : "bg-zinc-150 border-zinc-250 text-zinc-500"}`}>
                  <CheckCircle className="w-5 h-5 font-bold" />
                </div>
              </div>

              {/* Metric 2: Event Count */}
              <div className="bg-zinc-50/50 border border-zinc-150 rounded-lg p-4 flex items-center justify-between shadow-xs">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">Event Log Count</span>
                  <span className="text-lg font-mono font-bold text-zinc-805 mt-1">
                    {timelineEvents.length} <span className="text-xs font-sans text-zinc-400 font-normal">blocks</span>
                  </span>
                </div>
                <div className="p-2.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-lg shadow-xs">
                  <Database className="w-5 h-5 font-bold" />
                </div>
              </div>

              {/* Metric 3: Spine Duration */}
              <div className="relative group/duration bg-zinc-50/50 border border-zinc-150 rounded-lg p-4 flex flex-col justify-between gap-3 shadow-xs transition-colors hover:bg-zinc-50 cursor-help">
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                      Operational Duration
                      <span className="inline-flex w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                    </span>
                    <span className="text-lg font-mono font-bold text-zinc-800 mt-1 flex items-baseline gap-1.5">
                      {getDurationText()}
                      <span className="text-[9px] text-zinc-400 font-normal font-mono select-none" title="Average duration per sequence step">(~{getAverageTimePerStep()}/step)</span>
                    </span>
                  </div>
                  <div className="p-2.5 bg-purple-50 border border-purple-100 text-purple-600 rounded-lg shadow-xs">
                    <Clock className="w-5 h-5 font-bold" />
                  </div>
                </div>

                {/* Duration split horizontal mini-visualizer bar */}
                {(() => {
                  const split = getStateSplit();
                  return (
                    <div className="w-full mt-1 border-t border-zinc-150 pt-2 pb-0.5">
                      <div className="flex items-center justify-between text-[9px] font-mono mb-1 text-zinc-450 uppercase">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active: {split.activePct}%
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          Idle: {split.idlePct}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden flex">
                        <div 
                          className="bg-emerald-500 h-full transition-all duration-300" 
                          style={{ width: `${split.activePct}%` }}
                          title={`Active Processing: ${split.activePct}% of execution spectrum`}
                        />
                        <div 
                          className="bg-amber-400 h-full transition-all duration-300" 
                          style={{ width: `${split.idlePct}%` }}
                          title={`Stalled/Idle: ${split.idlePct}% of execution spectrum`}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Jump to Anomaly Button */}
                {getFirstAnomalyEvent() && (
                  <button
                    type="button"
                    onClick={scrollToFirstAnomaly}
                    className="z-10 mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-rose-50 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 text-rose-700 rounded-lg text-[10px] font-mono font-bold uppercase transition shadow-2xs cursor-pointer animate-pulse-subtle"
                    title="Find and focus the first latency bottleneck in the Event Timeline"
                  >
                    <Zap className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                    Jump to Anomaly
                  </button>
                )}

                {/* Spine operational velocity calculation tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-zinc-900 border border-zinc-800 text-white rounded-lg p-3 shadow-xl opacity-0 pointer-events-none group-hover/duration:opacity-100 group-hover/duration:pointer-events-auto transition-all duration-200 z-50">
                  <div className="font-bold border-b border-zinc-800 pb-1 mb-1.5 font-mono text-purple-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Spine Velocity Matrix
                  </div>
                  <div className="space-y-1 font-mono text-[10.5px] text-zinc-450 leading-normal">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Total Span:</span>
                      <strong className="text-white">{getDurationText()}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Step Count:</span>
                      <strong className="text-white">{timelineEvents.length} log{timelineEvents.length === 1 ? "" : "s"}</strong>
                    </div>
                    <div className="flex justify-between border-b border-zinc-850 pb-1 mb-1 shadow-2xs">
                      <span className="text-zinc-500 font-bold text-[10px]">Avg Time / Step:</span>
                      <strong className="text-purple-300">{getAverageTimePerStep()}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Active Pipeline:</span>
                      <strong className="text-emerald-400">{getStateSplit().activePct}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Stalled / Idle:</span>
                      <strong className="text-amber-400">{getStateSplit().idlePct}%</strong>
                    </div>
                  </div>
                  <div className="text-[9px] font-sans text-zinc-500 mt-2 italic leading-snug">
                    Calculated dynamically by dividing cumulative elapsed time across all registered immutable blocks.
                  </div>
                </div>
              </div>

              {/* Metric 4: Token Consumption */}
              <div className="bg-zinc-50/50 border border-zinc-150 rounded-lg p-4 flex items-center justify-between shadow-xs">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">Token Consumption</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-lg font-mono font-bold text-zinc-805">
                      {getEstimatedTokens().toLocaleString()}
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-50 text-amber-700 border border-amber-200 font-mono tracking-wide uppercase select-none">
                      Est. Tokens
                    </span>
                  </div>
                </div>
                <div className="p-2.5 bg-amber-50 border border-amber-100 text-amber-600 rounded-lg shadow-xs">
                  <Cpu className="w-5 h-5 font-bold" />
                </div>
              </div>

              {/* Metric 5: Efficiency Rating */}
              {(() => {
                const effRect = getEfficiencyRating();
                return (
                  <div className="bg-zinc-50/50 border border-zinc-150 rounded-lg p-4 flex items-center justify-between shadow-xs">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">Efficiency Rating</span>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${effRect.badgeBg} border`}>
                          {effRect.percentage}%
                        </span>
                        <span className="text-[9px] font-bold text-zinc-500 font-mono tracking-tight cursor-help" title={effRect.description}>
                          {effRect.label}
                        </span>
                      </div>
                      <span className="text-[9px] text-zinc-400 font-mono mt-1">
                        {effRect.assistantCount} ast / {effRect.userCount} user msg
                      </span>
                    </div>
                    <div className="p-2.5 bg-indigo-50 border border-indigo-100 text-indigo-650 rounded-lg shadow-xs">
                      <Zap className="w-5 h-5 font-bold" />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Latency Timeline Chart */}
            <div className="mt-6 pt-5 border-t border-zinc-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-xs font-semibold font-mono tracking-wider text-zinc-700 uppercase flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    Operational Step Latency Profile (Inter-arrival Deltas)
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-sans">
                    Tracks incremental processing delay (latency delta) between consecutive immutable sequence events
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3.5 mt-2 sm:mt-0">
                  <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-500">
                    <span className="w-2.5 h-2.5 rounded bg-indigo-500" />
                    Delta Latency
                  </span>

                  <div className="flex items-center gap-1 bg-zinc-100 border border-zinc-200 rounded-lg p-0.5" title="Exceeded standard deviation (SD) bottle-neck matching threshold">
                    <span className="text-[9px] font-mono font-bold text-zinc-500 px-1.5 uppercase tracking-wider">
                      Highlight:
                    </span>
                    {[1.5, 2.0, 2.5, 3.0].map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setStdDevMultiplier(val)}
                        className={`cursor-pointer px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition ${
                          stdDevMultiplier === val
                            ? "bg-white text-rose-700 shadow-xs border border-zinc-200"
                            : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
                        }`}
                      >
                        {val}σ
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {timelineEvents.length < 2 ? (
                <div className="bg-zinc-50 p-6 rounded-lg border border-dashed border-zinc-200 text-center text-zinc-400 text-xs font-mono">
                  Insufficient sequence length (requires at least 2 events to map delta processing latency).
                </div>
              ) : (
                (() => {
                  const timeline = getLatencyTimeline();
                  const latenciesSec = timeline.slice(1).map(t => t.latencySec);
                  const meanSec = latenciesSec.length > 0 ? latenciesSec.reduce((s, x) => s + x, 0) / latenciesSec.length : 0;
                  const variance = latenciesSec.length > 0 ? latenciesSec.reduce((s, x) => s + Math.pow(x - meanSec, 2), 0) / latenciesSec.length : 0;
                  const stdDevSec = Math.sqrt(variance);
                  const thresholdSec = meanSec + stdDevMultiplier * stdDevSec;
                  const outliers = timeline.slice(1).filter(t => t.latencySec >= thresholdSec && stdDevSec > 0.02);
                  const maxLatencySec = latenciesSec.length > 0 ? Math.max(...latenciesSec, 0) : 0;
                  const maxEvent = timeline.find((t, i) => i > 0 && t.latencySec === maxLatencySec);

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                      {/* Line Chart Canvas */}
                      <div className="lg:col-span-3 h-[185px] bg-zinc-50/40 border border-zinc-150 rounded-lg p-3">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={timeline}
                            margin={{ top: 12, right: 20, left: -25, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f4" vertical={false} />
                            <XAxis 
                              dataKey="index" 
                              stroke="#71717a" 
                              fontSize={9} 
                              tickLine={false} 
                              axisLine={false}
                            />
                            <YAxis 
                              stroke="#71717a" 
                              fontSize={9} 
                              tickLine={false} 
                              axisLine={false}
                            />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  const isAnomaly = data.latencySec >= thresholdSec && stdDevSec > 0.02 && data.index > 1;
                                  return (
                                    <div className="p-3 bg-white border border-zinc-200 rounded-lg shadow-md text-xs font-mono leading-relaxed max-w-[280px]">
                                      <div className="font-bold text-zinc-800 border-b border-zinc-100 pb-1 mb-1 flex items-center justify-between gap-2 text-[10px]">
                                        <span>EVENT #{data.index}</span>
                                        <span className="text-zinc-400 font-normal">{data.time}</span>
                                      </div>
                                      <div className="text-zinc-650 font-bold truncate uppercase tracking-tight text-[11px] mb-1">
                                        {data.name}
                                      </div>
                                      <div className="flex justify-between gap-4 text-zinc-500 text-[10px] mt-1.5">
                                        <span>Actor: <strong className="text-zinc-700 capitalize">{data.actor}</strong></span>
                                        <span>Delta Latency: <strong className="text-indigo-600">{data.latencySec}s</strong></span>
                                      </div>
                                      {isAnomaly && (
                                        <div className="mt-2 pt-1 border-t border-rose-100 text-[9px] text-rose-600 font-bold uppercase flex items-center gap-1">
                                          ⚠️ Bottleneck ({stdDevMultiplier}σ Outlier)
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            {/* Standard Deviation Threshold Reference Line */}
                            {thresholdSec > 0.001 && stdDevSec > 0.02 && (
                              <ReferenceLine 
                                y={parseFloat(thresholdSec.toFixed(3))} 
                                stroke="#f43f5e" 
                                strokeDasharray="4 4" 
                                strokeWidth={1.5}
                                label={{ 
                                  value: `${stdDevMultiplier}σ Threshold (${thresholdSec.toFixed(2)}s)`, 
                                  fill: '#e11d48', 
                                  fontSize: 8, 
                                  fontFamily: 'monospace',
                                  position: 'top',
                                  dy: -4
                                }} 
                              />
                            )}
                            <Line 
                              type="monotone" 
                              dataKey="latencySec" 
                              stroke="#6366f1" 
                              strokeWidth={2}
                              activeDot={{ r: 5 }}
                              dot={(props: any) => {
                                const { cx, cy, payload } = props;
                                const isAnomaly = payload.latencySec >= thresholdSec && stdDevSec > 0.02 && payload.index > 1;
                                if (isAnomaly) {
                                  return (
                                    <g key={`dot-g-${payload.index}`}>
                                      <circle 
                                        cx={cx} 
                                        cy={cy} 
                                        r={7} 
                                        fill="none" 
                                        stroke="#f43f5e" 
                                        strokeWidth={1.5} 
                                        className="animate-pulse"
                                      />
                                      <circle 
                                        cx={cx} 
                                        cy={cy} 
                                        r={3.5} 
                                        fill="#e11d48" 
                                        stroke="#fff" 
                                        strokeWidth={1.5} 
                                      />
                                    </g>
                                  );
                                }
                                return (
                                  <circle 
                                    key={`dot-g-${payload.index}`}
                                    cx={cx} 
                                    cy={cy} 
                                    r={3} 
                                    stroke="#818cf8" 
                                    strokeWidth={1} 
                                    fill="#fff" 
                                  />
                                );
                              }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Peak & Average Latency analysis right-side stats */}
                      <div className="bg-zinc-50/50 border border-zinc-150 rounded-lg p-3.5 flex flex-col justify-between text-xs font-mono">
                        <div className="space-y-3">
                          <span className="text-[10px] font-bold font-mono tracking-widest text-zinc-450 uppercase block">
                            DIAGNOSTIC MATRIX
                          </span>
                          
                          <div className="space-y-2.5">
                            <div className="flex flex-col border-b border-zinc-200/50 pb-1.5">
                              <span className="text-[9px] text-zinc-400 font-semibold uppercase">Mean Velocity (µ):</span>
                              <span className="text-xs font-bold text-zinc-800 mt-0.5">{meanSec.toFixed(3)}s</span>
                            </div>

                            <div className="flex flex-col border-b border-zinc-200/50 pb-1.5">
                              <span className="text-[9px] text-zinc-400 font-semibold uppercase">Std Deviation (σ):</span>
                              <span className="text-xs font-bold text-zinc-800 mt-0.5">{stdDevSec.toFixed(3)}s</span>
                            </div>

                            <div className="flex flex-col border-b border-zinc-200/50 pb-1.5">
                              <span className="text-[9px] text-rose-500 font-semibold uppercase flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 block animate-pulse" />
                                Threshold ({stdDevMultiplier}σ):
                              </span>
                              <span className="text-xs font-bold text-rose-600 mt-0.5">{thresholdSec.toFixed(3)}s</span>
                            </div>

                            <div className="flex flex-col">
                              <span className="text-[9px] text-zinc-400 font-semibold uppercase">Detected Anomalies:</span>
                              <span className={`text-xs font-bold mt-0.5 inline-flex items-center gap-1 ${
                                outliers.length > 0 ? "text-rose-650" : "text-emerald-650"
                              }`}>
                                {outliers.length > 0 ? (
                                  <>⚠️ {outliers.length} bottleneck{outliers.length > 1 ? "s" : ""}</>
                                ) : (
                                  <>✓ Nominal velocity</>
                                )}
                              </span>
                            </div>

                            <div className="text-[10px] font-sans leading-relaxed text-zinc-500 border-t border-zinc-200/60 pt-2 ml-[-2px]">
                              {outliers.length > 0 ? (
                                <span className="text-rose-700 font-mono text-[9px] leading-snug block">
                                  🚨 Event{outliers.length > 1 ? "s" : ""} {outliers.map(o => `#${o.index}`).join(", ")} exceeded bottleneck limit! Long cycles detected.
                                </span>
                              ) : maxEvent && maxEvent.latencySec > 1.5 ? (
                                <span className="text-zinc-600 font-mono text-[9px] leading-snug block">
                                  ℹ️ No statistical outliers found, but event #{maxEvent.index} has a peak delay of {maxEvent.latencySec}s.
                                </span>
                              ) : (
                                <span className="text-emerald-700 font-mono text-[9px] leading-snug block">
                                  ✓ Nominal transition cycles. Operational velocity is optimal.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </>
        ) : (
            <div className="mt-4 py-8 border-t border-dashed border-zinc-200 text-center text-zinc-400 text-xs font-mono">
              <Sliders className="w-6 h-6 text-zinc-300 mx-auto mb-2 animate-pulse" />
              Select an active trace from the registry below to observe system metrics.
            </div>
          )}
        </div>

        {/* LEFT COMPONENT: Traces Navigation Drawer & Goal Dispatcher (col-span-4) */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Dispatch Goal Interface */}
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold font-mono tracking-wide text-zinc-700 uppercase flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                Spawn New Goal Trace
              </h2>
            </div>

            <form onSubmit={handleCreateTrace} className="flex flex-col gap-3">
              <textarea
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                placeholder="Declare operating goal (e.g., 'Bootstrap partition matrix and test immutability')"
                rows={3}
                disabled={isLoading}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition resize-none"
              />
              <button
                type="submit"
                disabled={isLoading || !newGoal.trim()}
                className="w-full font-mono text-xs font-bold py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>
                    Initialize AEON Spine
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Trace History List */}
          {(() => {
            const activeTraces = traces.filter(t => !archivedTraceIds.includes(t.trace_id));
            const archivedTraces = traces.filter(t => archivedTraceIds.includes(t.trace_id));
            const displayedTraces = showArchived ? archivedTraces : activeTraces;

            return (
              <div className="bg-white border border-zinc-200 rounded-xl flex-1 flex flex-col min-h-[300px] shadow-sm animate-fade-in">
                <div className="p-4 border-b border-zinc-150 flex items-center justify-between bg-zinc-50/50">
                  <h2 className="text-xs font-bold font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                    <History className="w-3.5 h-3.5 text-zinc-400" />
                    Trace Registry ({displayedTraces.length})
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={openCompareModal}
                      className="text-indigo-650 hover:text-indigo-805 transition flex items-center gap-1.5 text-[10px] uppercase font-bold font-mono bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg px-2.5 py-1 cursor-pointer"
                      title="Compare traces side-by-side"
                    >
                      <GitCompare className="w-3.5 h-3.5 text-indigo-550" />
                      Compare
                    </button>
                    <button 
                      onClick={fetchTraces}
                      className="text-zinc-400 hover:text-zinc-650 transition cursor-pointer"
                      title="Refresh logs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Switcher Tab Toggle for Active and Archived */}
                <div className="flex border-b border-zinc-150 p-2 bg-zinc-50/50 gap-1.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => {
                      setShowArchived(false);
                      const currentActive = traces.filter(t => !archivedTraceIds.includes(t.trace_id));
                      if (currentActive.length > 0 && (!activeTraceId || archivedTraceIds.includes(activeTraceId))) {
                        setActiveTraceId(currentActive[0].trace_id);
                      }
                    }}
                    className={`flex-1 text-center py-2 px-3 rounded-lg text-[10.5px] font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                      !showArchived
                        ? "bg-white text-zinc-900 border-zinc-200 shadow-xs"
                        : "text-zinc-500 border-transparent hover:bg-zinc-100/60 hover:text-zinc-800"
                    }`}
                  >
                    <Activity className={`w-3.5 h-3.5 ${!showArchived ? "text-emerald-555 animate-pulse" : "text-zinc-400"}`} />
                    Active ({activeTraces.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowArchived(true);
                      const currentArchive = traces.filter(t => archivedTraceIds.includes(t.trace_id));
                      if (currentArchive.length > 0 && (!activeTraceId || !archivedTraceIds.includes(activeTraceId))) {
                        setActiveTraceId(currentArchive[0].trace_id);
                      }
                    }}
                    className={`flex-1 text-center py-2 px-3 rounded-lg text-[10.5px] font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                      showArchived
                        ? "bg-white text-zinc-900 border-zinc-200 shadow-xs"
                        : "text-zinc-500 border-transparent hover:bg-zinc-100/60 hover:text-zinc-800"
                    }`}
                  >
                    <Archive className={`w-3.5 h-3.5 ${showArchived ? "text-purple-500" : "text-zinc-400"}`} />
                    Archived ({archivedTraces.length})
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[480px] p-3 space-y-2">
                  {displayedTraces.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-12 text-zinc-400 text-center">
                      <Database className="w-8 h-8 text-zinc-300 mb-2" />
                      <p className="text-xs font-mono">
                        {showArchived ? "No archived traces inside ledger." : "No active traces inside ledger."}
                      </p>
                    </div>
                  ) : (
                    displayedTraces.map((t) => {
                      const isActive = t.trace_id === activeTraceId;
                      const isCompleted = t.status === "completed";
                      const isArchived = archivedTraceIds.includes(t.trace_id);
                      return (
                        <div
                          key={t.trace_id}
                          onClick={() => setActiveTraceId(t.trace_id)}
                          className={`w-full text-left p-3.5 rounded-lg border transition flex flex-col gap-2 cursor-pointer ${
                            isActive
                              ? "bg-blue-50/50 border-blue-400 shadow-sm ring-1 ring-blue-400/5"
                              : "bg-white border-zinc-200 hover:bg-zinc-50/50 hover:border-zinc-300"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[125px]" title={t.trace_id}>
                              UUID: {t.trace_id}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold font-mono tracking-wide bg-blue-100 text-blue-800 border border-blue-200">
                              {t.status}
                            </span>
                          </div>
                          
                          <p className="text-xs font-semibold text-zinc-800 line-clamp-2">
                            {t.goal}
                          </p>

                          <div className="flex items-center justify-between gap-2 mt-1 pt-1.5 border-t border-zinc-100/50">
                            <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono">
                              <Clock className="w-3.5 h-3.5 text-zinc-350" />
                              <span>{new Date(t.created_at).toLocaleTimeString()}</span>
                            </div>

                            {isCompleted && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isArchived) {
                                    setArchivedTraceIds(prev => prev.filter(id => id !== t.trace_id));
                                  } else {
                                    setArchivedTraceIds(prev => [...prev, t.trace_id]);
                                  }
                                }}
                                className={`flex items-center gap-1 text-[9.5px] uppercase font-mono font-bold px-2 py-0.5 rounded-md border transition cursor-pointer ${
                                  isArchived
                                    ? "bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-150 hover:text-zinc-700"
                                    : "bg-purple-50/50 border-purple-200/60 text-purple-600 hover:bg-purple-100 hover:border-purple-300"
                                }`}
                                title={isArchived ? "Restore to active traces list" : "Archive this trace"}
                              >
                                <Archive className="w-3 h-3" />
                                {isArchived ? "Unarchive" : "Archive"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })()}
        </section>

        {/* MIDDLE & RIGHT PANEL: Timeline Audit Log & Immutability Sandbox (col-span-8) */}
        <section className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Active Goal Terminal Head */}
          <div className="p-5 bg-white border border-zinc-200 rounded-xl relative overflow-hidden shadow-sm">
            <div className="absolute right-0 top-0 p-8 opacity-5">
              <Terminal className="w-32 h-32 text-zinc-900" />
            </div>

            {selectedTrace ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">
                    Active System Goal
                  </span>
                  <span className="text-zinc-300 font-mono">•</span>
                  <span className="text-zinc-400 font-mono text-xs">{selectedTrace.trace_id}</span>
                </div>
                <h3 className="text-base font-bold leading-relaxed text-zinc-900">
                  {selectedTrace.goal}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2 text-[11px] font-mono border-t border-zinc-100">
                  <div className="text-zinc-500">
                    STATUS: <span className="text-blue-600 font-bold uppercase">{selectedTrace.status}</span>
                  </div>
                  <div className="text-zinc-500">
                    DECLARED: <span className="text-zinc-600">{new Date(selectedTrace.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-2 text-zinc-500 text-sm font-mono flex items-center justify-center gap-2">
                <Sliders className="w-4 h-4 text-zinc-400 animate-spin" />
                Initialize block metrics or load trace above...
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1">
            
            {/* Timeline Stream (md:col-span-7) */}
            <div className="md:col-span-7 bg-white border border-zinc-200 rounded-xl p-4 flex flex-col min-h-[400px] shadow-sm">
              <div className="flex items-center justify-between pb-3.5 border-b border-zinc-150 mb-5">
                <span className="text-xs font-bold font-mono uppercase text-zinc-600 tracking-wider flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-zinc-400" />
                  Immutable Event Timeline
                </span>
                <div className="flex items-center gap-2">
                  {timelineEvents.length > 0 && (
                    <>
                      <button
                        onClick={() => setShowAnalytics(!showAnalytics)}
                        className="cursor-pointer flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-600 hover:text-zinc-800 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded transition shadow-sm"
                        title="Toggle flow distribution analysis visualization"
                      >
                        {showAnalytics ? "📊 HIDE MATRIX" : "📊 SHOW MATRIX"}
                      </button>
                      <button
                        onClick={handleExportJSON}
                        className="cursor-pointer flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition shadow-sm"
                        title="Export sequence as JSON file"
                      >
                        <Download className="w-3 h-3" />
                        EXPORT JSON
                      </button>
                    </>
                  )}
                  <div className="flex items-center border border-zinc-200 rounded p-0.5 bg-zinc-50">
                    <button
                      type="button"
                      onClick={() => setViewMode("timeline")}
                      className={`cursor-pointer px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase transition flex items-center gap-1 ${
                        viewMode === "timeline"
                          ? "bg-white text-zinc-800 shadow-xs border border-zinc-150"
                          : "text-zinc-500 hover:text-zinc-800 border border-transparent"
                      }`}
                      title="Show as standard detailed timeline stream"
                    >
                      <Activity className="w-2.5 h-2.5" />
                      TIMELINE
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("compact")}
                      className={`cursor-pointer px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase transition flex items-center gap-1 ${
                        viewMode === "compact"
                          ? "bg-white text-zinc-800 shadow-xs border border-zinc-150"
                          : "text-zinc-500 hover:text-zinc-800 border border-transparent"
                      }`}
                      title="Show as compact vertical list for scanning"
                    >
                      <List className="w-2.5 h-2.5" />
                      COMPACT
                    </button>
                  </div>
                </div>
              </div>

              {/* Analytics Flow Matrix per Trace */}
              {showAnalytics && timelineEvents.length > 0 && (
                <div className="mb-6 p-4 bg-zinc-50/50 border border-zinc-150 rounded-lg flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                      EVENT FLOW METRICS
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      Total Blocks: {timelineEvents.length}
                    </span>
                  </div>
                  
                  <div className="h-[140px] w-full bg-white border border-zinc-150 rounded p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={getEventDistribution()}
                        margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                      >
                        <XAxis type="number" stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="name" stroke="#71717a" fontSize={9} tickLine={false} axisLine={false} width={130} />
                        <Tooltip
                          cursor={{ fill: "rgba(0, 0, 0, 0.02)" }}
                          contentStyle={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #e4e4e7",
                            borderRadius: "0.375rem",
                            fontSize: "10px",
                            fontFamily: "monospace"
                          }}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={10}>
                          {getEventDistribution().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getEventColor(entry.rawType)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Operational Bottleneck Insight */}
                  {getBottleneckAnalysis() && (() => {
                    const insight = getBottleneckAnalysis()!;
                    return (
                      <div className="p-2.5 bg-white border border-zinc-150 rounded text-[11px] font-mono flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 font-bold uppercase text-zinc-700">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            insight.vibe === 'balanced' ? 'bg-emerald-500 animate-pulse' :
                            insight.vibe === 'agent-heavy' ? 'bg-blue-500' :
                            insight.vibe === 'operator-heavy' ? 'bg-amber-500' : 'bg-zinc-400'
                          }`} />
                          Bottleneck Diagnostic: {insight.status}
                        </div>
                        <p className="text-zinc-500 leading-normal font-sans">
                          {insight.description}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Search and Filters Header bar */}
              {timelineEvents.length > 0 && (
                <div className="mb-4 bg-zinc-50 border border-zinc-150 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search event types, actors, or message payloads..."
                      value={eventSearchQuery}
                      onChange={(e) => setEventSearchQuery(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-lg pl-9 pr-8 py-1.5 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-550 transition font-sans"
                    />
                    {eventSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setEventSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                        title="Clear search expression"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={systemLogsOnly}
                        onChange={(e) => setSystemLogsOnly(e.target.checked)}
                        className="rounded border-zinc-350 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer accent-indigo-600 font-mono"
                        id="toggle-system-logs"
                      />
                      <span className="text-[10px] font-mono font-bold text-zinc-500 hover:text-zinc-700 uppercase">
                        System Logs Only
                      </span>
                    </label>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase select-none">
                        Actor:
                      </span>
                      <select
                        value={filterActor}
                        onChange={(e) => setFilterActor(e.target.value)}
                        className="bg-white border border-zinc-200 text-xs rounded-lg px-2.5 py-1.5 text-zinc-700 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 transition cursor-pointer"
                      >
                        <option value="all">ALL ACTORS</option>
                        {getUniqueActors().map(actor => (
                          <option key={actor} value={actor.toLowerCase()}>
                            {actor.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Steps Stream list */}
              <div className={`flex-1 overflow-y-auto max-h-[360px] pr-1 ${viewMode === "compact" ? "space-y-1.5" : "space-y-4"}`}>
                {timelineEvents.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-zinc-400 text-xs font-mono py-12">
                    Timeline ledger is currently vacant.
                  </div>
                ) : getFilteredEvents().length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-xs font-mono py-12 gap-1 border border-dashed border-zinc-200 rounded-lg bg-zinc-50/20">
                    <Sliders className="w-5 h-5 text-zinc-300 animate-pulse mb-1" />
                    <span className="font-semibold text-zinc-500">No events found matching current filter context.</span>
                    <button 
                      onClick={() => { setEventSearchQuery(""); setFilterActor("all"); setSystemLogsOnly(false); }}
                      className="text-blue-600 hover:text-blue-700 font-sans cursor-pointer mt-1 text-xs hover:underline"
                    >
                      Reset search filters
                    </button>
                  </div>
                ) : viewMode === "compact" ? (
                  getFilteredEvents().map((evt, idx) => {
                    const originalIdx = timelineEvents.findIndex(item => item.event_id === evt.event_id);
                    const displayIdx = originalIdx !== -1 ? originalIdx : idx;
                    const isInspectionMatch = selectedEvent?.event_id === evt.event_id;
                    
                    let preview = "";
                    if (evt.event_type === "trace_created") {
                      preview = evt.payload?.goal ? String(evt.payload.goal) : "Created trace";
                    } else if (evt.event_type === "user_message" || evt.event_type === "assistant_message") {
                      preview = evt.payload?.message ? String(evt.payload.message) : "Message";
                    } else if (evt.payload && typeof evt.payload === "object") {
                      preview = Object.entries(evt.payload)
                        .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
                        .join(", ");
                    }
                    if (preview.length > 80) {
                      preview = preview.substring(0, 80) + "...";
                    }

                    return (
                      <div key={evt.event_id} className="flex flex-col gap-1.5">
                        <div 
                          id={`event-row-${evt.event_id}`}
                          onClick={() => setSelectedEvent(evt)}
                          className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border text-xs transition cursor-pointer font-sans ${
                            isInspectionMatch 
                              ? 'bg-blue-50/70 border-blue-200 text-blue-900 shadow-xs' 
                              : 'bg-zinc-50/50 hover:bg-zinc-55 border-zinc-150 text-zinc-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate flex-1">
                            <span className="text-[10px] font-mono font-bold text-zinc-400 select-none min-w-[20px] shrink-0">
                              #{displayIdx + 1}
                            </span>
                            <span className="text-[10px] font-mono border text-[9px] px-1.5 py-0.5 rounded uppercase font-semibold text-zinc-650 bg-zinc-50 border-zinc-205 shrink-0">
                              {evt.event_type}
                            </span>
                            <span className={`text-[9px] font-mono border px-1.5 rounded-full uppercase shrink-0 ${getActorBadgeStyles(evt.actor)}`}>
                              {evt.actor}
                            </span>
                            <span className={`truncate text-zinc-650 font-sans text-xs ${isInspectionMatch ? "font-medium text-zinc-900" : ""}`}>
                              {preview}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            {eventAnnotations[evt.event_id] && (
                              <span className="bg-amber-50 text-amber-700 border border-amber-205/60 rounded px-1.5 py-0.5 text-[9px] font-mono select-none" title={eventAnnotations[evt.event_id]}>
                                📝 Custom Note
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(evt);
                                setEditingEventId(evt.event_id === editingEventId ? null : evt.event_id);
                                setEditingNoteText(eventAnnotations[evt.event_id] || "");
                              }}
                              className="cursor-pointer p-1 hover:bg-zinc-200 rounded text-zinc-400 hover:text-zinc-750 transition"
                              title="Add or Edit Annotation"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                              {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        {/* Inline editor inside compact list */}
                        {editingEventId === evt.event_id && (
                          <div className="mx-2 p-2 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingNoteText}
                              onChange={(e) => setEditingNoteText(e.target.value)}
                              placeholder="Enter annotation note..."
                              className="flex-1 bg-white border border-zinc-250 rounded px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans text-zinc-805"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const text = editingNoteText.trim();
                                  const updated = { ...eventAnnotations };
                                  if (text) {
                                    updated[evt.event_id] = text;
                                  } else {
                                    delete updated[evt.event_id];
                                  }
                                  setEventAnnotations(updated);
                                  setEditingEventId(null);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const text = editingNoteText.trim();
                                const updated = { ...eventAnnotations };
                                if (text) {
                                  updated[evt.event_id] = text;
                                } else {
                                  delete updated[evt.event_id];
                                }
                                setEventAnnotations(updated);
                                setEditingEventId(null);
                              }}
                              className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white rounded text-[10px] font-mono font-bold px-2.5 py-1"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingEventId(null)}
                              className="cursor-pointer px-2.5 py-1 bg-zinc-200 hover:bg-zinc-250 text-zinc-700 rounded text-[10px] font-bold"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  getFilteredEvents().map((evt, idx) => {
                    const originalIdx = timelineEvents.findIndex(item => item.event_id === evt.event_id);
                    const displayIdx = originalIdx !== -1 ? originalIdx : idx;
                    const isInspectionMatch = selectedEvent?.event_id === evt.event_id;
                    return (
                      <div key={evt.event_id} id={`event-row-${evt.event_id}`} className="relative pl-5 border-l-2 border-zinc-200 flex flex-col gap-1.5 group">
                        {/* Timeline Circle point node */}
                        <div className={`absolute -left-[5px] top-1.5 w-2 h-2 rounded-full transition ${isInspectionMatch ? 'bg-blue-500' : 'bg-zinc-300 group-hover:bg-blue-400'}`} />
                        
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold text-zinc-400">#{displayIdx + 1}</span>
                            <span className="text-[10px] font-mono border text-[9px] px-1.5 py-0.5 rounded uppercase font-semibold text-zinc-650 bg-zinc-50 border-zinc-205 shrink-0">
                              {evt.event_type}
                            </span>
                            <span className={`text-[9px] font-mono border px-1.5 rounded-full uppercase ${getActorBadgeStyles(evt.actor)}`}>
                              {evt.actor}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 font-mono text-[9px]">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(evt);
                                setEditingEventId(evt.event_id === editingEventId ? null : evt.event_id);
                                setEditingNoteText(eventAnnotations[evt.event_id] || "");
                              }}
                              className="cursor-pointer p-1 hover:bg-zinc-150 rounded text-zinc-400 hover:text-zinc-700 transition flex items-center gap-1 uppercase font-bold"
                              title="Add or Edit Annotation"
                            >
                              <MessageSquare className="w-3 h-3 text-zinc-400 hover:text-zinc-600" />
                              <span>{eventAnnotations[evt.event_id] ? "Edit Note" : "Annotate"}</span>
                            </button>
                            <span className="text-zinc-400">
                              {new Date(evt.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>

                        <div className={`border p-2.5 rounded-lg text-xs leading-relaxed transition cursor-pointer ${isInspectionMatch ? 'bg-blue-50/30 border-blue-200 text-zinc-850 shadow-sm font-sans' : 'bg-zinc-50/50 hover:bg-zinc-50 border-zinc-150 text-zinc-700 font-sans'}`}
                             onClick={() => setSelectedEvent(evt)}>
                          {evt.event_type === "trace_created" && (
                            <p className="text-zinc-650">Spawned operational goal trace: <span className="text-zinc-805 italic font-mono font-medium">"{evt.payload.goal}"</span></p>
                          )}
                          {evt.event_type === "user_message" && (
                            <p className="text-zinc-805 font-medium font-sans">"{evt.payload.message}"</p>
                          )}
                          {evt.event_type === "assistant_message" && (
                            <p className="text-blue-805 font-mono font-medium font-sans">"{evt.payload.message}"</p>
                          )}
                          {evt.event_type !== "trace_created" && evt.event_type !== "user_message" && evt.event_type !== "assistant_message" && (
                            <span className="text-zinc-400 italic">JSON payload metadata...</span>
                          )}

                          {eventAnnotations[evt.event_id] && (
                            <div className="mt-2.5 p-2 bg-amber-50 border border-amber-200/50 text-amber-850 rounded-lg text-[10.5px] leading-normal font-sans shadow-2xs flex items-start gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <span className="text-amber-705 font-bold font-mono">📝 Note:</span>
                              <span className="italic">"{eventAnnotations[evt.event_id]}"</span>
                            </div>
                          )}
                        </div>

                        {/* Inline editor inside custom timeline style block */}
                        {editingEventId === evt.event_id && (
                          <div className="p-2 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center gap-2 mt-0.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingNoteText}
                              onChange={(e) => setEditingNoteText(e.target.value)}
                              placeholder="Enter event annotation..."
                              className="flex-1 bg-white border border-zinc-250 rounded px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans text-zinc-800"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const text = editingNoteText.trim();
                                  const updated = { ...eventAnnotations };
                                  if (text) {
                                    updated[evt.event_id] = text;
                                  } else {
                                    delete updated[evt.event_id];
                                  }
                                  setEventAnnotations(updated);
                                  setEditingEventId(null);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const text = editingNoteText.trim();
                                const updated = { ...eventAnnotations };
                                if (text) {
                                  updated[evt.event_id] = text;
                                } else {
                                  delete updated[evt.event_id];
                                }
                                setEventAnnotations(updated);
                                setEditingEventId(null);
                              }}
                              className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white rounded text-[10px] font-mono font-bold px-2.5 py-1 shadow-2xs"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingEventId(null)}
                              className="cursor-pointer px-2.5 py-1 bg-zinc-200 hover:bg-zinc-250 text-zinc-707 rounded text-[10px] font-mono font-bold"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Send Follow up inline form */}
              {selectedTrace && (
                <form onSubmit={handleSendChat} className="mt-4 pt-3 border-t border-zinc-150 flex items-center gap-2.5">
                  <input
                    type="text"
                    value={followUpMsg}
                    onChange={(e) => setFollowUpMsg(e.target.value)}
                    placeholder="Append additional trace logs (chat)..."
                    disabled={isLoading}
                    className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition text-zinc-850 placeholder-zinc-400"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !followUpMsg.trim()}
                    className="p-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200/80 disabled:opacity-40 transition"
                  >
                    <Send className="w-3.5 h-3.5 font-medium" />
                  </button>
                </form>
              )}
            </div>

            {/* Event Audit Inspector & Security Sandbox (md:col-span-5) */}
            <div className="md:col-span-5 flex flex-col gap-6">
              
              {/* Event Inspector Panel */}
              <div className="bg-white border border-zinc-200 p-4 rounded-xl flex-1 flex flex-col h-[270px] shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-150 mb-3">
                  <h4 className="text-xs font-bold font-mono uppercase text-zinc-500 tracking-wider flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-blue-500" />
                    Ledger Inspector
                  </h4>
                  {selectedEvent && (
                    <div className="flex items-center border border-zinc-205 rounded p-0.5 bg-zinc-50 shrink-0">
                      <button
                        type="button"
                        onClick={() => setInspectorTab("formatted")}
                        className={`cursor-pointer px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase transition ${
                          inspectorTab === "formatted"
                            ? "bg-white text-zinc-800 shadow-xs border border-zinc-150"
                            : "text-zinc-500 hover:text-zinc-805 border border-transparent"
                        }`}
                      >
                        FORMATTED
                      </button>
                      <button
                        type="button"
                        onClick={() => setInspectorTab("raw")}
                        className={`cursor-pointer px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase transition ${
                          inspectorTab === "raw"
                            ? "bg-white text-zinc-800 shadow-xs border border-zinc-150"
                            : "text-zinc-500 hover:text-zinc-805 border border-transparent"
                        }`}
                      >
                        RAW JSON
                      </button>
                    </div>
                  )}
                </div>

                {selectedEvent ? (
                  <div className="flex-1 flex flex-col gap-2 overflow-hidden bg-white">
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 border-b border-zinc-100 pb-1">
                      <span>EVENT ID UUID</span>
                      <span className="text-zinc-650 truncate max-w-[125px] font-medium font-mono">{selectedEvent.event_id}</span>
                    </div>
                    {(() => {
                      const sortedEvents = [...timelineEvents].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                      const idx = sortedEvents.findIndex(e => e.event_id === selectedEvent.event_id);
                      let timeString = "—";
                      let prevEventName = "";
                      let isFirst = true;

                      if (idx > 0) {
                        isFirst = false;
                        const prev = sortedEvents[idx - 1];
                        prevEventName = prev.event_type.replace(/_/g, " ").toUpperCase();
                        const diffMs = new Date(selectedEvent.timestamp).getTime() - new Date(prev.timestamp).getTime();
                        if (diffMs <= 0) {
                          timeString = "0ms";
                        } else if (diffMs < 1000) {
                          timeString = `${diffMs}ms`;
                        } else {
                          timeString = `${(diffMs / 1000).toFixed(2)}s`;
                        }
                      }

                      return (
                        <div className="flex items-center justify-between text-[10px] font-mono border-b border-zinc-100 pb-1.5 mb-0.5 bg-white">
                          <span className="text-zinc-400 uppercase">Delta Processing Latency</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${isFirst ? "bg-zinc-100 text-zinc-500 border border-zinc-200" : "bg-indigo-50 text-indigo-700 border border-indigo-200"}`} title={!isFirst ? `Time elapsed since previous step: ${prevEventName}` : "Initial sequence start point"}>
                            {isFirst ? "SEQUENCE ORIGIN" : `+${timeString}`}
                          </span>
                        </div>
                      );
                    })()}
                    <div className="flex-1 overflow-auto bg-zinc-50 p-2.5 rounded border border-zinc-150 text-[10px] leading-relaxed">
                      {(() => {
                        const annotatedPayload = getEventPayloadWithAnnotation(selectedEvent);
                        return inspectorTab === "formatted" ? (
                          renderFormattedPayload(annotatedPayload)
                        ) : (
                          highlightJson({
                            actor: selectedEvent.actor,
                            event_type: selectedEvent.event_type,
                            payload: annotatedPayload,
                            timestamp: selectedEvent.timestamp,
                            parent_event_id: selectedEvent.parent_event_id,
                          })
                        );
                      })()}
                    </div>

                    {/* Event Annotation input */}
                    <div className="mt-2.5 pt-2 border-t border-zinc-150 flex flex-col gap-1.5 shrink-0 bg-zinc-50/50 p-2 rounded-lg border border-zinc-200">
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 font-bold uppercase">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                          Event Annotation (stored in payload)
                        </span>
                        {eventAnnotations[selectedEvent.event_id] && (
                          <button 
                            type="button"
                            onClick={() => {
                              const updated = { ...eventAnnotations };
                              delete updated[selectedEvent.event_id];
                              setEventAnnotations(updated);
                            }}
                            className="cursor-pointer text-[9px] text-rose-650 hover:text-rose-800 uppercase font-bold"
                          >
                            Clear Note
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editingEventId === selectedEvent.event_id ? editingNoteText : (eventAnnotations[selectedEvent.event_id] || "")}
                          onChange={(e) => {
                            setEditingEventId(selectedEvent.event_id);
                            setEditingNoteText(e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const text = editingNoteText.trim();
                              const updated = { ...eventAnnotations };
                              if (text) {
                                updated[selectedEvent.event_id] = text;
                              } else {
                                delete updated[selectedEvent.event_id];
                              }
                              setEventAnnotations(updated);
                              setEditingEventId(null);
                            }
                          }}
                          placeholder="Annotate this event (press Enter to save)..."
                          className="flex-1 bg-white border border-zinc-205 rounded px-2.5 py-1 text-[10px] font-sans focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-zinc-850 placeholder-zinc-400"
                        />
                        {editingEventId === selectedEvent.event_id && editingNoteText !== (eventAnnotations[selectedEvent.event_id] || "") && (
                          <button
                            type="button"
                            onClick={() => {
                              const text = editingNoteText.trim();
                              const updated = { ...eventAnnotations };
                              if (text) {
                                updated[selectedEvent.event_id] = text;
                              } else {
                                delete updated[selectedEvent.event_id];
                              }
                              setEventAnnotations(updated);
                              setEditingEventId(null);
                            }}
                            className="cursor-pointer px-2 py-1 bg-blue-550 hover:bg-blue-600 text-white rounded text-[9.5px] font-mono font-bold uppercase shadow-2xs"
                          >
                            Save
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-zinc-400 text-[11px] font-mono">
                    <Database className="w-5 h-5 text-zinc-300 mb-1.5" />
                    Select any timeline event to inspect the immutable JSON block.
                  </div>
                )}
              </div>

              {/* Strict Trigger Sandbox Panel */}
              <div className="bg-white border border-zinc-200 p-4 rounded-xl shadow-sm border-l-4 border-l-amber-500">
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-150 mb-3.5">
                  <ShieldAlert className="w-4 h-4 text-amber-500 animate-pulse" />
                  <h4 className="text-xs font-bold font-mono uppercase text-zinc-700 tracking-wider">
                    Immutability Sandbox
                  </h4>
                </div>
                <p className="text-[11px] leading-relaxed text-zinc-550 font-sans mb-3.5">
                  The spine prevents record edits. Click below to verify the SQL append-only schema constraints against live objects.
                </p>

                <div className="flex gap-2.5">
                  <button
                    onClick={() => triggerTamperSimulation("update")}
                    className="flex-1 font-mono text-[10px] font-bold py-2 px-3 rounded bg-zinc-50 border border-amber-200 hover:bg-amber-100/50 text-amber-700 transition flex items-center justify-center gap-1.5"
                  >
                    <Lock className="w-3 h-3" />
                    Attempt UPDATE
                  </button>
                  <button
                    onClick={() => triggerTamperSimulation("delete")}
                    className="flex-1 font-mono text-[10px] font-bold py-2 px-3 rounded bg-zinc-50 border border-rose-200 hover:bg-rose-100/50 text-rose-700 transition flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3 h-3" />
                    Attempt DELETE
                  </button>
                </div>

                {tamperError && (
                  <div className="bg-rose-50 border border-rose-200 rounded p-2.5 mt-3">
                    <div className="flex items-center gap-1.5 text-rose-700 text-[10px] font-mono uppercase font-fold">
                      <ShieldAlert className="w-3 h-3" />
                      Security Intercepted:
                    </div>
                    <p className="text-[10px] text-rose-600 font-mono mt-1 break-words leading-tight">
                      {tamperError}
                    </p>
                  </div>
                )}
              </div>

            </div>

          </div>

        </section>

      </main>

      {/* Trace Comparison Modal */}
      {compareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-zinc-200 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-150 flex items-center justify-between bg-zinc-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-650 rounded-lg border border-indigo-100">
                  <GitCompare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-mono text-zinc-800 uppercase tracking-wide">
                    Trace Comparison Engine
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-sans mt-0.5">
                    Compare operational metrics, message ratios, and token payloads side-by-side
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCompareModalOpen(false)}
                className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-650 transition cursor-pointer font-bold font-mono"
                title="Close Comparison Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Selectors Panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-50 p-4 border border-zinc-200/80 rounded-xl">
                {/* Select Trace 1 */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wide">
                    Primary Trace (A)
                  </label>
                  <select
                    value={traceId1}
                    onChange={(e) => handleSelectTrace1(e.target.value)}
                    className="w-full bg-white border border-zinc-200 text-xs rounded-lg px-3 py-2 text-zinc-800 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 transition cursor-pointer"
                  >
                    <option value="">-- SELECT TRACE --</option>
                    {traces.map((t) => (
                      <option key={t.trace_id} value={t.trace_id}>
                        {t.goal.substring(0, 50)}{t.goal.length > 50 ? "..." : ""} (ID: {t.trace_id.substring(0, 8)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Trace 2 */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wide">
                    Comparison Target (B)
                  </label>
                  <select
                    value={traceId2}
                    onChange={(e) => handleSelectTrace2(e.target.value)}
                    className="w-full bg-white border border-zinc-200 text-xs rounded-lg px-3 py-2 text-zinc-800 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 transition cursor-pointer"
                  >
                    <option value="">-- SELECT TRACE --</option>
                    {traces.map((t) => (
                      <option key={t.trace_id} value={t.trace_id}>
                        {t.goal.substring(0, 50)}{t.goal.length > 50 ? "..." : ""} (ID: {t.trace_id.substring(0, 8)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Side-by-Side Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                {/* Visual Connector / Versus Indicator */}
                <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 border border-zinc-250 items-center justify-center font-mono text-[10px] font-bold text-zinc-400 z-10 select-none shadow-xs">
                  VS
                </div>

                {/* Column for Trace 1 */}
                <div className="border border-zinc-200 rounded-xl p-5 bg-white shadow-xs relative overflow-hidden flex flex-col gap-4">
                  {loadingCompare1 ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-400 text-xs font-mono">
                      <RefreshCw className="w-5 h-5 animate-spin text-zinc-400" />
                      Loading Trace A...
                    </div>
                  ) : (() => {
                    const traceA = traces.find(t => t.trace_id === traceId1);
                    if (!traceA) {
                      return (
                        <div className="py-12 text-center text-zinc-400 text-xs font-mono">
                          Please select a primary trace to view operational telemetrics.
                        </div>
                      );
                    }

                    const uCount = events1.filter(e => e.event_type === "user_message").length;
                    const aCount = events1.filter(e => e.event_type === "assistant_message").length;
                    const sCount = events1.length - uCount - aCount;
                    const tokens = calculateTokensForComparison(traceA, events1);
                    const duration = calculateDurationText(traceA, events1);
                    const effRating = uCount === 0 ? aCount * 100 : Math.round((aCount / uCount) * 100);

                    return (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-500 border border-zinc-200 select-none">
                            TRACE RESOURCE A
                          </span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                            traceA.status === "running" ? "bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse" : "bg-zinc-105 text-zinc-650 border border-zinc-205"
                          }`}>
                            {traceA.status}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Goal / Objective Form</h4>
                          <p className="text-xs text-zinc-700 font-medium font-sans mt-1 bg-zinc-50 p-2.5 rounded-lg border border-zinc-150 leading-relaxed max-h-[80px] overflow-y-auto">
                            "{traceA.goal}"
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {/* Event Count card */}
                          <div className="bg-zinc-50/50 border border-zinc-150 rounded-lg p-3">
                            <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wide">Event Log Count</span>
                            <div className="text-sm font-mono font-bold text-zinc-800 mt-1 flex items-baseline gap-1">
                              {events1.length}
                              <span className="text-[9px] font-sans text-zinc-450 font-normal">blocks</span>
                            </div>
                          </div>

                          {/* Operational Duration */}
                          <div className="bg-zinc-50/50 border border-zinc-150 rounded-lg p-3">
                            <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wide">Duration</span>
                            <div className="text-sm font-slate font-bold text-zinc-800 mt-1">
                              {duration}
                            </div>
                          </div>

                          {/* Est. Tokens */}
                          <div className="bg-zinc-50/50 border border-zinc-150 rounded-lg p-3">
                            <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wide">Est. Tokens</span>
                            <div className="text-sm font-mono font-bold text-zinc-800 mt-1 flex items-baseline gap-1">
                              {tokens.toLocaleString()}
                              <span className="text-[9px] font-sans text-zinc-450 font-normal">tkn</span>
                            </div>
                          </div>

                          {/* Efficiency Rating Ratio */}
                          <div className="bg-zinc-50/50 border border-zinc-150 rounded-lg p-3">
                            <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wide">Efficiency Ratio</span>
                            <div className="text-sm font-mono font-bold text-zinc-800 mt-1 flex items-baseline gap-1">
                              {effRating}%
                              <span className="text-[8px] font-mono px-1 bg-zinc-100 rounded text-zinc-500 font-semibold border border-zinc-200">
                                {aCount}ast/{uCount}usr
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-zinc-155 pt-3 flex flex-col gap-2">
                          <h4 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Event Actor Breakdown</h4>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-blue-50 border border-blue-200 text-blue-700 uppercase">
                              {uCount} User MSGS
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 uppercase">
                              {aCount} Assist MSGS
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-purple-50 border border-purple-200 text-purple-705 uppercase">
                              {sCount} Sys Blocks
                            </span>
                          </div>
                        </div>

                        <div className="text-[9px] font-mono text-zinc-400 mt-auto pt-2 flex items-center justify-between">
                          <span>CREATED AT: {new Date(traceA.created_at).toLocaleDateString()}</span>
                          <span className="truncate max-w-[130px]">{traceA.trace_id}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Column for Trace 2 */}
                <div className="border border-zinc-200 rounded-xl p-5 bg-white shadow-xs relative overflow-hidden flex flex-col gap-4">
                  {loadingCompare2 ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-400 text-xs font-mono">
                      <RefreshCw className="w-5 h-5 animate-spin text-zinc-400" />
                      Loading Trace B...
                    </div>
                  ) : (() => {
                    const traceB = traces.find(t => t.trace_id === traceId2);
                    if (!traceB) {
                      return (
                        <div className="py-12 text-center text-zinc-400 text-xs font-mono">
                          Please select a target trace to view operational telemetrics.
                        </div>
                      );
                    }

                    const uCount = events2.filter(e => e.event_type === "user_message").length;
                    const aCount = events2.filter(e => e.event_type === "assistant_message").length;
                    const sCount = events2.length - uCount - aCount;
                    const tokens = calculateTokensForComparison(traceB, events2);
                    const duration = calculateDurationText(traceB, events2);
                    const effRating = uCount === 0 ? aCount * 100 : Math.round((aCount / uCount) * 100);

                    return (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-500 border border-zinc-200 select-none">
                            TRACE RESOURCE B
                          </span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                            traceB.status === "running" ? "bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse" : "bg-zinc-100 text-zinc-650 border border-zinc-205"
                          }`}>
                            {traceB.status}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Goal / Objective Form</h4>
                          <p className="text-xs text-zinc-700 font-medium font-sans mt-1 bg-zinc-50 p-2.5 rounded-lg border border-zinc-150 leading-relaxed max-h-[80px] overflow-y-auto">
                            "{traceB.goal}"
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {/* Event Count card */}
                          <div className="bg-zinc-50/50 border border-zinc-150 rounded-lg p-3">
                            <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wide">Event Log Count</span>
                            <div className="text-sm font-mono font-bold text-zinc-800 mt-1 flex items-baseline gap-1">
                              {events2.length}
                              <span className="text-[9px] font-sans text-zinc-450 font-normal">blocks</span>
                            </div>
                          </div>

                          {/* Operational Duration */}
                          <div className="bg-zinc-50/50 border border-zinc-150 rounded-lg p-3">
                            <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wide">Duration</span>
                            <div className="text-sm font-slate font-bold text-zinc-800 mt-1">
                              {duration}
                            </div>
                          </div>

                          {/* Est. Tokens */}
                          <div className="bg-zinc-50/50 border border-zinc-150 rounded-lg p-3">
                            <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wide">Est. Tokens</span>
                            <div className="text-sm font-mono font-bold text-zinc-800 mt-1 flex items-baseline gap-1">
                              {tokens.toLocaleString()}
                              <span className="text-[9px] font-sans text-zinc-450 font-normal">tkn</span>
                            </div>
                          </div>

                          {/* Efficiency Rating Ratio */}
                          <div className="bg-zinc-50/50 border border-zinc-150 rounded-lg p-3">
                            <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wide">Efficiency Ratio</span>
                            <div className="text-sm font-mono font-bold text-zinc-800 mt-1 flex items-baseline gap-1">
                              {effRating}%
                              <span className="text-[8px] font-mono px-1 bg-zinc-100 rounded text-zinc-500 font-semibold border border-zinc-200">
                                {aCount}ast/{uCount}usr
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-zinc-155 pt-3 flex flex-col gap-2">
                          <h4 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Event Actor Breakdown</h4>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-blue-50 border border-blue-200 text-blue-700 uppercase">
                              {uCount} User MSGS
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 uppercase">
                              {aCount} Assist MSGS
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-purple-50 border border-purple-200 text-purple-705 uppercase">
                              {sCount} Sys Blocks
                            </span>
                          </div>
                        </div>

                        <div className="text-[9px] font-mono text-zinc-400 mt-auto pt-2 flex items-center justify-between">
                          <span>CREATED AT: {new Date(traceB.created_at).toLocaleDateString()}</span>
                          <span className="truncate max-w-[130px]">{traceB.trace_id}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-zinc-150 flex items-center justify-end bg-zinc-50/50 gap-3">
              <button
                type="button"
                onClick={() => setCompareModalOpen(false)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-205 border border-zinc-205 rounded-lg text-zinc-700 font-mono text-xs font-bold transition cursor-pointer uppercase"
              >
                Close Engine
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating alert bar */}
      {errorMessage && (
        <div className="bg-rose-50 border-t border-rose-200 px-6 py-2.5 flex items-center justify-between text-xs font-mono text-rose-700 sticky bottom-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>{errorMessage}</span>
          </div>
          <button 
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-900 font-bold"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Base footer */}
      <footer className="py-4 border-t border-zinc-200 text-center font-mono text-[10px] text-zinc-500 bg-white">
        AEON OS Operating Spine • Authorized Dev Session • Clean Compilation Established
      </footer>
    </div>
  );
}
