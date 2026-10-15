/* Client-side prototype only: browser-stored roles are not production auth. */
(() => {
  const SESSION_KEY = "studyhub-session";
  const USERS_KEY = "studyhub-users";
  const MAX_FAILED_LOGINS = 5;
  const LOCKOUT_MS = 30000;

  const ROLES = {
    admin: { label: "Administrator", view: "admin" },
    student: { label: "Student", view: "student" },
    teacher: { label: "Teacher", view: "teacher" },
  };

  const DEFAULT_USERS = [
    {
      id: "admin-001",
      username: "admin",
      displayName: "Admin",
      role: "admin",
      passwordHash:
        "9f75113838510c02f916ffc95d7b903078d74c35d9912ec30c2a4866cbcc0d83",
    },
    {
      id: "student-001",
      username: "student",
      displayName: "Student",
      role: "student",
      passwordHash:
        "652cb50427667500e55bade9c407dd0f648e4b80c423bb5a4c18231c5e88a636",
    },
    {
      id: "teacher-001",
      username: "teacher",
      displayName: "Teacher",
      role: "teacher",
      passwordHash:
        "c35bf2952e5a35a88721cf03349803358d2b7d84ba5def8a0b8d2f1567c2464a",
    },
  ];

  function storageError(action, error) {
    return new Error(
      `Unable to ${action} in this browser. Check your storage settings and try again.`,
      { cause: error },
    );
  }

  function getRegisteredUsers() {
    let raw;
    try {
      raw = localStorage.getItem(USERS_KEY);
    } catch (error) {
      throw storageError("read saved accounts", error);
    }

    if (!raw) return [];

    let users;
    try {
      users = JSON.parse(raw);
    } catch (error) {
      throw new Error(
        "Saved account data is invalid. Clear this site's stored data to continue.",
        { cause: error },
      );
    }

    if (
      !Array.isArray(users) ||
      users.some(
        (user) =>
          !user ||
          typeof user.id !== "string" ||
          typeof user.username !== "string" ||
          typeof user.displayName !== "string" ||
          !["student", "teacher"].includes(user.role) ||
          typeof user.passwordHash !== "string",
      )
    ) {
      throw new Error(
        "Saved account data is invalid. Clear this site's stored data to continue.",
      );
    }

    return users;
  }

  function allUsers() {
    return [...DEFAULT_USERS, ...getRegisteredUsers()];
  }

  function readSessionUserId() {
    let raw;
    try {
      raw = sessionStorage.getItem(SESSION_KEY);
    } catch (error) {
      throw storageError("read the current sign-in", error);
    }

    if (!raw) return null;

    try {
      const userId = JSON.parse(raw)?.userId;
      if (typeof userId === "string") return userId;
      clearSession();
      return null;
    } catch {
      clearSession();
      return null;
    }
  }

  function clearSession() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (error) {
      throw storageError("clear the current sign-in", error);
    }
  }

  function getSessionUser() {
    const id = readSessionUserId();
    if (!id) return null;
    const user = allUsers().find((entry) => entry.id === id) ?? null;
    if (!user) clearSession();
    return user;
  }

  async function sha256Hex(text) {
    if (!crypto.subtle) {
      throw new Error("Sign-in needs a secure page (https or localhost).");
    }
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  async function authenticate(username, password) {
    const name = username.trim().toLowerCase();
    const user = allUsers().find((entry) => entry.username === name);
    const hash = await sha256Hex(`studyhub:${name}:${password}`);
    return user && user.passwordHash === hash ? user : null;
  }

  function saveRegisteredUsers(users) {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch (error) {
      throw storageError("save this account", error);
    }
  }

  function setSession(user) {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id }));
    } catch (error) {
      throw storageError("keep this sign-in", error);
    }
  }

  function displayMessage(message) {
    const box = document.querySelector("#auth-error");
    if (!box) return;
    box.textContent = message;
    box.hidden = !message;
  }

  function setUpPasswordToggles() {
    document.querySelectorAll("[data-password-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const input = document.querySelector(button.dataset.passwordToggle);
        if (!input) return;
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        button.textContent = show ? "Hide" : "Show";
        button.setAttribute(
          "aria-label",
          `${show ? "Hide" : "Show"} password`,
        );
      });
    });
  }

  function setUpAuthForms() {
    const loginForm = document.querySelector("#login-form");
    const signupForm = document.querySelector("#signup-form");
    if (!loginForm && !signupForm) return;

    setUpPasswordToggles();

    try {
      if (getSessionUser()) {
        window.location.replace("index.html");
        return;
      }
    } catch (error) {
      displayMessage(error.message);
    }

    let failedLogins = 0;
    let lockedUntil = 0;

    if (loginForm) {
      loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const remainingMs = lockedUntil - Date.now();
        if (remainingMs > 0) {
          displayMessage(
            `Too many attempts. Try again in ${Math.ceil(remainingMs / 1000)} seconds.`,
          );
          return;
        }

        const data = new FormData(loginForm);
        const username = String(data.get("username") ?? "");
        const password = String(data.get("password") ?? "");
        const selectedRole = String(data.get("role") ?? "student");
        if (!username.trim() || !password) {
          displayMessage("Enter your username and password.");
          return;
        }

        let user;
        try {
          user = await authenticate(username, password);
        } catch (error) {
          displayMessage(error.message);
          return;
        }

        if (user && user.role !== "admin" && user.role !== selectedRole) {
          displayMessage("The selected role does not match this account.");
          loginForm.elements.password.value = "";
          return;
        }

        if (!user) {
          failedLogins += 1;
          loginForm.elements.password.value = "";
          if (failedLogins >= MAX_FAILED_LOGINS) {
            failedLogins = 0;
            lockedUntil = Date.now() + LOCKOUT_MS;
            displayMessage("Too many attempts. Try again in 30 seconds.");
          } else {
            displayMessage("Incorrect username or password.");
          }
          return;
        }

        try {
          setSession(user);
        } catch (error) {
          displayMessage(error.message);
          return;
        }
        window.location.href = "index.html";
      });
    }

    if (signupForm) {
      signupForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = new FormData(signupForm);
        const displayName = String(data.get("displayName") ?? "").trim();
        const username = String(data.get("email") ?? "").trim().toLowerCase();
        const password = String(data.get("password") ?? "");
        const role = String(data.get("role") ?? "");

        if (
          !displayName ||
          !username ||
          !password ||
          !["student", "teacher"].includes(role)
        ) {
          displayMessage("Complete every field and choose Student or Teacher.");
          return;
        }
        if (password.length < 8) {
          displayMessage("Choose a password with at least 8 characters.");
          return;
        }

        try {
          const registeredUsers = getRegisteredUsers();
          const emailExists = [...DEFAULT_USERS, ...registeredUsers].some(
            (user) => user.username.toLowerCase() === username,
          );
          if (emailExists) {
            displayMessage("An account with this email already exists.");
            return;
          }

          const user = {
            id: crypto.randomUUID(),
            username,
            displayName,
            role,
            passwordHash: await sha256Hex(`studyhub:${username}:${password}`),
          };
          saveRegisteredUsers([...registeredUsers, user]);
          try {
            setSession(user);
          } catch (error) {
            displayMessage(
              `Account created, but ${error.message.toLowerCase()} Please sign in.`,
            );
            return;
          }
          window.location.href = "index.html";
        } catch (error) {
          displayMessage(error.message);
        }
      });
    }
  }

  window.StudyHubAuth = {
    ROLES,
    clearSession,
    getSessionUser,
  };

  setUpAuthForms();
})();
