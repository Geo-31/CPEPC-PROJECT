/* StudyHub - Unit 3: JavaScript Data Model, State, and Deterministic Rendering */

const WORKFLOW_PATH = ["To do", "In progress", "Done"];

/*
  Each status lists the moves allowed from it.
  - row: show the move as a button in the task table
  - emphasis: style it as the main button
  Every move is also available from the task details panel.
*/
const TRANSITION_MATRIX = {
  "To do": {
    "In progress": { actionLabel: "Start", condition: "hasTaskBasics", row: true, emphasis: true }
  },
  "In progress": {
    Done: { actionLabel: "Mark done", condition: "hasTaskBasics", row: true, emphasis: true },
    "To do": { actionLabel: "Move back to To do", condition: "hasTaskBasics", row: false, emphasis: false }
  },
  Done: {
    "In progress": { actionLabel: "Reopen", condition: "hasTaskBasics", row: true, emphasis: false }
  }
};

const TRANSITION_CONDITIONS = {
  hasTaskBasics: (task) =>
    Boolean(
      String(task.title ?? "").trim() &&
        String(task.subject ?? "").trim() &&
        task.dueDate
    )
};

const session = {
  userId: "student-001",
  displayName: "Student"
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
      status: "In progress",
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
      status: "To do",
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
      status: "To do",
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
      status: "In progress",
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
      status: "Done",
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
      status: "To do",
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
      status: "Done",
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
      status: "To do",
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
      status: "Done",
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
      status: "In progress",
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
      status: "To do",
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
      status: "To do",
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
      status: "Done",
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
      status: "To do",
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
      status: "To do",
      createdAt: "2026-09-15T21:10:00",
      estimatedMinutes: 60
    }
  ].map((record) => ({ ...record, workflowHistory: [] })),

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
  archivedRecords: [],

  schedules: [
    { id: "SCH-001", day: "Monday", startTime: "10:30", endTime: "11:30", className: "Computer Engineering as a Discipline", courseCode: "CMPE 101", instructor: "Prof. Ryan Evangelista" },
    { id: "SCH-002", day: "Monday", startTime: "13:30", endTime: "16:30", className: "Filipinolohiya at Pambansang Kaunlaran", courseCode: "GEED 032", instructor: "Prof. Jhonley Cubacub" },
    { id: "SCH-003", day: "Tuesday", startTime: "07:30", endTime: "10:30", className: "2D Animation", courseCode: "CPET 201", instructor: "Prof. Jerome De Guzman" },
    { id: "SCH-004", day: "Tuesday", startTime: "10:30", endTime: "13:30", className: "Data Structures and Algorithms", courseCode: "CMPE 201", instructor: "Prof. Mylo Atencio" },
    { id: "SCH-005", day: "Tuesday", startTime: "15:00", endTime: "18:00", className: "Fundamentals of Electronic Circuits", courseCode: "ECEN 011", instructor: "TBA" },
    { id: "SCH-006", day: "Wednesday", startTime: "10:00", endTime: "13:00", className: "Discrete Mathematics", courseCode: "CMPE 104", instructor: "Prof. Mylo Atencio" },
    { id: "SCH-007", day: "Wednesday", startTime: "13:00", endTime: "16:00", className: "Fundamentals of Electrical Circuits", courseCode: "ELEN 012", instructor: "Prof. Ronald Fernando" },
    { id: "SCH-008", day: "Wednesday", startTime: "16:30", endTime: "18:30", className: "Physical Activity Towards Health and Fitness 3", courseCode: "PATHFIT 3", instructor: "Prof. Remus Laglagaron" },
    { id: "SCH-009", day: "Friday", startTime: "07:30", endTime: "10:30", className: "2D Animation", courseCode: "CPET 201", instructor: "Prof. Jerome De Guzman" },
    { id: "SCH-010", day: "Friday", startTime: "10:30", endTime: "13:30", className: "Data Structures and Algorithms", courseCode: "CMPE 201", instructor: "Prof. Mylo Atencio" },
    { id: "SCH-011", day: "Friday", startTime: "15:00", endTime: "18:00", className: "Fundamentals of Electronic Circuits", courseCode: "ECEN 011", instructor: "TBA" },
    { id: "SCH-012", day: "Friday", startTime: "18:00", endTime: "21:00", className: "CPE Professional Course 1", courseCode: "CMPE-PC1", instructor: "Prof. Jose Marie Dipay" },
    { id: "SCH-013", day: "Saturday", startTime: "07:30", endTime: "10:30", className: "Fundamentals of Electrical Circuits", courseCode: "ELEN 012", instructor: "Prof. Ronald Fernando" },
    { id: "SCH-014", day: "Saturday", startTime: "12:00", endTime: "14:00", className: "CPE Professional Course 1", courseCode: "CMPE-PC1", instructor: "Prof. Jose Marie Dipay" }
  ],
  editingSchedule: null,

  notes: [
    { id: "NOTE-001", title: "Electrical circuits", body: "For a series circuit, the same current flows through every component. Add the resistances to find the total resistance.", remark: "Review before the next problem set." },
    { id: "NOTE-002", title: "Data structures", body: "A linked list stores items in nodes. Each node points to the next node, so inserting or removing an item does not require shifting every later item.", remark: "Remember to trace the pointer changes." },
    { id: "NOTE-003", title: "Web development", body: "Use semantic HTML elements to describe the purpose of each part of a page, and keep form labels connected to their controls.", remark: "Unit 1 review" }
  ],
  editingNote: null,

  expenses: [
    { id: "EXP-001", date: "2026-10-12", item: "Bus fare", category: "Transport", amount: 3.0 },
    { id: "EXP-002", date: "2026-10-13", item: "Lunch", category: "Food", amount: 8.5 },
    { id: "EXP-003", date: "2026-10-14", item: "Printed readings", category: "School supplies", amount: 2.25 },
    { id: "EXP-004", date: "2026-10-15", item: "Bus fare", category: "Transport", amount: 3.0 }
  ],
  editingExpense: null,

  auditLog: []
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
  return task.status !== "Done" && getDaysRemaining(task) < 0;
}

function getDaysLabel(task) {
  if (task.status === "Done") return "Finished";

  const days = getDaysRemaining(task);
  const plural = (n) => `${n} day${n === 1 ? "" : "s"}`;

  if (days < 0) return `${plural(Math.abs(days))} overdue`;
  if (days === 0) return "Due today";
  return `${plural(days)} left`;
}

function getStatusClass(status) {
  return (
    {
      "To do": "status-todo",
      "In progress": "status-in-progress",
      Done: "status-done"
    }[status] ?? ""
  );
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

function canEditTask(task) {
  return task.status !== "Done";
}

function canArchiveTask(task) {
  return task.status === "Done";
}

function showMessage(message) {
  const messageRegion = document.querySelector("#app-message");
  if (!messageRegion) return;

  messageRegion.textContent = message;
  messageRegion.hidden = false;
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
      const overdue = getIsOverdue(task);

      return `
        <tr data-id="${task.id}">
          <td>${escapeHTML(task.id)}</td>
          <td>${escapeHTML(task.title)}</td>
          <td>${escapeHTML(task.subject)}</td>
          <td>${escapeHTML(task.dueDate)}</td>
          <td>${escapeHTML(task.priority)}</td>
          <td><span class="status-pill ${getStatusClass(task.status)}">${escapeHTML(task.status)}</span></td>
          <td class="${overdue ? "badge-overdue" : ""}">${escapeHTML(getDaysLabel(task))}</td>
          <td>
            <div class="task-actions">
              <button type="button" data-action="view" data-id="${escapeHTML(task.id)}">View</button>
              ${canEditTask(task) ? `<button type="button" data-action="edit" data-id="${escapeHTML(task.id)}">Edit</button>` : ""}
              ${getAvailableTransitions(task)
                .filter(([, transition]) => transition.row)
                .map(
                  ([nextStatus, transition]) => `
                    <button
                      type="button"
                      class="${transition.emphasis ? "primary-action" : ""}"
                      data-action="transition"
                      data-id="${escapeHTML(task.id)}"
                      data-next-status="${escapeHTML(nextStatus)}"
                    >${escapeHTML(transition.actionLabel)}</button>
                  `
                )
                .join("")}
              ${canArchiveTask(task) ? `<button type="button" data-action="archive" data-id="${escapeHTML(task.id)}">Archive</button>` : ""}
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderSummary(records) {
  const total = records.length;
  const completed = records.filter((task) => task.status === "Done").length;
  const pending = records.filter((task) => task.status !== "Done");

  const priorityTask = [...pending].sort((a, b) => {
    const priorityDifference = priorityRank(b.priority) - priorityRank(a.priority);
    if (priorityDifference !== 0) return priorityDifference;
    return new Date(a.dueDate) - new Date(b.dueDate);
  })[0];

  const upcomingCount = records.filter((task) => {
    const days = getDaysRemaining(task);
    return task.status !== "Done" && days >= 0 && days <= 7;
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

  const progress = getWorkflowProgress(task.status) ?? 0;
  const history = [...(task.workflowHistory ?? [])].reverse();
  const progressMarkup = `
          <label for="workflow-progress">${progress}% complete</label>
          <progress id="workflow-progress" max="100" value="${progress}">${progress}%</progress>
          <p>Step ${WORKFLOW_PATH.indexOf(task.status) + 1} of ${WORKFLOW_PATH.length}: ${escapeHTML(task.status)}.</p>
        `;
  const historyMarkup = history.length
    ? `<ol>
        ${history
          .map(
            (entry) => `
              <li>
                <time datetime="${escapeHTML(entry.timestamp)}">${escapeHTML(
                  new Date(entry.timestamp).toLocaleString()
                )}</time>:
                ${escapeHTML(entry.previousStatus)} &rarr; ${escapeHTML(
                  entry.nextStatus
                )} (${escapeHTML(entry.actionLabel)})
              </li>
            `
          )
          .join("")}
      </ol>`
    : "<p>No status changes yet.</p>";
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
    : "";

  const transitionMarkup = editing
    ? ""
    : `<div class="task-actions detail-actions">
        ${getAvailableTransitions(task)
          .map(
            ([nextStatus, transition]) => `
              <button type="button" class="${transition.emphasis ? "primary-action" : ""}" data-action="transition" data-id="${escapeHTML(task.id)}" data-next-status="${escapeHTML(nextStatus)}">${escapeHTML(transition.actionLabel)}</button>
            `
          )
          .join("")}
        ${canEditTask(task) ? `<button type="button" data-action="edit" data-id="${escapeHTML(task.id)}">Edit task</button>` : ""}
      </div>`;

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
      <dd><span class="status-pill ${getStatusClass(task.status)}">${escapeHTML(task.status)}</span></dd>

      <dt>Created</dt>
      <dd>${escapeHTML(task.createdAt)}</dd>

      <dt>Estimated study time</dt>
      <dd>${getStudyHours(task).toFixed(1)} hours</dd>

      <dt>Time left</dt>
      <dd>${escapeHTML(getDaysLabel(task))}</dd>
    </dl>
    <section class="workflow-history" aria-labelledby="workflow-history-title">
      <h4 id="workflow-history-title">Progress</h4>
      ${progressMarkup}
      <h4>History</h4>
      ${historyMarkup}
    </section>
    ${transitionMarkup}
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
  const visibleRecords = getVisibleRecords();

  renderSummary(state.records);
  renderEmptyState(visibleRecords);
  renderRecords(visibleRecords);
  renderPagination(visibleRecords.length);
  renderResultCount(visibleRecords.length);
  renderDetails();
  renderAuditLog();
  renderSchedules();
  renderNotes();
  renderExpenses();
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
  state.records = [...state.records, task];
  logAudit("task.create", task.id, task.title);
  state.page = 1;
  render();
  return true;
}

function archiveTask(id) {
  const task = state.records.find((record) => record.id === id);

  if (!task || !canArchiveTask(task)) {
    showMessage(
      task
        ? "Only completed tasks can be archived."
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

  logAudit("task.archive", id, task.title);
  showMessage(`${id} was archived.`);
  render();
  return true;
}

function updateTask(id, updates) {
  const task = state.records.find((record) => record.id === id);

  if (!task || !canEditTask(task)) {
    showMessage("Completed tasks can't be edited.");
    return false;
  }

  if (!updates.title.trim() || !updates.subject.trim() || !updates.dueDate) {
    showMessage("Title, subject, and due date are required.");
    return false;
  }

  state.records = state.records.map((record) =>
    record.id === id ? { ...record, ...updates } : record
  );
  state.editingRecord = null;
  logAudit("task.update", id, "Task details edited");
  showMessage(`${id} was updated.`);
  render();
  return true;
}

function transitionTask(id, nextStatus) {
  const task = state.records.find((record) => record.id === id);

  if (!task) {
    showMessage(`Task "${id}" was not found.`);
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
  logAudit(
    "task.transition",
    id,
    `${result.historyEntry.previousStatus} → ${result.historyEntry.nextStatus}`
  );
  showWorkflowMessage(
    `${id}: ${result.historyEntry.previousStatus} → ${result.historyEntry.nextStatus} (${result.historyEntry.actionLabel}).`
  );
  render();
  return true;
}

/* -----------------------------
   5b. Audit trail
   ----------------------------- */

function logAudit(action, targetId, details) {
  const entry = {
    timestamp: new Date().toISOString(),
    actor: session.displayName,
    action,
    targetId,
    details
  };

  state.auditLog = [entry, ...state.auditLog].slice(0, 200);
}

function renderAuditLog() {
  const body = document.querySelector("#audit-log-body");
  if (!body) return;

  body.innerHTML = state.auditLog.length
    ? state.auditLog
        .map(
          (entry) => `
            <tr>
              <td class="nowrap">${escapeHTML(new Date(entry.timestamp).toLocaleString())}</td>
              <td>${escapeHTML(entry.actor)}</td>
              <td>${escapeHTML(entry.action)}</td>
              <td>${escapeHTML(entry.targetId)}</td>
              <td>${escapeHTML(entry.details)}</td>
            </tr>
          `
        )
        .join("")
    : `<tr><td colspan="5">No actions recorded yet.</td></tr>`;
}

/* -----------------------------
   5c. Schedules (CRUD)
   ----------------------------- */

const SCHEDULE_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];

function formatTime(value) {
  const [h, m] = String(value).split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return value;
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function generateScheduleId() {
  const numbers = state.schedules
    .map((item) => Number(item.id.replace("SCH-", "")))
    .filter(Number.isFinite);
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
  return `SCH-${String(next).padStart(3, "0")}`;
}

/* Returns an error message, or "" when the entry is valid. */
function validateSchedule(entry, ignoreId = null) {
  if (!SCHEDULE_DAYS.includes(entry.day)) return "Choose a valid day.";
  if (!entry.startTime || !entry.endTime) return "Start and end time are required.";
  if (!entry.className) return "Class name is required.";
  if (entry.endTime <= entry.startTime) return "End time must be after the start time.";

  const clash = state.schedules.find(
    (item) =>
      item.id !== ignoreId &&
      item.day === entry.day &&
      entry.startTime < item.endTime &&
      entry.endTime > item.startTime
  );

  if (clash) {
    return `This overlaps with ${clash.className} (${formatTime(clash.startTime)}–${formatTime(clash.endTime)}) on ${clash.day}.`;
  }

  return "";
}

function addSchedule(entry) {
  const error = validateSchedule(entry);
  if (error) return error;

  const record = { id: generateScheduleId(), ...entry };
  state.schedules = [...state.schedules, record];
  logAudit("schedule.create", record.id, `${record.className} (${record.day})`);
  showMessage(`${record.id} was added.`);
  render();
  renderScheduleForm();
  return "";
}

function updateSchedule(id, updates) {
  const existing = state.schedules.find((item) => item.id === id);
  if (!existing) return `Schedule "${id}" was not found.`;

  const error = validateSchedule(updates, id);
  if (error) return error;

  state.schedules = state.schedules.map((item) =>
    item.id === id ? { ...item, ...updates } : item
  );
  state.editingSchedule = null;
  logAudit("schedule.update", id, `${updates.className} (${updates.day})`);
  showMessage(`${id} was updated.`);
  render();
  renderScheduleForm();
  return "";
}

function deleteSchedule(id) {
  const existing = state.schedules.find((item) => item.id === id);
  if (!existing) {
    showMessage(`Schedule "${id}" was not found.`);
    return false;
  }

  const wasEditing = state.editingSchedule === id;
  state.schedules = state.schedules.filter((item) => item.id !== id);
  if (wasEditing) state.editingSchedule = null;
  logAudit("schedule.delete", id, `${existing.className} (${existing.day})`);
  showMessage(`${id} was deleted.`);
  render();
  if (wasEditing) renderScheduleForm();
  return true;
}

function renderScheduleForm() {
  const form = document.querySelector("#schedule-form");
  if (!form) return;

  const editing = state.schedules.find((item) => item.id === state.editingSchedule);
  const submit = document.querySelector("#schedule-submit");
  const cancel = document.querySelector("#schedule-cancel");
  const title = document.querySelector("#schedule-form-title");

  if (editing) {
    form.elements.id.value = editing.id;
    form.elements.day.value = editing.day;
    form.elements.startTime.value = editing.startTime;
    form.elements.endTime.value = editing.endTime;
    form.elements.className.value = editing.className;
    form.elements.courseCode.value = editing.courseCode;
    form.elements.instructor.value = editing.instructor;
  } else {
    form.reset();
    form.elements.id.value = "";
  }

  if (submit) submit.textContent = editing ? "Save changes" : "Add class";
  if (cancel) cancel.hidden = !editing;
  if (title) title.textContent = editing ? `Edit class (${editing.id})` : "Add class";
}

function renderSchedules() {
  const body = document.querySelector("#schedule-table-body");
  if (!body) return;

  const actions = (item) => `
    <td>
      <div class="task-actions">
        <button type="button" data-schedule-action="edit" data-id="${escapeHTML(item.id)}">Edit</button>
        <button type="button" class="btn-danger" data-schedule-action="delete" data-id="${escapeHTML(item.id)}">Delete</button>
      </div>
    </td>`;

  const rows = [];

  SCHEDULE_DAYS.forEach((day) => {
    const items = state.schedules
      .filter((item) => item.day === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    /* Sunday only appears when it has classes, like the original table. */
    if (!items.length && day === "Sunday") return;

    if (!items.length) {
      rows.push(`
        <tr>
          <th scope="row">${day}</th>
          <td colspan="5">No classes</td>
        </tr>`);
      return;
    }

    items.forEach((item, index) => {
      rows.push(`
        <tr>
          ${index === 0 ? `<th scope="rowgroup" rowspan="${items.length}">${day}</th>` : ""}
          <td class="nowrap">${formatTime(item.startTime)}–${formatTime(item.endTime)}</td>
          <td>${escapeHTML(item.className)}</td>
          <td>${escapeHTML(item.courseCode || "—")}</td>
          <td>${escapeHTML(item.instructor || "TBA")}</td>
          ${actions(item)}
        </tr>`);
    });
  });

  body.innerHTML = rows.join("");
}

function showScheduleError(message) {
  const box = document.querySelector("#schedule-error-summary");
  if (!box) return;
  box.textContent = message;
  box.hidden = !message;
}

const scheduleForm = document.querySelector("#schedule-form");

if (scheduleForm) {
  scheduleForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = new FormData(scheduleForm);
    const entry = {
      day: String(data.get("day") ?? ""),
      startTime: String(data.get("startTime") ?? ""),
      endTime: String(data.get("endTime") ?? ""),
      className: String(data.get("className") ?? "").trim(),
      courseCode: String(data.get("courseCode") ?? "").trim(),
      instructor: String(data.get("instructor") ?? "").trim()
    };

    const id = String(data.get("id") ?? "");
    const error = id ? updateSchedule(id, entry) : addSchedule(entry);

    showScheduleError(error);
  });
}

const scheduleCancel = document.querySelector("#schedule-cancel");

if (scheduleCancel) {
  scheduleCancel.addEventListener("click", () => {
    state.editingSchedule = null;
    showScheduleError("");
    renderScheduleForm();
  });
}

const scheduleBody = document.querySelector("#schedule-table-body");

if (scheduleBody) {
  scheduleBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-schedule-action]");
    if (!button) return;

    const { scheduleAction, id } = button.dataset;
    const item = state.schedules.find((entry) => entry.id === id);

    if (scheduleAction === "edit" && item) {
      state.editingSchedule = id;
      showScheduleError("");
      renderScheduleForm();
      document.querySelector("#schedule-class")?.focus();
    }

    if (scheduleAction === "delete" && item) {
      if (window.confirm(`Delete ${item.className} on ${item.day}?`)) {
        showScheduleError("");
        deleteSchedule(id);
      }
    }
  });
}

/* -----------------------------
   5d. Notes (CRUD)
   ----------------------------- */

function generateNoteId() {
  const numbers = state.notes
    .map((item) => Number(item.id.replace("NOTE-", "")))
    .filter(Number.isFinite);
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
  return `NOTE-${String(next).padStart(3, "0")}`;
}

function validateNote(entry) {
  if (!entry.title) return "A note title is required.";
  if (!entry.body) return "The note text is required.";
  return "";
}

function addNote(entry) {
  const error = validateNote(entry);
  if (error) return error;

  const record = { id: generateNoteId(), ...entry };
  state.notes = [...state.notes, record];
  logAudit("note.create", record.id, record.title);
  showMessage(`${record.id} was added.`);
  render();
  renderNoteForm();
  return "";
}

function updateNote(id, updates) {
  if (!state.notes.some((item) => item.id === id)) {
    return `Note "${id}" was not found.`;
  }

  const error = validateNote(updates);
  if (error) return error;

  state.notes = state.notes.map((item) =>
    item.id === id ? { ...item, ...updates } : item
  );
  state.editingNote = null;
  logAudit("note.update", id, updates.title);
  showMessage(`${id} was updated.`);
  render();
  renderNoteForm();
  return "";
}

function deleteNote(id) {
  const existing = state.notes.find((item) => item.id === id);
  if (!existing) {
    showMessage(`Note "${id}" was not found.`);
    return false;
  }

  const wasEditing = state.editingNote === id;
  state.notes = state.notes.filter((item) => item.id !== id);
  if (wasEditing) state.editingNote = null;
  logAudit("note.delete", id, existing.title);
  showMessage(`${id} was deleted.`);
  render();
  if (wasEditing) renderNoteForm();
  return true;
}

/* Loads the form from state. Only called when the edit target changes,
   never from render(), so a half-typed draft is not wiped by other updates. */
function renderNoteForm() {
  const form = document.querySelector("#note-form");
  if (!form) return;

  const editing = state.notes.find((item) => item.id === state.editingNote);

  if (editing) {
    form.elements.id.value = editing.id;
    form.elements.title.value = editing.title;
    form.elements.body.value = editing.body;
    form.elements.remark.value = editing.remark;
  } else {
    form.reset();
    form.elements.id.value = "";
  }

  const submit = document.querySelector("#note-submit");
  const cancel = document.querySelector("#note-cancel");
  const title = document.querySelector("#note-form-title");
  if (submit) submit.textContent = editing ? "Save changes" : "Add note";
  if (cancel) cancel.hidden = !editing;
  if (title) title.textContent = editing ? `Edit note (${editing.id})` : "Add note";
}

function renderNotes() {
  const list = document.querySelector("#note-list");
  if (!list) return;

  list.innerHTML = state.notes
    .map(
      (note) => `
        <article class="info-entry">
          <h4>${escapeHTML(note.title)}</h4>
          <p>${escapeHTML(note.body)}</p>
          ${note.remark ? `<p class="section-note">${escapeHTML(note.remark)}</p>` : ""}
          <div class="task-actions">
            <button type="button" data-note-action="edit" data-id="${escapeHTML(note.id)}">Edit</button>
            <button type="button" class="btn-danger" data-note-action="delete" data-id="${escapeHTML(note.id)}">Delete</button>
          </div>
        </article>`
    )
    .join("");

  const empty = document.querySelector("#note-empty-state");
  if (empty) empty.hidden = state.notes.length > 0;
}

function showNoteError(message) {
  const box = document.querySelector("#note-error-summary");
  if (!box) return;
  box.textContent = message;
  box.hidden = !message;
}

const noteForm = document.querySelector("#note-form");

if (noteForm) {
  noteForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = new FormData(noteForm);
    const entry = {
      title: String(data.get("title") ?? "").trim(),
      body: String(data.get("body") ?? "").trim(),
      remark: String(data.get("remark") ?? "").trim()
    };

    const id = String(data.get("id") ?? "");
    showNoteError(id ? updateNote(id, entry) : addNote(entry));
  });
}

const noteCancel = document.querySelector("#note-cancel");

if (noteCancel) {
  noteCancel.addEventListener("click", () => {
    state.editingNote = null;
    showNoteError("");
    renderNoteForm();
  });
}

const noteList = document.querySelector("#note-list");

if (noteList) {
  noteList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-note-action]");
    if (!button) return;

    const { noteAction, id } = button.dataset;
    const item = state.notes.find((entry) => entry.id === id);
    if (!item) return;

    if (noteAction === "edit") {
      state.editingNote = id;
      showNoteError("");
      renderNoteForm();
      document.querySelector("#note-title")?.focus();
    }

    if (noteAction === "delete" && window.confirm(`Delete the note "${item.title}"?`)) {
      showNoteError("");
      deleteNote(id);
    }
  });
}

/* -----------------------------
   5e. Expenses (CRUD)
   ----------------------------- */

function formatMoney(value) {
  return `$${Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function formatExpenseDate(value) {
  const [y, m, d] = String(value).split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function generateExpenseId() {
  const numbers = state.expenses
    .map((item) => Number(item.id.replace("EXP-", "")))
    .filter(Number.isFinite);
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
  return `EXP-${String(next).padStart(3, "0")}`;
}

/* Sums in whole cents so totals never show float drift like 0.30000000000000004. */
function getExpenseTotal() {
  const cents = state.expenses.reduce(
    (sum, item) => sum + Math.round(item.amount * 100),
    0
  );
  return cents / 100;
}

function validateExpense(entry) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) return "A valid date is required.";
  if (!entry.item) return "The item name is required.";
  if (!Number.isFinite(entry.amount) || entry.amount <= 0) {
    return "Amount must be a number greater than 0.";
  }
  if (entry.amount > 10000000) return "Amount is too large.";
  return "";
}

function addExpense(entry) {
  const error = validateExpense(entry);
  if (error) return error;

  const record = { id: generateExpenseId(), ...entry };
  state.expenses = [...state.expenses, record];
  logAudit("expense.create", record.id, `${record.item} (${formatMoney(record.amount)})`);
  showMessage(`${record.id} was added.`);
  render();
  renderExpenseForm();
  return "";
}

function updateExpense(id, updates) {
  if (!state.expenses.some((item) => item.id === id)) {
    return `Expense "${id}" was not found.`;
  }

  const error = validateExpense(updates);
  if (error) return error;

  state.expenses = state.expenses.map((item) =>
    item.id === id ? { ...item, ...updates } : item
  );
  state.editingExpense = null;
  logAudit("expense.update", id, `${updates.item} (${formatMoney(updates.amount)})`);
  showMessage(`${id} was updated.`);
  render();
  renderExpenseForm();
  return "";
}

function deleteExpense(id) {
  const existing = state.expenses.find((item) => item.id === id);
  if (!existing) {
    showMessage(`Expense "${id}" was not found.`);
    return false;
  }

  const wasEditing = state.editingExpense === id;
  state.expenses = state.expenses.filter((item) => item.id !== id);
  if (wasEditing) state.editingExpense = null;
  logAudit("expense.delete", id, `${existing.item} (${formatMoney(existing.amount)})`);
  showMessage(`${id} was deleted.`);
  render();
  if (wasEditing) renderExpenseForm();
  return true;
}

function renderExpenseForm() {
  const form = document.querySelector("#expense-form");
  if (!form) return;

  const editing = state.expenses.find((item) => item.id === state.editingExpense);

  if (editing) {
    form.elements.id.value = editing.id;
    form.elements.date.value = editing.date;
    form.elements.itemName.value = editing.item;
    form.elements.category.value = editing.category;
    form.elements.amount.value = editing.amount.toFixed(2);
  } else {
    form.reset();
    form.elements.id.value = "";
  }

  const submit = document.querySelector("#expense-submit");
  const cancel = document.querySelector("#expense-cancel");
  const title = document.querySelector("#expense-form-title");
  if (submit) submit.textContent = editing ? "Save changes" : "Add expense";
  if (cancel) cancel.hidden = !editing;
  if (title) title.textContent = editing ? `Edit expense (${editing.id})` : "Add expense";
}

function renderExpenses() {
  const body = document.querySelector("#expense-table-body");
  if (!body) return;

  const sorted = [...state.expenses].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
  );

  body.innerHTML = sorted.length
    ? sorted
        .map(
          (item) => `
            <tr>
              <td class="nowrap">${escapeHTML(formatExpenseDate(item.date))}</td>
              <td>${escapeHTML(item.item)}</td>
              <td>${escapeHTML(item.category || "Uncategorized")}</td>
              <td class="nowrap">${formatMoney(item.amount)}</td>
              <td>
                <div class="task-actions">
                  <button type="button" data-expense-action="edit" data-id="${escapeHTML(item.id)}">Edit</button>
                  <button type="button" class="btn-danger" data-expense-action="delete" data-id="${escapeHTML(item.id)}">Delete</button>
                </div>
              </td>
            </tr>`
        )
        .join("")
    : `<tr><td colspan="5">No expenses recorded yet.</td></tr>`;

  setText("#expense-total", formatMoney(getExpenseTotal()));
}

function showExpenseError(message) {
  const box = document.querySelector("#expense-error-summary");
  if (!box) return;
  box.textContent = message;
  box.hidden = !message;
}

const expenseForm = document.querySelector("#expense-form");

if (expenseForm) {
  expenseForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = new FormData(expenseForm);
    const rawAmount = String(data.get("amount") ?? "").trim();
    const entry = {
      date: String(data.get("date") ?? ""),
      item: String(data.get("itemName") ?? "").trim(),
      category: String(data.get("category") ?? "").trim(),
      amount: rawAmount === "" ? NaN : Math.round(Number(rawAmount) * 100) / 100
    };

    const id = String(data.get("id") ?? "");
    showExpenseError(id ? updateExpense(id, entry) : addExpense(entry));
  });
}

const expenseCancel = document.querySelector("#expense-cancel");

if (expenseCancel) {
  expenseCancel.addEventListener("click", () => {
    state.editingExpense = null;
    showExpenseError("");
    renderExpenseForm();
  });
}

const expenseBody = document.querySelector("#expense-table-body");

if (expenseBody) {
  expenseBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-expense-action]");
    if (!button) return;

    const { expenseAction, id } = button.dataset;
    const item = state.expenses.find((entry) => entry.id === id);
    if (!item) return;

    if (expenseAction === "edit") {
      state.editingExpense = id;
      showExpenseError("");
      renderExpenseForm();
      document.querySelector("#expense-item")?.focus();
    }

    if (expenseAction === "delete" && window.confirm(`Delete "${item.item}" (${formatMoney(item.amount)})?`)) {
      showExpenseError("");
      deleteExpense(id);
    }
  });
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
        if (!task) {
          showMessage(`Task "${id}" was not found.`);
          return;
        }
        state.selectedRecord = id;
        state.editingRecord = null;
        renderDetails();
      }

      if (action === "edit") {
        const task = state.records.find((record) => record.id === id);
        if (!task || !canEditTask(task)) {
          showMessage("Completed tasks can't be edited.");
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

    const transitionButton = event.target.closest('[data-action="transition"]');
    if (transitionButton) {
      transitionTask(transitionButton.dataset.id, transitionButton.dataset.nextStatus);
      return;
    }

    const actionButton = event.target.closest('[data-action="edit"]');
    if (!actionButton) return;

    const task = state.records.find(
      (record) => record.id === actionButton.dataset.id
    );
    if (!task || !canEditTask(task)) {
      showMessage("Completed tasks can't be edited.");
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
      status: "To do",
      createdAt: new Date().toISOString(),
      estimatedMinutes: 30,
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
    if (!document.querySelector(`#app > section[id="${targetId}"]`)) return;

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
    ["To do", "Done"],
    ["Done", "To do"],
    ["To do", "To do"],
    ["Done", "Done"],
    ["In progress", "Blocked"],
    ["To do", "toString"],
    ["To do", "__proto__"]
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

  const legalCases = [
    ["To do", "In progress"],
    ["In progress", "Done"],
    ["In progress", "To do"],
    ["Done", "In progress"]
  ];

  legalCases.forEach(([status, nextStatus], index) => {
    const record = {
      id: `WORKFLOW-OK-${index + 1}`,
      title: "Workflow test",
      subject: "Workflow testing",
      description: "Record used to verify allowed transitions.",
      dueDate: "2026-12-31",
      status,
      workflowHistory: []
    };
    const result = attemptTransition(
      record,
      nextStatus,
      "2026-10-02T00:00:00.000Z"
    );

    console.assert(
      result.allowed &&
        result.record.status === nextStatus &&
        result.record.workflowHistory.length === 1 &&
        record.status === status,
      `Workflow assertion failed: allowed ${status} → ${nextStatus} did not apply cleanly.`
    );
  });

  console.log(
    `Workflow assertions completed (${illegalCases.length} rejected, ${legalCases.length} allowed).`
  );
}

/* -----------------------------
   Settings: appearance (theme)
   ----------------------------- */

const THEME_KEY = "studyhub-theme";
const THEME_CHOICES = {
  dark: "Dark",
  light: "Light",
  system: "Match my device"
};

function getStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return Object.hasOwn(THEME_CHOICES, stored) ? stored : "dark";
  } catch {
    return "dark"; /* storage blocked (private mode etc.) */
  }
}

function storeTheme(choice) {
  try {
    localStorage.setItem(THEME_KEY, choice);
  } catch {
    /* ignore: the theme still applies for this session */
  }
}

const lightQuery = window.matchMedia
  ? window.matchMedia("(prefers-color-scheme: light)")
  : null;

function resolveTheme(choice) {
  if (choice === "system") return lightQuery && lightQuery.matches ? "light" : "dark";
  return choice === "light" ? "light" : "dark";
}

function applyTheme(choice) {
  document.documentElement.setAttribute("data-theme", resolveTheme(choice));
}

const themeOptions = document.querySelectorAll('input[name="theme"]');

if (themeOptions.length) {
  const current = getStoredTheme();
  themeOptions.forEach((input) => {
    input.checked = input.value === current;
  });

  themeOptions.forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked || !Object.hasOwn(THEME_CHOICES, input.value)) return;
      storeTheme(input.value);
      applyTheme(input.value);
      showMessage(`Theme set to ${THEME_CHOICES[input.value]}.`);
    });
  });

  /* While on "Match my device", follow OS changes live. */
  if (lightQuery) {
    lightQuery.addEventListener("change", () => {
      if (getStoredTheme() === "system") applyTheme("system");
    });
  }
}

/* Initial deterministic render */
render();
runStableIdAssertions();
runWorkflowTransitionAssertions();
