import type { AuthSession, User } from "../types/auth";

const AUTH_STORAGE_KEY = "fiduciary-duty-auth-users";

function defaultUsers(): User[] {
  return [
    {
      id: "manager-admin",
      username: "Admin",
      password: "Admin01",
      displayName: "Admin",
      role: "manager",
      mustChangePassword: true,
      createdAt: Date.now()
    }
  ];
}

export function loadMockUsers(): User[] {
  if (typeof localStorage === "undefined") {
    return defaultUsers();
  }

  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      const users = defaultUsers();
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(users));
      return users;
    }

    const parsed = JSON.parse(raw) as User[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultUsers();
  } catch {
    return defaultUsers();
  }
}

export function saveMockUsers(users: User[]) {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(users));
}

export function authenticateMockUser(users: User[], username: string, password: string): AuthSession | null {
  const match = users.find((user) => user.username.toLowerCase() === username.trim().toLowerCase() && user.password === password);
  if (!match) {
    return null;
  }

  return {
    userId: match.id,
    username: match.username,
    displayName: match.displayName,
    role: match.role,
    authenticatedAt: Date.now(),
    mustChangePassword: match.mustChangePassword
  };
}

export function createEmployeeUser(users: User[], input: { displayName: string; username: string; password: string }): User[] {
  const usernameTaken = users.some((user) => user.username.toLowerCase() === input.username.trim().toLowerCase());
  if (usernameTaken) {
    throw new Error("That username is already assigned.");
  }

  return [
    ...users,
    {
      id: `employee-${Date.now()}`,
      username: input.username.trim(),
      password: input.password,
      displayName: input.displayName.trim(),
      role: "employee",
      mustChangePassword: false,
      createdAt: Date.now()
    }
  ];
}

export function removeEmployeeUser(users: User[], userId: string): User[] {
  return users.filter((user) => user.id !== userId || user.role === "manager");
}

export function changeUserPassword(
  users: User[],
  userId: string,
  nextPassword: string,
  currentPassword?: string
): User[] {
  return users.map((user) => {
    if (user.id !== userId) {
      return user;
    }

    if (typeof currentPassword === "string" && user.password !== currentPassword) {
      throw new Error("Current password is incorrect.");
    }

    return {
      ...user,
      password: nextPassword,
      mustChangePassword: false
    };
  });
}
