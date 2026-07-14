import { supabase } from '../supabase';
import { eventBus } from '../events';

export interface LinkedAccount {
    id: string;
    userId: string;
    providerId: string;
    status: 'connected' | 'error' | 'disconnected';
    profile?: {
        displayName: string;
        avatar?: string;
        email?: string;
    };
    capabilities: string[];
    linkedAt: string;
}

export class AccountLinkingService {
    private static instance: AccountLinkingService;
    private accounts: LinkedAccount[] = [];

    private constructor() {
        this.loadAccounts();
    }

    public static getInstance(): AccountLinkingService {
        if (!AccountLinkingService.instance) {
            AccountLinkingService.instance = new AccountLinkingService();
        }
        return AccountLinkingService.instance;
    }

    private async loadAccounts() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('linked_accounts')
            .select('*')
            .eq('user_id', user.id);

        if (error) {
            logger.error('Failed to load linked accounts', error);
            return;
        }

        this.accounts = (data || []) as any[];
        eventBus.emit('ACCOUNTS_CHANGED', this.accounts);
    }

    public getAccounts(): LinkedAccount[] {
        return this.accounts;
    }

    public async unlinkAccount(providerId: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('linked_accounts')
            .delete()
            .match({ user_id: user.id, provider_id: providerId });

        if (error) throw error;

        // Notify Edge Function to revoke tokens
        await supabase.functions.invoke('revoke-provider-token', {
            body: { providerId }
        });

        await this.loadAccounts();
    }

    public isProviderLinked(providerId: string): boolean {
        return this.accounts.some(a => a.providerId === providerId && a.status === 'connected');
    }
}

export const accountLinkingService = AccountLinkingService.getInstance();
