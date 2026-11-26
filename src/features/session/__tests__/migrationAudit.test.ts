import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 4 SQL Migrations & Schema Audit Tests', () => {
    const migrationPath = path.resolve(__dirname, '../../../../supabase/migrations/20261104000000_phase_4_social_experience.sql');
    const rollbackPath = path.resolve(__dirname, '../../../../supabase/migrations/20261104000000_phase_4_social_experience_rollback.sql');
    const authorityMigrationPath = path.resolve(__dirname, '../../../../supabase/migrations/20261124000000_harden_room_authority.sql');
    const authorityRollbackPath = path.resolve(__dirname, '../../../../supabase/migrations/20261124000000_harden_room_authority_rollback.sql');

    it('should verify migration file exists and is non-empty', () => {
        expect(fs.existsSync(migrationPath)).toBe(true);
        const content = fs.readFileSync(migrationPath, 'utf8');
        expect(content.length).toBeGreaterThan(1000);
    });

    it('should verify rollback file exists and is non-empty', () => {
        expect(fs.existsSync(rollbackPath)).toBe(true);
        const content = fs.readFileSync(rollbackPath, 'utf8');
        expect(content.length).toBeGreaterThan(500);
    });

    it('should enforce search_path = public, auth on all SECURITY DEFINER functions', () => {
        const content = fs.readFileSync(migrationPath, 'utf8');
        const secDefinerMatches = content.match(/SECURITY DEFINER/g) || [];
        const searchPathMatches = content.match(/SET search_path = public, auth/g) || [];
        expect(secDefinerMatches.length).toBeGreaterThanOrEqual(4);
        expect(searchPathMatches.length).toBeGreaterThanOrEqual(4);
    });

    it('should enforce RLS enablement on all 10 new tables', () => {
        const content = fs.readFileSync(migrationPath, 'utf8');
        const expectedTables = [
            'listening_rooms',
            'room_participants',
            'parties',
            'party_reports',
            'community_posts',
            'post_comments',
            'post_reactions',
            'user_follows',
            'poll_votes',
            'playlist_collaborators',
            'playlist_items',
        ];

        expectedTables.forEach(table => {
            const regex = new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY;`, 'i');
            expect(regex.test(content)).toBe(true);
        });
    });

    it('should verify rollback script includes data preservation before dropping tables', () => {
        const content = fs.readFileSync(rollbackPath, 'utf8');
        expect(content).toContain('songs_data = aggregated_songs');
        expect(content).toContain('jsonb_agg');
        expect(content).toContain('DROP TABLE IF EXISTS public.playlist_items CASCADE;');
    });

    it('should verify fractional ordering logic in rebalancing and backfill', () => {
        const content = fs.readFileSync(migrationPath, 'utf8');
        expect(content).toContain('new_pos DOUBLE PRECISION := 1000.0;');
        expect(content).toContain('new_pos := new_pos + 1000.0;');
        expect(content).toContain('idx_playlist_items_playlist_pos');
    });

    it('should verify atomic host election logic contains caller check and lock', () => {
        const content = fs.readFileSync(migrationPath, 'utf8');
        expect(content).toContain('FOR UPDATE');
        expect(content).toContain('Caller is not an active participant of this room');
        expect(content).toContain('grace_period_expires_at');
    });

    it('should secure room moderation, kicked membership, and private Realtime broadcasts', () => {
        const content = fs.readFileSync(authorityMigrationPath, 'utf8');
        expect(content).toContain('CREATE OR REPLACE FUNCTION public.is_room_member');
        expect(content).toContain('CREATE OR REPLACE FUNCTION public.can_access_listening_room');
        expect(content).toContain('CREATE OR REPLACE FUNCTION public.join_listening_room');
        expect(content).toContain('CREATE OR REPLACE FUNCTION public.leave_listening_room');
        expect(content).toContain('CREATE OR REPLACE FUNCTION public.moderate_room_participant');
        expect(content).toContain('CREATE OR REPLACE FUNCTION public.set_room_chat_muted');
        expect(content).toContain('CREATE OR REPLACE FUNCTION public.get_room_participant_status');
        expect(content).toContain('FOR UPDATE');
        expect(content).toContain('status <> \'kicked\'');
        expect(content).toContain('AS RESTRICTIVE');
        expect(content).toContain('CREATE POLICY "Host can update room"');
        expect(content).toContain('REVOKE INSERT, DELETE ON public.room_participants FROM anon, authenticated');
        expect(content).toContain('payload ->> \'type\' IN (\'requestSync\', \'reaction\')');
        expect(content).toContain('GRANT EXECUTE ON FUNCTION public.moderate_room_participant');
        expect(fs.existsSync(authorityRollbackPath)).toBe(true);
    });
});
