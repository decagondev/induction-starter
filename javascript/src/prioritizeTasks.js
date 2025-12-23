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
 * @param {Date | string} deadline - Deadline as Date object or ISO string
 * @returns {Date} Parsed Date object
 * @throws {Error} If date cannot be parsed
 */
function parseDeadline(deadline) {
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
      deadline: parseDeadline(task.deadline),
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

  // Normalize tasks (parse deadlines)
  const normalizedTasks = normalizeTasks(tasks)

  // Detect circular dependencies
  detectCircularDependencies(normalizedTasks)

  // TODO: Implement the prioritization algorithm
  //
  // Steps to implement:
  // 1. Perform topological sort to handle dependencies

  // Kahn's algorithm for topological sort
  const inDegree = new Map()
  const dependencyMap = new Map() // taskId -> Set of dependents (reverse edges)

  
  //    - Tasks with no dependencies come first
  //    - Then tasks whose dependencies are already in the result
  // 2. Within each dependency level, sort by:
  //    - Priority (descending: 5 is highest)
  //    - Deadline (ascending: earlier deadlines first)
  //    - Estimated hours (ascending: lower effort first)
  //
  // Hint: You can use a queue-based approach or recursive DFS for topological sort
  // Hint: After topological sort, you may need to do a stable sort by priority/deadline/effort

  // Placeholder: Return tasks as-is (this will fail tests)
  // Replace this with your implementation
  return tasks
}

// Export error classes for use in tests
export { CircularDependencyError, InvalidDependencyError, InvalidPriorityError }

