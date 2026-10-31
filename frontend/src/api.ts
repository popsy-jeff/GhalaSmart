import type {
  Farmer,
  Deposit,
  DepositCreate,
  RecommendRequest,
  RecommendResponse,
  AcceptAdvanceRequest,
  AcceptAdvanceResponse,
  SettleRequest,
  SettleResponse,
  Loan,
  Transaction,
  UserRegister,
  UserLogin,
  TokenResponse,
  SmsNotification,
} from './types';

// Dynamically use matching host (localhost vs 127.0.0.1)
const host = typeof window !== 'undefined' && window.location.hostname === '127.0.0.1' ? '127.0.0.1' : 'localhost';
export const API_BASE = `http://${host}:8000/api`;

// Helper to get auth header
export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('ghalasmart_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponseError(res: Response, defaultMessage: string): Promise<never> {
  let message = defaultMessage;
  try {
    const errorData = await res.json();
    if (errorData?.detail) {
      message = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
    }
  } catch {
    message = res.statusText || `${defaultMessage} (HTTP ${res.status})`;
  }
  throw new Error(message);
}

// ── Authentication API ──────────────────────────────────────────
export async function registerMember(req: UserRegister): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    await handleResponseError(res, 'Registration failed.');
  }
  const data: TokenResponse = await res.json();
  localStorage.setItem('ghalasmart_token', data.access_token);
  return data;
}

export async function loginMember(req: UserLogin): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    await handleResponseError(res, 'Login failed.');
  }
  const data: TokenResponse = await res.json();
  localStorage.setItem('ghalasmart_token', data.access_token);
  return data;
}

export async function fetchCurrentUser(): Promise<Farmer> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('ghalasmart_token');
    }
    await handleResponseError(res, 'Session expired. Please log in.');
  }
  return res.json();
}

// ── Counties & Machine Learning Advisory ────────────────────────
export async function fetchCounties(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/counties`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.counties) && data.counties.length > 0) {
        return data.counties;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch counties from API, using defaults:', err);
  }
  return ['Uasin-Gishu', 'Trans-Nzoia', 'Nakuru', 'Bungoma', 'Kakamega', 'Kiambu', 'Kirinyaga', 'Nairobi'];
}

export async function getRecommendation(req: RecommendRequest): Promise<RecommendResponse> {
  const res = await fetch(`${API_BASE}/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    await handleResponseError(res, 'Recommendation failed.');
  }
  return res.json();
}

// ── Warehouse Receipts / Deposits ───────────────────────────────
export async function createDeposit(req: DepositCreate): Promise<Deposit> {
  const res = await fetch(`${API_BASE}/deposits`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    await handleResponseError(res, 'Failed to create grain deposit.');
  }
  return res.json();
}

export async function fetchDeposits(): Promise<Deposit[]> {
  const res = await fetch(`${API_BASE}/deposits`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('ghalasmart_token');
    }
    await handleResponseError(res, 'Failed to fetch deposits.');
  }
  return res.json();
}

export async function fetchDeposit(id: number): Promise<Deposit> {
  const res = await fetch(`${API_BASE}/deposits/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    await handleResponseError(res, `Failed to fetch deposit #${id}.`);
  }
  return res.json();
}

// ── Advances & Settlements ──────────────────────────────────────
export async function acceptAdvance(depositId: number, req: AcceptAdvanceRequest): Promise<AcceptAdvanceResponse> {
  const res = await fetch(`${API_BASE}/deposits/${depositId}/accept-advance`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    await handleResponseError(res, 'Failed to accept advance.');
  }
  return res.json();
}

export async function settleDeposit(id: number, req: SettleRequest): Promise<SettleResponse> {
  const res = await fetch(`${API_BASE}/deposits/${id}/settle`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    await handleResponseError(res, `Failed to settle deposit #${id}.`);
  }
  return res.json();
}

// ── Loans & Transactions ────────────────────────────────────────
export async function fetchLoans(): Promise<Loan[]> {
  const res = await fetch(`${API_BASE}/loans`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    await handleResponseError(res, 'Failed to fetch loans.');
  }
  return res.json();
}

export async function fetchLoan(loanId: number): Promise<Loan> {
  const res = await fetch(`${API_BASE}/loans/${loanId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    await handleResponseError(res, `Failed to fetch loan #${loanId}.`);
  }
  return res.json();
}

export async function fetchLoanTransactions(loanId: number): Promise<Transaction[]> {
  const res = await fetch(`${API_BASE}/loans/${loanId}/transactions`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    await handleResponseError(res, 'Failed to fetch transactions.');
  }
  return res.json();
}

// ── Africa's Talking SMS & Daraja Notifications ─────────────────
export async function fetchNotifications(): Promise<SmsNotification[]> {
  const res = await fetch(`${API_BASE}/notifications`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    await handleResponseError(res, 'Failed to fetch notifications.');
  }
  return res.json();
}
