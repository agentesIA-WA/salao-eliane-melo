import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { AppState, User, Service, Professional, Appointment, Role, AppointmentStatus, BusinessConfig } from '../types';
import { MOCK_SERVICES, MOCK_PROFESSIONALS, MOCK_APPOINTMENTS, MOCK_BUSINESS_CONFIG } from '../mockData';
import { initializeDB, dbServices, dbProfessionals, dbAppointments, dbConfig, dbUsers, dbAdminPassword, setAdminToken } from '../services/db';

interface AppContextType extends AppState {
  isLoading: boolean;
  login: (userId: string, adminPassword?: string, clientData?: { name: string, phone: string, email: string }) => Promise<void>;
  logout: () => void;
  addAppointment: (apt: Omit<Appointment, 'id' | 'status'>) => Promise<Appointment | undefined>;
  updateAppointmentStatus: (id: string, status: AppointmentStatus) => Promise<void>;
  updateAppointment: (id: string, data: Partial<Appointment>) => Promise<void>;
  addReview: (id: string, rating: number, comment: string) => Promise<void>;
  addService: (service: Omit<Service, 'id'>) => Promise<void>;
  updateService: (id: string, service: Partial<Service>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  addProfessional: (pro: Omit<Professional, 'id'>) => Promise<void>;
  updateProfessional: (id: string, pro: Partial<Professional>) => Promise<void>;
  deleteProfessional: (id: string) => Promise<void>;
  updateBusinessConfig: (config: BusinessConfig) => Promise<void>;
  refreshAppointments: () => Promise<void>;
  verifyAdminPassword: (password: string) => Promise<string | false>;
  changeAdminPassword: (newPassword: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  
  // Data States
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [businessConfig, setBusinessConfig] = useState<BusinessConfig>(MOCK_BUSINESS_CONFIG);

  // Load initial data from "Database"
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await initializeDB();
        const [loadedServices, loadedPros, loadedApts, loadedConfig] = await Promise.all([
          dbServices.getAll(),
          dbProfessionals.getAll(),
          dbAppointments.getAll(),
          dbConfig.get()
        ]);
        
        setServices(loadedServices);
        setProfessionals(loadedPros);
        setAppointments(loadedApts);
        setBusinessConfig(loadedConfig);
      } catch (error) {
        console.error("Failed to load data from DB", error);
      } finally {
        setIsLoading(false);
      }
      
      const savedClient = localStorage.getItem('clientUser');
      if (savedClient) {
          try {
              setUser(JSON.parse(savedClient));
          } catch (e) { console.error("Error parsing saved client"); }
      }
    };
    loadData();
  }, []);

  const login = async (userId: string, adminToken?: string, clientData?: { name: string, phone: string, email: string }) => {
    if (userId === 'guest') {
        setAdminToken(null);
        setUser({
            id: 'guest-' + Date.now(),
            name: 'Visitante',
            email: '',
            role: Role.CLIENT,
            avatarUrl: `https://ui-avatars.com/api/?name=Visitante&background=random`
        });
        return;
    }

    if (userId === 'client' && clientData) {
        setAdminToken(null);
        const userObj = {
            id: clientData.phone.replace(/\D/g, '') || `client-${Date.now()}`,
            name: clientData.name,
            email: clientData.email,
            phone: clientData.phone,
            role: Role.CLIENT,
            avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(clientData.name)}&background=random`
        };
        setUser(userObj);
        localStorage.setItem('clientUser', JSON.stringify(userObj));
        return;
    }
    
    const foundUser = await dbUsers.getById(userId);
    if (foundUser) {
      // Se é admin e temos o token da api, configurar o header para as requisições
      if (foundUser.role === Role.ADMIN && adminToken) {
        setAdminToken(adminToken);
      }
      setUser(foundUser);
    }
  };

  const logout = () => {
    setAdminToken(null);
    setUser(null);
    localStorage.removeItem('clientUser');
  };

  const addAppointment = async (aptData: Omit<Appointment, 'id' | 'status'>) => {
    try {
        const newApt = await dbAppointments.create(aptData);
        setAppointments(prev => [...prev, newApt]);
        return newApt;
    } catch (e) {
        console.error(e);
        return undefined;
    }
  };

  const updateAppointmentStatus = async (id: string, status: AppointmentStatus) => {
    try {
        const updated = await dbAppointments.updateStatus(id, status);
        setAppointments(prev => prev.map(apt => apt.id === id ? { ...apt, ...updated } : apt));
    } catch (e) { console.error(e); }
  };

  const updateAppointment = async (id: string, data: Partial<Appointment>) => {
    try {
        const updated = await dbAppointments.update(id, data);
        setAppointments(prev => prev.map(apt => apt.id === id ? { ...apt, ...updated } : apt));
    } catch (e) { console.error(e); }
  };

  const addReview = async (id: string, rating: number, comment: string) => {
      try {
        const updated = await dbAppointments.addReview(id, rating, comment);
        setAppointments(prev => prev.map(apt => apt.id === id ? { ...apt, ...updated } : apt));
      } catch (e) { console.error(e); }
  }

  const addService = async (serviceData: Omit<Service, 'id'>) => {
      try {
        const newService = await dbServices.create(serviceData);
        setServices(prev => [...prev, newService]);
      } catch (e) { console.error(e); }
  }

  const updateService = async (id: string, serviceData: Partial<Service>) => {
    try {
        const updated = await dbServices.update(id, serviceData);
        setServices(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
    } catch (e) { console.error(e); }
  }

  const deleteService = async (id: string) => {
      try {
        await dbServices.delete(id);
        setServices(prev => prev.filter(s => s.id !== id));
      } catch (e) { console.error(e); }
  }

  const addProfessional = async (proData: Omit<Professional, 'id'>) => {
      try {
        const newPro = await dbProfessionals.create(proData);
        setProfessionals(prev => [...prev, newPro]);
      } catch (e) { console.error(e); }
  }

  const updateProfessional = async (id: string, proData: Partial<Professional>) => {
      try {
        const updated = await dbProfessionals.update(id, proData);
        setProfessionals(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
      } catch (e) { console.error(e); }
  }

  const deleteProfessional = async (id: string) => {
      try {
        await dbProfessionals.delete(id);
        setProfessionals(prev => prev.filter(p => p.id !== id));
      } catch (e) { console.error(e); }
  }

  const refreshAppointments = async () => {
      try {
        const [loadedApts, loadedConfig] = await Promise.all([
          dbAppointments.getAll(),
          dbConfig.get()
        ]);
        setAppointments(loadedApts);
        setBusinessConfig(loadedConfig);
      } catch (e) {
        console.error(e);
      }
  };

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'businessConfigUpdated' || e.key === 'appointmentsUpdated') {
        refreshAppointments();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const updateBusinessConfig = async (config: BusinessConfig) => {
      try {
        const updated = await dbConfig.save(config);
        setBusinessConfig(updated);
        try {
          localStorage.setItem('businessConfigUpdated', String(Date.now()));
        } catch (_) {}
      } catch (e) { console.error(e); }
  }

  const verifyAdminPassword = async (password: string): Promise<string | false> => {
    return await dbAdminPassword.verify(password);
  };

  const changeAdminPassword = async (newPassword: string) => {
    try {
      await dbAdminPassword.save(newPassword);
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  return (
    <AppContext.Provider value={{
      user, services, professionals, appointments, businessConfig, isLoading,
      login, logout, addAppointment, updateAppointmentStatus, updateAppointment, addReview, addService, updateService, deleteService,
      addProfessional, updateProfessional, deleteProfessional, updateBusinessConfig, refreshAppointments,
      verifyAdminPassword, changeAdminPassword
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};