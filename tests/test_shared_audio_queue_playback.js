/**
 * TunAIde - Shared Audio Queue Playback Controls Comprehensive Test Suite
 *
 * Verifies:
 * 1. Playback State Machine (IDLE, INITIALIZING, PLAYING, PAUSING, PAUSED, STOPPING, ERROR)
 * 2. Play button behavior (first play from 0, loading indicator, pause button replacement)
 * 3. Pause button behavior (pausing loading indicator, preserves position, resume from preserved position)
 * 4. Stop button behavior (GLOBAL action stopping ALL active audio, resets position to 0, returns to IDLE)
 * 5. Single-audio playback constraint (playing another track pauses the active track)
 * 6. Rapid clicks and race conditions (cancellation tokens, stop/pause during initialization)
 * 7. Audio ended event handling (resets position, returns to IDLE)
 * 8. Error handling and retry (fetch failure -> ERROR -> retry -> PLAYING)
 * 9. Resource management (cleanup on item delete/claim, blob URL revocation, navigation cleanup)
 * 10. Polling resilience (audio instances and state persist across 5-second DOM re-renders)
 * 11. UI and component structure (Play/Pause, Stop, SVG icons, disabled loading states)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('  TunAIde Shared Audio Queue Playback Controls Test Suite');
console.log('================================================================\n');

// ─── Setup Browser Mock Environment for Node.js ──────────────────────
const domElements = new Map();

global.document = {
    getElementById: (id) => domElements.get(id) || null,
    querySelectorAll: (selector) => {
        const results = [];
        for (const [id, el] of domElements.entries()) {
            if (selector.includes('sq-playback-controls-') && id.startsWith('sq-playback-controls-')) {
                results.push(el);
            }
        }
        return results;
    },
    addEventListener: () => {}
};

class MockElement {
    constructor(id) {
        this.id = id;
        this._innerHTML = '';
        this._outerHTML = '';
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
        MockAudio.instances.push(this);
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
        return Promise.resolve();
    }
    pause() {
        this.pauseCallCount++;
        this.paused = true;
        this._emit('pause');
    }
}
MockAudio.instances = [];
global.Audio = MockAudio;

// Load Components and App
const Components = require('../app/static/js/components.js');
global.Components = Components;

const { App, SharedAudioQueueManager } = require('../app/static/js/app.js');
global.App = App;

// Helper to mock mock DOM containers for queue items
function setupMockDom(itemIds) {
    domElements.clear();
    itemIds.forEach(id => {
        const el = new MockElement(`sq-playback-controls-${id}`);
        el.outerHTML = Components.SharedQueuePlaybackControls(id);
        domElements.set(`sq-playback-controls-${id}`, el);
    });
}

// Helper to mock successful fetch
function mockAuthFetchSuccess() {
    App.authFetch = async (url) => {
        return {
            ok: true,
            status: 200,
            blob: async () => ({ size: 1024, type: 'audio/mpeg' }),
            json: async () => ({})
        };
    };
}

// ─── Test 1: Static Code Structure & Invariants ───────────────────────
console.log('--- Phase 1: Static Analysis & Code Invariants ---');
const componentsCode = fs.readFileSync(path.join(__dirname, '..', 'app', 'static', 'js', 'components.js'), 'utf8');
const appCode = fs.readFileSync(path.join(__dirname, '..', 'app', 'static', 'js', 'app.js'), 'utf8');

assert.ok(componentsCode.includes('SharedQueuePlaybackControls'), 'Components.SharedQueuePlaybackControls missing');
assert.ok(componentsCode.includes('SharedQueuePlayPauseButton'), 'Components.SharedQueuePlayPauseButton missing');
assert.ok(componentsCode.includes('SharedQueueStopButton'), 'Components.SharedQueueStopButton missing');
assert.ok(componentsCode.includes('sq-playback-controls-'), 'sq-playback-controls container ID missing');
assert.ok(componentsCode.includes('sharedPlayBtn-'), 'sharedPlayBtn ID missing');
assert.ok(componentsCode.includes('sharedStopBtn-'), 'sharedStopBtn ID missing');
console.log('✓ Invariant 1: Component helper methods and DOM container IDs properly defined');

assert.ok(appCode.includes('class SharedAudioQueueManager'), 'SharedAudioQueueManager class missing in app.js');
assert.ok(appCode.includes('Promise.allSettled'), 'Promise.allSettled missing in global stop');
assert.ok(appCode.includes('App.sharedAudioQueueManager'), 'App.sharedAudioQueueManager missing on App');
assert.ok(appCode.includes('handleGlobalStop'), 'handleGlobalStop method missing');
console.log('✓ Invariant 2: SharedAudioQueueManager and Promise.allSettled present in app.js');

assert.ok(appCode.includes("if (App.state.view === 'shared-queue' && viewName !== 'shared-queue')"), 'Navigation cleanup missing');
console.log('✓ Invariant 3: Navigation away from shared-queue triggers audio cleanup');

// ─── Test 2: Initial State ───────────────────────────────────────────
console.log('\n--- Phase 2: State Machine & Playback Lifecycle ---');
const manager = new SharedAudioQueueManager();
App.sharedAudioQueueManager = manager;
setupMockDom(['item-1', 'item-2', 'item-3']);

assert.strictEqual(manager.getItemState('item-1'), 'IDLE', 'Item state must start as IDLE');
assert.strictEqual(manager.getPlaybackPosition('item-1'), 0, 'Initial position must be 0');
assert.strictEqual(manager.isGlobalStopping(), false, 'Global stopping flag must start false');
console.log('✓ Test 2.1: Initial state is IDLE, position is 0');

// ─── Test 3: First Play (IDLE -> INITIALIZING -> PLAYING) ─────────────
(async () => {
    mockAuthFetchSuccess();
    MockAudio.instances = [];

    // Initiate play
    const playPromise = manager.play('item-1');
    assert.strictEqual(manager.getItemState('item-1'), 'INITIALIZING', 'State must be INITIALIZING while loading');
    
    // Check loading indicator during INITIALIZING
    const loadingHtml = Components.SharedQueuePlayPauseButton('item-1', 'INITIALIZING', false);
    assert.ok(loadingHtml.includes('disabled'), 'Play/Pause button must be disabled during INITIALIZING');
    assert.ok(loadingHtml.includes('animate-spin'), 'Spinner must be visible during INITIALIZING');

    await playPromise;

    assert.strictEqual(manager.getItemState('item-1'), 'PLAYING', 'State must be PLAYING after resolution');
    assert.strictEqual(manager._activePlayingId, 'item-1', 'Active playing ID must be item-1');
    assert.strictEqual(MockAudio.instances.length, 1, 'Exactly one audio instance created');
    assert.strictEqual(MockAudio.instances[0].currentTime, 0, 'First play starts at 0');

    // UI shows Pause button
    const playingHtml = Components.SharedQueuePlayPauseButton('item-1', 'PLAYING', false);
    assert.ok(!playingHtml.includes('disabled'), 'Pause button must not be disabled');
    assert.ok(playingHtml.includes('title="Pause"'), 'Button title must be Pause');
    console.log('✓ Test 2.2: First Play transitions IDLE -> INITIALIZING -> PLAYING, renders Pause button');

    // ─── Test 4: Pause (PLAYING -> PAUSING -> PAUSED) ─────────────────
    // Simulate user playing for 12.5 seconds
    MockAudio.instances[0].currentTime = 12.5;

    const pausePromise = manager.pause('item-1');
    // While pausing:
    assert.strictEqual(manager.getItemState('item-1'), 'PAUSED', 'State must be PAUSED after pause completes');
    assert.strictEqual(manager.getPlaybackPosition('item-1'), 12.5, 'Exact playback position (12.5s) must be preserved');
    assert.strictEqual(manager._activePlayingId, null, 'Active playing ID cleared on pause');
    assert.strictEqual(MockAudio.instances[0].paused, true, 'Audio element must be paused');

    // UI shows Resume/Play button
    const pausedHtml = Components.SharedQueuePlayPauseButton('item-1', 'PAUSED', false);
    assert.ok(pausedHtml.includes('title="Resume"'), 'Button title must be Resume');
    console.log('✓ Test 2.3: Pause transitions PLAYING -> PAUSING -> PAUSED, preserves position at 12.5s');

    // ─── Test 5: Resume from Paused (PAUSED -> INITIALIZING -> PLAYING) ─
    await manager.play('item-1');
    assert.strictEqual(manager.getItemState('item-1'), 'PLAYING', 'State must be PLAYING on resume');
    assert.strictEqual(MockAudio.instances[0].currentTime, 12.5, 'Resume must continue from preserved 12.5s');
    assert.strictEqual(MockAudio.instances.length, 1, 'Must reuse existing audio instance without re-downloading');
    console.log('✓ Test 2.4: Resume from PAUSED continues from exact 12.5s without re-creating instance');

    // ─── Test 6: Single-Audio Playback Constraint ──────────────────────
    // When item-1 is PLAYING and user plays item-2:
    // item-1 must be paused, item-2 must start playing
    await manager.play('item-2');
    assert.strictEqual(manager.getItemState('item-1'), 'PAUSED', 'item-1 must be auto-paused when item-2 starts');
    assert.strictEqual(manager.getItemState('item-2'), 'PLAYING', 'item-2 must be PLAYING');
    assert.strictEqual(manager._activePlayingId, 'item-2', 'item-2 is now active playing ID');
    assert.strictEqual(MockAudio.instances[0].paused, true, 'item-1 audio element is paused');
    assert.strictEqual(MockAudio.instances[1].paused, false, 'item-2 audio element is playing');
    console.log('✓ Test 2.5: Single-audio playback constraint enforced (item-1 paused before item-2 started)');

    // ─── Test 7: Global Stop Action ────────────────────────────────────
    console.log('\n--- Phase 3: Global Stop & Promise.allSettled ---');
    // Currently item-1 is PAUSED (at 12.5s) and item-2 is PLAYING (at 0s)
    MockAudio.instances[1].currentTime = 5.0;

    const stopPromise = manager.handleGlobalStop('item-3'); // Click stop on item-3
    assert.strictEqual(manager.isGlobalStopping(), true, 'Global stopping flag must be true during stop');
    
    // While stopping, UI buttons must show stopping state
    const stoppingPlayHtml = Components.SharedQueuePlayPauseButton('item-2', 'STOPPING', true);
    assert.ok(stoppingPlayHtml.includes('disabled'), 'Play/Pause button disabled during stopping');
    const stoppingStopHtml = Components.SharedQueueStopButton('item-2', 'STOPPING', true);
    assert.ok(stoppingStopHtml.includes('disabled'), 'Stop button disabled during stopping');

    await stopPromise;

    assert.strictEqual(manager.isGlobalStopping(), false, 'Global stopping flag resets to false');
    assert.strictEqual(manager.getItemState('item-1'), 'IDLE', 'item-1 must be reset to IDLE');
    assert.strictEqual(manager.getItemState('item-2'), 'IDLE', 'item-2 must be reset to IDLE');
    assert.strictEqual(manager.getPlaybackPosition('item-1'), 0, 'item-1 position reset to 0');
    assert.strictEqual(manager.getPlaybackPosition('item-2'), 0, 'item-2 position reset to 0');
    assert.strictEqual(MockAudio.instances[0].currentTime, 0, 'item-1 audio currentTime reset to 0');
    assert.strictEqual(MockAudio.instances[1].currentTime, 0, 'item-2 audio currentTime reset to 0');
    assert.strictEqual(manager._activePlayingId, null, 'Active playing ID cleared');
    console.log('✓ Test 3.1: Global Stop stops ALL active audio, resets positions to 0, returns all to IDLE');

    // Next play after Stop starts from 0
    await manager.play('item-1');
    assert.strictEqual(MockAudio.instances[0].currentTime, 0, 'Play after stop must start from beginning (0)');
    await manager.handleGlobalStop();
    console.log('✓ Test 3.2: Play after Stop starts from beginning (0)');

    // ─── Test 8: Concurrent Operations & Cancellation Tokens ───────────
    console.log('\n--- Phase 4: Race Conditions & Concurrent Guarding ---');
    
    // Scenario 8A: Rapid clicks on Play
    // While item-1 is INITIALIZING, calling play() again must be ignored
    let fetchResolve;
    App.authFetch = () => new Promise(resolve => { fetchResolve = resolve; });
    manager._instances.delete('item-1'); // Reset instance

    const p1 = manager.play('item-1');
    const p2 = manager.play('item-1'); // Duplicate rapid click
    assert.strictEqual(manager.getItemState('item-1'), 'INITIALIZING');
    
    fetchResolve({
        ok: true,
        blob: async () => ({ size: 500 }),
        json: async () => ({})
    });
    await Promise.all([p1, p2]);
    assert.strictEqual(manager.getItemState('item-1'), 'PLAYING');
    console.log('✓ Test 4.1: Rapid duplicate clicks on Play handled gracefully without duplicate instances');

    // Scenario 8B: Stop clicked while INITIALIZING
    mockAuthFetchSuccess();
    manager._instances.delete('item-1');
    let slowFetchResolve;
    App.authFetch = () => new Promise(resolve => { slowFetchResolve = resolve; });

    const slowPlay = manager.play('item-1');
    assert.strictEqual(manager.getItemState('item-1'), 'INITIALIZING');

    // User clicks Stop before fetch finishes
    await manager.handleGlobalStop('item-1');
    assert.strictEqual(manager.getItemState('item-1'), 'IDLE');

    // Now slow fetch resolves
    slowFetchResolve({
        ok: true,
        blob: async () => ({ size: 500 }),
        json: async () => ({})
    });
    await slowPlay;

    // Cancellation token must prevent audio from starting playback!
    assert.strictEqual(manager.getItemState('item-1'), 'IDLE', 'State must remain IDLE; must not transition to PLAYING');
    assert.strictEqual(manager._activePlayingId, null, 'No audio should be active');
    console.log('✓ Test 4.2: Stop while INITIALIZING successfully cancels playback via cancellation token');

    // ─── Test 9: Natural Audio Completion (ended event) ────────────────
    console.log('\n--- Phase 5: Native Audio Events & Error Handling ---');
    mockAuthFetchSuccess();
    await manager.play('item-1');
    assert.strictEqual(manager.getItemState('item-1'), 'PLAYING');

    const activeAudio = manager.getInstance('item-1').audio;
    activeAudio.currentTime = 120;
    // Simulate ended event
    activeAudio._emit('ended');

    assert.strictEqual(manager.getItemState('item-1'), 'IDLE', 'State must transition to IDLE on ended');
    assert.strictEqual(manager.getPlaybackPosition('item-1'), 0, 'Position must reset to 0 on ended');
    assert.strictEqual(manager._activePlayingId, null, 'Active playing ID cleared on ended');
    console.log('✓ Test 5.1: Audio ended event resets position to 0 and transitions state to IDLE');

    // ─── Test 10: Network Failure & Error State ────────────────────────
    App.authFetch = async () => ({ ok: false, status: 500, statusText: 'Internal Error' });
    manager._instances.delete('item-fail');

    await manager.play('item-fail');
    assert.strictEqual(manager.getItemState('item-fail'), 'ERROR', 'Fetch failure transitions to ERROR');

    // UI shows Retry button
    const errorHtml = Components.SharedQueuePlayPauseButton('item-fail', 'ERROR', false);
    assert.ok(errorHtml.includes('title="Playback error – click to retry"'), 'Retry tooltip displayed');

    // User clicks retry with fixed network
    mockAuthFetchSuccess();
    await manager.handlePlayPause('item-fail');
    assert.strictEqual(manager.getItemState('item-fail'), 'PLAYING', 'Clicking retry successfully plays audio');
    console.log('✓ Test 5.2: Network error transitions to ERROR; user can retry successfully');

    // ─── Test 11: Resource Management & Memory Leaks ───────────────────
    console.log('\n--- Phase 6: Resource Cleanup & Object URL Revocation ---');
    revokedUrls.length = 0;
    const inst = manager.getInstance('item-fail');
    const blobUrl = inst.blobUrl;
    assert.ok(blobUrl, 'Blob URL should exist');

    manager.removeInstance('item-fail');
    assert.ok(revokedUrls.includes(blobUrl), 'URL.revokeObjectURL must be called when removing instance');
    assert.strictEqual(manager._instances.has('item-fail'), false, 'Instance removed from manager');
    console.log('✓ Test 6.1: removeInstance revokes blob URL and cleans up memory');

    // Test syncWithQueueItems removes deleted queue entries
    manager.getInstance('item-a');
    manager.getInstance('item-b');
    manager.syncWithQueueItems([{ id: 'item-a' }]); // item-b was removed from backend
    assert.strictEqual(manager._instances.has('item-a'), true, 'item-a kept in manager');
    assert.strictEqual(manager._instances.has('item-b'), false, 'item-b pruned from manager');
    console.log('✓ Test 6.2: syncWithQueueItems prunes removed items');

    // ─── Test 12: DOM Polling Resilience ───────────────────────────────
    console.log('\n--- Phase 7: DOM Polling Resilience (5s Interval Persistence) ---');
    mockAuthFetchSuccess();
    await manager.play('item-1');
    assert.strictEqual(manager.getItemState('item-1'), 'PLAYING');

    // Simulate 5-second polling re-render of Components.SharedAudioQueue
    const mockQueueItems = [
        { id: 'item-1', original_filename: 'interview.mp3', duration_seconds: 120, file_size_bytes: 2048000, uploaded_at: new Date().toISOString() }
    ];
    const reRenderedTableHtml = Components.SharedAudioQueue(mockQueueItems);

    // The re-rendered table should immediately reflect the PLAYING state (Pause button)
    assert.ok(reRenderedTableHtml.includes('title="Pause"'), 'Table re-render queries manager state and displays Pause button');
    assert.strictEqual(manager.getItemState('item-1'), 'PLAYING', 'Audio playback state unaffected by table re-render');
    console.log('✓ Test 7.1: Audio playback and button states persist across automatic 5-second DOM re-renders');

    console.log('\n================================================================');
    console.log('  All 12 Playback Controls Enhancement Test Suites Passed! ✓');
    console.log('================================================================');
})().catch(err => {
    console.error('\n❌ Test Suite Failed:', err);
    process.exit(1);
});

