export type ClientStatus = 'Activo' | 'Mantenimiento' | 'Suspendido';

export type EquipmentType = 'Generador' | 'Tractor' | 'Sampi' | 'Máquina' | 'Otro';

export interface Client {
  id: string;
  created_at: string;
  name: string;
  province: string;
  city: string;
  address: string;
  phone: string;
  status: ClientStatus;
}

export interface Equipment {
  id: string;
  client_id: string;
  type: EquipmentType;
  model: string;
  serial_number: string;
  kva?: number;
  next_service_date?: string; // Nuevo campo para alertas
  created_at?: string;
  
  // Para joins
  clients?: { name: string, city: string }; 
}

export interface Service {
  id: string;
  client_id: string;
  equipment_id?: string;
  date: string;
  description: string;
  technician: string;
  created_at?: string;
  
  // Para joins
  clients?: { name: string };
  equipment?: { model: string, type: string };
}

export interface Document {
  id: string;
  client_id: string;
  file_name: string;
  file_path: string;
  file_type: 'image' | 'report' | 'invoice' | 'budget' | 'other';
  created_at: string;
}