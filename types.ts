export enum Role {
  CLIENT = 'CLIENT',
  ADMIN = 'ADMIN'
}

export enum AppointmentStatus {
  PENDING = 'Agendado',
  CONFIRMED = 'Confirmado',
  IN_PROGRESS = 'Em Atendimento',
  COMPLETED = 'Concluído',
  CANCELLED = 'Cancelado'
}

export interface Service {
  id: string;
  name: string;
  groupName?: string;
  description: string;
  durationMinutes: number;
  price: number;
  imageUrl?: string;
  observation?: string;
}

export interface Client {
  userId: string;
  name: string;
  phone?: string;
  email?: string;
  observations?: string;
  totalAppointments: number;
  lastVisit: string; // "YYYY-MM-DD HH:mm"
}

export interface Professional {
  id: string;
  name: string;
  specialties: string[]; // Array of Service IDs
  avatarUrl?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  avatarUrl?: string;
}

export interface Appointment {
  id: string;
  userId: string;
  userName: string; // Denormalized for easier mock display
  clientPhone?: string; // New field
  clientEmail?: string; // New field
  serviceId: string;
  professionalId: string;
  date: string; // ISO Date string YYYY-MM-DD
  time: string; // HH:mm
  status: AppointmentStatus;
  observations?: string;
  rating?: number;
  reviewComment?: string;
}

export interface WorkDayConfig {
  isOpen: boolean;
  start: string; // "09:00"
  end: string;   // "18:00"
  hasLunch: boolean;
  lunchStart: string; // "12:00"
  lunchEnd: string;   // "13:00"
}

export interface BlockedSlot {
  id: string;
  date: string;
  time: string;
  professionalId: string; // 'ALL' or specific ID
  durationMinutes: number;
}

export interface BusinessConfig {
  // Key 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  days: Record<number, WorkDayConfig>;
  companyName?: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
  description?: string;
  logoUrl?: string;
  instagramUrl?: string;
  blockedSlots?: BlockedSlot[];
}

export interface AppState {
  user: User | null;
  services: Service[];
  professionals: Professional[];
  appointments: Appointment[];
  businessConfig: BusinessConfig;
}