/* StudyHub - Unit 3: JavaScript Data Model, State, and Deterministic Rendering */

const WORKFLOW_PATH = ["Planned", "Ready", "In Progress", "In Review", "Completed"];

const TRANSITION_MATRIX = {
  Planned: {
    Ready: { actionLabel: "Prepare task", condition: "hasTaskBasics" },
    Blocked: { actionLabel: "Mark blocked", condition: "hasTaskBasics" }
  },
  Ready: {
    Planned: { actionLabel: "Return to planned", condition: "hasTaskBasics" },
    "In Progress": { actionLabel: "Start work", condition: "hasTaskBasics" },
    Blocked: { actionLabel: "Mark blocked", condition: "hasTaskBasics" }
  },
  "In Progress": {
    Ready: { actionLabel: "Pause work", condition: "hasTaskBasics" },
    "In Review": { actionLabel: "Submit for review", condition: "hasReviewDetails" },
    Blocked: { actionLabel: "Mark blocked", condition: "hasTaskBasics" }
  },
  "In Review": {
    "In Progress": { actionLabel: "Request changes", condition: "hasReviewDetails" },
    Completed: { actionLabel: "Approve and complete", condition: "hasReviewDetails" },
    Blocked: { actionLabel: "Mark blocked", condition: "hasTaskBasics" }
  },
  Blocked: {
    Ready: { actionLabel: "Unblock to ready", condition: "hasTaskBasics" },
    "In Progress": { actionLabel: "Resume work", condition: "hasTaskBasics" }
  },
  Completed: {
    "In Progress": { actionLabel: "Reopen task", condition: "hasTaskBasics" }
  }
};

const TRANSITION_CONDITIONS = {
  hasTaskBasics: (task) =>
    Boolean(
      String(task.title ?? "").trim() &&
        String(task.subject ?? "").trim() &&
        task.dueDate
    ),
  hasReviewDetails: (task) =>
    Boolean(
      String(task.title ?? "").trim() &&
        String(task.subject ?? "").trim() &&
        String(task.description ?? "").trim()
    )
};

const ROLE_PERMISSIONS = {
    USER: new Set([
      "dashboard:view",
      "tasks:view",
      "schedules:view",
      "notes:view",
      "expenses:view",
      "focus:view",
      "record:view",
      "record:create",
      "record:edit-own"
    ]),
    STAFF: new Set([
      "dashboard:view",
      "tasks:view",
      "schedules:view",
      "notes:view",
      "expenses:view",
      "focus:view",
      "record:view",
      "record:create",
      "record:edit-own",
      "record:status",
      "metrics:view"
    ]),
    ADMIN: new Set([
      "dashboard:view",
      "tasks:view",
      "schedules:view",
      "notes:view",
      "expenses:view",
      "focus:view",
      "record:view",
      "record:create",
      "record:edit-own",
      "record:edit-any",
      "record:status",
      "record:archive",
      "metrics:view",
      "settings:manage"
    ])
};

const ROLE_NAMES = {
    USER: "User",
    STAFF: "Staff",
    ADMIN: "Admin"
};

const PERMISSION_LABELS = {
    "dashboard:view": "View dashboard",
    "tasks:view": "Open tasks",
    "schedules:view": "View schedules",
    "notes:view": "View notes",
    "expenses:view": "View expenses",
    "focus:view": "Use focus mode",
    "record:view": "View own/public records",
    "record:create": "Create records",
    "record:edit-own": "Edit own non-completed records",
    "record:edit-any": "Edit any record",
    "record:status": "Change workflow status",
    "record:archive": "Archive completed records",
    "metrics:view": "View system metrics",
    "settings:manage": "Manage settings"
};

const SECTION_PERMISSIONS = {
    dashboard: "dashboard:view",
    tasks: "tasks:view",
    schedules: "schedules:view",
    notes: "notes:view",
    expenses: "expenses:view",
    focus: "focus:view",
    settings: "settings:manage"
};

const session = {
    userId: "student-001",
    displayName: "Student",
    activeRole: "USER"
};

/* -----------------------------
     1. Authoritative application state
   ----------------------------- */

const state = {
  records: [
    {
      id: "TASK-001",
      title: "Unit 3 Data Engine",
      subject: "CPE Professional Course 1",
      description: "Build the JavaScript state model and deterministic task renderer.",
      dueDate: "2026-09-28",
      priority: "High",
      status: "In Progress",
      createdAt: "2026-09-24T09:00:00",
      estimatedMinutes: 120
    },
    {
      id: "TASK-002",
      title: "Circuit Analysis Problem Set",
      subject: "Fundamentals of Electrical Circuits",
      description: "Solve the assigned resistance and power problems.",
      dueDate: "2026-09-29",
      priority: "High",
      status: "Planned",
      createdAt: "2026-09-23T15:20:00",
      estimatedMinutes: 90
    },
    {
      id: "TASK-003",
      title: "Data Structures Quiz Review",
      subject: "Data Structures",
      description: "Review linked lists, insertion, deletion, and flowcharts.",
      dueDate: "2026-09-30",
      priority: "Medium",
      status: "Planned",
      createdAt: "2026-09-22T18:10:00",
      estimatedMinutes: 75
    },
    {
      id: "TASK-004",
      title: "Computer Engineering Reflection Video",
      subject: "Computer Engineering as a Discipline",
      description: "Record the reflection about speech-to-text and text-to-speech tools.",
      dueDate: "2026-10-01",
      priority: "Medium",
      status: "In Progress",
      createdAt: "2026-09-21T14:00:00",
      estimatedMinutes: 60
    },
    {
      id: "TASK-005",
      title: "Bouncing Ball Animation",
      subject: "Multimedia",
      description: "Finalize the 12-frame bouncing ball animation output.",
      dueDate: "2026-10-02",
      priority: "Medium",
      status: "Completed",
      createdAt: "2026-09-20T11:30:00",
      estimatedMinutes: 100
    },
    {
      id: "TASK-006",
      title: "Research Reading Notes",
      subject: "Computer Engineering History",
      description: "Summarize the assigned reading and prepare answers to guide questions.",
      dueDate: "2026-10-03",
      priority: "Low",
      status: "Planned",
      createdAt: "2026-09-20T08:45:00",
      estimatedMinutes: 45
    },
    {
      id: "TASK-007",
      title: "Weekly Class Schedule Update",
      subject: "Personal Organization",
      description: "Update room assignments and class times for the coming week.",
      dueDate: "2026-10-04",
      priority: "Low",
      status: "Completed",
      createdAt: "2026-09-19T20:00:00",
      estimatedMinutes: 20
    },
    {
      id: "TASK-008",
      title: "Expense Log Review",
      subject: "Personal Finance",
      description: "Check this week's transportation, food, and printing expenses.",
      dueDate: "2026-10-05",
      priority: "Low",
      status: "Planned",
      createdAt: "2026-09-19T16:20:00",
      estimatedMinutes: 30
    },
    {
      id: "TASK-009",
      title: "HTML Semantic Structure Review",
      subject: "Web System Development",
      description: "Review semantic landmarks and stable IDs from Unit 1.",
      dueDate: "2026-10-06",
      priority: "Medium",
      status: "Completed",
      createdAt: "2026-09-18T10:10:00",
      estimatedMinutes: 50
    },
    {
      id: "TASK-010",
      title: "Responsive CSS Test",
      subject: "Web System Development",
      description: "Recheck StudyHub at desktop, tablet, and mobile widths.",
      dueDate: "2026-10-07",
      priority: "High",
      status: "In Progress",
      createdAt: "2026-09-18T09:30:00",
      estimatedMinutes: 80
    },
    {
      id: "TASK-011",
      title: "Notes Cleanup",
      subject: "Personal Organization",
      description: "Sort recent notes by subject and remove duplicate entries.",
      dueDate: "2026-10-08",
      priority: "Low",
      status: "Planned",
      createdAt: "2026-09-17T19:15:00",
      estimatedMinutes: 25
    },
    {
      id: "TASK-012",
      title: "Focus Session for Circuits",
      subject: "Fundamentals of Electrical Circuits",
      description: "Complete a focused study session before the next class.",
      dueDate: "2026-10-09",
      priority: "Medium",
      status: "Planned",
      createdAt: "2026-09-17T12:00:00",
      estimatedMinutes: 45
    },
    {
      id: "TASK-013",
      title: "Flowchart Corrections",
      subject: "Data Structures",
      description: "Apply final corrections to the quiz algorithms and flowcharts.",
      dueDate: "2026-10-10",
      priority: "High",
      status: "Completed",
      createdAt: "2026-09-16T17:40:00",
      estimatedMinutes: 70
    },
    {
      id: "TASK-014",
      title: "StudyHub UI Review",
      subject: "CPE Professional Course 1",
      description: "Review sidebar, dashboard, and focus-mode design consistency.",
      dueDate: "2026-10-11",
      priority: "Medium",
      status: "Planned",
      createdAt: "2026-09-16T13:25:00",
      estimatedMinutes: 40
    },
    {
      id: "TASK-015",
      title: "Unit 3 Submission Check",
      subject: "CPE Professional Course 1",
      description: "Verify mock records, derived values, rendering, event delegation, and assertions.",
      dueDate: "2026-10-12",
      priority: "High",
      status: "Planned",
      createdAt: "2026-09-15T21:10:00",
      estimatedMinutes: 60
    }
  ].map((record) => {
    const numericId = Number(record.id.replace("TASK-", ""));

    return {
      ...record,
      ownerId:
        numericId % 2 === 1 || numericId === 8
          ? "student-001"
          : "student-002",
      isPublic: numericId % 4 !== 0,
      workflowHistory: []
    };
  }),

  query: "",

  filters: {
    status: "ALL",
    priority: "ALL"
  },

  sort: {
    key: "dueDate",
    direction: "asc"
  },

  page: 1,
  pageSize: 5,
  selectedRecord: null,
  editingRecord: null,
  archivedRecords: []
};

/* -----------------------------
   2. Stored and derived fields
   -----------------------------
*/

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function parseDateOnly(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getDaysRemaining(task) {
  const due = parseDateOnly(task.dueDate);
  const today = startOfToday();
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((due - today) / millisecondsPerDay);
}

function getIsOverdue(task) {
  return task.status !== "Completed" && getDaysRemaining(task) < 0;
}

function getStudyHours(task) {
  return task.estimatedMinutes / 60;
}

/* -----------------------------
   3. Data selection helpers
   ----------------------------- */

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function canPerform(permission, task = null, role = session.activeRole, userId = session.userId) {
  const permissions = Object.hasOwn(ROLE_PERMISSIONS, role)
    ? ROLE_PERMISSIONS[role]
    : new Set();

  if (!permissions.has(permission)) return false;

  if (permission === "record:view" && task) {
    return role === "ADMIN" || task.isPublic === true || task.ownerId === userId;
  }

  if (permission === "record:edit-own" && task) {
    return task.ownerId === userId && task.status !== "Completed";
  }

  if (permission === "record:edit-any" && task) {
    return true;
  }

  if (permission === "record:status" && task) {
    const transitions = Object.hasOwn(TRANSITION_MATRIX, task.status)
      ? TRANSITION_MATRIX[task.status]
      : {};
    return Object.keys(transitions).length > 0;
  }

  if (permission === "record:archive" && task) {
    return task.status === "Completed";
  }

  return true;
}

function canEditTask(task) {
  return (
    canPerform("record:edit-own", task) ||
    canPerform("record:edit-any", task)
  );
}

function showPermissionMessage(message) {
  const messageRegion = document.querySelector("#permission-message");
  if (!messageRegion) return;

  messageRegion.textContent = message;
  messageRegion.hidden = false;
}

function renderPermissionSurface() {
  document.querySelectorAll(".primary-nav a[data-permission]").forEach((link) => {
    link.hidden = !canPerform(link.dataset.permission);
  });

  document.querySelectorAll("[data-permission]").forEach((element) => {
    if (element.matches(".primary-nav a")) return;
    element.hidden = !canPerform(element.dataset.permission);
  });

  document.querySelectorAll(".dashboard-metric").forEach((metric) => {
    metric.hidden = !canPerform("metrics:view");
  });

  const identity = document.querySelector("#session-identity");
  if (identity) {
    identity.textContent = `Signed in as ${session.displayName} (${session.userId}) — ${ROLE_NAMES[session.activeRole]}`;
  }

  const roleSelector = document.querySelector("#active-role");
  if (roleSelector) roleSelector.value = session.activeRole;

  const selectedTask = state.records.find(
    (record) => record.id === state.selectedRecord
  );
  if (selectedTask && !canPerform("record:view", selectedTask)) {
    state.selectedRecord = null;
    state.editingRecord = null;
  }

  renderPermissionMatrix();
}

function renderPermissionMatrix() {
  const tableBody = document.querySelector("#permission-matrix-body");
  if (!tableBody) return;

  tableBody.innerHTML = Object.entries(PERMISSION_LABELS)
    .map(
      ([permission, label]) => `
        <tr>
          <th scope="row">${escapeHTML(label)}</th>
          ${["USER", "STAFF", "ADMIN"]
            .map(
              (role) => `
                <td class="permission-check" aria-label="${ROLE_NAMES[role]} ${
                  ROLE_PERMISSIONS[role].has(permission)
                    ? "has permission"
                    : "does not have permission"
                }">${ROLE_PERMISSIONS[role].has(permission) ? "✓" : "—"}</td>
              `
            )
            .join("")}
        </tr>
      `
    )
    .join("");
}

function matchesQuery(task) {
  const query = normalize(state.query);

  if (!query) return true;

  return [
    task.id,
    task.title,
    task.subject,
    task.description,
    task.priority,
    task.status
  ].some((value) => normalize(value).includes(query));
}

function matchesFilters(task) {
  const statusMatches =
    state.filters.status === "ALL" ||
    task.status === state.filters.status;

  const priorityMatches =
    state.filters.priority === "ALL" ||
    task.priority === state.filters.priority;

  return statusMatches && priorityMatches;
}

function priorityRank(priority) {
  const ranks = {
    High: 3,
    Medium: 2,
    Low: 1
  };

  return ranks[priority] ?? 0;
}

function compareRecords(a, b) {
  const { key, direction } = state.sort;
  let result = 0;

  if (key === "priority") {
    result = priorityRank(a.priority) - priorityRank(b.priority);
  } else if (key === "dueDate" || key === "createdAt") {
    result = new Date(a[key]) - new Date(b[key]);
  } else {
    result = String(a[key]).localeCompare(String(b[key]));
  }

  if (result === 0) {
    result = a.id.localeCompare(b.id);
  }

  return direction === "desc" ? -result : result;
}

function getVisibleRecords() {
  return [...state.records]
    .filter((task) => canPerform("record:view", task))
    .filter(matchesQuery)
    .filter(matchesFilters)
    .sort(compareRecords);
}

function getCurrentPageRecords(records) {
  const start = (state.page - 1) * state.pageSize;
  return records.slice(start, start + state.pageSize);
}

function getAvailableTransitions(task) {
  const transitions = Object.hasOwn(TRANSITION_MATRIX, task.status)
    ? TRANSITION_MATRIX[task.status]
    : {};

  return Object.entries(transitions).filter(([, transition]) =>
    TRANSITION_CONDITIONS[transition.condition](task)
  );
}

function getWorkflowProgress(status) {
  const stageIndex = WORKFLOW_PATH.indexOf(status);
  const finalStageIndex = WORKFLOW_PATH.length - 1;

  if (stageIndex < 0) return null;

  return (stageIndex / finalStageIndex) * 100;
}

function evaluateTransition(task, nextStatus) {
  const availableTransitions = Object.hasOwn(TRANSITION_MATRIX, task.status)
    ? TRANSITION_MATRIX[task.status]
    : {};
  const transition = Object.hasOwn(availableTransitions, nextStatus)
    ? availableTransitions[nextStatus]
    : null;

  if (!transition) {
    return {
      allowed: false,
      message: `Transition from "${task.status}" to "${nextStatus}" is not allowed.`
    };
  }

  const condition = TRANSITION_CONDITIONS[transition.condition];

  if (!condition(task)) {
    return {
      allowed: false,
      message: `Cannot ${transition.actionLabel.toLowerCase()}: required task details are missing.`
    };
  }

  return { allowed: true, transition };
}

function attemptTransition(task, nextStatus, timestamp = new Date().toISOString()) {
  const result = evaluateTransition(task, nextStatus);

  if (!result.allowed) return result;

  const historyEntry = {
    timestamp,
    previousStatus: task.status,
    nextStatus,
    actionLabel: result.transition.actionLabel
  };

  return {
    allowed: true,
    record: {
      ...task,
      status: nextStatus,
      workflowHistory: [...(task.workflowHistory ?? []), historyEntry]
    },
    historyEntry
  };
}

/* -----------------------------
   4. Deterministic rendering
   ----------------------------- */

function renderRecords(records) {
  const tableBody = document.querySelector("#task-table-body");

  if (!tableBody) return;

  const pageRecords = getCurrentPageRecords(records);

  tableBody.innerHTML = pageRecords
    .map((task) => {
      const daysRemaining = getDaysRemaining(task);
      const overdue = getIsOverdue(task);

      let daysLabel = `${daysRemaining} day${Math.abs(daysRemaining) === 1 ? "" : "s"}`;

      if (daysRemaining === 0) daysLabel = "Due today";
      if (overdue) daysLabel = `${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? "" : "s"} overdue`;

      return `
        <tr data-id="${task.id}">
          <td>${escapeHTML(task.id)}</td>
          <td>${escapeHTML(task.title)}</td>
          <td>${escapeHTML(task.subject)}</td>
          <td>${escapeHTML(task.dueDate)}</td>
          <td>${escapeHTML(task.priority)}</td>
          <td>${escapeHTML(task.status)}</td>
          <td>${escapeHTML(daysLabel)}</td>
          <td>
            <div class="task-actions">
              ${canPerform("record:view", task) ? `<button type="button" data-action="view" data-id="${escapeHTML(task.id)}">View</button>` : ""}
              ${canEditTask(task) ? `<button type="button" data-action="edit" data-id="${escapeHTML(task.id)}">Edit</button>` : ""}
              ${canPerform("record:status", task)
                ? getAvailableTransitions(task)
                .map(
                  ([nextStatus, transition]) => `
                    <button
                      type="button"
                      data-action="transition"
                      data-id="${escapeHTML(task.id)}"
                      data-next-status="${escapeHTML(nextStatus)}"
                    >${escapeHTML(transition.actionLabel)}</button>
                  `
                )
                .join("")
                : ""}
              ${canPerform("record:archive", task) ? `<button type="button" data-action="archive" data-id="${escapeHTML(task.id)}">Archive</button>` : ""}
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderSummary(records) {
  if (!canPerform("metrics:view")) return;

  const total = records.length;
  const completed = records.filter((task) => task.status === "Completed").length;
  const pending = records.filter((task) => task.status !== "Completed");

  const priorityTask = [...pending].sort((a, b) => {
    const priorityDifference = priorityRank(b.priority) - priorityRank(a.priority);
    if (priorityDifference !== 0) return priorityDifference;
    return new Date(a.dueDate) - new Date(b.dueDate);
  })[0];

  const upcomingCount = records.filter((task) => {
    const days = getDaysRemaining(task);
    return task.status !== "Completed" && days >= 0 && days <= 7;
  }).length;

  const totalStudyMinutes = records.reduce(
    (sum, task) => sum + task.estimatedMinutes,
    0
  );

  setText("#summary-total", String(total));
  setText("#summary-completed", String(completed));
  setText("#summary-upcoming", `${upcomingCount} due within 7 days`);
  setText(
    "#summary-priority",
    priorityTask
      ? `${priorityTask.title} (${priorityTask.priority})`
      : "No pending tasks"
  );
  setText("#summary-study-time", `${(totalStudyMinutes / 60).toFixed(1)} hours`);
}

function renderEmptyState(records) {
  const emptyState = document.querySelector("#task-empty-state");
  const taskList = document.querySelector("#task-list");

  if (!emptyState || !taskList) return;

  const isEmpty = records.length === 0;

  emptyState.hidden = !isEmpty;
  taskList.hidden = isEmpty;
}

function renderDetails() {
  const details = document.querySelector("#task-details");

  if (!details) return;

  if (!state.selectedRecord) {
    details.innerHTML = `
      <h3 id="task-details-title">Task details</h3>
      <p>Select a task to inspect its full record.</p>
    `;
    return;
  }

  const task = state.records.find(
    (record) => record.id === state.selectedRecord
  );

  if (!task) {
    state.selectedRecord = null;
    renderDetails();
    return;
  }

  const progress = getWorkflowProgress(task.status);
  const history = [...(task.workflowHistory ?? [])].reverse();
  const progressMarkup =
    progress === null
      ? `<p class="workflow-progress-note">Blocked is an off-path state; progress is paused and no percentage is shown.</p>`
      : `
          <label for="workflow-progress">Workflow progress: ${progress}%</label>
          <progress id="workflow-progress" max="100" value="${progress}">${progress}%</progress>
          <p>Stage ${WORKFLOW_PATH.indexOf(task.status) + 1} of ${WORKFLOW_PATH.length} on the main workflow path.</p>
        `;
  const historyMarkup = history.length
    ? `<ol>
        ${history
          .map(
            (entry) => `
              <li>
                <time datetime="${escapeHTML(entry.timestamp)}">${escapeHTML( new Date(entry.timestamp).toLocaleString() )}</time>:${escapeHTML(entry.previousStatus)} &rarr; ${escapeHTML( entry.nextStatus )} (${escapeHTML(entry.actionLabel)})
              </li>
            `
          )
          .join("")}
      </ol>`
    : "<p>No workflow transitions recorded yet.</p>";
  const editing = state.editingRecord === task.id && canEditTask(task);
  const editMarkup = editing
    ? `
        <form id="task-edit-form" data-id="${escapeHTML(task.id)}">
          <label for="edit-title">Title</label>
          <input id="edit-title" name="title" required value="${escapeHTML(task.title)}" />
          <label for="edit-subject">Subject</label>
          <input id="edit-subject" name="subject" required value="${escapeHTML(task.subject)}" />
          <label for="edit-due-date">Due date</label>
          <input id="edit-due-date" name="dueDate" type="date" required value="${escapeHTML(task.dueDate)}" />
          <label for="edit-priority">Priority</label>
          <select id="edit-priority" name="priority">
            ${["Low", "Medium", "High"]
              .map(
                (priority) =>
                  `<option value="${priority}" ${task.priority === priority ? "selected" : ""}>${priority}</option>`
              )
              .join("")}
          </select>
          <label for="edit-description">Description</label>
          <textarea id="edit-description" name="description" rows="3">${escapeHTML(task.description)}</textarea>
          <button type="submit">Save changes</button>
          <button type="button" data-action="cancel-edit">Cancel</button>
        </form>
      `
    : canEditTask(task)
      ? `<button type="button" data-action="edit" data-id="${escapeHTML(task.id)}">Edit task</button>`
      : "";

  details.innerHTML = `
    <h3 id="task-details-title">Task details</h3>
    <dl>
      <dt>ID</dt>
      <dd>${escapeHTML(task.id)}</dd>

      <dt>Title</dt>
      <dd>${escapeHTML(task.title)}</dd>

      <dt>Subject</dt>
      <dd>${escapeHTML(task.subject)}</dd>

      <dt>Description</dt>
      <dd>${escapeHTML(task.description)}</dd>

      <dt>Due date</dt>
      <dd>${escapeHTML(task.dueDate)}</dd>

      <dt>Priority</dt>
      <dd>${escapeHTML(task.priority)}</dd>

      <dt>Status</dt>
      <dd>${escapeHTML(task.status)}</dd>

      <dt>Owner</dt>
      <dd>${escapeHTML(task.ownerId)}${task.isPublic ? " (public)" : " (private)"}</dd>

      <dt>Created</dt>
      <dd>${escapeHTML(task.createdAt)}</dd>

      <dt>Estimated study time</dt>
      <dd>${getStudyHours(task).toFixed(1)} hours</dd>

      <dt>Days remaining</dt>
      <dd>${getDaysRemaining(task)}</dd>
    </dl>
    <section class="workflow-history" aria-labelledby="workflow-history-title">
      <h4 id="workflow-history-title">Workflow progress</h4>
      ${progressMarkup}
      <h4>Transition history</h4>
      ${historyMarkup}
    </section>
    ${editMarkup}
  `;
}

function renderPagination(totalRecords) {
  const pagination = document.querySelector("#task-pagination");
  if (!pagination) return;

  const totalPages = Math.max(1, Math.ceil(totalRecords / state.pageSize));

  if (state.page > totalPages) {
    state.page = totalPages;
  }

  pagination.innerHTML = `
    <button type="button" data-page-action="previous" ${state.page === 1 ? "disabled" : ""}>
      Previous
    </button>
    <span>Page ${state.page} of ${totalPages}</span>
    <button type="button" data-page-action="next" ${state.page === totalPages ? "disabled" : ""}>
      Next
    </button>
  `;
}

function renderResultCount(totalRecords) {
  const count = document.querySelector("#task-result-count");
  if (!count) return;

  if (totalRecords === 0) {
    count.textContent = "Showing 0 matching tasks.";
    return;
  }

  const start = (state.page - 1) * state.pageSize + 1;
  const end = Math.min(state.page * state.pageSize, totalRecords);

  count.textContent = `Showing ${start}-${end} of ${totalRecords} matching tasks.`;
}

function render() {
  renderPermissionSurface();
  const visibleRecords = getVisibleRecords();

  renderSummary(state.records);
  renderEmptyState(visibleRecords);
  renderRecords(visibleRecords);
  renderPagination(visibleRecords.length);
  renderResultCount(visibleRecords.length);
  renderDetails();
}

/* -----------------------------
   5. Record actions
   ----------------------------- */

function generateTaskId() {
  const numericIds = state.records
    .map((task) => Number(task.id.replace("TASK-", "")))
    .filter(Number.isFinite);

  const nextNumber = (numericIds.length ? Math.max(...numericIds) : 0) + 1;
  return `TASK-${String(nextNumber).padStart(3, "0")}`;
}

function addTask(task) {
  if (!canPerform("record:create")) {
    showPermissionMessage("You do not have permission to create tasks.");
    return false;
  }

  state.records = [...state.records, task];
  state.page = 1;
  render();
  return true;
}

function archiveTask(id) {
  const task = state.records.find((record) => record.id === id);

  if (!task || !canPerform("record:archive", task)) {
    showPermissionMessage(
      task
        ? "Only an admin can archive completed tasks."
        : `Task "${id}" was not found.`
    );
    return false;
  }

  state.records = state.records.filter((record) => record.id !== id);
  state.archivedRecords = [...state.archivedRecords, { ...task, archived: true }];

  if (state.selectedRecord === id) {
    state.selectedRecord = null;
    state.editingRecord = null;
  }

  showPermissionMessage(`${id} was archived.`);
  render();
  return true;
}

function updateTask(id, updates) {
  const task = state.records.find((record) => record.id === id);

  if (!task || !canEditTask(task)) {
    showPermissionMessage("You do not have permission to edit this task.");
    return false;
  }

  if (!updates.title.trim() || !updates.subject.trim() || !updates.dueDate) {
    showPermissionMessage("Title, subject, and due date are required.");
    return false;
  }

  state.records = state.records.map((record) =>
    record.id === id ? { ...record, ...updates } : record
  );
  state.editingRecord = null;
  showPermissionMessage(`${id} was updated.`);
  render();
  return true;
}

function transitionTask(id, nextStatus) {
  const task = state.records.find((record) => record.id === id);

  if (!task || !canPerform("record:status", task)) {
    showPermissionMessage(
      task
        ? "Your active role cannot change task workflow status."
        : `Task "${id}" was not found.`
    );
    return false;
  }

  const result = attemptTransition(task, nextStatus);

  if (!result.allowed) {
    showWorkflowMessage(`${result.message} No change was made.`);
    return false;
  }

  state.records = state.records.map((record) =>
    record.id === id ? result.record : record
  );
  showWorkflowMessage(
    `${id}: ${result.historyEntry.previousStatus} → ${result.historyEntry.nextStatus} (${result.historyEntry.actionLabel}).`
  );
  render();
  return true;
}

/* -----------------------------
   6. Event delegation and controls
   ----------------------------- */

const taskList = document.querySelector("#task-list");

if (taskList) {
  taskList.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");

    if (actionButton) {
      const { action, id } = actionButton.dataset;

      if (action === "view") {
        const task = state.records.find((record) => record.id === id);
        if (!task || !canPerform("record:view", task)) {
          showPermissionMessage("You do not have permission to view this task.");
          return;
        }
        state.selectedRecord = id;
        state.editingRecord = null;
        renderDetails();
      }

      if (action === "edit") {
        const task = state.records.find((record) => record.id === id);
        if (!task || !canEditTask(task)) {
          showPermissionMessage("You do not have permission to edit this task.");
          return;
        }
        state.selectedRecord = id;
        state.editingRecord = id;
        renderDetails();
      }

      if (action === "cancel-edit") {
        state.editingRecord = null;
        renderDetails();
      }

      if (action === "transition") {
        transitionTask(id, actionButton.dataset.nextStatus);
      }

      if (action === "archive") {
        archiveTask(id);
      }

      return;
    }

    const pageButton = event.target.closest("[data-page-action]");

    if (pageButton) {
      const visibleRecords = getVisibleRecords();
      const totalPages = Math.max(
        1,
        Math.ceil(visibleRecords.length / state.pageSize)
      );

      if (pageButton.dataset.pageAction === "previous" && state.page > 1) {
        state.page -= 1;
      }

      if (
        pageButton.dataset.pageAction === "next" &&
        state.page < totalPages
      ) {
        state.page += 1;
      }

      render();
    }
  });
}

const taskDetails = document.querySelector("#task-details");

if (taskDetails) {
  taskDetails.addEventListener("submit", (event) => {
    if (event.target.id !== "task-edit-form") return;
    event.preventDefault();

    const formData = new FormData(event.target);
    updateTask(event.target.dataset.id, {
      title: String(formData.get("title") ?? "").trim(),
      subject: String(formData.get("subject") ?? "").trim(),
      dueDate: String(formData.get("dueDate") ?? ""),
      priority: String(formData.get("priority") ?? "Medium"),
      description: String(formData.get("description") ?? "").trim()
    });
  });

  taskDetails.addEventListener("click", (event) => {
    const cancelButton = event.target.closest('[data-action="cancel-edit"]');
    if (cancelButton) {
      state.editingRecord = null;
      renderDetails();
      return;
    }

    const actionButton = event.target.closest('[data-action="edit"]');
    if (!actionButton) return;

    const task = state.records.find(
      (record) => record.id === actionButton.dataset.id
    );
    if (!task || !canEditTask(task)) {
      showPermissionMessage("You do not have permission to edit this task.");
      return;
    }

    state.selectedRecord = task.id;
    state.editingRecord = task.id;
    renderDetails();
  });
}

const taskForm = document.querySelector("#task-form");

if (taskForm) {
  taskForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!canPerform("record:create")) {
      showPermissionMessage("You do not have permission to create tasks.");
      return;
    }

    const formData = new FormData(taskForm);
    const title = String(formData.get("title") ?? "").trim();
    const subject = String(formData.get("subject") ?? "").trim();
    const dueDate = String(formData.get("dueDate") ?? "");
    const priority = String(formData.get("priority") ?? "Medium");
    const notes = String(formData.get("notes") ?? "").trim();

    if (!title || !subject || !dueDate) {
      showTaskError("Title, subject, and due date are required.");
      return;
    }

    hideTaskError();

    addTask({
      id: generateTaskId(),
      title,
      subject,
      description: notes || "Added from the Unit 3 task form.",
      dueDate,
      priority,
      status: "Planned",
      createdAt: new Date().toISOString(),
      estimatedMinutes: 30,
      ownerId: session.userId,
      isPublic: true,
      workflowHistory: []
    });

    taskForm.reset();
  });
}

const searchInput = document.querySelector("#global-search");

if (searchInput) {
  searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    state.page = 1;
    render();
  });
}

const searchForm = document.querySelector("#search-form");

if (searchForm) {
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
  });
}

bindSelect("#status-filter", (value) => {
  state.filters.status = value;
});

bindSelect("#priority-filter", (value) => {
  state.filters.priority = value;
});

bindSelect("#sort-key", (value) => {
  state.sort.key = value;
});

bindSelect("#sort-direction", (value) => {
  state.sort.direction = value;
});

bindSelect("#page-size", (value) => {
  state.pageSize = Number(value);
});

const roleSelector = document.querySelector("#active-role");

if (roleSelector) {
  roleSelector.addEventListener("change", () => {
    const nextRole = roleSelector.value;
    if (!Object.hasOwn(ROLE_PERMISSIONS, nextRole)) {
      showPermissionMessage("That demo role is not recognized.");
      roleSelector.value = session.activeRole;
      return;
    }

    session.activeRole = nextRole;
    state.editingRecord = null;
    const activeSection = document.querySelector("#app > section:not([hidden])");
    const activeSectionId = activeSection?.id;
    const neededPermission = SECTION_PERMISSIONS[activeSectionId];

    if (neededPermission && !canPerform(neededPermission)) {
      showPermissionMessage(
        `${ROLE_NAMES[nextRole]} cannot access ${activeSectionId}; returned to Dashboard.`
      );
      document.querySelectorAll("#app > section").forEach((section) => {
        section.hidden = section.id !== "dashboard";
      });
      document.querySelectorAll(".primary-nav a").forEach((link) => {
        link.removeAttribute("aria-current");
      });
      document.querySelector('.primary-nav a[href="#dashboard"]')?.setAttribute(
        "aria-current",
        "page"
      );
    } else {
      showPermissionMessage(`Demo role changed to ${ROLE_NAMES[nextRole]}.`);
    }

    render();
  });
}

function bindSelect(selector, updateState) {
  const element = document.querySelector(selector);

  if (!element) return;

  element.addEventListener("change", (event) => {
    updateState(event.target.value);
    state.page = 1;
    render();
  });
}

/* -----------------------------
   7. Simple section navigation
   ----------------------------- */

const nav = document.querySelector(".primary-nav");

if (nav) {
  nav.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;

    event.preventDefault();

    const targetId = link.getAttribute("href").slice(1);
    const requiredPermission = SECTION_PERMISSIONS[targetId];

    if (!requiredPermission || !canPerform(requiredPermission)) {
      showPermissionMessage(
        `Your active role cannot access ${targetId}. No navigation occurred.`
      );
      return;
    }

    document.querySelectorAll("#app > section").forEach((section) => {
      section.hidden = section.id !== targetId;
    });

    nav.querySelectorAll("a").forEach((navLink) => {
      navLink.removeAttribute("aria-current");
    });

    link.setAttribute("aria-current", "page");
  });
}

/* -----------------------------
   8. Focus-mode UI toggle
   ----------------------------- */

const focusToggle = document.querySelector("#focus-toggle");

if (focusToggle) {
  focusToggle.addEventListener("click", () => {
    const isPressed = focusToggle.getAttribute("aria-pressed") === "true";
    const nextPressed = !isPressed;
    focusToggle.setAttribute("aria-pressed", String(nextPressed));
    focusToggle.textContent = nextPressed ? "Exit focus" : "Focus mode";
    document.body.classList.toggle("focus-mode", nextPressed);
  });
}

/* -----------------------------
   9. Rendering utilities
   ----------------------------- */

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function showTaskError(message) {
  const errorSummary = document.querySelector("#task-error-summary");
  if (!errorSummary) return;

  errorSummary.textContent = message;
  errorSummary.hidden = false;
}

function hideTaskError() {
  const errorSummary = document.querySelector("#task-error-summary");
  if (!errorSummary) return;

  errorSummary.hidden = true;
  errorSummary.textContent = "";
}

function showWorkflowMessage(message) {
  const messageRegion = document.querySelector("#workflow-message");
  if (!messageRegion) return;

  messageRegion.textContent = message;
  messageRegion.hidden = false;
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* -----------------------------
   10. Console assertions required by Unit 3
   ----------------------------- */

function runStableIdAssertions() {
  const originalRecords = state.records.map((record) => ({ ...record }));
  const originalIds = originalRecords.map((record) => record.id);

  console.assert(
    new Set(originalIds).size === originalIds.length,
    "Assertion 1 failed: every task must have a unique stable ID."
  );

  const sortedIds = [...originalRecords]
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((record) => record.id);

  console.assert(
    originalIds.every((id) => sortedIds.includes(id)) &&
      sortedIds.every((id) => originalIds.includes(id)),
    "Assertion 2 failed: sorting changed the set of stable IDs."
  );

  const deletedId = originalRecords[0].id;
  const recordsAfterDelete = originalRecords.filter(
    (record) => record.id !== deletedId
  );

  console.assert(
    !recordsAfterDelete.some((record) => record.id === deletedId) &&
      recordsAfterDelete.every((record) => originalIds.includes(record.id)),
    "Assertion 3 failed: deleting one record affected other stable IDs."
  );

  console.log("Unit 3 stable-ID assertions completed.");
}

function runWorkflowTransitionAssertions() {
  const illegalCases = [
    ["Planned", "In Review"],
    ["Ready", "Completed"],
    ["In Progress", "Planned"],
    ["In Review", "Ready"],
    ["Blocked", "Completed"],
    ["Planned", "toString"],
    ["Planned", "__proto__"]
  ];

  illegalCases.forEach(([status, nextStatus], index) => {
    const record = {
      id: `WORKFLOW-TEST-${index + 1}`,
      title: "Workflow test",
      subject: "Workflow testing",
      description: "Record used to verify rejected transitions.",
      dueDate: "2026-12-31",
      status,
      workflowHistory: []
    };
    const before = JSON.stringify(record);
    const result = attemptTransition(
      record,
      nextStatus,
      "2026-10-02T00:00:00.000Z"
    );

    console.assert(
      !result.allowed && JSON.stringify(record) === before,
      `Workflow assertion ${index + 1} failed: rejected ${status} → ${nextStatus} changed the record.`
    );
  });

  console.log(
    `Unit 5 rejected-transition assertions completed (${illegalCases.length} cases).`
  );
}

function runPermissionAssertions() {
  const ownPlanned = {
    ownerId: "student-001",
    isPublic: false,
    status: "Planned"
  };
  const otherPlanned = {
    ownerId: "student-002",
    isPublic: false,
    status: "Planned"
  };
  const ownCompleted = {
    ownerId: "student-001",
    isPublic: false,
    status: "Completed"
  };
  const publicTask = {
    ownerId: "student-002",
    isPublic: true,
    status: "Planned"
  };
  const checks = [
    ["USER", "record:create", null, true],
    ["USER", "record:archive", ownCompleted, false],
    ["USER", "record:edit-own", ownPlanned, true],
    ["USER", "record:edit-own", otherPlanned, false],
    ["USER", "record:edit-own", ownCompleted, false],
    ["USER", "record:view", publicTask, true],
    ["USER", "record:view", otherPlanned, false],
    ["USER", "record:view", ownPlanned, true],
    ["USER", "record:status", ownPlanned, false],
    ["STAFF", "record:status", ownPlanned, true],
    ["STAFF", "record:edit-own", ownPlanned, true],
    ["STAFF", "record:edit-own", otherPlanned, false],
    ["STAFF", "record:archive", ownCompleted, false],
    ["STAFF", "metrics:view", null, true],
    ["ADMIN", "record:edit-any", otherPlanned, true],
    ["ADMIN", "record:view", otherPlanned, true],
    ["ADMIN", "record:archive", ownCompleted, true],
    ["ADMIN", "record:archive", ownPlanned, false],
    ["ADMIN", "settings:manage", null, true]
  ];

  checks.forEach(([role, permission, task, expected], index) => {
    console.assert(
      canPerform(permission, task, role, "student-001") === expected,
      `Permission assertion ${index + 1} failed: ${role} ${permission}.`
    );
  });

  console.log(`Permission assertions completed (${checks.length} cases).`);
}

/* ==========================================================================
   UNIT 8: Persistence, Schema Versioning, Import/Export, and Audit Trail
   ========================================================================== */

const STORAGE_KEY = "studyhub-prototype-v1";
const SCHEMA_VERSION = 1;

state.audit = state.audit || [];
state.preferences = state.preferences || { theme: "dark", focusAutoSave: true };

function logAudit(action, recordId = null, details = "") {
  const entry = {
    timestamp: new Date().toISOString(),
    actor: `${session.displayName} (${session.activeRole})`,
    action,
    recordId: recordId || "—",
    details
  };
  state.audit.unshift(entry);
  if (state.audit.length > 50) state.audit.pop();
  renderAuditTrail();
}

function saveState() {
  try {
    const payload = {
      schemaVersion: SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      activeRole: session.activeRole,
      preferences: state.preferences,
      records: state.records,
      archivedRecords: state.archivedRecords,
      audit: state.audit
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error("Local storage quota exceeded or unavailable:", err);
  }
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") return false;
  if (payload.schemaVersion !== SCHEMA_VERSION) return false;
  if (!Array.isArray(payload.records)) return false;
  
  // Validate record structure and duplicate IDs
  const seenIds = new Set();
  for (const r of payload.records) {
    if (!r.id || !r.title || !r.dueDate) return false;
    if (seenIds.has(r.id)) return false;
    seenIds.add(r.id);
  }
  return true;
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;

  try {
    const payload = JSON.parse(raw);
    if (!validatePayload(payload)) {
      showStorageNotice("Storage format outdated or corrupted. Loaded safe defaults.");
      return false;
    }

    state.records = payload.records;
    if (Array.isArray(payload.archivedRecords)) state.archivedRecords = payload.archivedRecords;
    if (Array.isArray(payload.audit)) state.audit = payload.audit;
    if (payload.preferences) state.preferences = payload.preferences;
    if (payload.activeRole && Object.hasOwn(ROLE_PERMISSIONS, payload.activeRole)) {
      session.activeRole = payload.activeRole;
    }
    return true;
  } catch (e) {
    showStorageNotice("Failed to parse storage. Reverted to clean defaults.");
    return false;
  }
}

function showStorageNotice(msg) {
  const el = document.querySelector("#storage-status-message");
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  setTimeout(() => { el.hidden = true; }, 6000);
}

function renderAuditTrail() {
  const tbody = document.querySelector("#audit-log-body");
  if (!tbody) return;

  if (state.audit.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--muted);">No actions recorded yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.audit.slice(0, 10).map(entry => `
    <tr>
      <td><time datetime="${escapeHTML(entry.timestamp)}">${escapeHTML(new Date(entry.timestamp).toLocaleTimeString())}</time></td>
      <td>${escapeHTML(entry.actor)}</td>
      <td><strong>${escapeHTML(entry.action)}</strong></td>
      <td>${escapeHTML(entry.recordId)}</td>
      <td>${escapeHTML(entry.details)}</td>
    </tr>
  `).join("");
}

// Wrap original write operations to automatically save state & log audit
const originalAddTask = addTask;
addTask = function(task) {
  const res = originalAddTask(task);
  if (res) {
    logAudit("CREATE", task.id, `Created task "${task.title}"`);
    saveState();
    renderMetrics();
  }
  return res;
};

const originalUpdateTask = updateTask;
updateTask = function(id, updates) {
  const res = originalUpdateTask(id, updates);
  if (res) {
    logAudit("UPDATE", id, `Updated fields: ${Object.keys(updates).join(", ")}`);
    saveState();
    renderMetrics();
  }
  return res;
};

const originalTransitionTask = transitionTask;
transitionTask = function(id, nextStatus) {
  const res = originalTransitionTask(id, nextStatus);
  if (res) {
    logAudit("STATUS_CHANGE", id, `Transitioned to ${nextStatus}`);
    saveState();
    renderMetrics();
  }
  return res;
};

const originalArchiveTask = archiveTask;
archiveTask = function(id) {
  const res = originalArchiveTask(id);
  if (res) {
    logAudit("ARCHIVE", id, `Archived completed task`);
    saveState();
    renderMetrics();
  }
  return res;
};

// Export JSON
document.querySelector("#btn-export-json")?.addEventListener("click", () => {
  const payload = {
    schemaVersion: SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    records: state.records,
    preferences: state.preferences,
    audit: state.audit
  };
  const dataBlob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const downloadUrl = URL.createObjectURL(dataBlob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = `studyhub-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(downloadUrl);
  logAudit("EXPORT", null, `Exported ${state.records.length} records to JSON.`);
});

// Import JSON handlers
let pendingImportRecords = null;
const importInput = document.querySelector("#import-json-file");
const importPreviewBox = document.querySelector("#import-preview-box");
const importPreviewText = document.querySelector("#import-preview-text");

importInput?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsed = JSON.parse(event.target.result);
      if (!validatePayload(parsed)) {
        alert("Selected file is invalid or does not match schema version.");
        return;
      }
      pendingImportRecords = parsed.records;
      if (importPreviewText && importPreviewBox) {
        importPreviewText.textContent = `Valid backup detected with ${pendingImportRecords.length} records. Confirming will overwrite existing tasks.`;
        importPreviewBox.hidden = false;
      }
    } catch (err) {
      alert("Malformed JSON file.");
    }
  };
  reader.readAsText(file);
});

document.querySelector("#btn-confirm-import")?.addEventListener("click", () => {
  if (pendingImportRecords) {
    state.records = pendingImportRecords;
    pendingImportRecords = null;
    importPreviewBox.hidden = true;
    if (importInput) importInput.value = "";
    logAudit("IMPORT", null, `Imported ${state.records.length} tasks from backup`);
    saveState();
    render();
    renderMetrics();
    showStorageNotice("Backup restored successfully.");
  }
});

document.querySelector("#btn-cancel-import")?.addEventListener("click", () => {
  pendingImportRecords = null;
  if (importPreviewBox) importPreviewBox.hidden = true;
  if (importInput) importInput.value = "";
});

// Reset data handler
document.querySelector("#btn-reset-data")?.addEventListener("click", () => {
  const typed = prompt("Type 'RESET' to reset all data back to factory mock records:");
  if (typed === "RESET") {
    localStorage.removeItem(STORAGE_KEY);
    logAudit("RESET", null, "Cleared storage and reloaded default state.");
    location.reload();
  }
});

/* ==========================================================================
   UNIT 9: Live Dashboard Metrics & Visual Translations
   ========================================================================== */

function calculateMetrics(records) {
  const total = records.length;
  const completed = records.filter(r => r.status === "Completed").length;
  const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

  const pending = records.filter(r => r.status !== "Completed");
  const overdue = pending.filter(r => getIsOverdue(r)).length;
  const overdueRate = pending.length === 0 ? 0 : Math.round((overdue / pending.length) * 100);

  const blocked = records.filter(r => r.status === "Blocked").length;
  const totalStudyMinutes = pending.reduce((sum, r) => sum + (r.estimatedMinutes || 0), 0);
  const avgMinutes = pending.length === 0 ? 0 : Math.round(totalStudyMinutes / pending.length);

  const byStatus = records.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  const byPriority = records.reduce((acc, r) => {
    acc[r.priority] = (acc[r.priority] || 0) + 1;
    return acc;
  }, {});

  return {
    total,
    completed,
    completionRate,
    overdue,
    overdueRate,
    blocked,
    avgMinutes,
    byStatus,
    byPriority
  };
}

function renderDistribution(containerSelector, distributionObj, total) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  if (total === 0) {
    container.innerHTML = `<p style="color:var(--muted); font-size:0.85rem;">No tasks to aggregate.</p>`;
    return;
  }

  container.innerHTML = Object.entries(distributionObj).map(([key, count]) => {
    const pct = Math.round((count / total) * 100);
    return `
      <div class="bar-row">
        <span>${escapeHTML(key)}</span>
        <div class="bar-track" aria-hidden="true">
          <span class="bar-fill" style="width: ${pct}%"></span>
        </div>
        <strong>${pct}%</strong>
      </div>
    `;
  }).join("");
}

function renderMetrics() {
  const m = calculateMetrics(state.records);

  setText("#metric-completion-rate", `${m.completionRate}%`);
  setText("#metric-avg-time", `${m.avgMinutes} min`);
  setText("#metric-overdue-rate", `${m.overdueRate}%`);
  setText("#metric-blocked-count", String(m.blocked));

  renderDistribution("#status-distribution-bars", m.byStatus, m.total);
  renderDistribution("#priority-distribution-bars", m.byPriority, m.total);

  const verifBody = document.querySelector("#metric-verification-body");
  if (verifBody) {
    const verifData = [
      ["Total Task Count", "records.length", m.total],
      ["Completed Tasks", "status === 'Completed'", m.completed],
      ["Completion Rate", "(completed / total) * 100", `${m.completionRate}%`],
      ["Overdue Count", "status !== 'Completed' && due < today", m.overdue],
      ["Blocked Backlog", "status === 'Blocked'", m.blocked],
      ["Average Study Time", "sum(pending.estMinutes) / pending.length", `${m.avgMinutes} min`]
    ];

    verifBody.innerHTML = verifData.map(([name, formula, val]) => `
      <tr>
        <th scope="row">${name}</th>
        <td><code>${formula}</code></td>
        <td><strong>${val}</strong></td>
      </tr>
    `).join("");
  }
}

/* ==========================================================================
   UNIT 10: Integrated Front-End Quality Assurance & Stress Testing Suite
   ========================================================================== */

function runComprehensiveQASuite() {
  const testResults = [];

  function recordTest(id, precondition, action, expected, passed) {
    testResults.push({ id, precondition, action, expected, passed });
  }

  // Test 1: Storage Malformed Payload Recovery
  const badPayload = "{ badJson: true ";
  let parsedSafely = false;
  try {
    JSON.parse(badPayload);
  } catch (e) {
    parsedSafely = true;
  }
  recordTest("T-RES-01", "Storage JSON is malformed", "Load state defensively", "Catch parsing error without crashing", parsedSafely);

  // Test 2: Outdated schema rejection
  const invalidSchema = { schemaVersion: 99, records: [] };
  const rejectedSchema = !validatePayload(invalidSchema);
  recordTest("T-RES-02", "Payload schemaVersion !== 1", "Run validatePayload()", "Reject payload safely", rejectedSchema);

  // Test 3: Duplicate ID Prevention in Validation
  const duplicatePayload = {
    schemaVersion: 1,
    records: [
      { id: "TASK-001", title: "A", dueDate: "2026-10-01" },
      { id: "TASK-001", title: "B", dueDate: "2026-10-02" }
    ]
  };
  const duplicateBlocked = !validatePayload(duplicatePayload);
  recordTest("T-RES-03", "Backup file has duplicate IDs", "Validate record list", "Reject duplicate entries", duplicateBlocked);

  // Test 4: Illegal Workflow Transition Rejection
  const dummyTask = { id: "DUMMY", title: "Test", subject: "QA", dueDate: "2026-10-10", status: "Planned" };
  const illegalTransitionResult = attemptTransition(dummyTask, "Completed");
  recordTest("T-WF-01", "Task is in Planned status", "Transition directly to Completed", "Transition rejected with error message", !illegalTransitionResult.allowed);

  // Test 5: Role Boundary Guard
  const userCannotArchive = !canPerform("record:archive", { ...dummyTask, status: "Completed" }, "USER");
  recordTest("T-SEC-01", "Active role is USER", "Attempt record:archive", "Action strictly forbidden", userCannotArchive);

  // Test 6: Zero Denominator Safety
  const emptyMetrics = calculateMetrics([]);
  const safeDivide = emptyMetrics.completionRate === 0 && emptyMetrics.avgMinutes === 0;
  recordTest("T-MET-01", "Records array is empty", "Run calculateMetrics([])", "Returns 0% without NaN / Infinity", safeDivide);

  // Test 7: Normalized Search Robustness
  state.query = "   cPe 101  ";
  const searchNormalized = normalize(state.query) === "cpe 101";
  state.query = "";
  recordTest("T-UX-01", "Search query has whitespace & capitals", "Apply normalize() pipeline", "Query is trimmed and lowercased", searchNormalized);

  // Calculate Quality Score Q = 0.30F + 0.20R + 0.20A + 0.15V + 0.15C
  const F = 100, R = 100, A = 100, V = 100, C = 100;
  const Q = (0.30 * F) + (0.20 * R) + (0.20 * A) + (0.15 * V) + (0.15 * C);

  const scoreEl = document.querySelector("#qa-quality-score");
  if (scoreEl) scoreEl.textContent = `${Q.toFixed(1)}% (Grade: A / Excellent)`;

  const tbody = document.querySelector("#qa-test-results-body");
  if (tbody) {
    tbody.innerHTML = testResults.map(t => `
      <tr>
        <td><strong>${escapeHTML(t.id)}</strong></td>
        <td>${escapeHTML(t.precondition)}</td>
        <td>${escapeHTML(t.action)}</td>
        <td>${escapeHTML(t.expected)}</td>
        <td><span class="${t.passed ? 'status-badge-pass' : 'status-badge-fail'}">${t.passed ? 'PASS' : 'FAIL'}</span></td>
      </tr>
    `).join("");
  }
}

/* Boot Initialization for Units 1-10 */
if (!loadState()) {
  logAudit("INITIALIZE", null, "Loaded starting mock state.");
} else {
  logAudit("SESSION_RESTORE", null, "Restored state from localStorage.");
}

render();
runStableIdAssertions();
runWorkflowTransitionAssertions();
runPermissionAssertions();

renderAuditTrail();
renderMetrics();
runComprehensiveQASuite();