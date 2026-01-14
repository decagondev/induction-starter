/**
 * Priority range constants
 */
const PRIORITY_MIN = 1
const PRIORITY_MAX = 5

/**
 * Custom error for circular dependencies
 */
class CircularDependencyError extends Error {
  constructor(message) {
    super(message)
    this.name = "CircularDependencyError"
  }
}

/**
 * Custom error for invalid dependencies
 */
class InvalidDependencyError extends Error {
  constructor(message) {
    super(message)
    this.name = "InvalidDependencyError"
  }
}

/**
 * Custom error for invalid priority values
 */
class InvalidPriorityError extends Error {
  constructor(message) {
    super(message)
    this.name = "InvalidPriorityError"
  }
}

/**
 * Parses a deadline from Date object or ISO string to Date object
 * @param {Date | string | undefined | null} deadline - Deadline as Date object or ISO string
 * @returns {Date | undefined} Parsed Date object, or undefined if deadline is missing
 * @throws {Error} If date cannot be parsed
 */
function parseDeadline(deadline) {
  if (deadline === undefined || deadline === null) {
    return undefined
  }
  if (deadline instanceof Date) {
    return deadline
  }
  const parsed = new Date(deadline)
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid date format: ${deadline}`)
  }
  return parsed
}

/**
 * Validates a single task
 * @param {Object} task - Task to validate
 * @param {string} task.id - Task ID
 * @param {string} task.name - Task name
 * @param {Date | string} task.deadline - Task deadline
 * @param {number} task.priority - Priority level (1-5)
 * @param {string[]} task.dependencies - Array of task IDs
 * @param {number} task.estimatedHours - Estimated hours
 * @param {Set<string>} allTaskIds - Set of all valid task IDs
 * @throws {InvalidPriorityError} If priority is out of range
 * @throws {InvalidDependencyError} If dependencies reference non-existent tasks
 */
function validateTask(task, allTaskIds) {
  // Validate priority range
  if (task.priority < PRIORITY_MIN || task.priority > PRIORITY_MAX) {
    throw new InvalidPriorityError(
      `Task "${task.id}" has invalid priority ${task.priority}. Priority must be between ${PRIORITY_MIN} and ${PRIORITY_MAX}.`
    )
  }

  // Validate dependencies exist
  for (const depId of task.dependencies) {
    if (!allTaskIds.has(depId)) {
      throw new InvalidDependencyError(
        `Task "${task.id}" has dependency on non-existent task "${depId}".`
      )
    }
  }

  // Validate estimated hours is non-negative
  if (task.estimatedHours < 0) {
    throw new Error(`Task "${task.id}" has negative estimated hours.`)
  }
}

/**
 * Detects circular dependencies using DFS
 * @param {Map<string, Object>} tasks - Map of task ID to normalized task
 * @throws {CircularDependencyError} If circular dependency is detected
 */
function detectCircularDependencies(tasks) {
  const visited = new Set()
  const recursionStack = new Set()

  function hasCycle(taskId) {
    if (recursionStack.has(taskId)) {
      return true // Circular dependency detected
    }
    if (visited.has(taskId)) {
      return false // Already processed, no cycle
    }

    visited.add(taskId)
    recursionStack.add(taskId)

    const task = tasks.get(taskId)
    if (task) {
      for (const depId of task.dependencies) {
        if (hasCycle(depId)) {
          return true
        }
      }
    }

    recursionStack.delete(taskId)
    return false
  }

  for (const taskId of tasks.keys()) {
    if (!visited.has(taskId) && hasCycle(taskId)) {
      throw new CircularDependencyError(
        `Circular dependency detected involving task "${taskId}".`
      )
    }
  }
}

/**
 * Normalizes tasks by parsing deadlines and creating a map
 * @param {Object[]} tasks - Array of tasks to normalize
 * @returns {Map<string, Object>} Map of task ID to normalized task
 */
function normalizeTasks(tasks) {
  const normalized = new Map()

  for (const task of tasks) {
    normalized.set(task.id, {
      ...task,
      deadline: task.deadline !== undefined ? parseDeadline(task.deadline) : undefined,
    })
  }

  return normalized
}

/**
 * Prioritizes tasks based on dependencies, priority, deadline, and estimated effort.
 *
 * Algorithm:
 * 1. Validate all tasks (priority range, dependencies exist)
 * 2. Detect circular dependencies
 * 3. Use topological sort to order tasks respecting dependencies
 * 4. Within each dependency level, sort by:
 *    - Priority (higher first)
 *    - Deadline (earlier first)
 *    - Estimated hours (lower first, as tiebreaker)
 *
 * @param {Object[]} tasks - Array of tasks to prioritize
 * @param {string} tasks[].id - Task ID
 * @param {string} tasks[].name - Task name
 * @param {Date | string} tasks[].deadline - Task deadline
 * @param {number} tasks[].priority - Priority level (1-5)
 * @param {string[]} tasks[].dependencies - Array of task IDs
 * @param {number} tasks[].estimatedHours - Estimated hours
 * @returns {Object[]} Array of tasks in priority order
 * @throws {CircularDependencyError} If circular dependencies are detected
 * @throws {InvalidDependencyError} If dependencies reference non-existent tasks
 * @throws {InvalidPriorityError} If priority is out of range
 */
export function prioritizeTasks(tasks) {
  // Handle empty input
  if (tasks.length === 0) {
    return []
  }

  // Create set of all task IDs for validation
  const allTaskIds = new Set(tasks.map((t) => t.id))

  // Validate all tasks
  for (const task of tasks) {
    validateTask(task, allTaskIds)
  }

  // Normalize tasks (parse deadlines) for comparison
  const normalizedTasks = normalizeTasks(tasks)
  
  // Keep original tasks map to preserve original deadline format
  const originalTasksMap = new Map()
  for (const task of tasks) {
    originalTasksMap.set(task.id, task)
  }

  // Detect circular dependencies
  detectCircularDependencies(normalizedTasks)

  // Kahn's algorithm for topological sort
  const inDegree = new Map()
  const dependencyMap = new Map() // taskId -> Set of dependents (reverse edges)

  // Initialize maps
  for (const [id, task] of normalizedTasks) {
    inDegree.set(id, 0)
    dependencyMap.set(id, new Set())
  }
  for (const [id, task] of normalizedTasks) {
    for (const depId of task.dependencies) {
      inDegree.set(id, inDegree.get(id) + 1)
      dependencyMap.get(depId).add(id)
    }
  }

  // Collect all tasks with no dependencies (in-degree 0)
  const queue = []
  for (const [id, degree] of inDegree) {
    if (degree === 0) {
      queue.push(id)
    }
  }

  const topoSortedIds = []

  while (queue.length > 0) {
    const currentId = queue.shift()
    topoSortedIds.push(currentId)

    for (const dependentId of dependencyMap.get(currentId)) {
      inDegree.set(dependentId, inDegree.get(dependentId) - 1)
      if (inDegree.get(dependentId) === 0) {
        queue.push(dependentId)
      }
    }
  }

  // Build normalized task lookup map for comparison
  const normalizedTaskMap = new Map(normalizedTasks)

  // Prepare dependency tracking for scheduling
  const unscheduled = new Set(topoSortedIds)
  const dependencyLeft = new Map()
  for (const [id, task] of normalizedTasks) {
    dependencyLeft.set(id, new Set(task.dependencies))
  }

  const finalOrder = []
  // Prioritize at each step
  while (unscheduled.size > 0) {
    // Find all tasks with dependencies already fulfilled
    const ready = []
    for (const id of unscheduled) {
      if (dependencyLeft.get(id).size === 0) {
        ready.push(normalizedTaskMap.get(id))
      }
    }

    // Sort ready tasks by: priority DESC, deadline ASC, estimatedHours ASC
    ready.sort((a, b) => {
      // Priority: higher first
      if (b.priority !== a.priority) return b.priority - a.priority
      // Deadline: earlier first (handle missing deadlines)
      if (a.deadline && b.deadline) {
        const deadlineDiff = a.deadline.getTime() - b.deadline.getTime()
        if (deadlineDiff !== 0) return deadlineDiff
      } else if (a.deadline) {
        return -1
      } else if (b.deadline) {
        return 1
      }
      // Estimated hours: lower first (handle missing)
      if (a.estimatedHours !== undefined && b.estimatedHours !== undefined) {
        return a.estimatedHours - b.estimatedHours
      } else if (a.estimatedHours !== undefined) {
        return -1
      } else if (b.estimatedHours !== undefined) {
        return 1
      }
      return 0
    })
    
    if (ready.length === 0) {
      // Circular dependency fallback (should not happen here)
      throw new CircularDependencyError('No tasks can be scheduled—circular dependency detected')
    }

    // Schedule all ready tasks, in order
    // Use original tasks to preserve original deadline format
    for (const normalizedTask of ready) {
      finalOrder.push(originalTasksMap.get(normalizedTask.id))
      unscheduled.delete(normalizedTask.id)
      // Remove this task from dependencies of all remaining tasks
      for (const [id, deps] of dependencyLeft) {
        if (deps.has(normalizedTask.id)) deps.delete(normalizedTask.id)
      }
    }
  }

  return finalOrder;
}


// Export error classes for use in tests
export { CircularDependencyError, InvalidDependencyError, InvalidPriorityError }

