import { expect, test } from '@playwright/test';

test('two-peer audio call connects, reports stats, and survives an ICE restart', async ({ page, context }) => {
    await context.grantPermissions(['camera', 'microphone']);
    await page.goto('/');

    const result = await page.evaluate(async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        const caller = new RTCPeerConnection({ iceServers: [] });
        const callee = new RTCPeerConnection({ iceServers: [] });
        let remoteTrackReceived = false;

        const waitForIceGathering = (pc: RTCPeerConnection) => new Promise<void>((resolve, reject) => {
            if (pc.iceGatheringState === 'complete') return resolve();
            const timeout = window.setTimeout(() => reject(new Error('ICE gathering timed out')), 12_000);
            pc.addEventListener('icegatheringstatechange', () => {
                if (pc.iceGatheringState === 'complete') {
                    window.clearTimeout(timeout);
                    resolve();
                }
            });
        });

        const waitForConnected = async () => {
            const deadline = Date.now() + 15_000;
            while (Date.now() < deadline) {
                if (caller.iceConnectionState === 'connected' || caller.iceConnectionState === 'completed') return;
                if (caller.iceConnectionState === 'failed' || callee.iceConnectionState === 'failed') {
                    throw new Error('Peer connection entered failed state');
                }
                await new Promise((resolve) => window.setTimeout(resolve, 100));
            }
            throw new Error('Peer connection did not connect before timeout');
        };

        callee.addEventListener('track', () => { remoteTrackReceived = true; });
        stream.getTracks().forEach((track) => caller.addTrack(track, stream));

        try {
            const offer = await caller.createOffer();
            await caller.setLocalDescription(offer);
            await waitForIceGathering(caller);
            await callee.setRemoteDescription(caller.localDescription!);

            const answer = await callee.createAnswer();
            await callee.setLocalDescription(answer);
            await waitForIceGathering(callee);
            await caller.setRemoteDescription(callee.localDescription!);
            await waitForConnected();

            const firstStats = await caller.getStats();
            const firstStatsCount = firstStats.size;

            const restartOffer = await caller.createOffer({ iceRestart: true });
            await caller.setLocalDescription(restartOffer);
            const restartOfferHasIceCredentials = Boolean(caller.localDescription?.sdp?.includes('a=ice-ufrag:'));
            await waitForIceGathering(caller);
            await callee.setRemoteDescription(caller.localDescription!);
            const restartAnswer = await callee.createAnswer();
            await callee.setLocalDescription(restartAnswer);
            await waitForIceGathering(callee);
            await caller.setRemoteDescription(callee.localDescription!);

            const stableDeadline = Date.now() + 10_000;
            while (Date.now() < stableDeadline &&
                (caller.signalingState !== 'stable' || callee.signalingState !== 'stable')) {
                await new Promise((resolve) => window.setTimeout(resolve, 50));
            }
            await new Promise((resolve) => window.setTimeout(resolve, 1000));

            return {
                connected: caller.iceConnectionState === 'connected' || caller.iceConnectionState === 'completed',
                remoteTrackReceived,
                firstStatsCount,
                restartSupported: restartOfferHasIceCredentials &&
                    caller.signalingState === 'stable' && callee.signalingState === 'stable',
                platform: /Android/i.test(navigator.userAgent) ? 'android-user-agent' : 'web',
            };
        } finally {
            stream.getTracks().forEach((track) => track.stop());
            caller.close();
            callee.close();
        }
    });

    expect(result.connected).toBe(true);
    expect(result.remoteTrackReceived).toBe(true);
    expect(result.firstStatsCount).toBeGreaterThan(0);
    expect(result.restartSupported).toBe(true);
});
