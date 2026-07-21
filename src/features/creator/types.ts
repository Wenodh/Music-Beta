export type CreatorRole = 'owner' | 'admin' | 'publisher' | 'editor' | 'analytics' | 'moderator';

export interface Organization {
    id: string;
    name: string;
    slug: string;
    description?: string;
    avatarUrl?: string;
    website?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreatorProfile {
    id: string;
    organizationId: string;
    displayName: string;
    slug: string;
    bio?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    verified: boolean;
    socialLinks: Record<string, string>;
    categories: string[];
    createdAt: string;
}

export interface OrganizationMember {
    id: string;
    organizationId: string;
    userId: string;
    role: CreatorRole;
    joinedAt: string;
}

export interface PublishingDraft {
    id: string;
    creatorId: string;
    organizationId: string;
    type: 'podcast' | 'episode' | 'audiobook' | 'chapter';
    data: any;
    status: 'draft' | 'validating' | 'ready';
    updatedAt: string;
}

export interface CreatorAnalytics {
    mediaId: string;
    plays: number;
    listeners: number;
    completionRate: number;
    totalDuration: number;
    period: 'daily' | 'weekly' | 'monthly';
    date: string;
}
