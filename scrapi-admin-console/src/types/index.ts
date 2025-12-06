export interface User {
    id: string;
    username: string;
    email: string;
    role: 'user' | 'admin' | 'owner';
    plan: 'Free' | 'Premium' | 'Enterprise';
    is_active: boolean;
    created_at: string;
    last_login_at?: string;
    organization_name?: string;
}

export interface Run {
    id: string;
    user_id: string;
    actor_id: string;
    actor_name: string;
    status: 'queued' | 'running' | 'succeeded' | 'failed' | 'aborted';
    created_at: string;
    started_at?: string;
    finished_at?: string;
    duration_seconds?: number;
    results_count: number;
}

export interface Actor {
    id: string;
    name: string;
    description: string;
    user_id: string;
    is_public: boolean;
    is_featured: boolean;
    is_verified: boolean;
    category: string;
    runs_count: number;
    created_at: string;
}

export interface SystemHealth {
    database: {
        size_mb: number;
        collections: Record<string, number>;
    };
    jobs: {
        running: number;
        queued: number;
    };
    errors: {
        last_24h: number;
    };
}


export interface AuditLog {
    id: string;
    admin_username: string;
    action: string;
    target_type: string;
    target_name?: string;
    details?: string;
    ip_address?: string;
    created_at: string;
    metadata?: Record<string, any>;
}
