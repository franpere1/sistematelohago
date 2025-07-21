export type ServiceCategory =
  | "Abogado"
  | "Adiestrador canino"
  | "Albañil"
  | "Arquitecto"
  | "Barbero"
  | "Carpintero"
  | "Cerrajero"
  | "Chef a domicilio"
  | "Chofer privado"
  | "Clases de idiomas"
  | "Clases de música"
  | "Clases particulares"
  | "Contador"
  | "Cuidador de adultos mayores"
  | "Electricista"
  | "Enfermero(a)"
  | "Fumigador"
  | "Herrero"
  | "Ingeniero"
  | "Jardinero"
  | "Lavado de autos"
  | "Limpieza de casas"
  | "Limpieza de oficinas"
  | "Maquillador"
  | "Manicurista"
  | "Masajista"
  | "Mecánico"
  | "Mesonero"
  | "Motorizado / Delivery"
  | "Mudanzas"
  | "Niñera"
  | "Organización de eventos"
  | "Paseador de perros"
  | "Peluquero"
  | "Pintor"
  | "Plomero"
  | "Repostero"
  | "Servicios de sistemas"
  | "Servicios digitales"
  | "Servicios electrónica"
  | "Técnico de aire acondicionado";

export type ImageSource = string | null | undefined; // string for URL, null/undefined for no image

export interface User {
  id: string; // This will now be the Supabase Auth user ID
  name: string;
  email: string;
  state: string;
  createdAt: number; // Changed to number for consistency with Contract and sorting
  profileImage?: ImageSource;
  type: "client" | "provider" | "admin";
  // password?: string; // Removed password field as Supabase handles authentication securely
}

export interface Client extends User {
  type: "client";
  phone: string;
}

export interface Admin extends User {
  type: "admin";
}

export enum FeedbackType {
  Positive = "positive",
  Negative = "negative",
  Neutral = "neutral",
}

export interface Feedback {
  id: string;
  clientId: string;
  providerId: string;
  type: FeedbackType;
  comment: string;
  timestamp: number;
}

export interface Provider extends User {
  type: "provider";
  category: ServiceCategory;
  serviceTitle: string;
  serviceDescription: string;
  serviceImage?: ImageSource;
  rate: number;
  feedback: Feedback[];
  starRating: number;
  phone?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
  readBy?: string[];
}

export interface Contract {
  id: string;
  clientId: string;
  providerId: string;
  serviceTitle: string;
  serviceRate: number;
  status: "pending" | "offered" | "active" | "finalized" | "cancelled" | "disputed" | "finalized_by_dispute";
  clientDeposited: boolean;
  clientAction: "none" | "cancel" | "finalize" | "dispute" | "accept_offer" | "cancel_dispute";
  providerAction: "none" | "cancel" | "finalize" | "make_offer" | "dispute" | "dispute_from_finalize";
  commissionRate: number;
  createdAt: number;
  updatedAt: number;
  disputeResolution?: 'toClient' | 'toProvider';
}