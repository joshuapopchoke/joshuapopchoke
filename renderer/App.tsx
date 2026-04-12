import { useEffect, useMemo, useState } from "react";
import { EmployeeAppView } from "../src/components/EmployeeAppView";
import { LoginScreen } from "../src/components/LoginScreen";
import { ManagerDashboard } from "../src/components/ManagerDashboard";
import { ManagerModulePreview } from "../src/components/ManagerModulePreview";
import { ManagerTwoFactorScreen } from "../src/components/ManagerTwoFactorScreen";
import { authenticateMockUser, changeUserPassword, createEmployeeUser, loadMockUsers, removeEmployeeUser, saveMockUsers } from "../src/engine/mockAuthEngine";
import { useGameStore } from "../src/store/gameStore";
import { verifyTotp } from "../src/engine/totpEngine";
import type { AuthSession, User } from "../src/types/auth";
import type { PlayDifficulty, TraineeProfile } from "../src/types/gameState";

function buildTraineeProfile(user: User): TraineeProfile {
  return {
    id: user.id,
    name: user.displayName,
    role: user.role === "manager" ? "Manager" : "Trainee",
    createdAt: user.createdAt
  };
}

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [managerPreview, setManagerPreview] = useState<{ moduleId: string; difficulty: PlayDifficulty; jurisdictionCode: string | null } | null>(null);
  const upsertTrainee = useGameStore((state) => state.upsertTrainee);
  const removeTrainee = useGameStore((state) => state.removeTrainee);
  const setActiveTrainee = useGameStore((state) => state.setActiveTrainee);
  const assignTrainingModule = useGameStore((state) => state.assignTrainingModule);
  const removeTrainingModule = useGameStore((state) => state.removeTrainingModule);
  
  useEffect(() => {
    users
      .filter((user) => user.role === "employee")
      .forEach((user) => upsertTrainee(buildTraineeProfile(user)));
  }, [upsertTrainee, users]);

  const managerUser = useMemo(() => users.find((user) => user.role === "manager") ?? null, [users]);

  useEffect(() => {
    let mounted = true;

    void loadMockUsers()
      .then((loadedUsers) => {
        if (!mounted) {
          return;
        }

        setUsers(loadedUsers);
        setAuthReady(true);
      })
      .catch(() => {
        if (!mounted) {
          return;
        }

        setAuthError("Unable to initialize local authentication.");
        setAuthReady(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const baselineWidth = 1720;
    const baselineHeight = 1180;

    const applyViewportScale = () => {
      const widthScale = window.innerWidth / baselineWidth;
      const heightScale = window.innerHeight / baselineHeight;
      const nextScale = Math.max(0.8, Math.min(1, widthScale, heightScale));
      document.documentElement.style.setProperty("--app-scale", nextScale.toFixed(3));
    };

    applyViewportScale();
    window.addEventListener("resize", applyViewportScale);

    return () => {
      window.removeEventListener("resize", applyViewportScale);
    };
  }, []);

  const handleLogin = async (username: string, password: string) => {
    const result = await authenticateMockUser(users, username, password);
    setUsers(result.users);
    saveMockUsers(result.users);

    if (!result.session) {
      setAuthError(result.error ?? "Invalid username or password.");
      return;
    }

    setAuthError(null);
    setTwoFactorError(null);
    setSession(result.session);

    if (result.session.role === "employee") {
      const traineeUser = result.users.find((user) => user.id === result.session?.userId);
      if (traineeUser) {
        upsertTrainee(buildTraineeProfile(traineeUser));
        setActiveTrainee(traineeUser.id);
      }
    }
  };

  const handleLogout = () => {
    setSession(null);
    setAuthError(null);
    setTwoFactorError(null);
    setManagerPreview(null);
  };

  const handleVerifyManagerTwoFactor = async (token: string) => {
    if (!session || session.role !== "manager") {
      return;
    }

    const currentManager = users.find((user) => user.id === session.userId) ?? null;
    if (!currentManager?.twoFactorSecret) {
      setTwoFactorError("Manager two-factor enrollment is unavailable.");
      return;
    }

    const verified = await verifyTotp(currentManager.twoFactorSecret, token);
    if (!verified) {
      setTwoFactorError("The verification code was invalid or expired.");
      return;
    }

    setTwoFactorError(null);
    setSession((previous) => previous
      ? {
          ...previous,
          twoFactorVerified: true
        }
      : previous);
  };

  const handleAddEmployee = async (input: { displayName: string; username: string; password: string }) => {
    const nextUsers = await createEmployeeUser(users, input);
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

  const handleChangeManagerPassword = async (currentPassword: string, nextPassword: string) => {
    if (!managerUser) {
      throw new Error("Manager account is unavailable.");
    }

    const nextUsers = await changeUserPassword(users, managerUser.id, nextPassword, currentPassword);
    setUsers(nextUsers);
    saveMockUsers(nextUsers);
    setSession((previous) => previous && previous.userId === managerUser.id
      ? {
          ...previous,
          mustChangePassword: false
        }
      : previous);
  };

  const handleAssignModule = (
    traineeId: string,
    moduleId: string,
    assignedDifficulty: PlayDifficulty,
    dueAt: number | null,
    jurisdictionCode: string | null
  ) => {
    assignTrainingModule(traineeId, moduleId, assignedDifficulty, dueAt, jurisdictionCode);
  };

  if (!authReady) {
    return <LoginScreen error={null} onLogin={() => undefined} loading />;
  }

  if (!session) {
    return <LoginScreen error={authError} onLogin={handleLogin} />;
  }

  if (session.role === "manager") {
    const currentManager = users.find((user) => user.id === session.userId) ?? managerUser;
    if (!currentManager) {
      return <LoginScreen error="Manager account could not be loaded." onLogin={handleLogin} />;
    }

    if (!session.twoFactorVerified) {
      return (
        <ManagerTwoFactorScreen
          managerUser={currentManager}
          error={twoFactorError}
          onVerify={handleVerifyManagerTwoFactor}
          onBack={handleLogout}
        />
      );
    }

    if (managerPreview) {
      return (
        <ManagerModulePreview
          moduleId={managerPreview.moduleId}
          assignedDifficulty={managerPreview.difficulty}
          jurisdictionCode={managerPreview.jurisdictionCode}
          onExit={() => setManagerPreview(null)}
        />
      );
    }

    return (
      <ManagerDashboard
        currentUser={currentManager}
        users={users}
        onLogout={handleLogout}
        onAddEmployee={handleAddEmployee}
        onRemoveEmployee={handleRemoveEmployee}
        onChangeManagerPassword={handleChangeManagerPassword}
        onAssignModule={handleAssignModule}
        onRemoveModule={removeTrainingModule}
        onLaunchModulePreview={(moduleId, assignedDifficulty, jurisdictionCode) => setManagerPreview({ moduleId, difficulty: assignedDifficulty, jurisdictionCode })}
      />
    );
  }

  return <EmployeeAppView onLogout={handleLogout} />;
}
