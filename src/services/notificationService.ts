import api from "@/lib/axios";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  readAt?: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  status: string;
  data: {
    notifications: Notification[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      unreadCount: number;
      limit: number;
    };
  };
}

export async function getNotifications(page = 1, limit = 10, unreadOnly = false) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    unreadOnly: String(unreadOnly),
  });
  const res = await api.get<NotificationsResponse>(`/notifications?${params.toString()}`);
  return res.data.data;
}

export async function getUnreadCount() {
  const data = await getNotifications(1, 1);
  return data.pagination.unreadCount;
}

export async function markAsRead(id: string) {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllAsRead() {
  await api.patch("/notifications/mark-all-read");
}
