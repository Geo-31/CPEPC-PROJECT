/* StudyHub - Unit 3: JavaScript Data Model, State, and Deterministic Rendering */

/* The five workflow states, in the order work normally moves through them. */
const WORKFLOW_PATH = ["To do", "In progress", "In review", "Done", "Archived"];

/* Progress is measured over the work itself. "Archived" is filing a finished
   task away, so it reports 100% rather than adding a fifth of extra progress. */
const PROGRESS_PATH = WORKFLOW_PATH.filter((status) => status !== "Archived");

/*
  Each status lists the moves allowed from it.
  - row: show the move as a button in the task table
  - emphasis: style it as the main button
  Every move is also available from the task details panel.
*/
const TRANSITION_MATRIX = {
  "To do": {
    "In progress": {
      actionLabel: "Start",
      condition: "hasTaskBasics",
      row: true,
      emphasis: true,
    },
  },
  "In progress": {
    "In review": {
      actionLabel: "Submit for review",
      condition: "hasTaskBasics",
      row: true,
      emphasis: true,
    },
    "To do": {
      actionLabel: "Move back to To do",
      condition: "hasTaskBasics",
      row: false,
      emphasis: false,
    },
  },
  "In review": {
    Done: {
      actionLabel: "Mark done",
      condition: "hasTaskBasics",
      row: true,
      emphasis: true,
    },
    "In progress": {
      actionLabel: "Return for changes",
      condition: "hasTaskBasics",
      row: true,
      emphasis: false,
    },
  },
  Done: {
    Archived: {
      actionLabel: "Archive",
      condition: "hasTaskBasics",
      row: true,
      emphasis: false,
    },
    "In progress": {
      actionLabel: "Reopen",
      condition: "hasTaskBasics",
      row: true,
      emphasis: false,
    },
  },
  /* Terminal state: nothing can leave Archived. */
  Archived: {},
};

const TRANSITION_CONDITIONS = {
  hasTaskBasics: (task) =>
    Boolean(
      String(task.title ?? "").trim() &&
      String(task.subject ?? "").trim() &&
      (task.dueDate || task.classroomAssignmentId),
    ),
};

/* -----------------------------
   0. Authentication + role-based views (RBAC)
   ----------------------------- */

const AUTH = window.StudyHubAuth;
const ROLES = AUTH.ROLES;

// Dev role override: if ?dev=1 and a saved dev role exists, use it instead of real auth
let devRoleOverride = null;
if (new URLSearchParams(location.search).has('dev')) {
  devRoleOverride = sessionStorage.getItem('devRoleOverride');
  console.log('[dev-startup] devRoleOverride from sessionStorage:', devRoleOverride);
}

let currentUser = null;
try {
  currentUser = AUTH.getSessionUser();
} catch (error) {
  const message = document.querySelector("#app-message");
  if (message) {
    message.textContent = error.message;
    message.hidden = false;
  }
}

console.log('[dev-startup] currentUser before override:', currentUser?.role);

// Apply dev role override if present
if (devRoleOverride && currentUser) {
  currentUser = { ...currentUser, role: devRoleOverride };
  console.log('[dev-startup] currentUser after override:', currentUser.role);
}

let currentView = currentUser
  ? (ROLES[currentUser.role]?.view ?? "student")
  : "guest";
const session = {
  userId: currentUser?.id ?? null,
  displayName: currentUser?.displayName ?? "Guest",
  role: currentUser?.role ?? null,
};

/* -----------------------------
   Unit 7: Central Permission Model
   ----------------------------- */

const CAPABILITIES = {
  // Tasks
  TASK_VIEW_OWN:      'task:view-own',
  TASK_CREATE:        'task:create',
  TASK_EDIT_OWN:      'task:edit-own',
  TASK_STATUS:        'task:status',
  TASK_ARCHIVE:       'task:archive',
  TASK_VIEW_ALL:      'task:view-all',
  // Users / Admin
  USER_MANAGE:        'user:manage',
  // Classrooms
  CLASS_CREATE:       'class:create',
  CLASS_JOIN:         'class:join',
  CLASS_GRADE:        'class:grade',
  // Analytics / Dashboards
  ANALYTICS_VIEW:     'analytics:view',
  // Features
  POMODORO_USE:       'pomodoro:use',
};

const ROLE_PERMISSIONS = {
  student: new Set([
    CAPABILITIES.TASK_VIEW_OWN,
    CAPABILITIES.TASK_CREATE,
    CAPABILITIES.TASK_EDIT_OWN,
    CAPABILITIES.TASK_STATUS,
    CAPABILITIES.TASK_ARCHIVE,
    CAPABILITIES.CLASS_JOIN,
    CAPABILITIES.POMODORO_USE,
  ]),
  teacher: new Set([
    CAPABILITIES.TASK_VIEW_OWN,
    CAPABILITIES.TASK_EDIT_OWN,
    CAPABILITIES.TASK_STATUS,
    CAPABILITIES.TASK_ARCHIVE,
    CAPABILITIES.CLASS_CREATE,
    CAPABILITIES.CLASS_GRADE,
    CAPABILITIES.ANALYTICS_VIEW,
  ]),
  admin: new Set(Object.values(CAPABILITIES)),
};

/** Single source of truth for "can this role do X?" */
function allowed(capability) {
  return ROLE_PERMISSIONS[session.role]?.has(capability) ?? false;
}

/** Ownership-aware check for record-scoped capabilities */
function allowedOn(capability, task) {
  if (!allowed(capability)) return false;
  if (capability === CAPABILITIES.TASK_EDIT_OWN) return canEditTask(task);
  if (capability === CAPABILITIES.TASK_STATUS) return canEditTask(task);
  if (capability === CAPABILITIES.TASK_ARCHIVE) return canEditTask(task);
  return true; // non-ownership capabilities
}

if (!currentUser) {
  window.location.replace("login.html");
}

/* Remove everything the current view should not have, then reveal the page. */
function applyRoleView() {
  console.log('[applyRoleView] currentView:', currentView, 'currentUser.role:', currentUser?.role);
  document.querySelectorAll("[data-view]").forEach((element) => {
    if (!element.dataset.view.split(/\s+/).includes(currentView)) {
      element.remove();
    }
  });

  const root = document.documentElement;
  root.dataset.appView = currentView;
  if (currentUser) root.dataset.role = currentUser.role;
  console.log('[applyRoleView] root.dataset.appView set to:', root.dataset.appView, 'root.dataset.role:', root.dataset.role);

  if (currentUser) {
    setLabel("#user-label", currentUser.displayName);
    setLabel("#user-role", ROLES[currentUser.role]?.label ?? currentUser.role);
  }

  if (currentView === "admin") {
    setLabel("#admin-name", currentUser.displayName);
    const adminSection = document.querySelector("#admin-dashboard");
    if (adminSection) adminSection.hidden = false;
    document
      .querySelector(".primary-nav a")
      ?.setAttribute("aria-current", "page");
  }

  if (currentView === "teacher") {
    const teacherSection = document.querySelector("#teacher-dashboard");
    if (teacherSection) teacherSection.hidden = false;
    document
      .querySelector('.primary-nav a[href="#teacher-dashboard"]')
      ?.setAttribute("aria-current", "page");
  }

  root.dataset.ready = "true";
}

function setLabel(selector, text) {
  const element = document.querySelector(selector);
  if (element) element.textContent = text;
}

const logoutButton = document.querySelector("#logout-btn");

if (logoutButton) {
  logoutButton.addEventListener("click", () => {
    try {
      AUTH.clearSession();
    } catch (error) {
      const message = document.querySelector("#app-message");
      if (message) {
        message.textContent = error.message;
        message.hidden = false;
      }
      return;
    }
    window.location.href = "login.html";
  });
}

applyRoleView();

/* -----------------------------
     1. Authoritative application state
   ----------------------------- */

const state = {
  records: [
    {
      id: "TASK-001",
      title: "Unit 3 Data Engine",
      subject: "CPE Professional Course 1",
      description:
        "Build the JavaScript state model and deterministic task renderer.",
      dueDate: "2026-09-28",
      priority: "High",
      status: "In progress",
      createdAt: "2026-09-24T09:00:00",
      estimatedMinutes: 120,
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
      estimatedMinutes: 90,
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
      estimatedMinutes: 75,
    },
    {
      id: "TASK-004",
      title: "Computer Engineering Reflection Video",
      subject: "Computer Engineering as a Discipline",
      description:
        "Record the reflection about speech-to-text and text-to-speech tools.",
      dueDate: "2026-10-01",
      priority: "Medium",
      status: "In progress",
      createdAt: "2026-09-21T14:00:00",
      estimatedMinutes: 60,
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
      estimatedMinutes: 100,
    },
    {
      id: "TASK-006",
      title: "Research Reading Notes",
      subject: "Computer Engineering History",
      description:
        "Summarize the assigned reading and prepare answers to guide questions.",
      dueDate: "2026-10-03",
      priority: "Low",
      status: "To do",
      createdAt: "2026-09-20T08:45:00",
      estimatedMinutes: 45,
    },
    {
      id: "TASK-007",
      title: "Weekly Class Schedule Update",
      subject: "Personal Organization",
      description:
        "Update room assignments and class times for the coming week.",
      dueDate: "2026-10-04",
      priority: "Low",
      status: "Done",
      createdAt: "2026-09-19T20:00:00",
      estimatedMinutes: 20,
    },
    {
      id: "TASK-008",
      title: "Expense Log Review",
      subject: "Personal Finance",
      description:
        "Check this week's transportation, food, and printing expenses.",
      dueDate: "2026-10-05",
      priority: "Low",
      status: "To do",
      createdAt: "2026-09-19T16:20:00",
      estimatedMinutes: 30,
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
      estimatedMinutes: 50,
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
      estimatedMinutes: 80,
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
      estimatedMinutes: 25,
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
      estimatedMinutes: 45,
    },
    {
      id: "TASK-013",
      title: "Flowchart Corrections",
      subject: "Data Structures",
      description:
        "Apply final corrections to the quiz algorithms and flowcharts.",
      dueDate: "2026-10-10",
      priority: "High",
      status: "Done",
      createdAt: "2026-09-16T17:40:00",
      estimatedMinutes: 70,
    },
    {
      id: "TASK-014",
      title: "StudyHub UI Review",
      subject: "CPE Professional Course 1",
      description:
        "Review sidebar, dashboard, and focus-mode design consistency.",
      dueDate: "2026-10-11",
      priority: "Medium",
      status: "To do",
      createdAt: "2026-09-16T13:25:00",
      estimatedMinutes: 40,
    },
    {
      id: "TASK-015",
      title: "Unit 3 Submission Check",
      subject: "CPE Professional Course 1",
      description:
        "Verify mock records, derived values, rendering, event delegation, and assertions.",
      dueDate: "2026-10-12",
      priority: "High",
      status: "To do",
      createdAt: "2026-09-15T21:10:00",
      estimatedMinutes: 60,
    },
  ].map((record) => ({ ...record, workflowHistory: [] })),

  query: "",

  filters: {
    status: "ALL",
    priority: "ALL",
  },

  sort: {
    key: "dueDate",
    direction: "asc",
  },

  page: 1,
  pageSize: 5,
  selectedRecord: null,
  editingRecord: null,
  archivedRecords: [],

  schedules: [
    {
      id: "SCH-001",
      day: "Monday",
      startTime: "10:30",
      endTime: "11:30",
      className: "Computer Engineering as a Discipline",
      courseCode: "CMPE 101",
      instructor: "Prof. Ryan Evangelista",
    },
    {
      id: "SCH-002",
      day: "Monday",
      startTime: "13:30",
      endTime: "16:30",
      className: "Filipinolohiya at Pambansang Kaunlaran",
      courseCode: "GEED 032",
      instructor: "Prof. Jhonley Cubacub",
    },
    {
      id: "SCH-003",
      day: "Tuesday",
      startTime: "07:30",
      endTime: "10:30",
      className: "2D Animation",
      courseCode: "CPET 201",
      instructor: "Prof. Jerome De Guzman",
    },
    {
      id: "SCH-004",
      day: "Tuesday",
      startTime: "10:30",
      endTime: "13:30",
      className: "Data Structures and Algorithms",
      courseCode: "CMPE 201",
      instructor: "Prof. Mylo Atencio",
    },
    {
      id: "SCH-005",
      day: "Tuesday",
      startTime: "15:00",
      endTime: "18:00",
      className: "Fundamentals of Electronic Circuits",
      courseCode: "ECEN 011",
      instructor: "TBA",
    },
    {
      id: "SCH-006",
      day: "Wednesday",
      startTime: "10:00",
      endTime: "13:00",
      className: "Discrete Mathematics",
      courseCode: "CMPE 104",
      instructor: "Prof. Mylo Atencio",
    },
    {
      id: "SCH-007",
      day: "Wednesday",
      startTime: "13:00",
      endTime: "16:00",
      className: "Fundamentals of Electrical Circuits",
      courseCode: "ELEN 012",
      instructor: "Prof. Ronald Fernando",
    },
    {
      id: "SCH-008",
      day: "Wednesday",
      startTime: "16:30",
      endTime: "18:30",
      className: "Physical Activity Towards Health and Fitness 3",
      courseCode: "PATHFIT 3",
      instructor: "Prof. Remus Laglagaron",
    },
    {
      id: "SCH-009",
      day: "Friday",
      startTime: "07:30",
      endTime: "10:30",
      className: "2D Animation",
      courseCode: "CPET 201",
      instructor: "Prof. Jerome De Guzman",
    },
    {
      id: "SCH-010",
      day: "Friday",
      startTime: "10:30",
      endTime: "13:30",
      className: "Data Structures and Algorithms",
      courseCode: "CMPE 201",
      instructor: "Prof. Mylo Atencio",
    },
    {
      id: "SCH-011",
      day: "Friday",
      startTime: "15:00",
      endTime: "18:00",
      className: "Fundamentals of Electronic Circuits",
      courseCode: "ECEN 011",
      instructor: "TBA",
    },
    {
      id: "SCH-012",
      day: "Friday",
      startTime: "18:00",
      endTime: "21:00",
      className: "CPE Professional Course 1",
      courseCode: "CMPE-PC1",
      instructor: "Prof. Jose Marie Dipay",
    },
    {
      id: "SCH-013",
      day: "Saturday",
      startTime: "07:30",
      endTime: "10:30",
      className: "Fundamentals of Electrical Circuits",
      courseCode: "ELEN 012",
      instructor: "Prof. Ronald Fernando",
    },
    {
      id: "SCH-014",
      day: "Saturday",
      startTime: "12:00",
      endTime: "14:00",
      className: "CPE Professional Course 1",
      courseCode: "CMPE-PC1",
      instructor: "Prof. Jose Marie Dipay",
    },
  ],
  editingSchedule: null,

  notes: [
    {
      id: "NOTE-001",
      title: "Electrical circuits",
      body: "For a series circuit, the same current flows through every component. Add the resistances to find the total resistance.",
      remark: "Review before the next problem set.",
    },
    {
      id: "NOTE-002",
      title: "Data structures",
      body: "A linked list stores items in nodes. Each node points to the next node, so inserting or removing an item does not require shifting every later item.",
      remark: "Remember to trace the pointer changes.",
    },
    {
      id: "NOTE-003",
      title: "Web development",
      body: "Use semantic HTML elements to describe the purpose of each part of a page, and keep form labels connected to their controls.",
      remark: "Unit 1 review",
    },
  ],
  editingNote: null,

  expenses: [
    {
      id: "EXP-001",
      date: "2026-10-12",
      item: "Bus fare",
      category: "Transport",
      amount: 3.0,
    },
    {
      id: "EXP-002",
      date: "2026-10-13",
      item: "Lunch",
      category: "Food",
      amount: 8.5,
    },
    {
      id: "EXP-003",
      date: "2026-10-14",
      item: "Printed readings",
      category: "School supplies",
      amount: 2.25,
    },
    {
      id: "EXP-004",
      date: "2026-10-15",
      item: "Bus fare",
      category: "Transport",
      amount: 3.0,
    },
  ],
  editingExpense: null,

  auditLog: [],
  preferences: {
    theme: null,
  },
};

/* -----------------------------
   Unit 8: versioned persistence
   ----------------------------- */

const STORAGE_KEY = "studyhub-state-v1";
const SCHEMA_VERSION = 1;
const DEFAULT_STATE = JSON.parse(JSON.stringify(state));
let pendingImport = null;
let persistenceBlocked = false;

function showStorageStatus(message, isError = false) {
  const status = document.querySelector("#storage-status-message");
  if (!status) return;

  status.textContent = message;
  status.hidden = !message;
  status.setAttribute("role", isError ? "alert" : "status");
}

function hasUniqueIds(items) {
  return (
    Array.isArray(items) &&
    items.every((item) => item && typeof item.id === "string" && item.id) &&
    new Set(items.map((item) => item.id)).size === items.length
  );
}

function isValidPayload(payload) {
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    payload.schemaVersion !== SCHEMA_VERSION ||
    typeof payload.savedAt !== "string" ||
    Number.isNaN(Date.parse(payload.savedAt)) ||
    !["admin", "student", "teacher"].includes(payload.activeRole) ||
    !payload.preferences ||
    typeof payload.preferences !== "object" ||
    !["dark", "light", "system"].includes(payload.preferences.theme) ||
    !payload.preferences.filters ||
    !["ALL", ...WORKFLOW_PATH].includes(payload.preferences.filters.status) ||
    !["ALL", "High", "Medium", "Low"].includes(
      payload.preferences.filters.priority,
    ) ||
    !payload.preferences.sort ||
    ![
      "title",
      "subject",
      "dueDate",
      "createdAt",
      "priority",
      "status",
    ].includes(payload.preferences.sort.key) ||
    !["asc", "desc"].includes(payload.preferences.sort.direction) ||
    ![5, 10, 15].includes(payload.preferences.pageSize) ||
    !Array.isArray(payload.records) ||
    !Array.isArray(payload.archivedRecords) ||
    !Array.isArray(payload.schedules) ||
    !Array.isArray(payload.notes) ||
    !Array.isArray(payload.expenses) ||
    !Array.isArray(payload.auditLog)
  ) {
    return false;
  }

  const allTasks = [...payload.records, ...payload.archivedRecords];
  if (
    !hasUniqueIds(payload.records) ||
    !hasUniqueIds(payload.archivedRecords) ||
    new Set(allTasks.map((task) => task.id)).size !== allTasks.length ||
    allTasks.some(
      (task) =>
        typeof task.title !== "string" ||
        typeof task.subject !== "string" ||
        typeof task.description !== "string" ||
        typeof task.dueDate !== "string" ||
        !["High", "Medium", "Low"].includes(task.priority) ||
        !WORKFLOW_PATH.includes(task.status) ||
        typeof task.createdAt !== "string" ||
        !Number.isFinite(task.estimatedMinutes) ||
        !Array.isArray(task.workflowHistory),
    ) ||
    payload.schedules.some(
      (item) =>
        !item ||
        typeof item.id !== "string" ||
        ![
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ].includes(item.day) ||
        typeof item.startTime !== "string" ||
        typeof item.endTime !== "string" ||
        typeof item.className !== "string" ||
        typeof item.courseCode !== "string" ||
        typeof item.instructor !== "string",
    ) ||
    !hasUniqueIds(payload.schedules) ||
    payload.notes.some(
      (item) =>
        !item ||
        typeof item.id !== "string" ||
        typeof item.title !== "string" ||
        typeof item.body !== "string" ||
        typeof item.remark !== "string",
    ) ||
    !hasUniqueIds(payload.notes) ||
    payload.expenses.some(
      (item) =>
        !item ||
        typeof item.id !== "string" ||
        typeof item.date !== "string" ||
        typeof item.item !== "string" ||
        typeof item.category !== "string" ||
        !Number.isFinite(item.amount) ||
        item.amount <= 0,
    ) ||
    !hasUniqueIds(payload.expenses) ||
    payload.auditLog.some(
      (entry) =>
        !entry ||
        typeof entry.timestamp !== "string" ||
        Number.isNaN(Date.parse(entry.timestamp)) ||
        typeof entry.actor !== "string" ||
        typeof entry.action !== "string" ||
        typeof entry.targetId !== "string" ||
        typeof entry.details !== "string",
    )
  ) {
    return false;
  }

  return true;
}

function applyPayload(payload) {
  state.records = payload.records;
  state.archivedRecords = payload.archivedRecords;
  state.schedules = payload.schedules;
  state.notes = payload.notes;
  state.expenses = payload.expenses;
  state.auditLog = payload.auditLog.slice(0, 200);
  state.filters = { ...payload.preferences.filters };
  state.sort = { ...payload.preferences.sort };
  state.pageSize = payload.preferences.pageSize;
  state.preferences = { theme: payload.preferences.theme };
  state.query = "";
  state.page = 1;
  state.selectedRecord = null;
  state.editingRecord = null;
  state.editingSchedule = null;
  state.editingNote = null;
  state.editingExpense = null;
}

function createStoragePayload() {
  return {
    schemaVersion: SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    records: state.records,
    archivedRecords: state.archivedRecords,
    schedules: state.schedules,
    notes: state.notes,
    expenses: state.expenses,
    preferences: {
      theme: state.preferences.theme,
      filters: state.filters,
      sort: state.sort,
      pageSize: state.pageSize,
    },
    activeRole: session.role,
    auditLog: state.auditLog,
  };
}

function saveState() {
  if (!currentUser || persistenceBlocked) return false;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(createStoragePayload()));
    return true;
  } catch (error) {
    console.error("Unable to save StudyHub state.", error);
    showStorageStatus(
      "StudyHub could not save your data. Check browser storage settings; export a backup if possible.",
      true,
    );
    return false;
  }
}

function restoreState() {
  if (!currentUser) {
    persistenceBlocked = true;
    return;
  }

  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.error("Unable to read saved StudyHub state.", error);
    persistenceBlocked = true;
    showStorageStatus(
      "Saved data could not be read. The app is using safe defaults; check browser storage settings.",
      true,
    );
    return;
  }

  if (raw === null) return;

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (error) {
    console.error("Saved StudyHub data is malformed JSON.", error);
    persistenceBlocked = true;
    showStorageStatus(
      "Saved data is malformed. The app is using safe defaults and has left the saved data untouched so it can be recovered.",
      true,
    );
    return;
  }

  if (!isValidPayload(payload)) {
    persistenceBlocked = true;
    showStorageStatus(
      "Saved data is incomplete, invalid, or from an unsupported schema version. The app is using safe defaults and has left the saved data untouched.",
      true,
    );
    return;
  }

  applyPayload(payload);
}

restoreState();

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
  if (!task.dueDate) return Infinity;
  const due = parseDateOnly(task.dueDate);
  if (!Number.isFinite(due.getTime())) return Infinity;
  const today = startOfToday();
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((due - today) / millisecondsPerDay);
}

/* A task is finished once it is Done or Archived. Finished tasks are never
   pending, overdue, or upcoming. */
function isFinished(task) {
  return task.status === "Done" || task.status === "Archived";
}

function getIsOverdue(task) {
  return !isFinished(task) && getDaysRemaining(task) < 0;
}

function getDaysLabel(task) {
  if (isFinished(task)) return "Finished";

  const days = getDaysRemaining(task);
  const plural = (n) => `${n} day${n === 1 ? "" : "s"}`;

  if (days === Infinity) return "No due date";
  if (days < 0) return `${plural(Math.abs(days))} overdue`;
  if (days === 0) return "Due today";
  return `${plural(days)} left`;
}

function getStatusClass(status) {
  return (
    {
      "To do": "status-todo",
      "In progress": "status-in-progress",
      "In review": "status-in-review",
      Done: "status-done",
      Archived: "status-archived",
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
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function canEditTask(task) {
  return !isFinished(task) && !task.classroomAssignmentId;
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
    task.status,
  ].some((value) => normalize(value).includes(query));
}

function matchesFilters(task) {
  const statusMatches =
    state.filters.status === "ALL" || task.status === state.filters.status;

  const priorityMatches =
    state.filters.priority === "ALL" ||
    task.priority === state.filters.priority;

  return statusMatches && priorityMatches;
}

function priorityRank(priority) {
  const ranks = {
    High: 3,
    Medium: 2,
    Low: 1,
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
    TRANSITION_CONDITIONS[transition.condition](task),
  );
}

function getWorkflowProgress(status) {
  if (status === "Archived") return 100;

  const stageIndex = PROGRESS_PATH.indexOf(status);
  const finalStageIndex = PROGRESS_PATH.length - 1;

  if (stageIndex < 0) return null;

  return Math.round((stageIndex / finalStageIndex) * 100);
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
      message: `Transition from "${task.status}" to "${nextStatus}" is not allowed.`,
    };
  }

  const condition = TRANSITION_CONDITIONS[transition.condition];

  if (!condition(task)) {
    return {
      allowed: false,
      message: `Cannot ${transition.actionLabel.toLowerCase()}: required task details are missing.`,
    };
  }

  return { allowed: true, transition };
}

function attemptTransition(
  task,
  nextStatus,
  timestamp = new Date().toISOString(),
) {
  const result = evaluateTransition(task, nextStatus);

  if (!result.allowed) return result;

  const historyEntry = {
    timestamp,
    previousStatus: task.status,
    nextStatus,
    actionLabel: result.transition.actionLabel,
  };

  return {
    allowed: true,
    record: {
      ...task,
      status: nextStatus,
      workflowHistory: [...(task.workflowHistory ?? []), historyEntry],
    },
    historyEntry,
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
          <td>${escapeHTML(task.title)}</td>
          <td>${escapeHTML(task.subject)}</td>
          <td>${escapeHTML(task.dueDate)}</td>
          <td>${escapeHTML(task.priority)}</td>
          <td><span class="status-pill ${getStatusClass(task.status)}">${escapeHTML(task.status)}</span></td>
          <td class="${overdue ? "badge-overdue" : ""}">${escapeHTML(getDaysLabel(task))}</td>
          <td>
            <div class="task-actions">
              <button type="button" data-action="view" data-id="${escapeHTML(task.id)}">View</button>
              ${allowedOn(CAPABILITIES.TASK_EDIT_OWN, task) && canEditTask(task) ? `<button type="button" data-action="edit" data-id="${escapeHTML(task.id)}">Edit</button>` : ""}
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
                  `,
                )
                .join("")}
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderSummary(records) {
  const total = records.length;
  const completed = records.filter(isFinished).length;
  const pending = records.filter((task) => !isFinished(task));

  const priorityTask = [...pending].sort((a, b) => {
    const priorityDifference =
      priorityRank(b.priority) - priorityRank(a.priority);
    if (priorityDifference !== 0) return priorityDifference;
    return new Date(a.dueDate) - new Date(b.dueDate);
  })[0];

  const upcomingCount = records.filter((task) => {
    const days = getDaysRemaining(task);
    return !isFinished(task) && days >= 0 && days <= 7;
  }).length;

  const totalStudyMinutes = records.reduce(
    (sum, task) => sum + task.estimatedMinutes,
    0,
  );

  setText("#summary-total", String(total));
  setText("#summary-completed", String(completed));
  setText("#summary-upcoming", `${upcomingCount} due within 7 days`);
  setText(
    "#summary-priority",
    priorityTask
      ? `${priorityTask.title} (${priorityTask.priority})`
      : "No pending tasks",
  );
  setText(
    "#summary-study-time",
    `${(totalStudyMinutes / 60).toFixed(1)} hours`,
  );
}

/* -----------------------------
   Unit 9: Live derived metrics
   Everything here is computed from state.records on every render(),
   so it can never drift from the task list. No chart library: the
   distribution "charts" are plain styled bars.
   ----------------------------- */

function percentOf(part, whole) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function computeMetrics(records) {
  const total = records.length;
  // Completion rate: finished tasks (Done or Archived) divided by all tasks.
  const done = records.filter(isFinished).length;
  // In-progress count: tasks whose current workflow status is "In progress".
  const inProgress = records.filter(
    (task) => task.status === "In progress",
  ).length;
  // Pending means any task not yet Done or Archived.
  const pending = records.filter((task) => !isFinished(task));
  // Overdue rate: overdue pending tasks divided by all pending tasks.
  const overdue = pending.filter(getIsOverdue).length;
  // Average study time: sum of pending estimated minutes divided by pending count.
  const pendingMinutes = pending.reduce(
    (sum, task) => sum + task.estimatedMinutes,
    0,
  );

  return {
    total,
    done,
    inProgress,
    pendingCount: pending.length,
    overdue,
    pendingMinutes,
    completionRate: percentOf(done, total),
    overdueRate: percentOf(overdue, pending.length),
    avgMinutes:
      pending.length > 0 ? Math.round(pendingMinutes / pending.length) : 0,
    byStatus: WORKFLOW_PATH.map((label) => ({
      label,
      count: records.filter((task) => task.status === label).length,
    })),
    byPriority: ["High", "Medium", "Low"].map((label) => ({
      label,
      count: records.filter((task) => task.priority === label).length,
    })),
  };
}

function runDashboardMetricAssertions() {
  const fixture = [
    {
      status: "Done",
      priority: "High",
      dueDate: "2999-01-01",
      estimatedMinutes: 30,
    },
    {
      status: "Archived",
      priority: "Medium",
      dueDate: "2999-01-01",
      estimatedMinutes: 60,
    },
    {
      status: "In progress",
      priority: "Low",
      dueDate: "2000-01-01",
      estimatedMinutes: 60,
    },
    {
      status: "To do",
      priority: "High",
      dueDate: "2999-01-01",
      estimatedMinutes: 30,
    },
  ];
  const metrics = computeMetrics(fixture);
  const emptyMetrics = computeMetrics([]);

  const checks = [
    metrics.total === 4,
    metrics.done === 2,
    metrics.completionRate === 50,
    metrics.pendingCount === 2,
    metrics.inProgress === 1,
    metrics.overdue === 1,
    metrics.overdueRate === 50,
    metrics.avgMinutes === 45,
    metrics.byStatus.reduce((sum, row) => sum + row.count, 0) === metrics.total,
    metrics.byPriority.reduce((sum, row) => sum + row.count, 0) ===
      metrics.total,
    emptyMetrics.total === 0 &&
      emptyMetrics.completionRate === 0 &&
      emptyMetrics.overdueRate === 0 &&
      emptyMetrics.avgMinutes === 0 &&
      [...emptyMetrics.byStatus, ...emptyMetrics.byPriority].every(
        (row) => row.count === 0,
      ),
  ];

  checks.forEach((passed, index) => {
    console.assert(passed, `Unit 9 metric assertion ${index + 1} failed.`);
  });
  console.log(
    `Unit 9 dashboard assertions completed (${checks.length} checks).`,
  );
}

/* -----------------------------
   Unit 10: Admin QA / quality score
   ----------------------------- */
const QA_WEIGHTS = {
  F: 0.3,
  R: 0.2,
  A: 0.2,
  V: 0.15,
  C: 0.15,
};

function computeQualityScore(results) {
  const grouped = Object.fromEntries(
    Object.keys(QA_WEIGHTS).map((category) => [category, []]),
  );

  results.forEach((entry) => {
    if (grouped[entry.category]) grouped[entry.category].push(entry.passed);
  });

  const categoryScore = (category) => {
    const checks = grouped[category];
    if (!checks || checks.length === 0) return 100;
    const passed = checks.filter(Boolean).length;
    return (passed / checks.length) * 100;
  };

  const score = Object.entries(QA_WEIGHTS).reduce(
    (total, [category, weight]) => total + categoryScore(category) * weight,
    0,
  );

  return Math.round(score);
}

function computeCategoryScores(results) {
  return Object.fromEntries(
    Object.keys(QA_WEIGHTS).map((category) => {
      const categoryResults = results.filter(
        (entry) => entry.category === category,
      );
      const passed = categoryResults.filter((entry) => entry.passed).length;
      const score = categoryResults.length
        ? Math.round((passed / categoryResults.length) * 100)
        : 100;
      return [category, score];
    }),
  );
}

function runQualityAssuranceSuite() {
  const originalBlocked = persistenceBlocked;

  const runTest = (
    testId,
    category,
    precondition,
    action,
    expected,
    evaluator,
  ) => {
    let passed = false;
    try {
      passed = Boolean(evaluator());
    } catch (error) {
      console.error(`QA test ${testId} failed to complete.`, error);
    }
    return {
      id: testId,
      category,
      precondition,
      action,
      expected,
      passed,
    };
  };

  const results = [
    runTest(
      "F-01",
      "F",
      "Fresh task list",
      "Attempt invalid transition: To do → Archived",
      "Rejected",
      () =>
        !evaluateTransition(
          {
            status: "To do",
            title: "Task",
            subject: "Math",
            dueDate: "2026-10-30",
          },
          "Archived",
        ).allowed,
    ),
    runTest(
      "F-02",
      "F",
      "Task with required fields",
      "Allow valid transition: To do → In progress",
      "Accepted",
      () =>
        evaluateTransition(
          {
            status: "To do",
            title: "Task",
            subject: "Math",
            dueDate: "2026-10-30",
          },
          "In progress",
        ).allowed,
    ),
    runTest(
      "R-01",
      "R",
      "Malformed stored JSON",
      "Restore state after parse failure",
      "Recovery mode enabled",
      () => {
        let originalStorageValue;
        let changedStorage = false;
        const statusElement = document.querySelector("#storage-status-message");
        const previousStatus = statusElement
          ? {
              text: statusElement.textContent,
              hidden: statusElement.hidden,
              role: statusElement.getAttribute("role"),
            }
          : null;
        try {
          originalStorageValue = localStorage.getItem(STORAGE_KEY);
          localStorage.setItem(STORAGE_KEY, "{bad json");
          changedStorage = true;
          persistenceBlocked = false;
          restoreState();
          return persistenceBlocked === true;
        } catch (error) {
          console.error("Unable to run QA storage-recovery check.", error);
          return false;
        } finally {
          persistenceBlocked = originalBlocked;
          if (changedStorage) {
            try {
              if (originalStorageValue === null) {
                localStorage.removeItem(STORAGE_KEY);
              } else {
                localStorage.setItem(STORAGE_KEY, originalStorageValue);
              }
            } catch (error) {
              console.error("Unable to restore storage after QA check.", error);
              throw new Error(
                "QA storage check could not restore saved data.",
                {
                  cause: error,
                },
              );
            }
          }
          if (statusElement && previousStatus) {
            statusElement.textContent = previousStatus.text;
            statusElement.hidden = previousStatus.hidden;
            if (previousStatus.role === null) {
              statusElement.removeAttribute("role");
            } else {
              statusElement.setAttribute("role", previousStatus.role);
            }
          }
        }
      },
    ),
    runTest(
      "A-01",
      "A",
      "Generic system event",
      "Log an audit entry",
      "Entry recorded with actor and timestamp",
      () => {
        const before = [...state.auditLog];
        try {
          logAudit("STATUS_CHANGE", "QA-TEST", "Admin QA pass");
          const entry = state.auditLog[0];
          return (
            state.auditLog.length === Math.min(before.length + 1, 200) &&
            entry.action === "STATUS_CHANGE" &&
            entry.targetId === "QA-TEST" &&
            entry.actor === session.displayName &&
            Number.isFinite(Date.parse(entry.timestamp))
          );
        } finally {
          state.auditLog = before;
        }
      },
    ),
    runTest(
      "V-01",
      "V",
      "Unsupported schema payload",
      "Validate imported data",
      "Rejected as invalid",
      () =>
        !isValidPayload({
          schemaVersion: 999,
          records: [],
          archivedRecords: [],
          schedules: [],
          notes: [],
          expenses: [],
          preferences: {
            theme: "light",
            filters: { status: "ALL", priority: "ALL" },
            sort: { key: "dueDate", direction: "asc" },
            pageSize: 10,
          },
          activeRole: "student",
          auditLog: [],
        }),
    ),
    runTest(
      "V-02",
      "V",
      "Duplicate task IDs in payload",
      "Reject invalid record set",
      "Rejected before import",
      () =>
        !isValidPayload({
          schemaVersion: 1,
          savedAt: new Date().toISOString(),
          records: [
            {
              id: "TASK-1",
              title: "X",
              subject: "Math",
              description: "First duplicate",
              dueDate: "2026-10-30",
              priority: "High",
              status: "To do",
              createdAt: "2026-10-16T00:00:00.000Z",
              estimatedMinutes: 30,
              workflowHistory: [],
            },
            {
              id: "TASK-1",
              title: "Y",
              subject: "Math",
              description: "Second duplicate",
              dueDate: "2026-10-30",
              priority: "High",
              status: "Done",
              createdAt: "2026-10-16T00:00:00.000Z",
              estimatedMinutes: 30,
              workflowHistory: [],
            },
          ],
          archivedRecords: [],
          schedules: [],
          notes: [],
          expenses: [],
          preferences: {
            theme: "light",
            filters: { status: "ALL", priority: "ALL" },
            sort: { key: "dueDate", direction: "asc" },
            pageSize: 10,
          },
          activeRole: "student",
          auditLog: [],
        }),
    ),
    runTest(
      "C-01",
      "C",
      "Empty task collection",
      "Compute dashboard totals",
      "Zero figures and no NaN/Infinity",
      () => {
        const empty = computeMetrics([]);
        return (
          empty.total === 0 &&
          empty.completionRate === 0 &&
          empty.overdueRate === 0 &&
          empty.avgMinutes === 0 &&
          Number.isFinite(empty.completionRate) &&
          Number.isFinite(empty.overdueRate) &&
          Number.isFinite(empty.avgMinutes)
        );
      },
    ),
  ];

  const score = computeQualityScore(results);
  return { results, score, categoryScores: computeCategoryScores(results) };
}

function renderAdminQA(suite) {
  if (!suite) return;

  const scoreElement = document.querySelector("#admin-qa-quality-score");
  const resultBody = document.querySelector("#admin-qa-test-results-body");
  const lastRun = document.querySelector("#admin-qa-last-run");

  if (scoreElement) {
    scoreElement.textContent = `${suite.score}%`;
  }

  Object.entries(suite.categoryScores).forEach(([category, score]) => {
    const element = document.querySelector(
      `[data-qa-category-score="${category}"]`,
    );
    if (element) element.textContent = `${score}%`;
  });

  if (lastRun) {
    const passedCount = suite.results.filter((entry) => entry.passed).length;
    lastRun.textContent = `Last run: ${new Date().toLocaleString()}. ${passedCount} of ${suite.results.length} checks passed.`;
  }

  if (!resultBody) return;

  resultBody.innerHTML = suite.results
    .map(
      (entry) => `
        <tr>
          <td>${escapeHTML(entry.id)}</td>
          <td>${escapeHTML(entry.category)}</td>
          <td>${escapeHTML(entry.precondition)}</td>
          <td>${escapeHTML(entry.action)}</td>
          <td>${escapeHTML(entry.expected)}</td>
          <td>
            <span class="status-pill ${entry.passed ? "status-done" : "status-archived"}">
              ${entry.passed ? "Pass" : "Fail"}
            </span>
          </td>
        </tr>
      `,
    )
    .join("");
}

document.querySelector("#admin-qa-run")?.addEventListener("click", () => {
  renderAdminQA(runQualityAssuranceSuite());
});

/* Colour for each bar, keyed by its label (see [data-tone] rules in style.css). */
const BAR_TONES = {
  "To do": "neutral",
  "In progress": "info",
  "In review": "purple",
  Done: "success",
  Archived: "muted",
  High: "danger",
  Medium: "warning",
  Low: "info",
};

function renderDistributionBars(selector, rows, total) {
  const container = document.querySelector(selector);
  if (!container) return;

  container.innerHTML = rows
    .map(({ label, count }) => {
      const percent = percentOf(count, total);
      return `
        <div class="bar-row" data-tone="${BAR_TONES[label] ?? "brand"}">
          <span class="bar-label">${escapeHTML(label)}</span>
          <div class="bar-track" role="img" aria-label="${escapeHTML(label)}: ${count} of ${total} tasks (${percent}%)">
            <span class="bar-fill" style="width: ${percent}%"></span>
          </div>
          <span class="bar-count">${count} <small>${percent}%</small></span>
        </div>
      `;
    })
    .join("");
}

function setMeter(selector, percent) {
  const element = document.querySelector(selector);
  if (element) element.style.width = `${percent}%`;
}

function renderMetrics(records) {
  const m = computeMetrics(records);

  setText("#metric-completion-rate", `${m.completionRate}%`);
  setText("#metric-avg-time", `${m.avgMinutes} min`);
  setText("#metric-overdue-rate", `${m.overdueRate}%`);
  setText("#metric-in-progress-count", String(m.inProgress));
  setMeter("#metric-completion-meter", m.completionRate);
  setMeter("#metric-overdue-meter", m.overdueRate);

  renderDistributionBars("#status-distribution-bars", m.byStatus, m.total);
  renderDistributionBars("#priority-distribution-bars", m.byPriority, m.total);

  const body = document.querySelector("#metric-verification-body");
  if (!body) return;

  const priorExpected = new Map(
    [...body.querySelectorAll("[data-manual-metric]")].map((input) => [
      input.dataset.manualMetric,
      input.value,
    ]),
  );
  const rows = [
    ["total", "Total tasks", m.total, "Count of all active and archived tasks"],
    [
      "done",
      "Completed tasks",
      m.done,
      'Count of tasks with status "Done" or "Archived"',
    ],
    [
      "completionRate",
      "Completion rate (%)",
      m.completionRate,
      "Completed tasks ÷ all tasks × 100; zero tasks gives 0%",
    ],
    [
      "pending",
      "Unfinished tasks",
      m.pendingCount,
      'Count of tasks not in "Done" or "Archived"',
    ],
    [
      "inProgress",
      "In-progress tasks",
      m.inProgress,
      'Count of tasks with status "In progress"',
    ],
    [
      "overdue",
      "Overdue unfinished tasks",
      m.overdue,
      "Count of unfinished tasks whose due date is before today",
    ],
    [
      "overdueRate",
      "Overdue rate (%)",
      m.overdueRate,
      "Overdue unfinished tasks ÷ unfinished tasks × 100; zero unfinished tasks gives 0%",
    ],
    [
      "avgMinutes",
      "Average study time (min)",
      m.avgMinutes,
      "Sum of unfinished estimated minutes ÷ unfinished task count; zero tasks gives 0",
    ],
  ];

  body.innerHTML = rows
    .map(
      ([key, name, value, formula]) => `
        <tr>
          <th scope="row">${escapeHTML(name)}</th>
          <td>
            <label class="sr-only" for="manual-metric-${key}">Manually counted expected value for ${escapeHTML(name)}</label>
            <input
              id="manual-metric-${key}"
              type="number"
              step="1"
              data-manual-metric="${key}"
              value="${escapeHTML(priorExpected.get(key) ?? "")}"
              aria-describedby="metric-check-${key}"
            />
            <span id="metric-check-${key}" data-metric-check="${key}" role="status" aria-live="polite">Not checked</span>
          </td>
          <td data-calculated-metric="${key}">${value}</td>
          <td>${escapeHTML(formula)}</td>
        </tr>`,
    )
    .join("");

  body.querySelectorAll("[data-manual-metric]").forEach((input) => {
    const check = body.querySelector(
      `[data-metric-check="${input.dataset.manualMetric}"]`,
    );
    const calculated = body.querySelector(
      `[data-calculated-metric="${input.dataset.manualMetric}"]`,
    );
    const updateCheck = () => {
      if (!check || !calculated) return;
      if (input.value.trim() === "") {
        check.textContent = "Not checked";
        return;
      }

      check.textContent =
        Number(input.value) === Number(calculated.textContent)
          ? "Matches"
          : "Does not match";
    };
    input.addEventListener("input", updateCheck);
    updateCheck();
  });
}

function renderArchives() {
  setText("#open-archives", `Archives (${state.archivedRecords.length})`);

  const body = document.querySelector("#archive-table-body");
  if (!body) return;

  const archivedAt = (task) => task.workflowHistory?.at(-1)?.timestamp ?? "";
  /* Newest first. Reversing before the (stable) sort makes ties favor the
     task that was archived later. */
  const rows = [...state.archivedRecords]
    .reverse()
    .sort((a, b) => archivedAt(b).localeCompare(archivedAt(a)));

  const empty = document.querySelector("#archive-empty-state");
  const wrapper = document.querySelector("#archive-table-wrapper");
  if (empty) empty.hidden = rows.length > 0;
  if (wrapper) wrapper.hidden = rows.length === 0;

  body.innerHTML = rows
    .map((task) => {
      const history = task.workflowHistory ?? [];
      const when = archivedAt(task);

      return `
        <tr data-id="${escapeHTML(task.id)}">
          <td>${escapeHTML(task.title)}</td>
          <td>${escapeHTML(task.subject)}</td>
          <td>${escapeHTML(task.dueDate)}</td>
          <td>${escapeHTML(task.priority)}</td>
          <td class="nowrap">${when ? escapeHTML(new Date(when).toLocaleString()) : "—"}</td>
          <td>
            <details class="archive-history">
              <summary>History (${history.length})</summary>
              <ol>
                ${history
                  .map(
                    (entry) =>
                      `<li>${escapeHTML(new Date(entry.timestamp).toLocaleString())}: ${escapeHTML(entry.previousStatus)} &rarr; ${escapeHTML(entry.nextStatus)} (${escapeHTML(entry.actionLabel)})</li>`,
                  )
                  .join("")}
              </ol>
            </details>
          </td>
        </tr>
      `;
    })
    .join("");
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
    (record) => record.id === state.selectedRecord,
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
                  new Date(entry.timestamp).toLocaleString(),
                )}</time>:
                ${escapeHTML(entry.previousStatus)} &rarr; ${escapeHTML(
                  entry.nextStatus,
                )} (${escapeHTML(entry.actionLabel)})
              </li>
            `,
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
                  `<option value="${priority}" ${task.priority === priority ? "selected" : ""}>${priority}</option>`,
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
            `,
          )
          .join("")}
        ${allowedOn(CAPABILITIES.TASK_EDIT_OWN, task) && canEditTask(task) ? `<button type="button" data-action="edit" data-id="${escapeHTML(task.id)}">Edit task</button>` : ""}
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

  renderSummary(getAllTasks());
  renderMetrics(getAllTasks());
  renderEmptyState(visibleRecords);
  renderRecords(visibleRecords);
  renderPagination(visibleRecords.length);
  renderResultCount(visibleRecords.length);
  renderDetails();
  renderArchives();
  renderAuditLog();
  renderSchedules();
  renderNotes();
  renderExpenses();
  saveState();
}

/* -----------------------------
   5. Record actions
   ----------------------------- */

/* Active tasks plus archived ones. Archived tasks live in their own list,
   but IDs and dashboard figures must still account for them. */
function getAllTasks() {
  return [...state.records, ...state.archivedRecords];
}

function generateTaskId() {
  const numericIds = getAllTasks()
    .map((task) => Number(task.id.replace("TASK-", "")))
    .filter(Number.isFinite);

  const nextNumber = (numericIds.length ? Math.max(...numericIds) : 0) + 1;
  return `TASK-${String(nextNumber).padStart(3, "0")}`;
}

function addTask(task) {
  if (!allowed(CAPABILITIES.TASK_CREATE)) {
    showMessage("You don't have permission to create tasks.");
    return false;
  }

  state.records = [...state.records, task];
  logAudit("CREATE", task.id, task.title);
  state.page = 1;
  render();
  return true;
}

function updateTask(id, updates) {
  const task = state.records.find((record) => record.id === id);

  if (!task || !allowedOn(CAPABILITIES.TASK_EDIT_OWN, task)) {
    showMessage("Completed tasks can't be edited.");
    return false;
  }

  if (!updates.title.trim() || !updates.subject.trim() || !updates.dueDate) {
    showMessage("Title, subject, and due date are required.");
    return false;
  }

  state.records = state.records.map((record) =>
    record.id === id ? { ...record, ...updates } : record,
  );
  state.editingRecord = null;
  logAudit("UPDATE", id, "Task details edited");
  showMessage(`${id} was updated.`);
  render();
  return true;
}

function transitionTask(id, nextStatus) {
  const task = state.records.find((record) => record.id === id);

  if (!task) {
    showMessage(
      state.archivedRecords.some((record) => record.id === id)
        ? "Archived tasks can't be changed."
        : `Task "${id}" was not found.`,
    );
    return false;
  }

  const isArchiving = nextStatus === "Archived";
  const requiredCapability = isArchiving ? CAPABILITIES.TASK_ARCHIVE : CAPABILITIES.TASK_STATUS;

  if (!allowedOn(requiredCapability, task)) {
    showMessage("You don't have permission to change this task's status.");
    return false;
  }

  const result = attemptTransition(task, nextStatus);

  if (!result.allowed) {
    showWorkflowMessage(`${result.message} No change was made.`);
    return false;
  }

  const archiving = result.record.status === "Archived";

  if (archiving) {
    /* Archived is the end of the workflow: the task leaves the working list
       and is kept, history included, in the Archives table. */
    state.records = state.records.filter((record) => record.id !== id);
    state.archivedRecords = [...state.archivedRecords, result.record];

    if (state.selectedRecord === id) {
      state.selectedRecord = null;
      state.editingRecord = null;
    }
  } else {
    state.records = state.records.map((record) =>
      record.id === id ? result.record : record,
    );
  }

  logAudit(
    archiving ? "ARCHIVE" : "STATUS_CHANGE",
    id,
    `${result.historyEntry.previousStatus} → ${result.historyEntry.nextStatus}`,
  );
  showWorkflowMessage(
    `${id}: ${result.historyEntry.previousStatus} → ${result.historyEntry.nextStatus} (${result.historyEntry.actionLabel}).${archiving ? " Moved to Archives." : ""}`,
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
    details,
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
          `,
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
  "Sunday",
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
  if (!entry.startTime || !entry.endTime)
    return "Start and end time are required.";
  if (!entry.className) return "Class name is required.";
  if (entry.endTime <= entry.startTime)
    return "End time must be after the start time.";

  const clash = state.schedules.find(
    (item) =>
      item.id !== ignoreId &&
      item.day === entry.day &&
      entry.startTime < item.endTime &&
      entry.endTime > item.startTime,
  );

  if (clash) {
    return `This overlaps with ${clash.className} (${formatTime(clash.startTime)}–${formatTime(clash.endTime)}) on ${clash.day}.`;
  }

  return "";
}

function addSchedule(entry) {
  if (!allowed(CAPABILITIES.CLASS_CREATE)) return "Not permitted.";

  const error = validateSchedule(entry);
  if (error) return error;

  const record = { id: generateScheduleId(), ...entry };
  state.schedules = [...state.schedules, record];
  logAudit(
    "CREATE",
    record.id,
    `Schedule: ${record.className} (${record.day})`,
  );
  showMessage(`${record.id} was added.`);
  render();
  renderScheduleForm();
  return "";
}

function updateSchedule(id, updates) {
  if (!allowed(CAPABILITIES.CLASS_CREATE)) return "Not permitted.";

  const existing = state.schedules.find((item) => item.id === id);
  if (!existing) return `Schedule "${id}" was not found.`;

  const error = validateSchedule(updates, id);
  if (error) return error;

  state.schedules = state.schedules.map((item) =>
    item.id === id ? { ...item, ...updates } : item,
  );
  state.editingSchedule = null;
  logAudit("UPDATE", id, `Schedule: ${updates.className} (${updates.day})`);
  showMessage(`${id} was updated.`);
  render();
  renderScheduleForm();
  return "";
}

function deleteSchedule(id) {
  if (!allowed(CAPABILITIES.CLASS_CREATE)) return false;

  const existing = state.schedules.find((item) => item.id === id);
  if (!existing) {
    showMessage(`Schedule "${id}" was not found.`);
    return false;
  }

  const wasEditing = state.editingSchedule === id;
  state.schedules = state.schedules.filter((item) => item.id !== id);
  if (wasEditing) state.editingSchedule = null;
  logAudit("DELETE", id, `Schedule: ${existing.className} (${existing.day})`);
  showMessage(`${id} was deleted.`);
  render();
  if (wasEditing) renderScheduleForm();
  return true;
}

function renderScheduleForm() {
  const form = document.querySelector("#schedule-form");
  if (!form) return;

  const editing = state.schedules.find(
    (item) => item.id === state.editingSchedule,
  );
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
  if (title)
    title.textContent = editing ? `Edit class (${editing.id})` : "Add class";
}

function renderSchedules() {
  const body = document.querySelector("#schedule-table-body");
  if (!body) return;

  const actions = (item) => `
    <td class="schedule-actions-column">
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
      instructor: String(data.get("instructor") ?? "").trim(),
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

const scheduleActionsToggle = document.querySelector(
  "#schedule-actions-toggle",
);
const scheduleTable = document.querySelector("#schedule-table");

if (scheduleActionsToggle && scheduleTable) {
  scheduleActionsToggle.addEventListener("click", () => {
    const showActions =
      scheduleTable.classList.toggle("schedule-actions-hidden") === false;
    scheduleActionsToggle.setAttribute("aria-pressed", String(showActions));
    scheduleActionsToggle.textContent = showActions
      ? "Hide actions"
      : "Show actions";
  });
}

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
  logAudit("CREATE", record.id, `Note: ${record.title}`);
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
    item.id === id ? { ...item, ...updates } : item,
  );
  state.editingNote = null;
  logAudit("UPDATE", id, `Note: ${updates.title}`);
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
  logAudit("DELETE", id, `Note: ${existing.title}`);
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
  if (title)
    title.textContent = editing ? `Edit note (${editing.id})` : "Add note";
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
        </article>`,
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
      remark: String(data.get("remark") ?? "").trim(),
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

    if (
      noteAction === "delete" &&
      window.confirm(`Delete the note "${item.title}"?`)
    ) {
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
    maximumFractionDigits: 2,
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
    year: "numeric",
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
    0,
  );
  return cents / 100;
}

function validateExpense(entry) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date))
    return "A valid date is required.";
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
  logAudit(
    "CREATE",
    record.id,
    `Expense: ${record.item} (${formatMoney(record.amount)})`,
  );
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
    item.id === id ? { ...item, ...updates } : item,
  );
  state.editingExpense = null;
  logAudit(
    "UPDATE",
    id,
    `Expense: ${updates.item} (${formatMoney(updates.amount)})`,
  );
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
  logAudit(
    "DELETE",
    id,
    `Expense: ${existing.item} (${formatMoney(existing.amount)})`,
  );
  showMessage(`${id} was deleted.`);
  render();
  if (wasEditing) renderExpenseForm();
  return true;
}

function renderExpenseForm() {
  const form = document.querySelector("#expense-form");
  if (!form) return;

  const editing = state.expenses.find(
    (item) => item.id === state.editingExpense,
  );

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
  if (title)
    title.textContent = editing
      ? `Edit expense (${editing.id})`
      : "Add expense";
}

function renderExpenses() {
  const body = document.querySelector("#expense-table-body");
  if (!body) return;

  const sorted = [...state.expenses].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
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
            </tr>`,
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
      amount:
        rawAmount === "" ? NaN : Math.round(Number(rawAmount) * 100) / 100,
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

    if (
      expenseAction === "delete" &&
      window.confirm(`Delete "${item.item}" (${formatMoney(item.amount)})?`)
    ) {
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
        if (!task) {
          showMessage(`Task "${id}" was not found.`);
          return;
        }
        // Permission + ownership guard
        if (!allowedOn(CAPABILITIES.TASK_EDIT_OWN, task)) {
          showMessage("You don't have permission to edit this task.");
          return;
        }
        // Workflow state guard
        if (!canEditTask(task)) {
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

      return;
    }

    const pageButton = event.target.closest("[data-page-action]");

    if (pageButton) {
      const visibleRecords = getVisibleRecords();
      const totalPages = Math.max(
        1,
        Math.ceil(visibleRecords.length / state.pageSize),
      );

      if (pageButton.dataset.pageAction === "previous" && state.page > 1) {
        state.page -= 1;
      }

      if (pageButton.dataset.pageAction === "next" && state.page < totalPages) {
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
      description: String(formData.get("description") ?? "").trim(),
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
      transitionTask(
        transitionButton.dataset.id,
        transitionButton.dataset.nextStatus,
      );
      return;
    }

    const actionButton = event.target.closest('[data-action="edit"]');
    if (!actionButton) return;

    const task = state.records.find(
      (record) => record.id === actionButton.dataset.id,
    );
    if (!task) return;

    // Permission + ownership guard
    if (!allowedOn(CAPABILITIES.TASK_EDIT_OWN, task)) {
      showMessage("You don't have permission to edit this task.");
      return;
    }
    // Workflow state guard
    if (!canEditTask(task)) {
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

    const added = addTask({
      id: generateTaskId(),
      title,
      subject,
      description: notes || "Added from the Unit 3 task form.",
      dueDate,
      priority,
      status: "To do",
      createdAt: new Date().toISOString(),
      estimatedMinutes: 30,
      workflowHistory: [],
    });

    if (added) taskForm.reset();
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
   Archives modal
   Uses the native <dialog> element: it traps keyboard focus, closes on Esc,
   and returns focus to the button that opened it.
   ----------------------------- */

const archivesDialog = document.querySelector("#archives-dialog");
const openArchivesButton = document.querySelector("#open-archives");

if (archivesDialog && openArchivesButton) {
  const closeArchives = () => {
    if (typeof archivesDialog.close === "function") archivesDialog.close();
    else archivesDialog.removeAttribute("open");
  };

  openArchivesButton.addEventListener("click", () => {
    if (archivesDialog.hasAttribute("open")) return;
    renderArchives();

    if (typeof archivesDialog.showModal === "function")
      archivesDialog.showModal();
    else archivesDialog.setAttribute("open", "");
  });

  document
    .querySelector("#close-archives")
    ?.addEventListener("click", closeArchives);

  /* A click on the dark backdrop lands on the <dialog> itself, not on its content. */
  archivesDialog.addEventListener("click", (event) => {
    if (event.target === archivesDialog) closeArchives();
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
    "Assertion 1 failed: every task must have a unique stable ID.",
  );

  const sortedIds = [...originalRecords]
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((record) => record.id);

  console.assert(
    originalIds.every((id) => sortedIds.includes(id)) &&
      sortedIds.every((id) => originalIds.includes(id)),
    "Assertion 2 failed: sorting changed the set of stable IDs.",
  );

  const deletedId = originalRecords[0]?.id;
  const recordsAfterDelete = deletedId
    ? originalRecords.filter((record) => record.id !== deletedId)
    : [];

  console.assert(
    deletedId
      ? !recordsAfterDelete.some((record) => record.id === deletedId) &&
          recordsAfterDelete.every((record) => originalIds.includes(record.id))
      : recordsAfterDelete.length === 0,
    "Assertion 3 failed: deleting one record affected other stable IDs.",
  );

  console.log("Unit 3 stable-ID assertions completed.");
}

function runWorkflowTransitionAssertions() {
  const illegalCases = [
    ["To do", "Done"],
    ["To do", "In review"],
    ["In progress", "Done"],
    ["In progress", "Archived"],
    ["In review", "To do"],
    ["In review", "Archived"],
    ["Done", "To do"],
    ["Done", "In review"],
    ["Archived", "Done"],
    ["Archived", "In progress"],
    ["To do", "To do"],
    ["Done", "Done"],
    ["Archived", "Archived"],
    ["In progress", "Blocked"],
    ["To do", "toString"],
    ["To do", "__proto__"],
  ];

  illegalCases.forEach(([status, nextStatus], index) => {
    const record = {
      id: `WORKFLOW-TEST-${index + 1}`,
      title: "Workflow test",
      subject: "Workflow testing",
      description: "Record used to verify rejected transitions.",
      dueDate: "2026-12-31",
      status,
      workflowHistory: [],
    };
    const before = JSON.stringify(record);
    const result = attemptTransition(
      record,
      nextStatus,
      "2026-10-02T00:00:00.000Z",
    );

    console.assert(
      !result.allowed && JSON.stringify(record) === before,
      `Workflow assertion ${index + 1} failed: rejected ${status} → ${nextStatus} changed the record.`,
    );
  });

  const legalCases = [
    ["To do", "In progress"],
    ["In progress", "In review"],
    ["In progress", "To do"],
    ["In review", "Done"],
    ["In review", "In progress"],
    ["Done", "Archived"],
    ["Done", "In progress"],
  ];

  legalCases.forEach(([status, nextStatus], index) => {
    const record = {
      id: `WORKFLOW-OK-${index + 1}`,
      title: "Workflow test",
      subject: "Workflow testing",
      description: "Record used to verify allowed transitions.",
      dueDate: "2026-12-31",
      status,
      workflowHistory: [],
    };
    const result = attemptTransition(
      record,
      nextStatus,
      "2026-10-02T00:00:00.000Z",
    );

    console.assert(
      result.allowed &&
        result.record.status === nextStatus &&
        result.record.workflowHistory.length === 1 &&
        record.status === status,
      `Workflow assertion failed: allowed ${status} → ${nextStatus} did not apply cleanly.`,
    );
  });

  console.log(
    `Workflow assertions completed (${illegalCases.length} rejected, ${legalCases.length} allowed).`,
  );
}

/* -----------------------------
   Settings: appearance (theme)
   ----------------------------- */

const THEME_KEY = "studyhub-theme";
const THEME_CHOICES = {
  dark: "Dark",
  light: "Light",
  system: "Match my device",
};

function getStoredTheme() {
  if (Object.hasOwn(THEME_CHOICES, state.preferences.theme)) {
    return state.preferences.theme;
  }

  try {
    const stored = localStorage.getItem(THEME_KEY);
    return Object.hasOwn(THEME_CHOICES, stored) ? stored : "dark";
  } catch {
    return "dark"; /* storage blocked (private mode etc.) */
  }
}

function storeTheme(choice) {
  state.preferences.theme = choice;
  try {
    localStorage.setItem(THEME_KEY, choice);
  } catch {
    showStorageStatus(
      "Theme changed for this session, but browser storage could not save it.",
      true,
    );
  }
  saveState();
}

const lightQuery = window.matchMedia
  ? window.matchMedia("(prefers-color-scheme: light)")
  : null;

function resolveTheme(choice) {
  if (choice === "system")
    return lightQuery && lightQuery.matches ? "light" : "dark";
  return choice === "light" ? "light" : "dark";
}

function applyTheme(choice) {
  document.documentElement.setAttribute("data-theme", resolveTheme(choice));
}

const themeOptions = document.querySelectorAll('input[name="theme"]');

if (themeOptions.length) {
  const current = getStoredTheme();
  state.preferences.theme = current;
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

/* -----------------------------
   Unit 8: backup, import, reset
   ----------------------------- */

function updateThemeControls() {
  themeOptions.forEach((input) => {
    input.checked = input.value === state.preferences.theme;
  });
  applyTheme(state.preferences.theme);
}

function updatePreferenceControls() {
  const controls = [
    ["#status-filter", state.filters.status],
    ["#priority-filter", state.filters.priority],
    ["#sort-key", state.sort.key],
    ["#sort-direction", state.sort.direction],
    ["#page-size", String(state.pageSize)],
  ];
  controls.forEach(([selector, value]) => {
    const control = document.querySelector(selector);
    if (control) control.value = value;
  });
}

function closeImportPreview() {
  pendingImport = null;
  const preview = document.querySelector("#import-preview-box");
  if (preview) preview.hidden = true;
}

function runPersistenceAssertions() {
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const valid = createStoragePayload();

  console.assert(
    isValidPayload(valid),
    "Persistence assertion 1 failed: a valid payload was rejected.",
  );
  console.assert(
    (() => {
      try {
        return isValidPayload(JSON.parse("{"));
      } catch {
        return false;
      }
    })() === false,
    "Persistence assertion 2 failed: malformed JSON was not rejected.",
  );

  const wrongVersion = clone(valid);
  wrongVersion.schemaVersion += 1;
  console.assert(
    !isValidPayload(wrongVersion),
    "Persistence assertion 3 failed: an unsupported schema version was accepted.",
  );

  const missingCollection = clone(valid);
  delete missingCollection.expenses;
  console.assert(
    !isValidPayload(missingCollection),
    "Persistence assertion 4 failed: a missing required collection was accepted.",
  );

  const duplicateIds = clone(valid);
  const sampleTask = { ...DEFAULT_STATE.records[0] };
  duplicateIds.records = [sampleTask, { ...sampleTask }];
  console.assert(
    !isValidPayload(duplicateIds),
    "Persistence assertion 5 failed: duplicate record IDs were accepted.",
  );

  const missingTaskField = clone(valid);
  missingTaskField.records = [{ ...DEFAULT_STATE.records[0] }];
  delete missingTaskField.records[0].title;
  console.assert(
    !isValidPayload(missingTaskField),
    "Persistence assertion 6 failed: a task with a missing field was accepted.",
  );

  const emptyPayload = clone(valid);
  for (const collection of [
    "records",
    "archivedRecords",
    "schedules",
    "notes",
    "expenses",
    "auditLog",
  ]) {
    emptyPayload[collection] = [];
  }
  console.assert(
    isValidPayload(emptyPayload),
    "Persistence assertion 7 failed: valid empty collections were rejected.",
  );

  const originalState = clone(state);
  const expectedIds = valid.records.map((record) => record.id);
  applyPayload(valid);
  const restoreSucceeded =
    JSON.stringify(state.records.map((record) => record.id)) ===
    JSON.stringify(expectedIds);
  Object.assign(state, originalState);
  console.assert(
    restoreSucceeded,
    "Persistence assertion 8 failed: valid data did not restore into state.",
  );
  console.log("Unit 8 persistence assertions completed (8 checks).");
}

document.querySelector("#btn-export-json")?.addEventListener("click", () => {
  const payload = createStoragePayload();
  const file = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = `studyhub-backup-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  showStorageStatus("JSON backup exported.");
});

document
  .querySelector("#import-json-file")
  ?.addEventListener("change", async (event) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    closeImportPreview();

    try {
      const payload = JSON.parse(await file.text());
      if (!isValidPayload(payload)) {
        throw new Error(
          "The file is malformed, incomplete, or uses an unsupported schema version.",
        );
      }

      pendingImport = payload;
      const count = payload.records.length + payload.archivedRecords.length;
      const previewText = document.querySelector("#import-preview-text");
      const preview = document.querySelector("#import-preview-box");
      if (previewText) {
        previewText.textContent = `${count} task record(s) (${payload.records.length} active, ${payload.archivedRecords.length} archived), ${payload.schedules.length} schedule(s), ${payload.notes.length} note(s), and ${payload.expenses.length} expense(s). Backup saved ${new Date(payload.savedAt).toLocaleString()}. Confirm to replace current app data.`;
      }
      if (preview) preview.hidden = false;
      showStorageStatus(
        "Import validated. Review the preview before replacing data.",
      );
    } catch (error) {
      console.error("Unable to read the selected StudyHub backup.", error);
      showStorageStatus(
        `Import was not prepared: ${error.message || "the file could not be read."}`,
        true,
      );
    } finally {
      input.value = "";
    }
  });

document.querySelector("#btn-confirm-import")?.addEventListener("click", () => {
  if (!pendingImport || !isValidPayload(pendingImport)) {
    showStorageStatus("There is no valid import to confirm.", true);
    closeImportPreview();
    return;
  }

  const recordCount =
    pendingImport.records.length + pendingImport.archivedRecords.length;
  applyPayload(pendingImport);
  persistenceBlocked = false;
  logAudit("IMPORT", "application", `Imported ${recordCount} task record(s)`);
  closeImportPreview();
  updateThemeControls();
  updatePreferenceControls();
  render();
  showStorageStatus("Backup imported and saved.");
});

document.querySelector("#btn-cancel-import")?.addEventListener("click", () => {
  closeImportPreview();
  showStorageStatus("Import cancelled. Current data was not changed.");
});

document.querySelector("#btn-reset-data")?.addEventListener("click", () => {
  const box = document.querySelector("#reset-confirm-box");
  const input = document.querySelector("#reset-confirm-input");
  if (box) box.hidden = false;
  if (input) {
    input.value = "";
    input.focus();
  }
  showStorageStatus(
    "Export a backup first if you may need to recover this data. Type RESET to continue.",
  );
});

document.querySelector("#btn-cancel-reset")?.addEventListener("click", () => {
  const box = document.querySelector("#reset-confirm-box");
  const input = document.querySelector("#reset-confirm-input");
  if (box) box.hidden = true;
  if (input) input.value = "";
  showStorageStatus("Reset cancelled. Current data was not changed.");
});

document.querySelector("#btn-confirm-reset")?.addEventListener("click", () => {
  const input = document.querySelector("#reset-confirm-input");
  if (input?.value !== "RESET") {
    showStorageStatus('Type "RESET" exactly to confirm the data reset.', true);
    input?.focus();
    return;
  }

  Object.assign(state, JSON.parse(JSON.stringify(DEFAULT_STATE)));
  state.preferences.theme = "dark";
  persistenceBlocked = false;
  closeImportPreview();
  const resetBox = document.querySelector("#reset-confirm-box");
  if (resetBox) resetBox.hidden = true;
  input.value = "";
  logAudit("RESET", "application", "Restored default app data");
  updateThemeControls();
  updatePreferenceControls();
  render();
  showStorageStatus("App data was reset to defaults.");
});

/* Initial deterministic render */
runPersistenceAssertions();
runDashboardMetricAssertions();
updatePreferenceControls();
render();
if (currentView === "admin") {
  renderAdminQA(runQualityAssuranceSuite());
}
runStableIdAssertions();
runWorkflowTransitionAssertions();

const CLASSROOMS_KEY = "studyhub-classes-v1";
const LEGACY_CLASSROOM_KEY = "studyhub-classroom-v1";

function syncClassroomAssignments() {
  if (currentView !== "student" || !session.userId) return false;

  let classes;
  try {
    const raw = localStorage.getItem(CLASSROOMS_KEY);
    classes = raw === null ? [] : JSON.parse(raw);
    if (!Array.isArray(classes)) {
      throw new Error("Saved classrooms must be a list.");
    }
  } catch (error) {
    console.error("Unable to load classroom assignments into Tasks.", error);
    showMessage("Classroom assignments could not be loaded into Tasks.");
    return false;
  }

  const priorAssignedTasks = getAllTasks().filter(
    (task) => task.classroomAssignmentId,
  );
  const priorByAssignment = new Map(
    priorAssignedTasks.map((task) => [task.classroomAssignmentId, task]),
  );
  const archivedAssignments = new Set(
    state.archivedRecords
      .filter((task) => task.classroomAssignmentId)
      .map((task) => task.classroomAssignmentId),
  );
  const assignedTasks = [];

  for (const item of classes) {
    if (
      !item ||
      !Array.isArray(item.studentIds) ||
      !item.studentIds.includes(session.userId) ||
      !Array.isArray(item.posts)
    ) {
      continue;
    }

    for (const post of item.posts) {
      if (
        !post ||
        post.type !== "Assignment" ||
        typeof post.id !== "string" ||
        !post.id ||
        typeof post.title !== "string"
      ) {
        continue;
      }

      const assignmentId = `${item.id}:${post.id}`;
      const previous = priorByAssignment.get(assignmentId);
      assignedTasks.push({
        id: previous?.id ?? `CLASS-${item.id}-${post.id}`,
        title: post.title,
        subject: item.subject || item.name || "Classroom assignment",
        description: post.body || "",
        dueDate: post.dueDate || "",
        priority: previous?.priority ?? "Medium",
        status: previous?.status ?? "To do",
        createdAt: post.createdAt || new Date().toISOString(),
        estimatedMinutes: previous?.estimatedMinutes ?? 30,
        workflowHistory: previous?.workflowHistory ?? [],
        classroomAssignmentId: assignmentId,
        classroomId: item.id,
        classroomName: item.name || "",
        teacherName: item.teacherName || "",
      });
    }
  }

  const currentAssignmentIds = new Set(
    assignedTasks.map((task) => task.classroomAssignmentId),
  );
  state.records = [
    ...state.records.filter((task) => !task.classroomAssignmentId),
    ...assignedTasks.filter(
      (task) => !archivedAssignments.has(task.classroomAssignmentId),
    ),
  ];
  state.archivedRecords = [
    ...state.archivedRecords.filter(
      (task) =>
        !task.classroomAssignmentId ||
        currentAssignmentIds.has(task.classroomAssignmentId),
    ),
    ...assignedTasks.filter((task) =>
      archivedAssignments.has(task.classroomAssignmentId),
    ),
  ];
  return true;
}

function readClassrooms() {
  try {
    const saved = localStorage.getItem(CLASSROOMS_KEY);
    if (saved === null) return [];
    const classes = JSON.parse(saved);
    if (!Array.isArray(classes)) {
      throw new Error("Saved classrooms must be a list.");
    }
    return classes;
  } catch (error) {
    console.error("Unable to load classroom data for teacher views.", error);
    showMessage("Classroom data could not be loaded.");
    return [];
  }
}

function getTeacherStudentNames() {
  try {
    const users = JSON.parse(localStorage.getItem("studyhub-users") || "[]");
    return new Map(
      users
        .filter((user) => user && typeof user.id === "string")
        .map((user) => [user.id, user.displayName || user.name || "Student"]),
    );
  } catch (error) {
    console.error("Unable to load classroom student names.", error);
    return new Map();
  }
}

function classroomStudentName(id, names) {
  return (
    names.get(id) ||
    (id === "student-001" ? "Student" : `Student (${id.slice(0, 8)})`)
  );
}

function clearLegacyTeacherSamples() {
  try {
    const raw = localStorage.getItem(LEGACY_CLASSROOM_KEY);
    if (raw === null) return;
    const saved = JSON.parse(raw);
    if (
      !saved ||
      !Array.isArray(saved.students) ||
      !Array.isArray(saved.assignments) ||
      !Array.isArray(saved.submissions)
    ) {
      return;
    }

    const cleaned = {
      ...saved,
      students: saved.students.filter(
        (student) =>
          !(
            (student?.id === "STU-001" && student.name === "Student") ||
            (student?.id === "STU-002" && student.name === "Student 002") ||
            (student?.id === "STU-003" && student.name === "Student 003")
          ),
      ),
      assignments: saved.assignments.filter(
        (assignment) =>
          !(
            assignment?.id === "ASG-001" &&
            assignment.title === "Circuit Analysis Practice" &&
            assignment.subject === "Fundamentals of Electrical Circuits"
          ),
      ),
      submissions: saved.submissions.filter(
        (submission) =>
          !(
            submission?.id === "SUB-001" &&
            submission.assignmentId === "ASG-001" &&
            submission.studentId === "STU-002" &&
            submission.response ===
              "Sample demonstration response for circuit analysis practice."
          ),
      ),
    };
    if (
      cleaned.students.length !== saved.students.length ||
      cleaned.assignments.length !== saved.assignments.length ||
      cleaned.submissions.length !== saved.submissions.length
    ) {
      localStorage.setItem(LEGACY_CLASSROOM_KEY, JSON.stringify(cleaned));
    }
  } catch (error) {
    console.error("Unable to clear built-in teacher sample data.", error);
    showMessage("Built-in teacher sample data could not be cleared.");
  }
}

function renderClassroom() {
  const classes = readClassrooms().filter(
    (classroom) => classroom?.teacherId === session.userId,
  );
  const studentNames = getTeacherStudentNames();
  const students = new Map();
  const assignments = [];
  const submissions = [];

  for (const classroom of classes) {
    const studentIds = Array.isArray(classroom.studentIds)
      ? [
          ...new Set(
            classroom.studentIds.filter((id) => typeof id === "string"),
          ),
        ]
      : [];
    const posts = Array.isArray(classroom.posts) ? classroom.posts : [];
    const classSubmissions = Array.isArray(classroom.submissions)
      ? classroom.submissions
      : [];

    for (const studentId of studentIds) {
      if (!students.has(studentId)) {
        students.set(studentId, {
          id: studentId,
          name: classroomStudentName(studentId, studentNames),
          submitted: 0,
          reviewed: 0,
        });
      }
    }

    for (const post of posts) {
      if (
        !post ||
        post.type !== "Assignment" ||
        typeof post.id !== "string" ||
        typeof post.title !== "string"
      ) {
        continue;
      }

      const assignment = {
        classId: classroom.id,
        className: classroom.name || "Classroom",
        postId: post.id,
        title: post.title,
        studentCount: studentIds.length,
        submissions: [],
      };

      for (const submission of classSubmissions) {
        if (
          !submission ||
          submission.postId !== post.id ||
          typeof submission.studentId !== "string" ||
          !studentIds.includes(submission.studentId)
        ) {
          continue;
        }

        const hasScore =
          submission.score !== null &&
          submission.score !== undefined &&
          submission.score !== "" &&
          Number.isFinite(Number(submission.score));
        const student = students.get(submission.studentId);
        const normalized = {
          ...submission,
          classId: classroom.id,
          className: assignment.className,
          assignmentId: post.id,
          assignmentTitle: post.title,
          studentName:
            student?.name ||
            classroomStudentName(submission.studentId, studentNames),
          reviewed: hasScore,
        };
        assignment.submissions.push(normalized);
        submissions.push(normalized);
        if (student) {
          student.submitted += 1;
          if (hasScore) student.reviewed += 1;
        }
      }

      assignments.push(assignment);
    }
  }

  const reviewed = submissions.filter((submission) => submission.reviewed);
  const studentList = [...students.values()];
  setText("#teacher-total-students", studentList.length);
  setText("#teacher-active-assignments", assignments.length);
  setText("#teacher-total-submissions", submissions.length);
  setText("#teacher-pending-reviews", submissions.length - reviewed.length);
  const recent = document.querySelector("#teacher-recent-submissions");
  if (recent)
    recent.innerHTML = submissions.length
      ? [...submissions]
          .sort(
            (a, b) =>
              (Date.parse(b.submittedAt) || 0) -
              (Date.parse(a.submittedAt) || 0),
          )
          .slice(0, 5)
          .map(
            (submission) =>
              `<div class="teacher-list-item"><strong>${escapeHTML(submission.studentName)}</strong><p>${escapeHTML(submission.assignmentTitle)} · ${escapeHTML(submission.className)} · ${submission.reviewed ? "Reviewed" : "Pending review"}</p></div>`,
          )
          .join("")
      : "<p>No submissions yet.</p>";
  const sr = document.querySelector("#teacher-student-rows");
  if (sr)
    sr.innerHTML =
      studentList
        .map(
          (student) =>
            `<tr><td>${escapeHTML(student.name)}</td><td>${student.submitted}</td><td>${student.reviewed}</td></tr>`,
        )
        .join("") ||
      '<tr><td colspan="3">No students have joined your classrooms yet.</td></tr>';
  const subr = document.querySelector("#teacher-submission-rows");
  if (subr)
    subr.innerHTML =
      submissions
        .slice()
        .sort(
          (a, b) =>
            (Date.parse(b.submittedAt) || 0) - (Date.parse(a.submittedAt) || 0),
        )
        .map((submission) => {
          const submittedAt = Date.parse(submission.submittedAt);
          const submittedLabel = Number.isNaN(submittedAt)
            ? "Unknown date"
            : new Date(submittedAt).toLocaleString();
          return `<tr><td>${escapeHTML(submission.studentName)}</td><td>${escapeHTML(submission.className)}</td><td>${escapeHTML(submission.assignmentTitle)}</td><td>${escapeHTML(submittedLabel)}</td><td>${submission.reviewed ? "Reviewed" : "Pending review"}</td><td><details><summary>${submission.reviewed ? "View grade" : "Review submission"}</summary><p>${escapeHTML(submission.response)}</p><form class="teacher-grade-form" data-class-submission-id="${escapeHTML(submission.id)}" data-class-id="${escapeHTML(submission.classId)}"><div><label>Score (0–100)</label><input type="number" name="score" min="0" max="100" required value="${submission.reviewed ? escapeHTML(submission.score) : ""}"></div><div><label>Feedback</label><textarea name="feedback" rows="2" maxlength="1000">${escapeHTML(submission.feedback || "")}</textarea></div><button type="submit">Save review</button></form></details></td></tr>`;
        })
        .join("") || '<tr><td colspan="6">No submissions yet.</td></tr>';
  const fr = document.querySelector("#teacher-feedback-rows");
  if (fr)
    fr.innerHTML =
      reviewed
        .map(
          (submission) =>
            `<tr><td>${escapeHTML(submission.studentName)}</td><td>${escapeHTML(submission.className)}</td><td>${escapeHTML(submission.assignmentTitle)}</td><td>${escapeHTML(submission.score)}/100</td><td>${escapeHTML(submission.feedback || "—")}</td></tr>`,
        )
        .join("") ||
      '<tr><td colspan="5">No reviewed submissions yet.</td></tr>';
  const possible = assignments.reduce(
    (total, assignment) => total + assignment.studentCount,
    0,
  );
  setText(
    "#teacher-submission-rate",
    `${possible ? Math.min(100, Math.round((submissions.length / possible) * 100)) : 0}%`,
  );
  setText(
    "#teacher-review-rate",
    `${submissions.length ? Math.round((reviewed.length / submissions.length) * 100) : 0}%`,
  );
  setText(
    "#teacher-average-grade",
    reviewed.length
      ? `${Math.round(reviewed.reduce((sum, s) => sum + Number(s.score), 0) / reviewed.length)}/100`
      : "—",
  );
  const bars = document.querySelector("#teacher-analytics-bars");
  if (bars)
    bars.innerHTML =
      assignments
        .map((assignment) => {
          const count = assignment.submissions.length;
          const pct = assignment.studentCount
            ? Math.min(100, Math.round((count / assignment.studentCount) * 100))
            : 0;
          return `<div class="bar-row"><span class="bar-label">${escapeHTML(assignment.title)} · ${escapeHTML(assignment.className)}</span><div class="bar-track"><span class="bar-fill" style="width:${pct}%"></span></div><span class="bar-count">${count}/${assignment.studentCount}</span></div>`;
        })
        .join("") || "<p>No assignments yet.</p>";
}

document.querySelector("#app")?.addEventListener("submit", (e) => {
  const form = e.target;
  if (form.matches("[data-class-submission-id]") && currentView === "teacher") {
    e.preventDefault();
    const data = new FormData(form);
    const score = Number(data.get("score"));
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      showMessage("Enter a score from 0 to 100.");
      return;
    }

    try {
      const classes = readClassrooms();
      const classroom = classes.find(
        (item) =>
          item?.id === form.dataset.classId &&
          item.teacherId === session.userId,
      );
      const submission = classroom?.submissions?.find(
        (item) => item.id === form.dataset.classSubmissionId,
      );
      if (!classroom || !submission) {
        showMessage("That classroom submission could not be found.");
        return;
      }

      submission.score = score;
      submission.feedback = String(data.get("feedback") || "").trim();
      localStorage.setItem(CLASSROOMS_KEY, JSON.stringify(classes));
    } catch (error) {
      console.error("Unable to save classroom submission review.", error);
      showMessage("The submission review could not be saved.");
      return;
    }

    window.dispatchEvent(new Event("studyhub:classrooms-updated"));
    showMessage("Submission reviewed and graded.");
  }
});
window.addEventListener("storage", (e) => {
  if (e.key === CLASSROOMS_KEY) {
    if (currentView === "teacher") renderClassroom();
    if (syncClassroomAssignments()) render();
  }
});
window.addEventListener("studyhub:classrooms-updated", () => {
  if (currentView === "teacher") {
    renderClassroom();
  }
  if (syncClassroomAssignments()) render();
});
if (syncClassroomAssignments()) render();
clearLegacyTeacherSamples();
renderClassroom();

/* Dev-only role switch — only enable when ?dev=1 in URL */
if (new URLSearchParams(location.search).has('dev')) {
  const devSwitch = document.querySelector('#dev-role-switch');
  const devSelect = document.querySelector('#dev-role');
  if (devSwitch && devSelect) {
    devSwitch.style.display = 'flex';
    // Set dropdown to current effective role (real or override)
    devSelect.value = session.role;
    devSelect.addEventListener('change', () => {
      const role = devSelect.value;
      if (role === '__clear__') {
        // Clear override, return to real role
        sessionStorage.removeItem('devRoleOverride');
        // Also sync in-memory session immediately so guards work NOW
        const realUser = AUTH.getSessionUser();
        if (realUser) {
          session.role = realUser.role;
          currentUser = { ...realUser };
        }
        showMessage('Dev override cleared. Reloading as real role…');
      } else {
        // Persist dev role override so it survives page reload
        sessionStorage.setItem('devRoleOverride', role);
        // IMMEDIATELY sync in-memory session so allowed() works NOW (before reload)
        session.role = role;
        currentUser = { ...currentUser, role };
        showMessage(`Dev role → ${role}. Guards active. Reloading in 10s…`);
      }
      // Small delay so you can test immediate guards, then FORCE reload
      setTimeout(() => {
        try {
          // Use location.reload() to force navigation even if URL unchanged
          console.log('[dev-switch] Forcing reload...');
          location.reload();
        } catch (e) {
          console.error('[dev-switch] Reload failed:', e);
          showMessage('Reload failed. Check console.');
        }
      }, 10000);
    });
  }
}
