// ---------------------------------------------------------------------------
// Centralized API service.
//
// UI-FIRST MODE
//   - Every call below has a matching MOCK (same JSON shape the FastAPI backend
//     will return), so every screen renders without a backend.
//   - Mock data is used when:
//       1. NEXT_PUBLIC_USE_MOCK=true  (force mocks, never touches the network), or
//       2. a request fails while running `next dev` (logged with console.warn).
//   - In a production build the fallback is OFF: real errors surface to the UI.
//
// CONNECTING THE BACKEND LATER
//   Set NEXT_PUBLIC_API_URL, leave NEXT_PUBLIC_USE_MOCK unset, and each method
//   starts returning live data. No page code needs to change.
// ---------------------------------------------------------------------------
// const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
// const FORCE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
// const DEV_FALLBACK = process.env.NODE_ENV !== 'production';

// async function request<T>(path: string, mock: T, init?: RequestInit): Promise<T> {
//   if (FORCE_MOCK) return mock;
//   try {
//     const res = await fetch(`${API_BASE_URL}${path}`, init);
//     if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
//     return (await res.json()) as T;
//   } catch (err) {
//     if (!DEV_FALLBACK) throw err;
//     console.warn(`[api] ${path} unavailable (${String(err)}) - showing mock data`);
//     return mock;
//   }
// }

// // ----------------------------- MOCK DATA -----------------------------------
// const MOCK_ATHLETE = {
//   todayTraining: [
//     { id: 1, title: 'Upper Body Strength', subtitle: '5 exercises • 55 min', statusText: 'completed', statusColor: 'green' },
//     { id: 2, title: 'Zone 2 Cardio', subtitle: '30 min • easy pace', statusText: 'pending', statusColor: 'gold' },
//     { id: 3, title: 'Core & Mobility', subtitle: 'McGill Big 3 • 15 min', statusText: 'upcoming', statusColor: 'gold' },
//   ],
// };

// const MOCK_COACH = {
//   stats: [
//     { label: 'Active Clients', value: '12' },
//     { label: 'Check-ins Due', value: '3' },
//     { label: 'Avg Adherence', value: '87%' },
//   ],
//   recentActivity: [
//     { id: 1, client: 'Sandy Kumar', action: 'Completed Upper Body Strength', status: 'completed' },
//     { id: 2, client: 'Hemanth Rao', action: 'Submitted weekly check-in', status: 'completed' },
//     { id: 3, client: 'Rakesh S.', action: 'Missed Tuesday leg session', status: 'missed' },
//     { id: 4, client: 'Manoj Reddy', action: 'Hit all macro targets', status: 'completed' },
//   ],
// };

// const MOCK_TEMPLATES = {
//   templates: [
//     { id: 'tpl-1', title: 'Hypertrophy Push / Pull / Legs', description: 'Six-day split focused on progressive overload and volume.', activities: '18 activities', workoutDays: '6 days / week', goal: 'Muscle gain' },
//     { id: 'tpl-2', title: 'Fat-Loss Full Body', description: 'Three full-body sessions plus low-intensity cardio.', activities: '12 activities', workoutDays: '3 days / week', goal: 'Fat loss' },
//     { id: 'tpl-3', title: 'Strength Base (5x5)', description: 'Linear progression on the main barbell lifts.', activities: '9 activities', workoutDays: '3 days / week', goal: 'Strength' },
//   ],
// };

// export type CoachClient = {
//   id: string;
//   name: string;
//   goal: string;
//   adherence: number;
//   lastCheckIn: string;
//   status: 'on-track' | 'needs-attention';
// };

// const MOCK_CLIENTS: { clients: CoachClient[] } = {
//   clients: [
//     { id: 'c-1001', name: 'Sandy Kumar', goal: 'Fat loss', adherence: 92, lastCheckIn: 'Today', status: 'on-track' },
//     { id: 'c-1002', name: 'Hemanth Rao', goal: 'Muscle gain', adherence: 88, lastCheckIn: 'Yesterday', status: 'on-track' },
//     { id: 'c-1003', name: 'Rakesh S.', goal: 'Strength', adherence: 61, lastCheckIn: '6 days ago', status: 'needs-attention' },
//     { id: 'c-1004', name: 'Manoj Reddy', goal: 'Fat loss', adherence: 95, lastCheckIn: 'Today', status: 'on-track' },
//     { id: 'c-1005', name: 'Suresh Babu', goal: 'Recomposition', adherence: 54, lastCheckIn: '9 days ago', status: 'needs-attention' },
//     { id: 'c-1006', name: 'Priya Nair', goal: 'Muscle gain', adherence: 83, lastCheckIn: '2 days ago', status: 'on-track' },
//   ],
// };

// const MOCK_ADMIN = { users: 12, coaches: 9, health: '99.9%' };

// // ------------------------------ ENDPOINTS ----------------------------------
// export const dashboardAPI = {
//   // GET /athlete/{athleteId}/dashboard
//   getAthleteData: (athleteId: string) =>
//     request(`/athlete/${athleteId}/dashboard`, MOCK_ATHLETE),

//   // GET /coach/{coachId}/dashboard
//   getCoachData: (coachId: string) =>
//     request(`/coach/${coachId}/dashboard`, MOCK_COACH),

//   // GET /admin/system-status
//   getAdminData: () =>
//     request('/admin/system-status', MOCK_ADMIN),

//   // GET /coach/{coachId}/templates
//   getCoachTemplates: (coachId: string) =>
//     request(`/coach/${coachId}/templates`, MOCK_TEMPLATES),

//   // GET /coach/{coachId}/clients
//   getCoachClients: (coachId: string) =>
//     request(`/coach/${coachId}/clients`, MOCK_CLIENTS),
// };

// =============================================================


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

export const dashboardAPI = {
  // --- AUTH & FIRST-TIME SETUP ---
  login: async (role: 'CLIENT' | 'COACH' | 'ADMIN', identifier: string, password: string) => {
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
