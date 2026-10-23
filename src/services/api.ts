// ---------------------------------------------------------------------------
// ACTIVE API LAYER
//  - The API address comes ONLY from NEXT_PUBLIC_API_URL (no address in source code).
//  - After sign-in, every request carries the session token as "Authorization: Bearer ...".
//  - The server enforces who may see what; the checks in the UI are for convenience only.
// ---------------------------------------------------------------------------
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

export interface UserSession {
  PK: string;
  userCode: string;
  role: 'CLIENT' | 'COACH' | 'ADMIN';
  name: string;
  email?: string;
  mustChangePassword?: boolean;
  onboardingCompleted?: boolean;
  token?: string;
}

export type CoachClient = {
  id: string;
  name: string;
  goal: string;
  adherence: number;
  lastCheckIn: string;
  status: 'on-track' | 'needs-attention';
};

const SESSION_KEY = 'bluefit_user_session';

// ── Persistent session store ────────────────────────────────────────────────
// On native (iOS/Android via Capacitor), we use @capacitor/preferences which
// writes to NSUserDefaults / SharedPreferences — this survives app clears,
// backgrounding, and memory pressure kills. localStorage alone gets wiped by
// Capacitor's WebView cache-clear on some Android OEMs and every iOS "Offload".
//
// On web we fall back to localStorage with sessionStorage as a secondary copy.
//
// The API is intentionally synchronous for the `get()` path (reads from the
// in-memory cache below) and async for the `set()` / `clear()` paths.
// ────────────────────────────────────────────────────────────────────────────
let _sessionCache: UserSession | null = null;
let _nativePrefsReady = false;

// Attempt to hydrate from Capacitor Preferences once on first import
async function hydrateFromNative(): Promise<void> {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key: SESSION_KEY });
    if (value) {
      const parsed: UserSession = JSON.parse(value);
      _sessionCache = parsed;
      // Also write to localStorage so synchronous reads work right away
      localStorage.setItem(SESSION_KEY, value);
    }
    _nativePrefsReady = true;
  } catch {
    // Not a native environment or plugin not installed — that's fine
    _nativePrefsReady = true;
  }
}

if (typeof window !== 'undefined') {
  // Pre-populate cache from localStorage immediately (fast synchronous path)
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) _sessionCache = JSON.parse(raw);
  } catch {}
  // Then enrich from native storage (async, catches anything localStorage missed)
  hydrateFromNative().then(() => {
    window.dispatchEvent(new Event('bluefit:auth-change'));
  }).catch(() => {});
}

async function writeToNative(json: string): Promise<void> {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key: SESSION_KEY, value: json });
  } catch {}
}

async function removeFromNative(): Promise<void> {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.remove({ key: SESSION_KEY });
  } catch {}
}

export const authSession = {
  /** Synchronous read — returns cached value immediately. */
  get: (): UserSession | null => {
    if (typeof window === 'undefined') return null;
    // Return in-memory cache first (always up-to-date after set/clear)
    if (_sessionCache) return _sessionCache;
    // Fallback: parse localStorage (covers first render before hydrateFromNative resolves)
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) { _sessionCache = JSON.parse(raw); return _sessionCache; }
    } catch {}
    return null;
  },

  /** Write session to all stores: memory + localStorage + Capacitor Preferences */
  set: (session: UserSession) => {
    if (typeof window === 'undefined') return;
    const json = JSON.stringify(session);
    _sessionCache = session;
    localStorage.setItem(SESSION_KEY, json);
    try { sessionStorage.setItem(SESSION_KEY, json); } catch {}
    writeToNative(json); // fire-and-forget: persists to NSUserDefaults/SharedPreferences
    window.dispatchEvent(new Event('bluefit:auth-change'));
  },

  /** Clear session from all stores */
  clear: () => {
    if (typeof window === 'undefined') return;
    _sessionCache = null;
    localStorage.removeItem(SESSION_KEY);
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    removeFromNative(); // fire-and-forget
    window.dispatchEvent(new Event('bluefit:auth-change'));
  },
};

function getLocalDateISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// The signed-in user's own ID. Pages never choose whose data to load.
function sessionId(): string {
  const id = authSession.get()?.PK;
  if (!id) throw new Error('Please sign in to continue.');
  return id;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('The API address is not configured (set NEXT_PUBLIC_API_URL).');
  }
  const token = authSession.get()?.token;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401 && token && !path.startsWith('/auth/')) {
    authSession.clear(); // expired / revoked session: the layout sends the user back to sign-in
    throw new Error('Your session has expired. Please sign in again.');
  }

  if (!res.ok) {
    let errorDetail = `Request failed (${res.status})`;
    try {
      const errJson = await res.json();
      if (typeof errJson.detail === 'string') errorDetail = errJson.detail;
      else if (Array.isArray(errJson.detail)) errorDetail = 'Please check the information you entered.';
      else if (typeof errJson.message === 'string') errorDetail = errJson.message;
    } catch {}
    throw new Error(errorDetail);
  }
  return res.json();
}

export interface ThreeDayPhoto {
  id: string;
  day: number;
  meal: string;
  originalFileName: string;
  contentType: string;
  /** S3 object key — use this with getMediaViewUrl() to display the image in-app. */
  objectKey?: string;
  /** Short-lived presigned URL kept for backward compatibility only. Do NOT use as an href. */
  viewUrl?: string;
  uploadedAt: string;
}

export interface ThreeDayDayStatus {
  day: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';
  meals: Record<string, string>;
  photos: ThreeDayPhoto[];
}

export interface ThreeDayCheckStatus {
  onboardingCompleted: boolean;
  overallStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';
  days: ThreeDayDayStatus[];
}

export interface ThreeDayPhotoUpload {
  uploadUrl: string;
  fields: Record<string, string>;
  objectKey: string;
  expiresIn: number;
}

export interface ThreeDayLogResponse {
  message: string;
  day: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';
}

export const dashboardAPI = {
  // --- AUTH & FIRST-TIME SETUP ---
  login: async (role: 'CLIENT' | 'COACH' | 'ADMIN' | undefined, identifier: string, password: string) => {
    const user = await apiFetch<UserSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password, ...(role ? { role } : {}) }),
    });
    // A temporary-password login has no token yet: keep it in memory only, never in storage
    if (user.token && !user.mustChangePassword) authSession.set(user);
    return user;
  },

  completeFirstTimeSetup: async (payload: {
    userId: string;
    currentPassword: string;
    newPassword: string;
    [key: string]: any;
  }) => {
    const res = await apiFetch<{ message: string; user: UserSession }>('/auth/complete-setup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    authSession.set(res.user);
    return res.user;
  },

  // --- ADMIN PROVISIONING & MANAGEMENT (admin session required) ---
  saveOnboarding: (payload: {
    name: string;
    role: 'CLIENT' | 'COACH' | string;
    email: string;
    [key: string]: any;
  }) =>
    apiFetch<{
      message: string;
      userId: string;
      userCode: string;
      tempPassword: string;
      role: 'CLIENT' | 'COACH';
      name: string;
    }>('/admin/onboarding', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAllUsers: () => apiFetch<any[]>('/admin/users'),
  getAdminData: () => apiFetch<{ stats: any[] }>('/admin/dashboard/stats'),
  updateUser: (userId: string, payload: Record<string, any>) =>
    apiFetch<{ message: string; user: any }>(`/admin/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  resetUserPassword: (userId: string) =>
    apiFetch<{ message: string; userId: string; userCode: string; tempPassword: string }>(
      `/admin/users/${encodeURIComponent(userId)}/reset-password`,
      { method: 'POST' }
    ),
  deleteUser: (userId: string) =>
    apiFetch<{ message: string }>(`/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    }),
  assignCoach: (clientId: string, coachId: string) =>
    apiFetch<{ message: string; updated: any }>(
      `/admin/users/${encodeURIComponent(clientId)}/assign`,
      {
        method: 'PUT',
        body: JSON.stringify({ coachId }),
      }
    ),

  // --- COACH (always the signed-in coach's own data) ---
  getCoachData: (_coachId?: string) =>
    apiFetch<{ stats: any[]; recentActivity: any[] }>(
      `/coach/${encodeURIComponent(sessionId())}/dashboard`
    ),
  getCoachClients: (_coachId?: string) =>
    apiFetch<{ clients: CoachClient[] }>(
      `/coach/${encodeURIComponent(sessionId())}/clients`
    ),
  getCoachTemplates: (_coachId?: string) =>
    apiFetch<{ templates: any[] }>(
      `/coach/${encodeURIComponent(sessionId())}/templates`
    ),
  createTemplate: (payload: any, _coachId?: string) =>
    apiFetch<any>(`/coach/${encodeURIComponent(sessionId())}/templates`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getTemplate: (templateId: string) =>
    apiFetch<any>(`/coach/templates/${encodeURIComponent(templateId)}`),
  updateTemplate: (templateId: string, payload: any) =>
    apiFetch<any>(`/coach/templates/${encodeURIComponent(templateId)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // --- ATHLETE (CLIENT) ---
  getAthleteData: (_athleteId?: string, date?: string) =>
    apiFetch<{ date: string; todayTraining: any[] }>(
      `/athlete/${encodeURIComponent(sessionId())}/dashboard?date=${encodeURIComponent(date || getLocalDateISO())}`
    ),

  // 3-Day onboarding / check-status
  getClientCheckStatus: () =>
    apiFetch<ThreeDayCheckStatus>(
      `/athlete/${encodeURIComponent(sessionId())}/check-status`
    ),

  saveThreeDayLog: (day: number, meals: Record<string, string>) =>
    apiFetch<ThreeDayLogResponse>(
      `/athlete/check-status/3-day-log/${day}`,
      {
        method: 'PUT',
        body: JSON.stringify({ meals }),
      }
    ),

  createThreeDayPhotoUpload: (payload: {
    day: number;
    meal: string;
    fileName: string;
    contentType: string;
  }) =>
    apiFetch<ThreeDayPhotoUpload>(
      '/athlete/check-status/photos/upload-url',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  completeThreeDayPhoto: (payload: {
    day: number;
    meal: string;
    objectKey: string;
    originalFileName?: string;
  }) =>
    apiFetch<{ message: string; photo: ThreeDayPhoto }>(
      '/athlete/check-status/photos/complete',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  // --- COACH: signed-in coach may view only assigned clients ---
  getCoachClientCheckStatus: (clientId: string) =>
    apiFetch<ThreeDayCheckStatus>(
      `/coach/${encodeURIComponent(sessionId())}/clients/${encodeURIComponent(clientId)}/check-status`
    ),

  saveCheckin: (payload: {
    weight: number;
    adherence: string;
    workoutQuality: string;
    waist?: number;
    notes?: string;
  }) =>
    apiFetch<{ message: string; checkinId: string }>('/athlete/checkin', {
      method: 'POST',
      body: JSON.stringify(payload), // the server uses the signed-in athlete, not an ID from the browser
    }),

  saveHealthMetrics: (data: {
    steps?: number;
    sleepHours?: number;
    calories?: number;
    heartRate?: number;
    hydration?: number;
  }) =>
    apiFetch<{ message: string }>('/athlete/health-metrics', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // --- WORKOUT IMAGE IMPORT ---
  getWorkoutImageUploadUrl: (fileName: string, contentType: string) =>
    apiFetch<{ uploadUrl: string; fields: Record<string, string>; objectKey: string; expiresIn: number }>(
      `/coach/${encodeURIComponent(sessionId())}/templates/import/upload-url`,
      { method: 'POST', body: JSON.stringify({ fileName, contentType }) }
    ),

  generateWorkoutFromImage: (objectKey: string) =>
    apiFetch<{ objectKey: string; extracted: any }>(
      `/coach/${encodeURIComponent(sessionId())}/templates/import/generate`,
      { method: 'POST', body: JSON.stringify({ objectKey }) }
    ),

  approveWorkoutTemplate: (objectKey: string, template: any) =>
    apiFetch<{ message: string; template: any }>(
      `/coach/${encodeURIComponent(sessionId())}/templates/import/approve`,
      { method: 'POST', body: JSON.stringify({ objectKey, template }) }
    ),

  // --- TEMPLATE ASSIGNMENT ---
  assignTemplateToClient: (templateId: string, clientId: string, startDate?: string, notes?: string) =>
    apiFetch<{ message: string; assignmentId: string; clientId: string; startDate: string }>(
      `/coach/${encodeURIComponent(sessionId())}/templates/${encodeURIComponent(templateId)}/assign`,
      { method: 'POST', body: JSON.stringify({ clientId, startDate, notes }) }
    ),

  getClientSchedules: (clientId: string) =>
    apiFetch<{ schedules: any[] }>(
      `/coach/${encodeURIComponent(sessionId())}/clients/${encodeURIComponent(clientId)}/schedules`
    ),

  // --- ATHLETE SCHEDULES ---
  getAthleteSchedules: () =>
    apiFetch<{ schedules: any[] }>(
      `/athlete/${encodeURIComponent(sessionId())}/schedules`
    ),

  getAthleteScheduleDetail: (assignmentId: string) =>
    apiFetch<any>(
      `/athlete/${encodeURIComponent(sessionId())}/schedules/${encodeURIComponent(assignmentId)}`
    ),

  // --- MEDIA VIEWER ---
  getMediaViewUrl: (objectKey: string) =>
    apiFetch<{ viewUrl: string; objectKey: string }>(
      `/media/view?objectKey=${encodeURIComponent(objectKey)}`
    ),

  getTemplateImageView: (templateId: string) =>
    apiFetch<{ viewUrl: string; objectKey: string }>(
      `/coach/templates/${encodeURIComponent(templateId)}/image-view`
    ),
};
