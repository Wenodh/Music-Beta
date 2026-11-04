import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 4 SQL Migrations & Schema Audit Tests', () => {
    const migrationPath = path.resolve(__dirname, '../../../../supabase/migrations/20261104000000_phase_4_social_experience.sql');
    const rollbackPath = path.resolve(__dirname, '../../../../supabase/migrations/20261104000000_phase_4_social_experience_rollback.sql');

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
});
