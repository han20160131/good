/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NovelProject, BackendStatus, VoiceConfig, User, CharacterVoiceMapping, CustomCharacter } from './types';
import { TopNav, TabKey } from './components/TopNav';
import { Dashboard } from './components/Dashboard';
import { MakerView } from './components/MakerView';
import { CharacterLibraryView } from './components/CharacterLibraryView';
import { MultiVoiceMakerView } from './components/MultiVoiceMakerView';
import { ExportView } from './components/ExportView';
import { VoiceSettingsView } from './components/VoiceSettingsView';
import { AuthModal } from './components/AuthModal';
import { AccountSettingsGear } from './components/AccountSettingsGear';
import { signOut } from 'firebase/auth';
import { auth } from './utils/firebase';
import { DEFAULT_VOICE_CONFIG } from './utils/voices';
import { CHARACTER_COLORS, loadStoredCharacters, saveStoredCharacters } from './utils/characterConstants';
import {
  testFirestoreConnection,
  loadUserCharactersFromCloud,
  saveUserCharacterToCloud,
  deleteUserCharacterFromCloud,
} from './utils/cloudSyncService';
import {
  getStoredUser,
  getStoredToken,
  setStoredToken,
  clearStoredAuth,
  setStoredUser,
  authFetch,
  ensureAutoLogin,
} from './utils/authClient';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  const [authModalMessage, setAuthModalMessage] = useState<string | undefined>(undefined);
  const [projectToDelete, setProjectToDelete] = useState<NovelProject | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState<boolean>(false);

  // Character Library State
  const [characters, setCharacters] = useState<CustomCharacter[]>(() => {
    const stored = loadStoredCharacters();
    if (stored.length > 0) return stored;
    return [
      {
        id: 'char_default_1',
        name: '甲',
        voiceCode: 'zh-CN-YunxiNeural',
        displayName: '雲希 · 青年男聲（遠行一 / 遠者）',
        color: CHARACTER_COLORS[0],
        gender: 'male',
        rate: '+0%',
        pitch: '+0Hz',
        description: '主角 / 第一發言人',
        createdAt: Date.now() - 10000,
      },
      {
        id: 'char_default_2',
        name: '乙',
        voiceCode: 'zh-CN-YunyangNeural',
        displayName: '雲揚 · 播音男聲（元陽 / 專業播音）',
        color: CHARACTER_COLORS[1],
        gender: 'male',
        rate: '+0%',
        pitch: '+0Hz',
        description: '對手 / 第二發言人',
        createdAt: Date.now() - 5000,
      },
    ];
  });

  const [projects, setProjects] = useState<NovelProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [defaultVoiceConfig, setDefaultVoiceConfig] = useState<VoiceConfig>(DEFAULT_VOICE_CONFIG);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>({
    connected: true,
    checkedAt: Date.now(),
  });
  const [isCheckingBackend, setIsCheckingBackend] = useState<boolean>(false);

  // Sync characters to storage whenever updated
  useEffect(() => {
    saveStoredCharacters(characters);
  }, [characters]);

  // Validate Firestore connection on boot per Firebase skill requirements
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  // Load user characters from Cloud Firestore across different hosts
  useEffect(() => {
    if (currentUser?.id) {
      loadUserCharactersFromCloud(currentUser.id).then((cloudChars) => {
        if (cloudChars && cloudChars.length > 0) {
          setCharacters(cloudChars);
        }
      });
    }
  }, [currentUser?.id]);

  const handleAddCharacter = (char: CustomCharacter) => {
    setCharacters((prev) => [char, ...prev]);
    if (currentUser?.id) {
      saveUserCharacterToCloud(currentUser.id, char);
    }
  };

  const handleUpdateCharacter = (char: CustomCharacter) => {
    setCharacters((prev) => prev.map((c) => (c.id === char.id ? char : c)));
    if (currentUser?.id) {
      saveUserCharacterToCloud(currentUser.id, char);
    }
  };

  const handleDeleteCharacter = (id: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== id));
    if (currentUser?.id) {
      deleteUserCharacterFromCloud(currentUser.id, id);
    }
  };

  // Open Auth Modal helper
  const handleOpenAuth = (tab: 'login' | 'register' = 'login', message?: string) => {
    setAuthModalTab(tab);
    setAuthModalMessage(message);
    setIsAuthModalOpen(true);
  };

  // Fetch projects strictly isolated by authenticated user
  const fetchProjects = useCallback(async (targetUser?: User | null) => {
    const activeUser = targetUser !== undefined ? targetUser : currentUser;
    if (!activeUser || !activeUser.id) {
      setProjects([]);
      return [];
    }
    try {
      const res = await authFetch('/api/projects');
      if (res.ok) {
        const data: NovelProject[] = await res.json();
        setProjects(data);
        setBackendStatus({ connected: true, checkedAt: Date.now() });
        return data;
      }
    } catch (e: any) {
      console.warn('Failed to fetch projects:', e);
      setBackendStatus({ connected: false, checkedAt: Date.now(), error: e.message });
    }
    return [];
  }, [currentUser]);

  // Sync projects with current user authentication
  useEffect(() => {
    if (currentUser?.id) {
      fetchProjects(currentUser);
    } else {
      setProjects([]);
    }
  }, [currentUser, fetchProjects]);

  // On device launch (ChatGPT DMG style):
  // - First launch or when logged out: strictly 0 projects, currentUser is null
  // - After logging in: persistently remembers account on this machine and displays ONLY their projects
  // - When logging out: projects immediately disappear, zero traces left
  useEffect(() => {
    const initDeviceAuth = async () => {
      const token = getStoredToken();
      const storedUser = getStoredUser();
      if (!token && !storedUser) {
        // Machine has no saved session -> strictly logged-out state with empty projects
        setCurrentUser(null);
        setProjects([]);
        return;
      }

      // 1. Try verifying with /api/auth/me if token exists
      if (token) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: {
              Authorization: `Bearer ${token}`,
              ...(storedUser?.id ? { 'x-user-id': storedUser.id } : {}),
            },
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.user) {
              setCurrentUser(data.user);
              setStoredUser(data.user);
              fetchProjects(data.user);
              return;
            }
          } else {
            // Server has no record of this user (account cleared or deleted)
            clearStoredAuth();
            setCurrentUser(null);
            setProjects([]);
            return;
          }
        } catch (err) {
          console.warn('Failed to restore device login session:', err);
        }
      }

      // If no token or invalid session: stay completely logged out
      clearStoredAuth();
      setCurrentUser(null);
      setProjects([]);
    };

    initDeviceAuth();
  }, [fetchProjects]);

  // Periodic polling for active project generation progress (only when a project is actively synthesizing)
  useEffect(() => {
    if (!currentUser) return;
    const isAnyProjectProcessing = projects.some((p) => p.status === 'processing');
    if (!isAnyProjectProcessing) return;

    const interval = setInterval(async () => {
      try {
        const res = await authFetch('/api/projects');
        if (res.ok) {
          const data: NovelProject[] = await res.json();
          setProjects(data);
        }
      } catch (_) {}
    }, 2500);

    return () => clearInterval(interval);
  }, [currentUser, projects]);

  // Check backend health
  const checkBackendHealth = async () => {
    setIsCheckingBackend(true);
    await fetchProjects();
    setIsCheckingBackend(false);
  };

  // Handle successful login or registration
  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    setStoredUser(user);
    fetchProjects(user).then(() => {
      if (authModalMessage?.includes('製作新配音') || activeTab === 'maker') {
        setActiveProjectId(null);
        setActiveTab('maker');
      }
    });
  };

  // Handle logout: clear projects and return to dashboard
  const handleLogout = async () => {
    // 1. Instantly clear client-side auth state
    clearStoredAuth();
    setCurrentUser(null);
    setProjects([]);
    setActiveProjectId(null);
    setActiveTab('dashboard');

    // 2. Clear Firebase Google OAuth session
    try {
      await signOut(auth);
    } catch (_) {}

    // 3. Inform server in background
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  };

  // User Actions delegating to server with authentication
  const handleMakerSaveAndStart = async (
    title: string,
    rawText: string,
    voiceSettings: VoiceConfig,
    enableAiRoles?: boolean,
    characterVoices?: CharacterVoiceMapping[],
    enablePolyphoneFix?: boolean,
    customPolyphoneRules?: any[]
  ) => {
    const activeUser = currentUser || getStoredUser();
    if (!activeUser) {
      handleOpenAuth('login', '請先登入帳號以製作新配音');
      return;
    }
    if (!currentUser && activeUser) {
      setCurrentUser(activeUser);
    }

    try {
      let res = await authFetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          text: rawText,
          voiceSettings,
          enableAiRoles,
          characterVoices,
          enablePolyphoneFix,
          customPolyphoneRules,
          userId: activeUser.id,
          ownerName: activeUser.displayName || activeUser.username,
        }),
      });

      // If server returned 401, attempt transparent session restore and retry once
      if (res.status === 401 && currentUser) {
        try {
          const restoreRes = await fetch('/api/auth/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: currentUser }),
          });
          if (restoreRes.ok) {
            const restored = await restoreRes.json();
            if (restored?.token) {
              setStoredToken(restored.token);
              res = await authFetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title,
                  text: rawText,
                  voiceSettings,
                  enableAiRoles,
                  characterVoices,
                  enablePolyphoneFix,
                  customPolyphoneRules,
                  userId: currentUser.id,
                  ownerName: currentUser.displayName || currentUser.username,
                }),
              });
            }
          }
        } catch (_) {}
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`建立專案失敗：${err.error || res.statusText}`);
        return;
      }

      const newProj: NovelProject = await res.json();
      setProjects((prev) => [newProj, ...prev.filter((p) => p.id !== newProj.id)]);
      setActiveProjectId(newProj.id);
      setActiveTab('maker');
    } catch (e: any) {
      alert(`伺服器錯誤：${e.message}`);
    }
  };

  const handlePause = async (id: string) => {
    try {
      const res = await authFetch(`/api/projects/${id}/pause`, { method: 'POST' });
      if (res.ok) {
        const updated = await res.json();
        setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleResume = async (id: string) => {
    try {
      const res = await authFetch(`/api/projects/${id}/start`, { method: 'POST' });
      if (res.ok) {
        const updated = await res.json();
        setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleReset = async (id: string) => {
    if (!confirm('確定要清空已生成的音訊並重新開始配音嗎？')) return;
    try {
      const res = await authFetch(`/api/projects/${id}/reset`, { method: 'POST' });
      if (res.ok) {
        const updated = await res.json();
        setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleRetryFailed = async (id: string) => {
    try {
      const res = await authFetch(`/api/projects/${id}/retry-failed`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.project) {
          setProjects((prev) => prev.map((p) => (p.id === id ? data.project : p)));
        }
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  // Open in-app confirmation modal (avoids window.confirm which is blocked in iframes)
  const handleDeleteProject = (id: string) => {
    const p = projects.find((item) => item.id === id);
    if (p) {
      setProjectToDelete(p);
    }
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    const id = projectToDelete.id;
    setIsDeletingProject(true);
    try {
      const res = await authFetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        if (activeProjectId === id) {
          setActiveProjectId(null);
        }
      }
    } catch (e: any) {
      console.error('Delete project failed:', e);
    } finally {
      setIsDeletingProject(false);
      setProjectToDelete(null);
    }
  };

  // Open an existing project: sets active project id and opens maker view
  const handleOpenProject = (id: string) => {
    setActiveProjectId(id);
    setActiveTab('maker');
  };

  // Navigating to maker as a brand new draft
  const handleStartNewDraft = () => {
    if (!currentUser) {
      handleOpenAuth('login', '請先登入帳號以開始製作新配音');
      return;
    }
    setActiveProjectId(null);
    setActiveTab('maker');
  };

  const activeProject = activeProjectId ? projects.find((p) => p.id === activeProjectId) : undefined;
  const isRunning = activeProject?.status === 'processing';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      <TopNav
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if ((tab === 'maker' || tab === 'multivoice') && !currentUser) {
            handleOpenAuth('login', '請先登入帳號以開始配音製作');
            return;
          }
          setActiveTab(tab);
        }}
        backendStatus={backendStatus}
        onCheckBackend={checkBackendHealth}
        isCheckingBackend={isCheckingBackend}
        onNewDraft={handleStartNewDraft}
        currentUser={currentUser}
        onOpenAuth={(tab) => handleOpenAuth(tab, '請先登入帳號以開始製作新配音')}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'dashboard' && (
          <Dashboard
            projects={projects}
            backendStatus={backendStatus}
            onOpenProject={handleOpenProject}
            onCreateNewProject={handleStartNewDraft}
            activeProjectId={activeProjectId || ''}
            onDeleteProject={handleDeleteProject}
            currentUser={currentUser}
            onOpenAuth={(tab) => handleOpenAuth(tab, '請先登入帳號以製作新配音')}
            onOpenCharacterLibrary={() => setActiveTab('characters')}
            onOpenMultiVoice={() => setActiveTab('multivoice')}
          />
        )}

        {activeTab === 'characters' && (
          <CharacterLibraryView
            characters={characters}
            onAddCharacter={handleAddCharacter}
            onUpdateCharacter={handleUpdateCharacter}
            onDeleteCharacter={handleDeleteCharacter}
            onNavigateToMultiVoice={() => setActiveTab('multivoice')}
          />
        )}

        {activeTab === 'maker' && (
          <MakerView
            project={activeProject}
            onSaveAndStart={handleMakerSaveAndStart}
            isRunning={isRunning}
            onPause={() => activeProject && handlePause(activeProject.id)}
            onResume={() => activeProject && handleResume(activeProject.id)}
            onReset={() => activeProject && handleReset(activeProject.id)}
            onRetryFailed={() => activeProject && handleRetryFailed(activeProject.id)}
            backendStatus={backendStatus}
            onNewDraft={handleStartNewDraft}
            currentUser={currentUser}
            onOpenAuth={(tab) => handleOpenAuth(tab, '請先登入帳號以開始製作新配音')}
          />
        )}

        {activeTab === 'multivoice' && (
          <MultiVoiceMakerView
            characters={characters}
            onOpenCharacterLibrary={() => setActiveTab('characters')}
          />
        )}

        {activeTab === 'export' && (
          <ExportView
            project={activeProject || projects[0]}
            backendStatus={backendStatus}
            onNavigate={(tab) => setActiveTab(tab)}
            onRetryFailed={(id) => handleRetryFailed(id)}
          />
        )}

        {activeTab === 'voices' && (
          <VoiceSettingsView
            voiceConfig={defaultVoiceConfig}
            onChangeConfig={setDefaultVoiceConfig}
            backendStatus={backendStatus}
          />
        )}
      </main>

      <footer className="border-t border-slate-800 py-5 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>免費小說配音室 · 支援微軟 Edge Neural 全系列音色 (300+ 種官方聲音)</span>
          <span className="text-slate-400">
            {currentUser
              ? '本機已安全登入 · 專案資料儲存於本機磁碟'
              : '本機模式 · 專案安全儲存於磁碟'}
          </span>
        </div>
      </footer>

      {/* Auth Modal (登入帳號 / 建立帳號) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        initialTab={authModalTab}
        message={authModalMessage}
      />

      {/* Account Settings Gear in bottom-left */}
      <AccountSettingsGear
        currentUser={currentUser}
        onLogout={handleLogout}
        onUpdateUser={(updated) => setCurrentUser(updated)}
      />

      {/* In-App Delete Confirmation Modal (100% reliable, no browser confirm dialog) */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 font-bold text-lg">
                🗑️
              </div>
              <div>
                <h3 className="text-base font-bold text-white">確認刪除小說專案？</h3>
                <p className="text-xs text-slate-400">此動作將清除本機磁碟檔案且無法復原</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              確定要永久刪除專案「<span className="text-amber-300 font-semibold">{projectToDelete.title}</span>」嗎？
              已生成的各章節 MP3 配音音訊檔案將一併清除。
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                disabled={isDeletingProject}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeletingProject}
                className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl transition-colors shadow-lg shadow-red-600/30 flex items-center gap-1.5"
              >
                {isDeletingProject ? '正在刪除...' : '確認刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
