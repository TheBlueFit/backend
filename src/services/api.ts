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

export const authSession = {
  get: (): UserSession | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  set: (session: UserSession) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    window.dispatchEvent(new Event('bluefit:auth-change'));
  },
  clear: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(SESSION_KEY);
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

export interface AthleteDashboardData {
  date: string;
  todayTraining: any[];
  steps?: number;
  stepGoal?: number;
  sleepHours?: number;
  sleepGoal?: number;
  hydration?: number;
  hydrationGoal?: number;
  workoutCompletion?: number;
  recovery?: number;
  calories?: number;
  workoutsThisWeek?: number;
}

export type AthleteProgressRange = 'today' | '7d' | '30d' | '3m' | '1y';

export interface AthleteProgressPoint {
  date: string;
  steps?: number | null;
  sleepHours?: number | null;
  hydration?: number | null;
  weight?: number | null;
  adherence?: number | null;
  workoutCompletion?: number | null;
  workoutsCompleted: number;
}

export interface AthleteProgressData {
  range: AthleteProgressRange;
  from: string;
  to: string;
  summary: {
    averageSteps?: number | null;
    averageSleepHours?: number | null;
    averageHydration?: number | null;
    averageWeight?: number | null;
    averageAdherence?: number | null;
    workoutCompletion?: number | null;
    workoutsCompleted: number;
  };
  daily: AthleteProgressPoint[];
}

export interface ThreeDayPhoto {
  id: string;
  day: number;
  meal: string;
  originalFileName: string;
  contentType: string;
  uploadedAt: string;
  viewUrl?: string;
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
      body: JSON.stringify({ role, identifier, password }),
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
  deleteUser: (userId: string) =>
    apiFetch<{ message: string }>(`/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    }),
  updateUser: (userId: string, payload: {
    name?: string;
    email?: string;
    status?: 'ACTIVE' | 'INACTIVE';
    age?: number;
    height?: number;
    weight?: number;
    activityLevel?: string;
    primaryGoal?: string;
    medicalNotes?: string;
    specialization?: string;
  }) =>
    apiFetch<{ message: string; user: any }>(`/admin/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  resetUserPassword: (userId: string) =>
    apiFetch<{ message: string; userId: string; userCode: string; tempPassword: string }>(
      `/admin/users/${encodeURIComponent(userId)}/reset-password`,
      { method: 'POST' }
    ),
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
    apiFetch<AthleteDashboardData>(
      `/athlete/${encodeURIComponent(sessionId())}/dashboard?date=${encodeURIComponent(date || getLocalDateISO())}`
    ),

  getAthleteProgress: (range: AthleteProgressRange, to?: string) =>
    apiFetch<AthleteProgressData>(
      `/athlete/${encodeURIComponent(sessionId())}/progress?range=${encodeURIComponent(range)}&to=${encodeURIComponent(to || getLocalDateISO())}`
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
};
