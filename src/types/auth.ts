export type Role = "employee" | "manager";

export interface User {
  id: string;
  username: string;
  password: string;
  displayName: string;
  role: Role;
  mustChangePassword: boolean;
  createdAt: number;
}

export interface AuthSession {
  userId: string;
  username: string;
  displayName: string;
  role: Role;
  authenticatedAt: number;
  mustChangePassword: boolean;
}

export interface ManagerDashboardState {
  newEmployeeName: string;
  newEmployeeUsername: string;
  newEmployeePassword: string;
  passwordChangeCurrent: string;
  passwordChangeNext: string;
  passwordChangeConfirm: string;
  error: string | null;
}
