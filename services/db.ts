import { 
  Appointment, 
  Service, 
  Professional, 
  User, 
  Client,
  BusinessConfig, 
  AppointmentStatus, 
  Role 
} from '../types';
import { 
  MOCK_USERS,
  MOCK_BUSINESS_CONFIG
} from '../mockData';

const API_URL = './backend/api.php';

// Token de autenticação admin (definido após login)
let adminToken: string | null = null;

export const setAdminToken = (token: string | null) => {
    adminToken = token;
};

export const getAdminToken = () => adminToken;

const resolveCurrentTenant = (): string | null => {
    try {
        const searchParams = new URLSearchParams(window.location.search);
        const fromSearch = searchParams.get('tenant') || searchParams.get('empresa');
        if (fromSearch) return fromSearch.trim();
        const hash = window.location.hash || '';
        const qIdx = hash.indexOf('?');
        if (qIdx !== -1) {
            const hashParams = new URLSearchParams(hash.slice(qIdx + 1));
            const fromHash = hashParams.get('tenant') || hashParams.get('empresa');
            if (fromHash) return fromHash.trim();
        }
        const stored = localStorage.getItem('tenantSlug');
        if (stored) return stored.trim();
    } catch (e) {}
    return null;
};

const apiFetch = async (action: string, options: RequestInit = {}) => {
    try {
        const url = new URL(API_URL, window.location.href);
        url.searchParams.set('action', action);
        const tenant = resolveCurrentTenant();
        if (tenant) {
            url.searchParams.set('tenant', tenant);
        }
        
        if (options.method === 'PUT' || options.method === 'DELETE') {
            const id = (options as any).id;
            if (id) url.searchParams.set('id', id);
        }

        // Adicionar token de autenticação se disponível
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string> || {}),
        };

        if (tenant) {
            headers['X-Tenant'] = tenant;
        }

        if (adminToken) {
            headers['Authorization'] = `Bearer ${adminToken}`;
        }

        const response = await fetch(url.toString(), {
            ...options,
            headers,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error("API Error: " + response.status + " - " + errorText);
        }

        return response.json();
    } catch (e) {
        console.error("Fetch error for action " + action, e);
        throw e;
    }
};

// --- Inicialização ---
export const initializeDB = async () => {
  return Promise.resolve();
};

// --- Serviços (Services) ---
export const dbServices = {
  getAll: async (): Promise<Service[]> => {
    return apiFetch('services');
  },
  create: async (data: Omit<Service, 'id'>): Promise<Service> => {
    const newItem = { ...data, id: "s" + Date.now() };
    return apiFetch('services', { method: 'POST', body: JSON.stringify(newItem) });
  },
  update: async (id: string, data: Partial<Service>): Promise<Service> => {
    return apiFetch('services', { method: 'PUT', id, body: JSON.stringify(data) } as any);
  },
  delete: async (id: string): Promise<void> => {
    return apiFetch('services', { method: 'DELETE', id } as any);
  }
};

// --- Profissionais ---
export const dbProfessionals = {
  getAll: async (): Promise<Professional[]> => {
    return apiFetch('professionals');
  },
  create: async (data: Omit<Professional, 'id'>): Promise<Professional> => {
    const newItem = { ...data, id: "p" + Date.now() };
    return apiFetch('professionals', { method: 'POST', body: JSON.stringify(newItem) });
  },
  update: async (id: string, data: Partial<Professional>): Promise<Professional> => {
    return apiFetch('professionals', { method: 'PUT', id, body: JSON.stringify(data) } as any);
  },
  delete: async (id: string): Promise<void> => {
    return apiFetch('professionals', { method: 'DELETE', id } as any);
  }
};

// --- Agendamentos ---
export const dbAppointments = {
  getAll: async (): Promise<Appointment[]> => {
    return apiFetch('appointments');
  },
  create: async (data: Omit<Appointment, 'id' | 'status'>): Promise<Appointment> => {
    const bookingNumber = Math.floor(100000 + Math.random() * 900000);
    const newItem: Appointment = { 
      ...data, 
      id: "AG-" + bookingNumber,
      status: AppointmentStatus.PENDING 
    };
    return apiFetch('appointments', { method: 'POST', body: JSON.stringify(newItem) });
  },
  updateStatus: async (id: string, status: AppointmentStatus): Promise<Appointment> => {
    return apiFetch('appointments', { method: 'PUT', id, body: JSON.stringify({ status }) } as any);
  },
  update: async (id: string, data: Partial<Appointment>): Promise<Appointment> => {
    return apiFetch('appointments', { method: 'PUT', id, body: JSON.stringify(data) } as any);
  },
  addReview: async (id: string, rating: number, comment: string): Promise<Appointment> => {
    return apiFetch('appointments', { method: 'PUT', id, body: JSON.stringify({ rating, reviewComment: comment }) } as any);
  }
};

// --- Users ---
export const dbUsers = {
    getById: async (id: string): Promise<User | null> => {
        if (id.startsWith('guest')) return null;
        return MOCK_USERS.find(u => u.id === id) || null;
    }
};

// --- Clientes ---
export const dbClients = {
  getAll: async (): Promise<Client[]> => {
    return apiFetch('clients');
  },
  create: async (data: { name: string; phone?: string; email?: string; observations?: string }): Promise<Client> => {
    const newItem = { id: "cli-" + Date.now(), ...data };
    return apiFetch('clients', { method: 'POST', body: JSON.stringify(newItem) } as any);
  },
  update: async (id: string, data: { name: string; phone?: string; email?: string; observations?: string }): Promise<any> => {
    return apiFetch('clients', { method: 'PUT', id, body: JSON.stringify(data) } as any);
  },
  delete: async (id: string): Promise<any> => {
    return apiFetch('clients', { method: 'DELETE', id } as any);
  }
};

// --- Senha Administrativa ---
export const dbAdminPassword = {
    get: async (): Promise<string> => {
        return '********'; 
    },
    verify: async (password: string): Promise<string | false> => {
        try {
            const res = await apiFetch('auth', { 
                method: 'POST', 
                body: JSON.stringify({ auth_action: 'verify', password }) 
            });
            return (res && res.success === true) ? (res.token || '') : false;
        } catch (e) {
            console.error("Auth verification failed", e);
            return false;
        }
    },
    save: async (newPassword: string): Promise<void> => {
        await apiFetch('auth', { 
            method: 'POST', 
            body: JSON.stringify({ auth_action: 'update', newPassword }) 
        });
    }
};

// --- Configuração ---
function normalizeBusinessConfig(raw: unknown): BusinessConfig {
    const base = MOCK_BUSINESS_CONFIG;
    const cfg: Record<string, any> =
        raw && typeof raw === 'object' && !Array.isArray(raw) ? { ...(raw as Record<string, any>) } : {};

    const incomingDays: Record<string, any> =
        cfg.days && typeof cfg.days === 'object' ? cfg.days : {};

    const days: BusinessConfig['days'] = {} as BusinessConfig['days'];
    for (let i = 0; i <= 6; i++) {
        const fallback = (base.days as Record<number, any>)[i];
        const d = incomingDays[i] ?? incomingDays[String(i)];
        days[i] = {
            isOpen: typeof d?.isOpen === 'boolean' ? d.isOpen : fallback.isOpen,
            start: d?.start ?? fallback.start,
            end: d?.end ?? fallback.end,
            hasLunch: typeof d?.hasLunch === 'boolean' ? d.hasLunch : fallback.hasLunch,
            lunchStart: d?.lunchStart ?? fallback.lunchStart,
            lunchEnd: d?.lunchEnd ?? fallback.lunchEnd,
        };
    }

    return { ...base, ...cfg, days } as BusinessConfig;
}

export const dbConfig = {
    get: async (): Promise<BusinessConfig> => {
        const raw = await apiFetch('config');
        return normalizeBusinessConfig(raw);
    },
    save: async (config: BusinessConfig): Promise<BusinessConfig> => {
        return apiFetch('config', { method: 'POST', body: JSON.stringify(config) });
    }
}
