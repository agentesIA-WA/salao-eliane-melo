import { Service, Professional, Appointment, AppointmentStatus, Role, User, BusinessConfig } from './types';

export const MOCK_SERVICES: Service[] = [
  {
    id: 's1',
    name: 'Corte de Cabelo Feminino',
    description: 'Lavagem, corte personalizado e finalização com escova.',
    durationMinutes: 60,
    price: 120.00,
    imageUrl: 'https://picsum.photos/400/300?random=1'
  },
  {
    id: 's2',
    name: 'Coloração',
    description: 'Aplicação de tintura em todo o cabelo. Inclui hidratação.',
    durationMinutes: 120,
    price: 250.00,
    imageUrl: 'https://picsum.photos/400/300?random=2'
  },
  {
    id: 's3',
    name: 'Manicure e Pedicure',
    description: 'Cutilagem e esmaltação completa de mãos e pés.',
    durationMinutes: 90,
    price: 80.00,
    imageUrl: 'https://picsum.photos/400/300?random=3'
  },
  {
    id: 's4',
    name: 'Hidratação Profunda',
    description: 'Tratamento intensivo para recuperação dos fios.',
    durationMinutes: 45,
    price: 150.00,
    imageUrl: 'https://picsum.photos/400/300?random=4'
  }
];

export const MOCK_PROFESSIONALS: Professional[] = [
  { id: 'p1', name: 'Ana Silva', specialties: ['s1', 's2', 's4'], avatarUrl: 'https://picsum.photos/100/100?random=10' },
  { id: 'p2', name: 'Carlos Souza', specialties: ['s1', 's2'], avatarUrl: 'https://picsum.photos/100/100?random=11' },
  { id: 'p3', name: 'Mariana Lima', specialties: ['s3'], avatarUrl: 'https://picsum.photos/100/100?random=12' }
];

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Julia Cliente', email: 'julia@example.com', role: Role.CLIENT, avatarUrl: 'https://picsum.photos/100/100?random=20' },
  { id: 'a1', name: 'Admin Salão', email: 'admin@salao.com', role: Role.ADMIN, avatarUrl: 'https://picsum.photos/100/100?random=21' }
];

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt1',
    userId: 'u1',
    userName: 'Julia Cliente',
    serviceId: 's1',
    professionalId: 'p1',
    date: new Date().toISOString().split('T')[0], // Today
    time: '14:00',
    status: AppointmentStatus.CONFIRMED
  },
  {
    id: 'apt2',
    userId: 'u1',
    userName: 'Julia Cliente',
    serviceId: 's3',
    professionalId: 'p3',
    date: '2023-12-25', // Past date example
    time: '10:00',
    status: AppointmentStatus.COMPLETED,
    rating: 5,
    reviewComment: 'Adorei o atendimento, a Mariana é ótima!'
  }
];

// Default Config: Mon-Sat 09:00 to 19:00, Sun Closed. Lunch 12:00-13:00
export const MOCK_BUSINESS_CONFIG: BusinessConfig = {
  days: {
    0: { isOpen: false, start: '09:00', end: '18:00', hasLunch: false, lunchStart: '12:00', lunchEnd: '13:00' }, // Sunday
    1: { isOpen: true, start: '09:00', end: '19:00', hasLunch: true, lunchStart: '12:00', lunchEnd: '13:00' }, // Monday
    2: { isOpen: true, start: '09:00', end: '19:00', hasLunch: true, lunchStart: '12:00', lunchEnd: '13:00' }, // Tuesday
    3: { isOpen: true, start: '09:00', end: '19:00', hasLunch: true, lunchStart: '12:00', lunchEnd: '13:00' }, // Wednesday
    4: { isOpen: true, start: '09:00', end: '19:00', hasLunch: true, lunchStart: '12:00', lunchEnd: '13:00' }, // Thursday
    5: { isOpen: true, start: '09:00', end: '19:00', hasLunch: true, lunchStart: '12:00', lunchEnd: '13:00' }, // Friday
    6: { isOpen: true, start: '09:00', end: '18:00', hasLunch: false, lunchStart: '12:00', lunchEnd: '13:00' }, // Saturday
  },
  companyName: 'Salão de Beleza Eliane Melo',
  cnpj: '12.345.678/0001-99',
  phone: '(11) 98765-4321',
  email: 'contato@salaoelianemelo.com',
  address: 'Rua de Exemplo, 456 - Cerqueira César, São Paulo - SP',
  description: 'Proporcionamos uma experiência exclusiva e diferenciada de beleza, estilo de vida e bem-estar no coração de São Paulo.',
  logoUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=400',
  instagramUrl: '@salao_elianemelo'
};