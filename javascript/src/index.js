type Task = {
  name: string;
  deadline: string | Date;        // e.g. "2026-01-05" or Date
  priority: number;               // 1..5
  dependencies: string[];         // names of tasks
  estimatedHours: number;
};

function toTime(d: string | Date): number {
  const dt = d instanceof Date ? d : new Date(d);
  const t = dt.getTime();
  if (Number.isNaN(t)) throw new Error(`Invalid deadline: ${String(d)}`);
  return t;
}

// Higher score = do sooner (only used among "ready" tasks)
function score(task: Task, now: number): number {
  const deadlineMs = toTime(task.deadline);
  const daysLeft = Math.max(0, (deadlineMs - now) / (1000 * 60 * 60 * 24));

  // urgency: closer deadlines -> bigger number
  const urgency = 1 / (daysLeft + 1);

  // priority: bigger -> bigger number (dominant)
  const pr = Math.min(5, Math.max(1, task.priority));

  // effort: smaller -> slightly bigger number
  const effort = 1 / (Math.max(0, task.estimatedHours) + 1);

  // Weights: priority dominates, then deadline urgency, then effort
  return pr * 1000 + urgency * 100 + effort;
}

export function prioritizeTasks(tasks: Task[]): Task[] {
  if (!Array.isArray(tasks)) throw new Error("Invalid input: tasks must be an array");

  const byName = new Map<string, Task>();
  for (const t of tasks) {
    if (!t?.name) throw new Error("Invalid task: missing name");
    if (byName.has(t.name)) throw new Error(`Duplicate task name: ${t.name}`);
    byName.set(t.name, t);
  }

  // Validate deps exist
  const missing: string[] = [];
  for (const t of tasks) {
    const deps = Array.isArray(t.dependencies) ? t.dependencies : [];
    for (const dep of deps) {
      if (!byName.has(dep)) missing.push(`${t.name} -> ${dep}`);
    }
  }
  if (missing.length) {
    throw new Error(`Missing dependencies: ${missing.join(", ")}`);
  }

  // Build graph: dep -> task
  const graph = new Map<string, string[]>();
  const indeg = new Map<string, number>();

  for (const t of tasks) {
    graph.set(t.name, []);
    indeg.set(t.name, 0);
  }

  for (const t of tasks) {
    const deps = Array.isArray(t.dependencies) ? t.dependencies : [];
    for (const dep of deps) {
      graph.get(dep)!.push(t.name);
      indeg.set(t.name, (indeg.get(t.name) ?? 0) + 1);
    }
  }

  // Kahn’s algorithm, but each step picks "best" ready task by score
  const now = Date.now();
  const ready: string[] = [];
  for (const [name, d] of indeg.entries()) if (d === 0) ready.push(name);

  const out: Task[] = [];

  while (ready.length) {
    // pick best ready task
    ready.sort((a, b) => {
      const ta = byName.get(a)!;
      const tb = byName.get(b)!;

      const sa = score(ta, now);
      const sb = score(tb, now);
      if (sb !== sa) return sb - sa; // higher score first

      // extra deterministic tie-breakers
      const da = toTime(ta.deadline);
      const db = toTime(tb.deadline);
      if (da !== db) return da - db; // earlier deadline
      if (tb.priority !== ta.priority) return tb.priority - ta.priority; // higher priority
      if (ta.estimatedHours !== tb.estimatedHours) return ta.estimatedHours - tb.estimatedHours; // less effort
      return ta.name.localeCompare(tb.name);
    });

    const pick = ready.shift()!;
    out.push(byName.get(pick)!);

    for (const nxt of graph.get(pick)!) {
      indeg.set(nxt, (indeg.get(nxt) ?? 0) - 1);
      if (indeg.get(nxt) === 0) ready.push(nxt);
    }
  }

  if (out.length !== tasks.length) {
    throw new Error("Circular dependency detected");
  }

  return out;
}

export { prioritizeTasks, CircularDependencyError, InvalidDependencyError, InvalidPriorityError } from "./prioritizeTasks.js"

