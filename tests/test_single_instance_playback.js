/**
 * TunAIde - Single Instance Audio Playback & Loading States Test Suite
 *
 * Verifies all 9 edge cases and acceptance criteria:
 * 1. Only ONE audio instance can play globally across the entire application (Queue, Transcript, Ledger).
 * 2. Play repeatedly on the same recording (no duplicate instances, disabled while loading).
 * 3. Play recording A, then immediately Play recording B (A stops/cancels, only B plays).
 * 4. Stop while audio is loading (pending request cancelled, state resets to IDLE, 0 audio playing).
 * 5. Stop while audio is playing (all audio stopped, currentTime = 0, state resets to IDLE).
 * 6. Pause and immediately click Play (position preserved, resumes from paused timestamp).
 * 7. Navigate away while audio is playing (audio stops, no background playback).
 * 8. Audio fails to load (error state, button retry).
 * 9. Audio reaches its natural end (resets to 0, transitions to IDLE).
 * 10. Rapid switching between multiple recordings (no race condition, at most 1 playing).
 * 11. Transcript view player slab has dedicated Stop button and single-instance coordination.
 * 12. Ledger audio preview stops queue/transcript audio and respects single instance.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('  TunAIde Single Instance Playback & Loading States Test Suite');
console.log('================================================================\n');

// ─── Setup Browser Mock Environment ──────────────────────────────────
const domElements = new Map();

global.document = {
    getElementById: (id) => domElements.get(id) || null,
    querySelectorAll: (selector) => {
        const results = [];
        for (const [id, el] of domElements.entries()) {
            if (selector.includes('sq-playback-controls-') && id.startsWith('sq-playback-controls-')) {
                results.push(el);
            }
            if (selector === 'audio' && el._isAudio) {
                results.push(el);
            }
        }
        return results;
    },
    addEventListener: () => {},
    createElement: (tag) => {
        const el = new MockElement(`mock-${tag}-${Math.random().toString(36).substring(2, 6)}`);
        if (tag === 'audio') el._isAudio = true;
        return el;
    }
};

class MockElement {
    constructor(id) {
        this.id = id;
        this._innerHTML = '';
        this._outerHTML = '';
        this.disabled = false;
        this.classList = {
            _classes: new Set(),
            add: (...cls) => cls.forEach(c => this.classList._classes.add(c)),
            remove: (...cls) => cls.forEach(c => this.classList._classes.delete(c)),
            contains: (c) => this.classList._classes.has(c)
        };
        this.style = {};
    }
    get innerHTML() { return this._innerHTML; }
    set innerHTML(val) { this._innerHTML = val; }
    get outerHTML() { return this._outerHTML || `<div id="${this.id}">${this._innerHTML}</div>`; }
    set outerHTML(val) {
        this._outerHTML = val;
        this._innerHTML = val;
    }
}

global.MockElement = MockElement;

const revokedUrls = [];
global.URL = {
    createObjectURL: (blob) => `blob:mock-uuid-${Math.random().toString(36).substring(2, 9)}`,
    revokeObjectURL: (url) => { revokedUrls.push(url); }
};

class MockAudio {
    constructor(src) {
        this.src = src;
        this.currentTime = 0;
        this.paused = true;
        this._listeners = {};
        this.playCallCount = 0;
        this.pauseCallCount = 0;
        this._isAudio = true;
        MockAudio.allCreated.push(this);
    }
    addEventListener(event, fn) {
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event].push(fn);
    }
    removeEventListener(event, fn) {
        if (!this._listeners[event]) return;
        this._listeners[event] = this._listeners[event].filter(l => l !== fn);
    }
    _emit(event, ...args) {
        if (this._listeners[event]) {
            this._listeners[event].forEach(fn => fn(...args));
        }
    }
    async play() {
        this.playCallCount++;
        this.paused = false;
        this._emit('play');
        this._emit('playing');
        return Promise.resolve();
    }
    pause() {
        this.pauseCallCount++;
        this.paused = true;
        this._emit('pause');
    }
}
MockAudio.allCreated = [];
global.Audio = MockAudio;

// Load Components and App
const Components = require('../app/static/js/components.js');
global.Components = Components;

const { App, CentralizedAudioController, SharedAudioQueueManager } = require('../app/static/js/app.js');
global.App = App;

// Helper to count currently playing instances
function countCurrentlyPlaying() {
    const list = [...MockAudio.allCreated];
    const el = domElements.get('audioElement');
    if (el && !list.includes(el)) list.push(el);
    return list.filter(a => !a.paused).length;
}

// Helper to setup mock DOM
function setupMockContainers(ids) {
    domElements.clear();
    ids.forEach(id => {
        const el = new MockElement(`sq-playback-controls-${id}`);
        el.outerHTML = Components.SharedQueuePlaybackControls(id);
        domElements.set(`sq-playback-controls-${id}`, el);
    });

    // Transcript player elements
    const audioEl = new MockAudio('blob:mock-job-audio');
    audioEl.id = 'audioElement';
    domElements.set('audioElement', audioEl);

    const playPauseBtn = new MockElement('audioPlayPauseBtn');
    domElements.set('audioPlayPauseBtn', playPauseBtn);

    const stopBtn = new MockElement('audioStopBtn');
    domElements.set('audioStopBtn', stopBtn);

    const playIcon = new MockElement('playIcon');
    domElements.set('playIcon', playIcon);

    const pauseIcon = new MockElement('pauseIcon');
    domElements.set('pauseIcon', pauseIcon);

    const bufferIcon = new MockElement('audioBufferIcon');
    domElements.set('audioBufferIcon', bufferIcon);

    const seekBar = new MockElement('audioSeekBar');
    seekBar.value = 0;
    domElements.set('audioSeekBar', seekBar);

    const currentTimeEl = new MockElement('audioCurrentTime');
    currentTimeEl.textContent = '0:00';
    domElements.set('audioCurrentTime', currentTimeEl);
}

function mockFetchOk() {
    App.authFetch = async () => ({
        ok: true,
        status: 200,
        blob: async () => ({ size: 2048, type: 'audio/mpeg' }),
        json: async () => ({})
    });
}

(async () => {
    // ─── Test 1: Code Invariant Verification ───────────────────────────
    console.log('--- Test 1: Code Invariant & Component Structure ---');
    const compCode = fs.readFileSync(path.join(__dirname, '..', 'app', 'static', 'js', 'components.js'), 'utf8');
    const appCode = fs.readFileSync(path.join(__dirname, '..', 'app', 'static', 'js', 'app.js'), 'utf8');

    assert.ok(compCode.includes('id="audioStopBtn"'), 'Dedicated audioStopBtn must exist in Transcript player');
    assert.ok(compCode.includes('App.stopAudio()'), 'App.stopAudio() call must exist on audioStopBtn');
    assert.ok(appCode.includes('class CentralizedAudioController'), 'CentralizedAudioController class defined in app.js');
    assert.ok(appCode.includes('stopAudio:'), 'App.stopAudio defined');
    assert.ok(appCode.includes('App.audioController'), 'App.audioController initialized');
    console.log('✓ Test 1: Dedicated Stop button and CentralizedAudioController correctly defined');

    // ─── Test 2: Edge Case 1 - Repeated Play clicks on same recording ────
    console.log('\n--- Test 2: Repeated Play clicks on same recording ---');
    setupMockContainers(['item-A', 'item-B', 'item-C']);
    mockFetchOk();
    MockAudio.allCreated = [];

    // Trigger play multiple times concurrently
    const p1 = App.sharedAudioQueueManager.play('item-A');
    const p2 = App.sharedAudioQueueManager.play('item-A');
    const p3 = App.sharedAudioQueueManager.play('item-A');

    // While loading, state must be INITIALIZING
    assert.strictEqual(App.sharedAudioQueueManager.getItemState('item-A'), 'INITIALIZING');
    await Promise.all([p1, p2, p3]);

    assert.strictEqual(App.sharedAudioQueueManager.getItemState('item-A'), 'PLAYING');
    assert.strictEqual(countCurrentlyPlaying(), 1, 'Exactly ONE instance playing after repeated clicks');
    console.log('✓ Test 2: Repeated Play clicks guarded; exactly 1 instance playing');

    // ─── Test 3: Edge Case 2 - Play recording A, then immediately Play recording B ─
    console.log('\n--- Test 3: Play recording A, then immediately Play recording B ---');
    App.sharedAudioQueueManager.cleanupAll();
    setupMockContainers(['item-A', 'item-B', 'item-C']);
    MockAudio.allCreated = [];

    let resolveFetchA;
    let resolveFetchB;
    App.authFetch = (url) => {
        if (url.includes('item-A')) {
            return new Promise(res => { resolveFetchA = res; });
        }
        if (url.includes('item-B')) {
            return new Promise(res => { resolveFetchB = res; });
        }
        return Promise.resolve({
            ok: true,
            status: 200,
            blob: async () => ({ size: 1000 }),
            json: async () => ({})
        });
    };

    // User clicks Play on A (slow load)
    const playA = App.sharedAudioQueueManager.play('item-A');
    assert.strictEqual(App.sharedAudioQueueManager.getItemState('item-A'), 'INITIALIZING');

    // User immediately clicks Play on B before A loads
    const playB = App.sharedAudioQueueManager.play('item-B');
    assert.strictEqual(App.sharedAudioQueueManager.getItemState('item-A'), 'IDLE', 'A must be cancelled and reset to IDLE');
    assert.strictEqual(App.sharedAudioQueueManager.getItemState('item-B'), 'INITIALIZING');

    // Resolve B
    resolveFetchB({
        ok: true,
        status: 200,
        blob: async () => ({ size: 1000 }),
        json: async () => ({})
    });
    await playB;
    assert.strictEqual(App.sharedAudioQueueManager.getItemState('item-B'), 'PLAYING');

    // Now A finally resolves late
    resolveFetchA({
        ok: true,
        status: 200,
        blob: async () => ({ size: 1000 }),
        json: async () => ({})
    });
    await playA;

    // A must NOT have started playing; B must still be the only playing track
    assert.strictEqual(App.sharedAudioQueueManager.getItemState('item-A'), 'IDLE', 'A remains IDLE despite late fetch');
    assert.strictEqual(App.sharedAudioQueueManager.getItemState('item-B'), 'PLAYING', 'B is PLAYING');
    assert.strictEqual(countCurrentlyPlaying(), 1, 'At most ONE instance playing');
    console.log('✓ Test 3: Play A then immediately B cancels A; only B plays');

    // ─── Test 4: Edge Case 3 - Click Stop while audio is loading ────────
    console.log('\n--- Test 4: Click Stop while audio is loading ---');
    App.sharedAudioQueueManager.cleanupAll();
    MockAudio.allCreated = [];
    let resolveSlowFetch;
    App.authFetch = () => new Promise(res => { resolveSlowFetch = res; });

    const slowPlay = App.sharedAudioQueueManager.play('item-C');
    assert.strictEqual(App.sharedAudioQueueManager.getItemState('item-C'), 'INITIALIZING');

    // User clicks Stop while loading
    await App.sharedAudioQueueManager.handleGlobalStop('item-C');
    assert.strictEqual(App.sharedAudioQueueManager.getItemState('item-C'), 'IDLE');

    // Now slow fetch resolves
    resolveSlowFetch({
        ok: true,
        blob: async () => ({ size: 500 }),
        json: async () => ({})
    });
    await slowPlay;

    assert.strictEqual(App.sharedAudioQueueManager.getItemState('item-C'), 'IDLE', 'State must remain IDLE');
    assert.strictEqual(countCurrentlyPlaying(), 0, 'ZERO audio instances playing');
    console.log('✓ Test 4: Stop while loading cancels pending request and stays IDLE');

    // ─── Test 5: Edge Case 4 - Click Stop while audio is playing ─────────
    console.log('\n--- Test 5: Click Stop while audio is playing ---');
    mockFetchOk();
    await App.sharedAudioQueueManager.play('item-A');
    assert.strictEqual(App.sharedAudioQueueManager.getItemState('item-A'), 'PLAYING');
    assert.strictEqual(countCurrentlyPlaying(), 1);

    // Simulate progress
    const activeAud = App.sharedAudioQueueManager.getInstance('item-A').audio;
    activeAud.currentTime = 42.0;

    // Click Stop
    await App.sharedAudioQueueManager.handleGlobalStop('item-A');
    assert.strictEqual(App.sharedAudioQueueManager.getItemState('item-A'), 'IDLE');
    assert.strictEqual(App.sharedAudioQueueManager.getPlaybackPosition('item-A'), 0, 'Position reset to 0');
    assert.strictEqual(activeAud.currentTime, 0, 'Audio currentTime reset to 0');
    assert.strictEqual(countCurrentlyPlaying(), 0, 'No audio playing after stop');
    console.log('✓ Test 5: Stop while playing resets position to 0 and transitions to IDLE');

    // ─── Test 6: Edge Case 5 - Pause and immediately click Play ──────────
    console.log('\n--- Test 6: Pause and immediately click Play ---');
    await App.sharedAudioQueueManager.play('item-A');
    assert.strictEqual(App.sharedAudioQueueManager.getItemState('item-A'), 'PLAYING');

    activeAud.currentTime = 18.5;
    await App.sharedAudioQueueManager.pause('item-A');
    assert.strictEqual(App.sharedAudioQueueManager.getItemState('item-A'), 'PAUSED');
    assert.strictEqual(App.sharedAudioQueueManager.getPlaybackPosition('item-A'), 18.5);

    // Immediately click play
    await App.sharedAudioQueueManager.play('item-A');
    assert.strictEqual(App.sharedAudioQueueManager.getItemState('item-A'), 'PLAYING');
    assert.strictEqual(activeAud.currentTime, 18.5, 'Resumes from exact 18.5s');
    assert.strictEqual(countCurrentlyPlaying(), 1);
    console.log('✓ Test 6: Pause and immediately Play resumes preserved position');

    // ─── Test 7: Edge Case 6 - Navigate away while audio is playing ─────
    console.log('\n--- Test 7: Navigate away while audio is playing ---');
    assert.strictEqual(countCurrentlyPlaying(), 1, 'Audio playing before navigation');

    // Navigate to dashboard
    App.navigateTo('dashboard');
    assert.strictEqual(countCurrentlyPlaying(), 0, 'All audio stopped after navigateTo');
    console.log('✓ Test 7: navigateTo stops all audio globally with no background playback');

    // ─── Test 8: Edge Case 7 - Audio fails to load ───────────────────────
    console.log('\n--- Test 8: Audio fails to load ---');
    App.authFetch = async () => ({ ok: false, status: 404 });
    App.sharedAudioQueueManager._instances.delete('item-err');

    await App.sharedAudioQueueManager.play('item-err');
    assert.strictEqual(App.sharedAudioQueueManager.getItemState('item-err'), 'ERROR');
    assert.strictEqual(countCurrentlyPlaying(), 0);

    // Retry with working network
    mockFetchOk();
    await App.sharedAudioQueueManager.handlePlayPause('item-err');
    assert.strictEqual(App.sharedAudioQueueManager.getItemState('item-err'), 'PLAYING');
    assert.strictEqual(countCurrentlyPlaying(), 1);
    await App.sharedAudioQueueManager.handleGlobalStop();
    console.log('✓ Test 8: Load error transitions to ERROR; retry successfully starts playback');

    // ─── Test 9: Edge Case 8 - Audio reaches natural end ─────────────────
    console.log('\n--- Test 9: Audio reaches natural end ---');
    await App.sharedAudioQueueManager.play('item-A');
    assert.strictEqual(App.sharedAudioQueueManager.getItemState('item-A'), 'PLAYING');

    const audA = App.sharedAudioQueueManager.getInstance('item-A').audio;
    audA.currentTime = 90;
    audA._emit('ended');

    assert.strictEqual(App.sharedAudioQueueManager.getItemState('item-A'), 'IDLE');
    assert.strictEqual(App.sharedAudioQueueManager.getPlaybackPosition('item-A'), 0);
    assert.strictEqual(countCurrentlyPlaying(), 0);
    console.log('✓ Test 9: ended event resets position to 0 and transitions state to IDLE');

    // ─── Test 10: Edge Case 9 - Rapid switching between multiple recordings ─
    console.log('\n--- Test 10: Rapid switching between multiple recordings ---');
    MockAudio.allCreated = [];
    const pA = App.sharedAudioQueueManager.play('item-A');
    const pB = App.sharedAudioQueueManager.play('item-B');
    const pC = App.sharedAudioQueueManager.play('item-C');

    await Promise.all([pA, pB, pC]);

    assert.strictEqual(App.sharedAudioQueueManager.getItemState('item-C'), 'PLAYING');
    assert.strictEqual(App.sharedAudioQueueManager.getItemState('item-A'), 'IDLE');
    assert.strictEqual(App.sharedAudioQueueManager.getItemState('item-B'), 'IDLE');
    assert.strictEqual(countCurrentlyPlaying(), 1, 'Only the final recording C is playing');
    console.log('✓ Test 10: Rapid switching across recordings leaves at most ONE playing instance');

    // ─── Test 11: Cross-Component Single Instance (Queue vs Transcript) ──
    console.log('\n--- Test 11: Cross-Component Single Instance (Queue vs Transcript vs Ledger) ---');
    // Start Queue item-C
    assert.strictEqual(App.sharedAudioQueueManager.getItemState('item-C'), 'PLAYING');
    assert.strictEqual(countCurrentlyPlaying(), 1);

    // Now user plays Transcript audio
    App.state.currentJob = { id: 'test-job-999' };
    await App.togglePlayPause();

    // Queue audio must have been stopped!
    assert.strictEqual(App.sharedAudioQueueManager.getItemState('item-C'), 'IDLE', 'Queue audio stopped when Transcript played');
    const transcriptAudio = domElements.get('audioElement');
    assert.strictEqual(transcriptAudio.paused, false, 'Transcript audio is playing');
    assert.strictEqual(countCurrentlyPlaying(), 1, 'Exactly one audio playing across the entire application');

    // Stop Transcript player using dedicated stop button
    App.stopAudio();
    assert.strictEqual(transcriptAudio.paused, true);
    assert.strictEqual(transcriptAudio.currentTime, 0);
    assert.strictEqual(countCurrentlyPlaying(), 0);
    console.log('✓ Test 11: Cross-component exclusivity verified (Queue auto-stopped when Transcript played)');

    // ─── Test 12: Ledger Audio Preview Coordination ──────────────────────
    console.log('\n--- Test 12: Ledger Audio Preview Coordination ---');
    // Start transcript audio again
    await App.togglePlayPause();
    assert.strictEqual(transcriptAudio.paused, false);

    // Mock DOM for ledger button
    const ledgerPlayBtn = new MockElement('ledgerPlayBtn');
    domElements.set('ledgerPlayBtn', ledgerPlayBtn);
    const ledgerPlayIcon = new MockElement('ledgerPlayIcon');
    domElements.set('ledgerPlayIcon', ledgerPlayIcon);
    const ledgerPlayText = new MockElement('ledgerPlayText');
    domElements.set('ledgerPlayText', ledgerPlayText);

    // User plays ledger audio
    await App.toggleLedgerAudio('job-ledger-1');
    assert.strictEqual(transcriptAudio.paused, true, 'Transcript audio stopped when Ledger audio played');
    assert.strictEqual(countCurrentlyPlaying(), 1, 'Only Ledger audio is playing');

    // User stops all audio
    App.audioController.stopAll();
    assert.strictEqual(countCurrentlyPlaying(), 0, 'stopAll stops Ledger audio too');
    console.log('✓ Test 12: Ledger audio coordinates with CentralizedAudioController');

    console.log('\n================================================================');
    console.log('  All 12 Single Instance & Loading State Tests Passed! ✓');
    console.log('================================================================');
})().catch(err => {
    console.error('\n❌ Test Suite Failed:', err);
    process.exit(1);
});
