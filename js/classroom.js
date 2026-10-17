/* StudyHub Classroom: local-browser demonstration */
(() => {
  "use strict";
  const user = window.StudyHubAuth?.getSessionUser?.();
  if (!user || !["student", "teacher"].includes(user.role)) return;
  const KEY = "studyhub-classes-v1";
  const $ = (s) => document.querySelector(s);
  const escape = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const uid = () =>
    crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  let active = null;
  const read = () => {
    try {
      const x = JSON.parse(localStorage.getItem(KEY));
      return Array.isArray(x) ? x : [];
    } catch {
      return [];
    }
  };
  let classes = read();
  const notice = (message) => {
    const el = $(
      user.role === "teacher"
        ? "#classroom-notice"
        : "#student-classroom-notice",
    );
    if (el) {
      el.textContent = message;
      el.hidden = false;
    }
  };
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(classes));
      window.dispatchEvent(new Event("studyhub:classrooms-updated"));
      render();
      return true;
    } catch {
      notice("Unable to save. Check browser storage settings.");
      return false;
    }
  };
  const owned = (c) => c.teacherId === user.id;
  const enrolled = (c) => (c.studentIds || []).includes(user.id);
  const canSee = (c) => owned(c) || enrolled(c);
  const code = () => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out;
    do {
      const bytes = new Uint8Array(7);
      crypto.getRandomValues(bytes);
      out = [...bytes].map((x) => alphabet[x % alphabet.length]).join("");
    } while (classes.some((c) => c.code === out));
    return out;
  };
  const find = (id) => classes.find((c) => c.id === id && canSee(c));
  const current = () => find(active);
  const date = (v) => (v ? new Date(v).toLocaleDateString() : "No due date");
  function tile(c) {
    const count = (c.studentIds || []).length;
    return `<article class="classroom-tile"><div class="classroom-tile-head"><h3>${escape(c.name)}</h3><p>${escape(c.section || "No section")}</p><p>${escape(c.subject || "")}</p></div><div class="classroom-tile-body"><p>${user.role === "teacher" ? `${count} enrolled student${count === 1 ? "" : "s"}` : `Teacher: ${escape(c.teacherName)}`}</p><button type="button" data-class-action="open" data-id="${escape(c.id)}">Open classroom →</button></div></article>`;
  }
  function render() {
    classes = read();
    const list =
      user.role === "teacher"
        ? classes.filter(owned)
        : classes.filter(enrolled);
    const grid = $(
      user.role === "teacher" ? "#teacher-class-cards" : "#student-class-cards",
    );
    if (grid)
      grid.innerHTML = list.length
        ? list.map(tile).join("")
        : `<div class="classroom-empty">${user.role === "teacher" ? "No classes yet. Create your first class." : "You have not joined any classes yet. Use a class code to join."}</div>`;
    const detail = $(
      user.role === "teacher"
        ? "#teacher-class-detail"
        : "#student-class-detail",
    );
    if (!detail) return;
    const c = current();
    detail.hidden = !c;
    if (!c) {
      detail.innerHTML = "";
      return;
    }
    const teacher = owned(c);
    const posts = (c.posts || [])
      .slice()
      .reverse()
      .map(
        (p) =>
          `<article class="classroom-post"><small>${escape(p.type)} · ${date(p.createdAt)}</small><h4>${escape(p.title)}</h4><p>${escape(p.body)}</p>${p.type === "Assignment" ? `<small>Due: ${escape(p.dueDate || "Not set")}</small>` : ""}${teacher ? `<div class="classroom-actions"><button type="button" data-class-action="delete-post" data-post-id="${escape(p.id)}">Delete post</button></div>` : p.type === "Assignment" ? submissionForm(c, p) : ""}</article>`,
      )
      .join("");
    const roster = teacher
      ? `<div class="content-card"><h3>People · ${c.studentIds.length} student(s)</h3>${c.studentIds.length ? c.studentIds.map((id) => `<div class="classroom-post">${escape(lookupName(id))} <button type="button" data-class-action="remove-student" data-student-id="${escape(id)}">Remove</button></div>`).join("") : '<p class="section-note">Share the class code to invite students.</p>'}</div>`
      : "";
    const compose = teacher
      ? `<div class="content-card"><h3>Share with your class</h3><form id="class-post-form" class="classroom-form"><div><label>Post type</label><select name="type"><option>Announcement</option><option>Assignment</option></select></div><div><label>Title</label><input name="title" required maxlength="120" /></div><div style="flex-basis:100%"><label>Message / instructions</label><textarea name="body" maxlength="3000" required></textarea></div><div><label>Due date (assignments)</label><input name="dueDate" type="date" /></div><button type="submit">Publish</button></form></div>`
      : "";
    const grades = teacher ? renderSubmissions(c) : "";
    detail.innerHTML = `<div class="classroom-banner"><button type="button" data-class-action="back">← All classes</button><h3>${escape(c.name)}</h3><p>${escape(c.section || "")} ${escape(c.subject || "")}</p>${teacher ? `<span class="classroom-code">Class code: ${escape(c.code)}</span><div class="classroom-actions"><button type="button" data-class-action="copy">Copy code</button><button type="button" data-class-action="delete-class">Delete class</button></div>` : `<p>Teacher: ${escape(c.teacherName)}</p><div class="classroom-actions"><button type="button" data-class-action="leave">Leave class</button></div>`}</div>${compose}<div class="content-card"><h3>Stream & classwork</h3>${posts || '<p class="section-note">No posts yet.</p>'}</div>${grades}${roster}`;
  }
  function lookupName(id) {
    try {
      const users = JSON.parse(localStorage.getItem("studyhub-users")) || [];
      return (
        users.find((u) => u.id === id)?.displayName ||
        (id === "student-001" ? "Student" : `Student (${id.slice(0, 8)})`)
      );
    } catch {
      return "Student";
    }
  }
  function submissionForm(c, p) {
    const s = (c.submissions || []).find(
      (x) => x.postId === p.id && x.studentId === user.id,
    );
    return `<div class="classroom-post"><strong>${s ? "Your submission" : "Turn in your work"}</strong>${s ? `<p>${escape(s.response)}</p><small>${s.score === null ? "Submitted · Awaiting review" : `Grade: ${escape(s.score)}/100 · ${escape(s.feedback || "No feedback")}`}</small>` : `<form class="classroom-form" data-class-submit="${escape(p.id)}"><div style="flex-basis:100%"><label>Your response</label><textarea name="response" required maxlength="5000"></textarea></div><button type="submit">Turn in</button></form>`}</div>`;
  }
  function renderSubmissions(c) {
    const items = c.submissions || [];
    return `<div class="content-card"><h3>Student submissions (${items.length})</h3>${
      items.length
        ? items
            .map((s) => {
              const p = c.posts.find((p) => p.id === s.postId);
              return `<article class="classroom-post"><h4>${escape(lookupName(s.studentId))} — ${escape(p?.title || "Deleted assignment")}</h4><p>${escape(s.response)}</p><small>${date(s.submittedAt)} · ${s.score === null ? "Pending review" : `Graded ${escape(s.score)}/100`}</small><form class="classroom-form" data-class-grade="${escape(s.id)}"><div><label>Score / 100</label><input name="score" type="number" min="0" max="100" required value="${s.score === null ? "" : escape(s.score)}" /></div><div><label>Feedback</label><input name="feedback" maxlength="1000" value="${escape(s.feedback || "")}" /></div><button type="submit">Save grade</button></form></article>`;
            })
            .join("")
        : '<p class="section-note">No submissions yet.</p>'
    }</div>`;
  }
  $("#class-create-toggle")?.addEventListener("click", () => {
    $("#class-create-form").hidden = false;
  });
  $("#class-create-cancel")?.addEventListener("click", () => {
    $("#class-create-form").hidden = true;
  });
  $("#class-join-toggle")?.addEventListener("click", () => {
    $("#class-join-form").hidden = false;
  });
  $("#class-join-cancel")?.addEventListener("click", () => {
    $("#class-join-form").hidden = true;
  });
  $("#class-create-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = new FormData(e.target);
    const name = String(d.get("name") || "").trim();
    if (!name) return;
    classes = read();
    classes.push({
      id: uid(),
      name,
      section: String(d.get("section") || "").trim(),
      subject: String(d.get("subject") || "").trim(),
      code: code(),
      teacherId: user.id,
      teacherName: user.displayName,
      studentIds: [],
      posts: [],
      submissions: [],
    });
    if (save()) {
      e.target.reset();
      e.target.hidden = true;
      notice("Class created. Open it to copy your class code.");
    }
  });
  $("#class-join-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const code = String(new FormData(e.target).get("code") || "")
      .trim()
      .toUpperCase();
    classes = read();
    const c = classes.find((c) => c.code === code);
    if (!c) {
      notice("Class code not found. Check the code and try again.");
      return;
    }
    if (enrolled(c)) {
      notice("You are already enrolled in this class.");
      return;
    }
    c.studentIds.push(user.id);
    if (save()) {
      e.target.reset();
      e.target.hidden = true;
      notice(`Joined ${c.name}.`);
    }
  });
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-class-action]");
    if (!btn) return;
    const action = btn.dataset.classAction;
    classes = read();
    const c = current();
    if (action === "open") {
      active = btn.dataset.id;
      render();
      return;
    }
    if (action === "back") {
      active = null;
      render();
      return;
    }
    if (!c) return;
    if (action === "copy" && owned(c)) {
      try {
        await navigator.clipboard.writeText(c.code);
        notice("Class code copied.");
      } catch {
        notice(`Class code: ${c.code}`);
      }
      return;
    }
    if (
      action === "delete-class" &&
      owned(c) &&
      confirm("Delete this class and all its posts and submissions?")
    ) {
      classes = classes.filter((x) => x.id !== c.id);
      active = null;
      save();
      return;
    }
    if (action === "leave" && enrolled(c) && confirm("Leave this class?")) {
      c.studentIds = c.studentIds.filter((x) => x !== user.id);
      c.submissions = c.submissions.filter((x) => x.studentId !== user.id);
      active = null;
      save();
      return;
    }
    if (action === "delete-post" && owned(c) && confirm("Delete this post?")) {
      c.posts = c.posts.filter((p) => p.id !== btn.dataset.postId);
      c.submissions = c.submissions.filter(
        (s) => s.postId !== btn.dataset.postId,
      );
      save();
      return;
    }
    if (
      action === "remove-student" &&
      owned(c) &&
      confirm("Remove this student?")
    ) {
      c.studentIds = c.studentIds.filter((id) => id !== btn.dataset.studentId);
      c.submissions = c.submissions.filter(
        (s) => s.studentId !== btn.dataset.studentId,
      );
      save();
    }
  });
  document.addEventListener("submit", (e) => {
    const f = e.target;
    if (f.id === "class-post-form") {
      e.preventDefault();
      classes = read();
      const c = current();
      if (!c || !owned(c)) return;
      const d = new FormData(f),
        title = String(d.get("title") || "").trim(),
        body = String(d.get("body") || "").trim();
      if (!title || !body) return;
      c.posts.push({
        id: uid(),
        type: d.get("type") === "Assignment" ? "Assignment" : "Announcement",
        title,
        body,
        dueDate: String(d.get("dueDate") || ""),
        createdAt: new Date().toISOString(),
      });
      save();
      notice("Post published.");
    } else if (f.matches("[data-class-submit]")) {
      e.preventDefault();
      classes = read();
      const c = current(),
        postId = f.dataset.classSubmit,
        response = String(new FormData(f).get("response") || "").trim();
      if (
        !c ||
        !enrolled(c) ||
        !response ||
        !c.posts.some((p) => p.id === postId && p.type === "Assignment") ||
        c.submissions.some(
          (s) => s.postId === postId && s.studentId === user.id,
        )
      )
        return;
      c.submissions.push({
        id: uid(),
        postId,
        studentId: user.id,
        response,
        submittedAt: new Date().toISOString(),
        score: null,
        feedback: "",
      });
      save();
      notice("Work turned in successfully.");
    } else if (f.matches("[data-class-grade]")) {
      e.preventDefault();
      classes = read();
      const c = current();
      if (!c || !owned(c)) return;
      const s = c.submissions.find((x) => x.id === f.dataset.classGrade),
        d = new FormData(f),
        score = Number(d.get("score"));
      if (!s || !Number.isFinite(score) || score < 0 || score > 100) return;
      s.score = score;
      s.feedback = String(d.get("feedback") || "").trim();
      save();
      notice("Grade saved.");
    }
  });
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) render();
  });
  window.addEventListener("studyhub:classrooms-updated", render);
  render();
})();
