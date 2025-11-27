// API Service - Centralized API calls to backend
const API_BASE_URL = 'http://localhost:3002';

// ============================================
// HELPER FUNCTIONS
// ============================================

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
};

// ============================================
// USER ROUTES
// ============================================

export const userApi = {
    // Register new user
    register: async (data: {
        username: string;
        password: string;
        fullName: string;
        email?: string | null;
        cpf?: string;
        profilePicture?: string | null;
    }) => {
        const response = await fetch(`${API_BASE_URL}/api/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    // Login
    login: async (username: string, password: string) => {
        const response = await fetch(`${API_BASE_URL}/api/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        return handleResponse(response);
    },

    // Get all users
    getAll: async () => {
        const response = await fetch(`${API_BASE_URL}/api/users`);
        return handleResponse(response);
    },

    // Update user
    update: async (id: string, data: any) => {
        const response = await fetch(`${API_BASE_URL}/api/users/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    // Delete user
    delete: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/api/users/${id}`, {
            method: 'DELETE',
        });
        return handleResponse(response);
    },
};

// ============================================
// TICKET ROUTES
// ============================================

export const ticketApi = {
    // Create ticket
    create: async (type: 'NORMAL' | 'PREFERENCIAL', service: string) => {
        const response = await fetch(`${API_BASE_URL}/api/tickets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, service }),
        });
        return handleResponse(response);
    },

    // Get all tickets
    getAll: async (params?: { page?: number; limit?: number; status?: string }) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.status) queryParams.append('status', params.status);

        const response = await fetch(`${API_BASE_URL}/api/tickets?${queryParams}`);
        return handleResponse(response);
    },

    // Get ticket by ID
    getById: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/api/tickets/${id}`);
        return handleResponse(response);
    },

    // Update ticket status
    updateStatus: async (id: string, status: string, additionalData?: any) => {
        const response = await fetch(`${API_BASE_URL}/api/tickets/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, ...additionalData }),
        });
        return handleResponse(response);
    },

    // Delete ticket
    delete: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/api/tickets/${id}`, {
            method: 'DELETE',
        });
        return handleResponse(response);
    },
};

// ============================================
// DESK ROUTES
// ============================================

export const deskApi = {
    // Get all desks
    getAll: async () => {
        const response = await fetch(`${API_BASE_URL}/api/desks`);
        return handleResponse(response);
    },

    // Get desk by ID
    getById: async (id: number) => {
        const response = await fetch(`${API_BASE_URL}/api/desks/${id}`);
        return handleResponse(response);
    },

    // Update desk
    update: async (id: number, data: {
        user_id?: string | null;
        user_display_name?: string | null;
        current_ticket?: string | null;
        current_ticket_info?: any;
        service_start_time?: number | null;
        services?: string[];
    }) => {
        const response = await fetch(`${API_BASE_URL}/api/desks/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },
};

// ============================================
// HISTORY ROUTES
// ============================================

export const historyApi = {
    // Get called history
    getCalledHistory: async (limit = 100) => {
        const response = await fetch(`${API_BASE_URL}/api/called-history?limit=${limit}`);
        return handleResponse(response);
    },

    // Add to called history
    addCalledHistory: async (data: {
        ticket_number: string;
        desk_number: number;
        ticket_type: string;
        timestamp: number;
    }) => {
        const response = await fetch(`${API_BASE_URL}/api/called-history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    // Get completed services
    getCompletedServices: async (limit = 100) => {
        const response = await fetch(`${API_BASE_URL}/api/completed-services?limit=${limit}`);
        return handleResponse(response);
    },

    // Add completed service
    addCompletedService: async (data: {
        ticket_number: string;
        desk_id: number;
        user_id: string;
        user_name: string;
        service_duration: number;
        wait_time: number;
        completed_timestamp: number;
        service: string;
    }) => {
        const response = await fetch(`${API_BASE_URL}/api/completed-services`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    // Get abandoned tickets
    getAbandonedTickets: async (limit = 100) => {
        const response = await fetch(`${API_BASE_URL}/api/abandoned-tickets?limit=${limit}`);
        return handleResponse(response);
    },

    // Add abandoned ticket
    addAbandonedTicket: async (data: {
        ticket_number: string;
        desk_id: number;
        user_id: string;
        user_name: string;
        called_timestamp: number;
        abandoned_timestamp: number;
        ticket_type: string;
        wait_time: number;
        service: string;
    }) => {
        const response = await fetch(`${API_BASE_URL}/api/abandoned-tickets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    // Remove abandoned ticket (for reinsert)
    removeAbandonedTicket: async (ticketNumber: string) => {
        const response = await fetch(`${API_BASE_URL}/api/abandoned-tickets/${ticketNumber}`, {
            method: 'DELETE',
        });
        return handleResponse(response);
    },
};

// ============================================
// AGENDA ROUTES
// ============================================

export const agendaApi = {
    // Get agenda
    getAll: async (status?: string) => {
        const queryParams = status ? `?status=${status}` : '';
        const response = await fetch(`${API_BASE_URL}/api/agenda${queryParams}`);
        return handleResponse(response);
    },

    // Create agenda entry
    create: async (data: {
        id: string;
        ticket_number: string;
        nome_completo: string;
        cpf?: string;
        telefone?: string;
        email?: string;
        data_agendamento: number;
        horario: string;
        servico: string;
        observacoes?: string;
        documentos_necessarios?: string[];
        data_do_registro: number;
    }) => {
        const response = await fetch(`${API_BASE_URL}/api/agenda`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    // Update agenda entry
    update: async (id: string, data: any) => {
        const response = await fetch(`${API_BASE_URL}/api/agenda/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    // Cancel agenda entry
    cancel: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/api/agenda/${id}`, {
            method: 'DELETE',
        });
        return handleResponse(response);
    },
};

// ============================================
// CONFIG ROUTES
// ============================================

export const configApi = {
    // Get config by key
    get: async (key: string) => {
        const response = await fetch(`${API_BASE_URL}/api/config/${key}`);
        return handleResponse(response);
    },

    // Update config
    update: async (key: string, value: string) => {
        const response = await fetch(`${API_BASE_URL}/api/config/${key}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value }),
        });
        return handleResponse(response);
    },
};

// ============================================
// ACTIVITY LOG ROUTES
// ============================================

export const activityLogApi = {
    // Get activity logs
    getAll: async (params?: { limit?: number; user_id?: string }) => {
        const queryParams = new URLSearchParams();
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.user_id) queryParams.append('user_id', params.user_id);

        const response = await fetch(`${API_BASE_URL}/api/activity-logs?${queryParams}`);
        return handleResponse(response);
    },

    // Create activity log
    create: async (data: {
        id: string;
        user_id: string;
        user_name: string;
        timestamp: number;
        type: 'LOGIN' | 'LOGOUT';
        duration?: number;
    }) => {
        const response = await fetch(`${API_BASE_URL}/api/activity-logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    // Update activity log duration
    updateDuration: async (id: string, duration: number) => {
        const response = await fetch(`${API_BASE_URL}/api/activity-logs/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ duration }),
        });
        return handleResponse(response);
    },
};

// ============================================
// EXPORT ALL
// ============================================

export const api = {
    users: userApi,
    tickets: ticketApi,
    desks: deskApi,
    history: historyApi,
    agenda: agendaApi,
    config: configApi,
    activityLogs: activityLogApi,
};

export default api;
