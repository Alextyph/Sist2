export type Role = "USER" | "SUPPORT" | "SUB_MANAGER" | "ADMIN";
export type SupportArea =
  "HARDWARE" | "SOFTWARE" | "NETWORKS" | "ADMINISTRATIVE";
export type Priority = "LOW" | "MEDIUM" | "HIGH";
export type TicketStatus =
  "OPEN" | "IN_REVIEW" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export interface User {
  id: string;
  fullName: string;
  email: string;
  institutionalId: string;
  phone: string | null;
  role: Role;
  supportAreas: SupportArea[];
  skills: string[];
  avatarUrl: string | null;
}
export interface Subcategory {
  id: string;
  code: string;
  name: string;
  priority: Priority | null;
  isActive?: boolean;
}
export interface Category {
  id: string;
  code: string;
  name: string;
  supportArea: SupportArea;
  defaultPriority: Priority | null;
  requiresSoftwareDetails: boolean;
  isActive?: boolean;
  subcategories: Subcategory[];
}
export interface Ticket {
  id: string;
  code: string;
  title: string;
  description?: string;
  priority: Priority;
  status: TicketStatus;
  location: { building: string; room: string | null };
  createdAt: string;
  updatedAt?: string;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  category: {
    id: string;
    name: string;
    code?: string;
    supportArea?: SupportArea;
  };
  subcategory: { id: string; name: string; code?: string } | null;
  assignee: { id: string; fullName: string } | null;
  reporter?: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
  };
  inventoryItem?: {
    id: string;
    type: string;
    model: string;
    assetCode: string | null;
  } | null;
  software?: {
    name: string;
    version: string;
    downloadUrl: string;
    coordinationApprovalReference: string;
  } | null;
}
export interface TicketEvent {
  id: string;
  type: string;
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus | null;
  createdAt: string;
  actor: { id?: string; fullName: string } | null;
  metadata: Record<string, unknown>;
}
export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
export interface Envelope<T> {
  success: boolean;
  data: T;
  meta?: PageMeta;
}
export const statusLabels: Record<TicketStatus, string> = {
  OPEN: "Abierto",
  IN_REVIEW: "En revisión",
  IN_PROGRESS: "En proceso",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
};
export const priorityLabels: Record<Priority, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
};
export const roleLabels: Record<Role, string> = {
  USER: "Usuario",
  SUPPORT: "Soporte técnico",
  SUB_MANAGER: "Subencargado",
  ADMIN: "Administrador",
};
export const areaLabels: Record<SupportArea, string> = {
  HARDWARE: "Hardware",
  SOFTWARE: "Software",
  NETWORKS: "Redes",
  ADMINISTRATIVE: "Administrativa",
};
export function roleHome(role: Role) {
  return role === "USER"
    ? "/usuario"
    : role === "ADMIN"
      ? "/admin"
      : "/soporte";
}
export function formatDate(value?: string | null, time = false) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    ...(time ? { timeStyle: "short" as const } : {}),
  }).format(new Date(value));
}
export const isActiveTicket = (ticket: Ticket) =>
  !["COMPLETED", "CANCELLED"].includes(ticket.status);
