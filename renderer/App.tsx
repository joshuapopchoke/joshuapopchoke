import { useMemo, useState } from "react";
import { EmployeeAppView } from "../src/components/EmployeeAppView";
import { LoginScreen } from "../src/components/LoginScreen";
import { ManagerDashboard } from "../src/components/ManagerDashboard";
import { authenticateMockUser, changeUserPassword, createEmployeeUser, loadMockUsers, removeEmployeeUser, saveMockUsers } from "../src/engine/mockAuthEngine";
import { useGameStore } from "../src/store/gameStore";
import type { AuthSession, User } from "../src/types/auth";
import type { TraineeProfile } from "../src/types/gameState";

function buildTraineeProfile(user: User): TraineeProfile {
  return {
    id: user.id,
    name: user.displayName,
    role: user.role === "manager" ? "Manager" : "Trainee",
    createdAt: user.createdAt
  };
}

export default function App() {
  const [users, setUsers] = useState<User[]>(() => loadMockUsers());
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const upsertTrainee = useGameStore((state) => state.upsertTrainee);
  const removeTrainee = useGameStore((state) => state.removeTrainee);
  const setActiveTrainee = useGameStore((state) => state.setActiveTrainee);

  const managerUser = useMemo(() => users.find((user) => user.role === "manager") ?? null, [users]);

  const handleLogin = (username: string, password: string) => {
    const nextSession = authenticateMockUser(users, username, password);
    if (!nextSession) {
      setAuthError("Invalid username or password.");
      return;
    }

    setAuthError(null);
    setSession(nextSession);

    if (nextSession.role === "employee") {
      const traineeUser = users.find((user) => user.id === nextSession.userId);
      if (traineeUser) {
        upsertTrainee(buildTraineeProfile(traineeUser));
        setActiveTrainee(traineeUser.id);
      }
    }
  };

  const handleLogout = () => {
    setSession(null);
    setAuthError(null);
  };

  const handleAddEmployee = (input: { displayName: string; username: string; password: string }) => {
    const nextUsers = createEmployeeUser(users, input);
    const newUser = nextUsers[nextUsers.length - 1];
    setUsers(nextUsers);
    saveMockUsers(nextUsers);
    upsertTrainee(buildTraineeProfile(newUser));
  };

  const handleRemoveEmployee = (userId: string) => {
    const nextUsers = removeEmployeeUser(users, userId);
    setUsers(nextUsers);
    saveMockUsers(nextUsers);
    removeTrainee(userId);
  };

  const handleChangeManagerPassword = (currentPassword: string, nextPassword: string) => {
    if (!managerUser) {
      throw new Error("Manager account is unavailable.");
    }

    const nextUsers = changeUserPassword(users, managerUser.id, nextPassword, currentPassword);
    setUsers(nextUsers);
    saveMockUsers(nextUsers);
    setSession((previous) => previous && previous.userId === managerUser.id
      ? {
          ...previous,
          mustChangePassword: false
        }
      : previous);
  };

  if (!session) {
    return <LoginScreen error={authError} onLogin={handleLogin} />;
  }

  if (session.role === "manager") {
    const currentManager = users.find((user) => user.id === session.userId) ?? managerUser;
    if (!currentManager) {
      return <LoginScreen error="Manager account could not be loaded." onLogin={handleLogin} />;
    }

    return (
      <ManagerDashboard
        currentUser={currentManager}
        users={users}
        onLogout={handleLogout}
        onAddEmployee={handleAddEmployee}
        onRemoveEmployee={handleRemoveEmployee}
        onChangeManagerPassword={handleChangeManagerPassword}
      />
    );
  }

  return <EmployeeAppView onLogout={handleLogout} />;
}
