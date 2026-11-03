/**
 * SharedAudioQueueManager
 *
 * Centralized state machine & playback controller for the Shared Audio Queue.
 *
 * States per queue entry:
 *   IDLE          - Not playing, playback position at 0
 *   INITIALIZING  - Fetching audio blob / initializing Audio instance / awaiting play()
 *   PLAYING       - Audio actively playing
 *   PAUSING       - Audio is pausing
 *   PAUSED        - Audio paused, playback position preserved
 *   STOPPING      - Global or individual stop in progress
 *   ERROR         - Error occurred during fetch/decoding
 *
 * Transitions:
 *   IDLE         -> INITIALIZING -> PLAYING
 *   PLAYING      -> PAUSING      -> PAUSED
 *   PAUSED       -> INITIALIZING -> PLAYING
 *   PLAYING      -> STOPPING     -> IDLE
 *   PAUSED       -> STOPPING     -> IDLE
 *   INITIALIZING -> ERROR
 *   PLAYING      -> ERROR
 *   STOPPING     -> IDLE
 */
/**
 * CentralizedAudioController
 *
 * Enforces a single active audio playback instance across the entire application:
 * - Only ONE audio instance can play at any given time across all components & views.
 * - Maintains reference to the currently active audio instance.
 * - Stops/pauses previously playing audio before a new recording starts.
 * - Cancels/invalidates pending or in-flight requests when another track or Stop is clicked.
 * - Provides centralized cleanup on navigation, component unmount, or modal close.
 */
class CentralizedAudioController {
    constructor() {
        this._activeAudio = null;
        this._activeRecordingId = null;
        this._stopCallback = null;
        this._globalOpId = 0;
    }

    notifyActive(recordingId, stopCallback = null) {
        this._globalOpId++;
        // If there was an active audio from another component/recording, stop it immediately
        if (this._activeRecordingId && this._activeRecordingId !== recordingId) {
            const isBothQueue = this._activeRecordingId.startsWith('sq-') && recordingId.startsWith('sq-');
            if (!isBothQueue && this._stopCallback) {
                const cb = this._stopCallback;
                this._stopCallback = null;
                try {
                    cb();
                } catch (e) {
                    console.warn('Error invoking previous audio stopCallback:', e);
                }
            }
            if (this._activeAudio && !isBothQueue) {
                try {
                    this._activeAudio.pause();
                } catch (e) {}
                this._activeAudio = null;
            }
        }
        this._activeRecordingId = recordingId;
        this._stopCallback = stopCallback;
    }

    setActiveAudio(audio, recordingId) {
        this._activeAudio = audio;
        this._activeRecordingId = recordingId;
    }

    getActiveAudio() {
        return this._activeAudio;
    }

    getActiveRecordingId() {
        return this._activeRecordingId;
    }

    stopAll() {
        this._globalOpId++;
        if (this._stopCallback) {
            const cb = this._stopCallback;
            this._stopCallback = null;
            try {
                cb();
            } catch (e) {
                console.warn('Error invoking stopCallback:', e);
            }
        }
        if (typeof App !== 'undefined' && App.sharedAudioQueueManager) {
            App.sharedAudioQueueManager._isGlobalStopping = false;
        }
        if (this._activeAudio) {
            try {
                this._activeAudio.pause();
                this._activeAudio.currentTime = 0;
            } catch (e) {}
            this._activeAudio = null;
        }
        this._activeRecordingId = null;

        // Ensure all <audio> elements across the DOM are stopped and reset
        if (typeof document !== 'undefined') {
            document.querySelectorAll('audio').forEach(a => {
                try {
                    a.pause();
                    a.currentTime = 0;
                } catch (e) {}
            });
        }
    }

    _stopNonQueueAudio() {
        if (this._activeRecordingId && !this._activeRecordingId.startsWith('sq-')) {
            if (this._stopCallback) {
                try { this._stopCallback(); } catch (e) {}
                this._stopCallback = null;
            }
            if (this._activeAudio) {
                try {
                    this._activeAudio.pause();
                    this._activeAudio.currentTime = 0;
                } catch (e) {}
                this._activeAudio = null;
            }
            this._activeRecordingId = null;
        }
        if (typeof document !== 'undefined') {
            const transcriptAudio = document.getElementById('audioElement');
            if (transcriptAudio && !transcriptAudio.paused) {
                try {
                    transcriptAudio.pause();
                    transcriptAudio.currentTime = 0;
                } catch (e) {}
            }
        }
    }
}

class SharedAudioQueueManager {
    constructor() {
        this._instances = new Map(); // itemId -> { id, state, audio, blobUrl, position, opId, error }
        this._activePlayingId = null;
        this._initializingId = null;
        this._isGlobalStopping = false;
        this._globalOpId = 0;
    }

    getInstance(itemId) {
        if (!this._instances.has(itemId)) {
            this._instances.set(itemId, {
                id: itemId,
                state: 'IDLE',
                audio: null,
                blobUrl: null,
                position: 0,
                opId: 0,
                error: null
            });
        }
        return this._instances.get(itemId);
    }

    getItemState(itemId) {
        if (!this._instances.has(itemId)) return 'IDLE';
        return this._instances.get(itemId).state;
    }

    isGlobalStopping() {
        return this._isGlobalStopping;
    }

    getPlaybackPosition(itemId) {
        const inst = this._instances.get(itemId);
        if (!inst) return 0;
        if (inst.state === 'IDLE') return 0;
        if (inst.audio && !inst.audio.paused) {
            return inst.audio.currentTime || 0;
        }
        return inst.position || 0;
    }

    async handlePlayPause(itemId) {
        const state = this.getItemState(itemId);
        if (state === 'PLAYING') {
            return await this.pause(itemId);
        } else if (state === 'IDLE' || state === 'PAUSED' || state === 'ERROR') {
            return await this.play(itemId);
        }
        // When INITIALIZING, PAUSING, or STOPPING, button is disabled; ignore clicks
    }

    async play(itemId) {
        const inst = this.getInstance(itemId);

        // Guard against duplicate concurrent calls while initializing or already playing
        if (inst.state === 'INITIALIZING' || inst.state === 'PLAYING') {
            return;
        }

        // Advance operation counter for cancellation tokens
        inst.opId = (inst.opId || 0) + 1;
        const currentOpId = inst.opId;
        const currentGlobalOpId = this._globalOpId;

        // Transition to INITIALIZING immediately (disables button & shows loading spinner)
        inst.state = 'INITIALIZING';
        inst.error = null;
        this.updateEntryUI(itemId);

        // Single-audio playback constraint across the ENTIRE application:
        // 1. Notify CentralizedAudioController to stop any non-queue active audio
        if (typeof App !== 'undefined' && App.audioController) {
            App.audioController.notifyActive('sq-' + itemId, () => this.handleGlobalStop());
        }

        // 2. If another queue item is currently playing, pause it immediately
        if (this._activePlayingId && this._activePlayingId !== itemId) {
            await this.pause(this._activePlayingId);
        }

        // 3. If another queue item is currently initializing, cancel it immediately!
        if (this._initializingId && this._initializingId !== itemId) {
            const prevInst = this._instances.get(this._initializingId);
            if (prevInst) {
                prevInst.opId = (prevInst.opId || 0) + 1; // cancel token
                prevInst.state = 'IDLE';
                prevInst.position = 0;
                this.updateEntryUI(this._initializingId);
            }
        }
        this._initializingId = itemId;

        // Check cancellation
        if (inst.opId !== currentOpId || this._globalOpId !== currentGlobalOpId || this._isGlobalStopping || this._initializingId !== itemId) {
            return;
        }

        try {
            // Step 1: Ensure audio instance and blob URL are ready
            if (!inst.audio || !inst.blobUrl) {
                const res = await App.authFetch(`${App.API_URL}/queue/${itemId}/audio`);
                if (!res.ok) {
                    throw new Error(`Failed to load audio (${res.status})`);
                }
                const blob = await res.blob();

                // Check cancellation
                if (inst.opId !== currentOpId || this._globalOpId !== currentGlobalOpId || this._isGlobalStopping || this._initializingId !== itemId) {
                    return;
                }

                const createUrl = (typeof URL !== 'undefined' && URL.createObjectURL)
                    ? URL.createObjectURL.bind(URL)
                    : (typeof window !== 'undefined' && window.URL && window.URL.createObjectURL)
                    ? window.URL.createObjectURL.bind(window.URL)
                    : (b) => `blob:mock-${itemId}`;

                inst.blobUrl = createUrl(blob);

                const AudioConstructor = (typeof Audio !== 'undefined')
                    ? Audio
                    : (typeof window !== 'undefined' && window.Audio)
                    ? window.Audio
                    : null;

                if (!AudioConstructor) {
                    throw new Error('Audio API not available in this environment');
                }

                const audio = new AudioConstructor(inst.blobUrl);
                inst.audio = audio;

                // Event listener: Audio reached the end naturally
                audio.addEventListener('ended', () => {
                    try {
                        audio.pause();
                        audio.currentTime = 0;
                    } catch (e) {}
                    inst.position = 0;
                    inst.state = 'IDLE';
                    if (this._activePlayingId === itemId) {
                        this._activePlayingId = null;
                    }
                    if (this._initializingId === itemId) {
                        this._initializingId = null;
                    }
                    if (typeof App !== 'undefined' && App.audioController && App.audioController.getActiveAudio() === audio) {
                        App.audioController.setActiveAudio(null, null);
                    }
                    this.updateEntryUI(itemId);
                });

                // Event listener: Media error
                audio.addEventListener('error', (e) => {
                    if (inst.state !== 'STOPPING' && inst.state !== 'IDLE') {
                        inst.state = 'ERROR';
                        inst.error = 'Audio playback error';
                        if (this._activePlayingId === itemId) {
                            this._activePlayingId = null;
                        }
                        if (this._initializingId === itemId) {
                            this._initializingId = null;
                        }
                        this.updateEntryUI(itemId);
                    }
                });
            }

            // Check cancellation after audio preparation
            if (inst.opId !== currentOpId || this._globalOpId !== currentGlobalOpId || this._isGlobalStopping || this._initializingId !== itemId) {
                if (inst.audio) {
                    try { inst.audio.pause(); } catch (e) {}
                }
                return;
            }

            // Step 2: Set start or resume position
            if (inst.position > 0) {
                try {
                    inst.audio.currentTime = inst.position;
                } catch (e) {
                    console.warn('Could not seek audio position:', e);
                }
            } else {
                try {
                    inst.audio.currentTime = 0;
                } catch (e) {}
            }

            // Step 3: Trigger playback and wait for confirmation
            await new Promise((resolve, reject) => {
                let resolved = false;
                const done = () => {
                    if (!resolved) {
                        resolved = true;
                        if (inst.audio) {
                            inst.audio.removeEventListener('playing', done);
                            inst.audio.removeEventListener('play', done);
                            inst.audio.removeEventListener('error', onErr);
                        }
                        resolve();
                    }
                };
                const onErr = (e) => {
                    if (!resolved) {
                        resolved = true;
                        if (inst.audio) {
                            inst.audio.removeEventListener('playing', done);
                            inst.audio.removeEventListener('play', done);
                            inst.audio.removeEventListener('error', onErr);
                        }
                        reject(e || new Error('Playback error'));
                    }
                };
                inst.audio.addEventListener('playing', done, { once: true });
                inst.audio.addEventListener('play', done, { once: true });
                inst.audio.addEventListener('error', onErr, { once: true });

                const playPromise = inst.audio.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        setTimeout(done, 10);
                    }).catch(onErr);
                }
            });

            // Check cancellation after play promise resolves
            if (inst.opId !== currentOpId || this._globalOpId !== currentGlobalOpId || this._isGlobalStopping || this._initializingId !== itemId) {
                if (inst.audio) {
                    try {
                        inst.audio.pause();
                        if (inst.state === 'STOPPING' || inst.state === 'IDLE') {
                            inst.audio.currentTime = 0;
                            inst.position = 0;
                        }
                    } catch (e) {}
                }
                return;
            }

            // Step 4: Transition to PLAYING
            inst.state = 'PLAYING';
            this._activePlayingId = itemId;
            this._initializingId = null;
            if (typeof App !== 'undefined' && App.audioController) {
                App.audioController.setActiveAudio(inst.audio, 'sq-' + itemId);
            }
            this.updateEntryUI(itemId);

        } catch (err) {
            if (this._initializingId === itemId) {
                this._initializingId = null;
            }
            // If operation was cancelled or aborted by pause/stop, do not report an error
            if (inst.opId !== currentOpId || this._globalOpId !== currentGlobalOpId || this._isGlobalStopping ||
                inst.state === 'PAUSED' || inst.state === 'PAUSING' || inst.state === 'STOPPING' || inst.state === 'IDLE' ||
                (err && err.name === 'AbortError')) {
                if (inst.state === 'STOPPING' || inst.state === 'IDLE') {
                    inst.state = 'IDLE';
                    inst.position = 0;
                    this.updateEntryUI(itemId);
                }
                return;
            }

            console.error(`Audio playback error for item ${itemId}:`, err);
            inst.state = 'ERROR';
            inst.error = err.message || 'Playback failed';
            if (this._activePlayingId === itemId) {
                this._activePlayingId = null;
            }
            this.updateEntryUI(itemId);
        }
    }

    async pause(itemId) {
        const inst = this._instances.get(itemId);
        if (!inst) return;

        if (inst.state !== 'PLAYING' && inst.state !== 'INITIALIZING') {
            return;
        }

        inst.opId = (inst.opId || 0) + 1;
        const currentOpId = inst.opId;
        inst.state = 'PAUSING';
        this.updateEntryUI(itemId);

        if (inst.audio) {
            try {
                inst.audio.pause();
                inst.position = inst.audio.currentTime || inst.position || 0;
            } catch (e) {
                console.warn('Error pausing audio:', e);
            }
        }

        if (this._activePlayingId === itemId) {
            this._activePlayingId = null;
        }
        if (this._initializingId === itemId) {
            this._initializingId = null;
        }
        if (typeof App !== 'undefined' && App.audioController && App.audioController.getActiveAudio() === inst.audio) {
            App.audioController.setActiveAudio(null, null);
        }

        if (inst.opId !== currentOpId) {
            return;
        }

        inst.state = 'PAUSED';
        this.updateEntryUI(itemId);
    }

    async handleGlobalStop(triggerItemId) {
        this._isGlobalStopping = true;
        this._globalOpId = (this._globalOpId || 0) + 1;
        this._initializingId = null;

        // Stop any non-queue active audio across the entire application
        if (typeof App !== 'undefined' && App.audioController) {
            App.audioController._stopNonQueueAudio();
        }

        // Mark active or in-flight instances as STOPPING
        for (const [id, inst] of this._instances.entries()) {
            if (inst.state === 'PLAYING' || inst.state === 'PAUSING' || inst.state === 'PAUSED' || inst.state === 'INITIALIZING') {
                inst.state = 'STOPPING';
                inst.opId = (inst.opId || 0) + 1;
            }
        }

        // Update UI to reflect stopping state immediately
        this.updateAllUI();

        // Stop all initialized audio instances concurrently using Promise.allSettled
        const stopPromises = Array.from(this._instances.values()).map(async (inst) => {
            if (inst.audio) {
                try {
                    inst.audio.pause();
                    inst.audio.currentTime = 0;
                } catch (e) {
                    console.warn('Error resetting audio instance:', inst.id, e);
                }
            }
            inst.position = 0;
            inst.state = 'IDLE';
            inst.error = null;
        });

        for (const inst of this._instances.values()) {
            if (inst.audio) {
                try {
                    inst.audio.pause();
                    inst.audio.currentTime = 0;
                } catch (e) {}
            }
            inst.position = 0;
            inst.state = 'IDLE';
            inst.error = null;
        }

        await Promise.allSettled(stopPromises);

        this._activePlayingId = null;
        this._isGlobalStopping = false;

        if (typeof App !== 'undefined' && App.audioController) {
            App.audioController.setActiveAudio(null, null);
        }

        // Update all buttons back to idle state
        this.updateAllUI();
    }

    removeInstance(itemId) {
        if (!this._instances.has(itemId)) return;
        const inst = this._instances.get(itemId);
        if (inst.audio) {
            try { inst.audio.pause(); } catch (e) {}
            inst.audio = null;
        }
        if (inst.blobUrl) {
            const revoke = (typeof URL !== 'undefined' && URL.revokeObjectURL)
                ? URL.revokeObjectURL.bind(URL)
                : (typeof window !== 'undefined' && window.URL && window.URL.revokeObjectURL)
                ? window.URL.revokeObjectURL.bind(window.URL)
                : null;
            if (revoke) {
                try { revoke(inst.blobUrl); } catch (e) {}
            }
            inst.blobUrl = null;
        }
        this._instances.delete(itemId);
        if (this._activePlayingId === itemId) {
            this._activePlayingId = null;
        }
        if (this._initializingId === itemId) {
            this._initializingId = null;
        }
    }

    cleanupAll() {
        const revoke = (typeof URL !== 'undefined' && URL.revokeObjectURL)
            ? URL.revokeObjectURL.bind(URL)
            : (typeof window !== 'undefined' && window.URL && window.URL.revokeObjectURL)
            ? window.URL.revokeObjectURL.bind(window.URL)
            : null;

        for (const [itemId, inst] of this._instances.entries()) {
            if (inst.audio) {
                try { inst.audio.pause(); } catch (e) {}
                inst.audio = null;
            }
            if (inst.blobUrl && revoke) {
                try { revoke(inst.blobUrl); } catch (e) {}
                inst.blobUrl = null;
            }
        }
        this._instances.clear();
        this._activePlayingId = null;
        this._initializingId = null;
        this._isGlobalStopping = false;
    }

    syncWithQueueItems(currentItems) {
        if (!Array.isArray(currentItems)) return;
        const currentIds = new Set(currentItems.map(item => item.id));
        for (const itemId of this._instances.keys()) {
            if (!currentIds.has(itemId)) {
                this.removeInstance(itemId);
            }
        }
    }

    updateEntryUI(itemId) {
        if (typeof document === 'undefined') return;
        const container = document.getElementById(`sq-playback-controls-${itemId}`);
        if (container && typeof Components !== 'undefined' && Components.SharedQueuePlaybackControls) {
            container.outerHTML = Components.SharedQueuePlaybackControls(itemId);
        }
    }

    updateAllUI() {
        if (typeof document === 'undefined') return;
        const containers = document.querySelectorAll('[id^="sq-playback-controls-"]');
        containers.forEach(el => {
            const id = el.id.replace('sq-playback-controls-', '');
            if (typeof Components !== 'undefined' && Components.SharedQueuePlaybackControls) {
                el.outerHTML = Components.SharedQueuePlaybackControls(id);
            }
        });
    }
}

const App = {
    audioController: new CentralizedAudioController(),
    sharedAudioQueueManager: new SharedAudioQueueManager(),
    state: {
        jobs: [],
        currentJob: null,
        view: 'dashboard', // 'dashboard' | 'transcript' | 'trash' | 'admin' | 'login' | 'ledger' | 'ledger-detail'
        activeActionMenu: null,
        token: (typeof localStorage !== 'undefined') ? localStorage.getItem('access_token') : null,
        user: (typeof localStorage !== 'undefined') ? JSON.parse(localStorage.getItem('user_info') || 'null') : null,
        adminStats: [],
        isEditing: false,
        audioPlaybackRate: 1.0,
        lifetimeStats: null,
        dailyStats: null,
        popupQueue: [],
        sharedQueueItems: [],
        loadingJobs: true,
        loadingSharedQueue: false,
        loadingAdminStats: false,
        clients: [],
        clientCount: 0,
        currentClient: null,
        ledgerSearchQuery: '',
        editingClientId: null,
        activeProfileSection: null,
        loadingClients: false
    },

    // ── Per-operation loading guards (prevent duplicates & track active ops) ──
    _activeDownloads: new Set(),     // Set of operation keys like "job-audio-{id}", "shared-{id}", "transcript-{id}"
    _activeUploads: new Set(),       // Set of upload keys like "dashboard", "shared-queue", "supp-doc-{id}"
    _uploadBtnRef: false,            // Synchronous guard for dashboard upload button
    _sharedUploadBtnRef: false,      // Synchronous guard for shared queue upload button

    _getFilenameFromResponse: (res, fallbackFilename) => {
        try {
            const disposition = res.headers ? res.headers.get('content-disposition') : null;
            if (disposition) {
                const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
                if (utf8Match && utf8Match[1]) {
                    return decodeURIComponent(utf8Match[1].trim());
                }
                const filenameMatch = disposition.match(/filename="?([^";]+)"?/i);
                if (filenameMatch && filenameMatch[1]) {
                    return filenameMatch[1].trim();
                }
            }
        } catch (e) {
            console.warn('Could not parse content-disposition header', e);
        }
        return fallbackFilename || 'download';
    },

    formatBytes: (bytes, decimals = 1) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },

    // Audio player state (not persisted)
    audioPlayerHovered: false,
    _seeking: false,
    _audioKeyHandler: null,

    API_URL: "",

    init: async () => {
        if (!App.state.token) {
            App.state.view = 'login';
        } else {
            // If we have a token, start at dashboard (or stay where we were if we persisted view state, but simple is dashboard)
            if (App.state.view === 'login') App.state.view = 'dashboard';
        }

        App.render();

        if (App.state.token) {
            await App.loadJobs();
            await App.loadSharedQueue();
            setInterval(() => {
                App.loadJobs();
                if(App.state.view === 'shared-queue') {
                    App.loadSharedQueue();
                }
            }, 5000);
        }

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.actions-menu-btn') && !e.target.closest('.actions-menu')) {
                App.state.activeActionMenu = null;
                App.renderJobsList();
            }
        });
    },

    render: () => {
        const root = document.getElementById('app');

        if (App.state.view === 'login') {
            root.innerHTML = Components.Login();
            ThinkingLoader.init(root);
            return;
        }

        // Logged in UI
        root.innerHTML = Components.Sidebar(App.state.view, App.state.user);

        const mainContent = document.createElement('div');
        mainContent.id = 'main-content';
        mainContent.className = 'flex-1';
        root.appendChild(mainContent);

        App.updateView();
    },

    updateView: () => {
        const main = document.getElementById('main-content');
        if (!main) return;

        if (App.state.view === 'dashboard' || App.state.view === 'trash') {
            main.innerHTML = Components.Dashboard(App.state.view);
            App.renderJobsList();
        } else if (App.state.view === 'ledger') {
            main.innerHTML = Components.LedgerView(App.state.clients, App.state.clientCount, App.state.ledgerSearchQuery, App.state.loadingClients);
            App.renderLedgerList();
        } else if (App.state.view === 'client-profile') {
            main.innerHTML = Components.ClientProfileView(App.state.currentClient, App.state.activeProfileSection);
        } else if (App.state.view === 'transcript') {
            main.innerHTML = Components.TranscriptView();
            App.renderTranscript();
            App.initAudioPlayer();
        } else if (App.state.view === 'admin') {
            main.innerHTML = Components.AdminDashboard(App.state.adminStats);
            App.loadAdminStats(); // Fetch stats
        } else if (App.state.view === 'user-management') {
            main.innerHTML = Components.UserManagement(App.state.adminStats); // Reusing adminStats as it contains user list
            App.loadAdminStats();
        } else if (App.state.view === 'shared-queue') {
            main.innerHTML = Components.SharedAudioQueue(App.state.sharedQueueItems);
            App.loadSharedQueue();
        }

        // Initialize any Thinking Orbs present in the newly rendered view
        ThinkingLoader.init(main);
    },

    navigateTo: (viewName) => {
        // Enforce centralized audio cleanup on navigation across the entire application
        if (App.audioController) {
            App.audioController.stopAll();
        }
        // Cleanup audio player if leaving transcript view
        if (App.state.view === 'transcript' && viewName !== 'transcript') {
            App.destroyAudioPlayer();
        }
        // Cleanup shared queue audio if leaving shared-queue
        if (App.state.view === 'shared-queue' && viewName !== 'shared-queue') {
            if (App.sharedAudioQueueManager) {
                App.sharedAudioQueueManager.handleGlobalStop();
            }
        }
        // Cleanup ledger audio if leaving ledger-detail
        if (App.state.view === 'ledger-detail' && viewName !== 'ledger-detail') {
            if (App._ledgerAudio) {
                App._ledgerAudio.pause();
                App._ledgerAudio = null;
                App._ledgerAudioJobId = null;
                App._ledgerAudioPlaying = false;
            }
        }
        // Reset edit mode when navigating away
        App.state.isEditing = false;

        if (App.state.view === 'ledger' && viewName !== 'ledger') {
            App.state.editingClientId = null;
        }
        App.state.view = viewName;
        App.state.activeActionMenu = null;
        if (viewName === 'ledger') {
            App.loadClients();
        }

        // Re-render sidebar if needed (to highlight active)
        const root = document.getElementById('app');
        if (root && App.state.view !== 'login') {
            const sidebar = root.querySelector('.w-64');
            if (sidebar) sidebar.outerHTML = Components.Sidebar(viewName, App.state.user);
        }

        if (root) {
            App.updateView();
        }

        if (viewName === 'dashboard' || viewName === 'trash') {
            App.loadJobs();
        } else if (viewName === 'shared-queue') {
            App.loadSharedQueue();
        }
    },

    login: async (username, password) => {
        const loginBtn = document.getElementById('loginBtn');
        const originalText = loginBtn ? loginBtn.innerHTML : '';
        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.innerHTML = `${ThinkingLoader.inline('connecting', 'Signing In…')}`;
            ThinkingLoader.init(loginBtn);
        }

        try {
            const res = await fetch(`${App.API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Login failed");
            }

            const data = await res.json();
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('user_info', JSON.stringify({
                username: data.username,
                is_admin: data.is_admin
            }));

            App.state.token = data.access_token;
            App.state.user = { username: data.username, is_admin: data.is_admin };
            App.state.view = 'dashboard';

            App.init(); // Re-init to setup intervals and UI

        } catch (e) {
            alert(e.message);
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.innerHTML = originalText;
            }
        }
    },

    logout: () => {
        if (App.sharedAudioQueueManager) {
            App.sharedAudioQueueManager.cleanupAll();
        }
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_info');
        App.state.token = null;
        App.state.user = null;
        App.state.view = 'login';
        window.location.reload(); // Cleanest way to reset all state intervals
    },

    // Authorized Fetch Helper
    authFetch: async (url, options = {}) => {
        const headers = { ...options.headers };
        if (App.state.token) {
            headers['Authorization'] = `Bearer ${App.state.token}`;
        }
        return fetch(url, { ...options, headers });
    },

    loadJobs: async () => {
        if (!App.state.token) return;
        try {
            let url = `${App.API_URL}/jobs/`;
            if (App.state.view === 'trash') {
                url += `?status=TRASHED`;
            }

            const res = await App.authFetch(url);
            if (res.status === 401) { App.logout(); return; }
            if (!res.ok) throw new Error("Failed to fetch jobs");
            const jobs = await res.json();

            App.state.jobs = jobs;
            App.state.loadingJobs = false;
            if (App.state.view === 'dashboard' || App.state.view === 'trash') {
                App.renderJobsList();
            }
        } catch (e) {
            console.error("Load jobs error:", e);
            App.state.loadingJobs = false;
            if (App.state.view === 'dashboard' || App.state.view === 'trash') {
                const tbody = document.getElementById('jobsTableBody');
                if (tbody && (!App.state.jobs || App.state.jobs.length === 0)) {
                    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-500 font-medium">Failed to load files. <button onclick="App.loadJobs()" class="underline text-blue-600 hover:text-blue-800 ml-2">Retry</button></td></tr>`;
                }
            }
        }
    },

    loadSharedQueue: async () => {
        if (!App.state.token) return;
        App.state.loadingSharedQueue = true;
        try {
            const res = await App.authFetch(`${App.API_URL}/queue/`);
            if (res.ok) {
                const data = await res.json();
                App.state.sharedQueueItems = data.items;
                App.state.loadingSharedQueue = false;
                if (App.sharedAudioQueueManager) {
                    App.sharedAudioQueueManager.syncWithQueueItems(data.items);
                }
                if (App.state.view === 'shared-queue') {
                    const main = document.getElementById('main-content');
                    if (main) {
                        main.innerHTML = Components.SharedAudioQueue(App.state.sharedQueueItems);
                        ThinkingLoader.init(main);
                    }
                }
            } else {
                App.state.loadingSharedQueue = false;
            }
        } catch (e) {
            console.error("Load shared queue error:", e);
            App.state.loadingSharedQueue = false;
        }
    },

    loadAdminStats: async () => {
        if (!App.state.token || !App.state.user.is_admin) return;
        App.state.loadingAdminStats = true;
        try {
            const res = await App.authFetch(`${App.API_URL}/admin/users`);
            if (res.ok) {
                const stats = await res.json();
                App.state.adminStats = stats;
                App.state.loadingAdminStats = false;
                // Re-render admin view with data
                const main = document.getElementById('main-content');
                if ((App.state.view === 'admin' || App.state.view === 'user-management') && main) {
                    if (App.state.view === 'admin') {
                        main.innerHTML = Components.AdminDashboard(App.state.adminStats);
                        ThinkingLoader.init(main);
                        App.loadDailyStats(); // Load activity chart on Admin Dashboard
                    } else {
                        main.innerHTML = Components.UserManagement(App.state.adminStats);
                        ThinkingLoader.init(main);
                    }
                }
            } else {
                App.state.loadingAdminStats = false;
            }
        } catch (e) {
            console.error(e);
            App.state.loadingAdminStats = false;
        }
    },

    renderJobsList: () => {
        const tbody = document.getElementById('jobsTableBody');
        const emptyState = document.getElementById('emptyState');
        const emptyTitle = document.getElementById('emptyTitle');
        const emptyDesc = document.getElementById('emptyDesc');

        if (!tbody) return;

        // If initial loading and no cached jobs
        if (App.state.loadingJobs && (!App.state.jobs || App.state.jobs.length === 0)) {
            if (emptyState) emptyState.classList.add('hidden');
            tbody.innerHTML = `<tr><td colspan="6" class="py-12">${ThinkingLoader.section('searching', App.state.view === 'trash' ? 'Loading trash…' : 'Loading your files…')}</td></tr>`;
            ThinkingLoader.init(tbody);
            return;
        }

        // Sort jobs by created_at descending (newest first)
        const sortedJobs = [...(App.state.jobs || [])].sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        );

        // Update completion tracker using lifetime stats
        App.loadLifetimeStats();

        if (sortedJobs.length === 0) {
            tbody.innerHTML = '';
            if (emptyState) emptyState.classList.remove('hidden');
            if (App.state.view === 'trash') {
                if (emptyTitle) emptyTitle.textContent = "Trash is empty";
                if (emptyDesc) emptyDesc.textContent = "Deleted files will appear here.";
            } else {
                if (emptyTitle) emptyTitle.textContent = "No files yet";
                if (emptyDesc) emptyDesc.textContent = "Upload an audio or video file to get started.";
            }
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');
        // Serial numbers: newest = #1
        tbody.innerHTML = sortedJobs.map((job, index) =>
            Components.JobRow(job, App.state.view === 'trash', App.state.activeActionMenu === job.id, index + 1)
        ).join('');

        // Initialize inline status orbs for processing, transcribing, and queued jobs
        ThinkingLoader.init(tbody);
    },

    loadLifetimeStats: async () => {
        if (!App.state.token) return;
        try {
            const res = await App.authFetch(`${App.API_URL}/jobs/stats`);
            if (res.ok) {
                const stats = await res.json();
                App.state.lifetimeStats = stats;
                App.updateCompletionTracker(stats);
            }
        } catch (e) {
            console.error('Failed to load lifetime stats:', e);
        }
    },

    updateCompletionTracker: (stats) => {
        const trackerText = document.getElementById('trackerText');
        const trackerPercent = document.getElementById('trackerPercent');
        const trackerBar = document.getElementById('trackerBar');

        if (!trackerText) return;

        const total = stats.total_ever || 0;
        const completed = stats.completed_ever || 0;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

        trackerText.textContent = `${completed} of ${total} file${total !== 1 ? 's' : ''} completed (all-time)`;
        if (trackerPercent) trackerPercent.textContent = `${pct}%`;
        if (trackerBar) trackerBar.style.width = `${pct}%`;
    },

    loadDailyStats: async () => {
        if (!App.state.token) return;
        try {
            const res = await App.authFetch(`${App.API_URL}/jobs/stats/daily`);
            if (res.ok) {
                const data = await res.json();
                App.state.dailyStats = data;
                App.renderActivityChart(data);
            }
        } catch (e) {
            console.error('Failed to load daily stats:', e);
        }
    },

    renderActivityChart: (days) => {
        const container = document.getElementById('activityChart');
        if (!container) return;

        const maxVal = Math.max(...days.map(d => Math.max(d.uploaded, d.completed)), 1);
        const chartHeight = 140; // px

        const barsHtml = days.map(d => {
            const uploadH = (d.uploaded / maxVal) * chartHeight;
            const completeH = (d.completed / maxVal) * chartHeight;
            const isToday = d.label === new Date().toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Europe/Paris' });

            return `
                <div class="activity-bar-group">
                    <div class="activity-bar-pair" style="height: ${chartHeight}px;">
                        <div class="activity-bar activity-bar--upload" style="height: ${uploadH}px;" title="${d.uploaded} uploaded">
                            ${d.uploaded > 0 ? `<span class="activity-bar-value">${d.uploaded}</span>` : ''}
                        </div>
                        <div class="activity-bar activity-bar--complete" style="height: ${completeH}px;" title="${d.completed} completed">
                            ${d.completed > 0 ? `<span class="activity-bar-value">${d.completed}</span>` : ''}
                        </div>
                    </div>
                    <span class="activity-bar-label ${isToday ? 'activity-bar-label--today' : ''}">${d.label}</span>
                </div>
            `;
        }).join('');

        container.innerHTML = `<div class="activity-chart-bars">${barsHtml}</div>`;
    },

    handleUpload: async (input) => {
        const file = input.files[0];
        if (!file) return;

        // Synchronous duplicate guard
        if (App._uploadBtnRef) return;
        App._uploadBtnRef = true;
        App._activeUploads.add('dashboard');

        // Disable the upload trigger button and show loading state
        const uploadTriggerBtn = input.previousElementSibling || document.querySelector('button[onclick*="fileInput"]');
        const originalBtnHtml = uploadTriggerBtn ? uploadTriggerBtn.innerHTML : '';
        if (uploadTriggerBtn) {
            uploadTriggerBtn.disabled = true;
            uploadTriggerBtn.innerHTML = `${ThinkingLoader.inline('working', 'Uploading…')}`;
            ThinkingLoader.init(uploadTriggerBtn);
        }

        const uploadArea = document.getElementById('uploadArea');
        const uploadText = document.getElementById('uploadText');
        const uploadSubText = document.getElementById('uploadSubText');
        const uploadProgressBar = document.getElementById('uploadProgressBar');
        const uploadProgressText = document.getElementById('uploadProgressText');

        if (uploadArea) {
            uploadArea.classList.remove('hidden');
            if (uploadText) uploadText.textContent = `Preparing ${file.name}...`;
            if (uploadSubText) uploadSubText.textContent = 'Please do not close this tab.';
            if (uploadProgressBar) uploadProgressBar.style.width = '0%';
            if (uploadProgressText) uploadProgressText.textContent = '0%';
            ThinkingLoader.update('uploadOrbContainer', { state: 'working', label: `Uploading ${file.name}` });
            ThinkingLoader.init(uploadArea);
        }

        try {
            const formData = new FormData();
            formData.append('file', file);

            // Use XMLHttpRequest for real upload progress
            const uploadData = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', `${App.API_URL}/jobs/upload`);
                if (App.state.token) {
                    xhr.setRequestHeader('Authorization', `Bearer ${App.state.token}`);
                }

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const percent = Math.min(Math.round((e.loaded / e.total) * 100), 99);
                        if (uploadProgressBar) uploadProgressBar.style.width = `${percent}%`;
                        if (uploadProgressText) {
                            uploadProgressText.textContent = `${percent}% (${App.formatBytes(e.loaded)} / ${App.formatBytes(e.total)})`;
                        }
                        if (uploadText) uploadText.textContent = `Uploading ${file.name}...`;
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const res = JSON.parse(xhr.responseText);
                            resolve(res);
                        } catch (err) {
                            reject(new Error("Invalid JSON response from server"));
                        }
                    } else {
                        reject(new Error(`Upload failed (${xhr.status})`));
                    }
                };

                xhr.onerror = () => reject(new Error("Network error during upload"));
                xhr.send(formData);
            });

            // Transition from upload completion to registration and processing
            if (uploadProgressBar) uploadProgressBar.style.width = '100%';
            if (uploadProgressText) uploadProgressText.textContent = 'Upload complete (100%)';
            if (uploadText) uploadText.textContent = "Registering & queuing transcription...";
            if (uploadSubText) uploadSubText.textContent = "Triggering AI transcription pipeline...";
            ThinkingLoader.update('uploadOrbContainer', { state: 'solving', label: 'Queuing transcription job…' });

            const processRes = await App.authFetch(`${App.API_URL}/jobs/${uploadData.job_id}/process`, {
                method: 'POST'
            });

            if (!processRes.ok) throw new Error("Processing trigger failed");

            await App.loadJobs();

        } catch (err) {
            console.error(err);
            alert("Upload failed: " + err.message);
        } finally {
            if (uploadArea) uploadArea.classList.add('hidden');
            input.value = '';
            App._uploadBtnRef = false;
            App._activeUploads.delete('dashboard');
            // Restore upload button
            if (uploadTriggerBtn) {
                uploadTriggerBtn.disabled = false;
                uploadTriggerBtn.innerHTML = originalBtnHtml;
            }
        }
    },

    handleSharedQueueUpload: async (input) => {
        const file = input.files[0];
        if (!file) return;

        // Synchronous duplicate guard
        if (App._sharedUploadBtnRef) return;
        App._sharedUploadBtnRef = true;
        App._activeUploads.add('shared-queue');

        // Disable the shared upload trigger button and show loading state
        const sharedUploadTriggerBtn = document.querySelector('button[onclick*="sharedFileInput"]');
        const originalSharedBtnHtml = sharedUploadTriggerBtn ? sharedUploadTriggerBtn.innerHTML : '';
        if (sharedUploadTriggerBtn) {
            sharedUploadTriggerBtn.disabled = true;
            sharedUploadTriggerBtn.innerHTML = `${ThinkingLoader.inline('working', 'Uploading…')}`;
            ThinkingLoader.init(sharedUploadTriggerBtn);
        }

        const uploadArea = document.getElementById('sharedUploadArea');
        const uploadText = document.getElementById('sharedUploadText');
        const uploadSubText = document.getElementById('sharedUploadSubText');
        const uploadProgressBar = document.getElementById('sharedUploadProgressBar');
        const uploadProgressText = document.getElementById('sharedUploadProgressText');

        if (uploadArea) {
            uploadArea.classList.remove('hidden');
            if (uploadText) uploadText.textContent = `Preparing ${file.name}...`;
            if (uploadSubText) uploadSubText.textContent = 'Uploading to team shared queue. Please do not close this tab.';
            if (uploadProgressBar) uploadProgressBar.style.width = '0%';
            if (uploadProgressText) uploadProgressText.textContent = '0%';
            ThinkingLoader.update('sharedUploadOrbContainer', { state: 'working', label: `Uploading ${file.name}` });
            ThinkingLoader.init(uploadArea);
        }

        try {
            const formData = new FormData();
            formData.append('file', file);

            await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', `${App.API_URL}/queue/upload`);
                if (App.state.token) {
                    xhr.setRequestHeader('Authorization', `Bearer ${App.state.token}`);
                }

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const percent = Math.min(Math.round((e.loaded / e.total) * 100), 100);
                        if (uploadProgressBar) uploadProgressBar.style.width = `${percent}%`;
                        if (uploadProgressText) {
                            uploadProgressText.textContent = `${percent}% (${App.formatBytes(e.loaded)} / ${App.formatBytes(e.total)})`;
                        }
                        if (uploadText) uploadText.textContent = `Uploading ${file.name} to shared queue...`;
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve();
                    } else {
                        reject(new Error(`Upload failed (${xhr.status})`));
                    }
                };

                xhr.onerror = () => reject(new Error("Network error during upload"));
                xhr.send(formData);
            });

            await App.loadSharedQueue();

        } catch (err) {
            console.error(err);
            alert("Upload failed: " + err.message);
        } finally {
            if (uploadArea) uploadArea.classList.add('hidden');
            input.value = '';
            App._sharedUploadBtnRef = false;
            App._activeUploads.delete('shared-queue');
            // Restore shared upload button
            if (sharedUploadTriggerBtn) {
                sharedUploadTriggerBtn.disabled = false;
                sharedUploadTriggerBtn.innerHTML = originalSharedBtnHtml;
            }
        }
    },

    // Claim modal state
    _claimModalItemId: null,
    _claimModalFilename: null,

    showClaimModal: (itemId, filename = null) => {
        App._claimModalItemId = itemId;
        if (!filename) {
            const item = (App.state.sharedQueueItems || []).find(i => i.id === itemId);
            filename = item ? item.original_filename : 'audio.mp3';
        }
        App._claimModalFilename = filename;
        const modal = document.getElementById('claimModal');
        if (modal) modal.classList.remove('hidden');
    },

    hideClaimModal: () => {
        App._claimModalItemId = null;
        App._claimModalFilename = null;
        const modal = document.getElementById('claimModal');
        if (modal) modal.classList.add('hidden');
    },

    claimWithDownload: async (triggerBtn) => {
        const itemId = App._claimModalItemId;
        const filename = App._claimModalFilename;
        if (!itemId) return;

        const opKey = `claim-dl-${itemId}`;
        if (App._activeDownloads.has(opKey)) return;
        App._activeDownloads.add(opKey);

        const claimBtn = triggerBtn || document.getElementById('claimWithDlBtn');
        const originalBtnHtml = claimBtn ? claimBtn.innerHTML : '';
        if (claimBtn) {
            claimBtn.disabled = true;
            claimBtn.innerHTML = `${ThinkingLoader.inline('working', 'Preparing…')}`;
            ThinkingLoader.init(claimBtn);
        }

        // Download first, then claim
        try {
            const downloaded = await App.downloadSharedAudio(itemId, filename);
            if (downloaded !== false) {
                App.hideClaimModal();
                await App._performClaim(itemId);
            }
        } catch (e) {
            console.error('Download during claim failed:', e);
            alert('Failed to download audio during claim: ' + (e.message || 'Error'));
        } finally {
            App._activeDownloads.delete(opKey);
            if (claimBtn) {
                claimBtn.disabled = false;
                claimBtn.innerHTML = originalBtnHtml;
            }
        }
    },

    claimWithoutDownload: async (triggerBtn) => {
        const itemId = App._claimModalItemId;
        if (!itemId) return;

        const opKey = `claim-${itemId}`;
        if (App._activeUploads.has(opKey)) return;
        App._activeUploads.add(opKey);

        const claimBtn = triggerBtn || document.getElementById('claimWithoutDlBtn');
        const originalBtnHtml = claimBtn ? claimBtn.innerHTML : '';
        if (claimBtn) {
            claimBtn.disabled = true;
            claimBtn.innerHTML = `${ThinkingLoader.inline('working', 'Claiming…')}`;
            ThinkingLoader.init(claimBtn);
        }

        try {
            App.hideClaimModal();
            await App._performClaim(itemId);
        } finally {
            App._activeUploads.delete(opKey);
            if (claimBtn) {
                claimBtn.disabled = false;
                claimBtn.innerHTML = originalBtnHtml;
            }
        }
    },

    _performClaim: async (itemId) => {
        if (App.sharedAudioQueueManager) {
            App.sharedAudioQueueManager.removeInstance(itemId);
        }
        try {
            const res = await App.authFetch(`${App.API_URL}/queue/${itemId}/claim`, {
                method: 'POST'
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Claim failed");
            }
            
            alert("Successfully claimed! It is now processing in your dashboard.");
            App.navigateTo('dashboard');
        } catch (err) {
            console.error(err);
            alert("Failed to claim: " + err.message);
            App.loadSharedQueue();
        }
    },

    deleteSharedQueueItem: async (itemId) => {
        if (!confirm("Delete this audio from the shared queue? This cannot be undone.")) return;
        if (App.sharedAudioQueueManager) {
            App.sharedAudioQueueManager.removeInstance(itemId);
        }
        try {
            const res = await App.authFetch(`${App.API_URL}/queue/${itemId}`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Delete failed");
            }
            
            App.loadSharedQueue();
        } catch (err) {
            console.error(err);
            alert("Failed to delete: " + err.message);
        }
    },

    toggleActions: (e, jobId) => {
        e.stopPropagation();
        if (App.state.activeActionMenu === jobId) {
            App.state.activeActionMenu = null;
        } else {
            App.state.activeActionMenu = jobId;
        }
        App.renderJobsList();
    },

    deleteJob: async (jobId) => {
        if (!confirm("Move to Trash?")) return;
        try {
            const res = await App.authFetch(`${App.API_URL}/jobs/${jobId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                App.loadJobs();
            }
        } catch (e) { console.error(e); }
    },

    deleteJobPermanent: async (jobId) => {
        if (!confirm("Permanently delete this file? This cannot be undone.")) return;
        try {
            const res = await App.authFetch(`${App.API_URL}/jobs/${jobId}/permanent`, {
                method: 'DELETE'
            });
            if (res.ok) {
                App.loadJobs();
            }
        } catch (e) { console.error(e); }
    },

    emptyTrash: async () => {
        if (!confirm("Permanently delete ALL files in Trash? This cannot be undone.")) return;
        try {
            const res = await App.authFetch(`${App.API_URL}/jobs/trash/all`, {
                method: 'DELETE'
            });
            if (res.ok) {
                App.loadJobs();
            }
        } catch (e) { console.error(e); }
    },

    restoreJob: async (jobId) => {
        try {
            const res = await App.authFetch(`${App.API_URL}/jobs/${jobId}/restore`, {
                method: 'POST'
            });
            if (res.ok) {
                App.loadJobs();
            }
        } catch (e) { console.error(e); }
    },

    createUser: async (username, password) => {
        try {
            const res = await App.authFetch(`${App.API_URL}/admin/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Failed to create user");
            }

            alert("User created successfully");
            App.loadAdminStats(); // Reload list
        } catch (e) {
            alert(e.message);
        }
    },

    deleteUser: async (username) => {
        if (!confirm(`Are you sure you want to delete user ${username}?`)) return;
        try {
            const res = await App.authFetch(`${App.API_URL}/admin/users/${username}`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Failed to delete user");
            }

            App.loadAdminStats(); // Reload list
        } catch (e) {
            alert(e.message);
        }
    },

    resetTracker: async (username) => {
        if (!confirm(`Are you sure you want to reset the lifetime tracker for ${username}? This cannot be undone.`)) return;
        try {
            const res = await App.authFetch(`${App.API_URL}/admin/users/${username}/reset-tracker`, {
                method: 'POST'
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Failed to reset tracker");
            }

            alert(`Tracker reset successfully for ${username}.`);
            if (username === App.state.user.username) {
                App.loadLifetimeStats(); // Update own tracker UI immediately
            }
            App.loadAdminStats(); // Refresh admin table
        } catch (e) {
            alert(e.message);
        }
    },

    openTranscript: async (jobId) => {
        const job = App.state.jobs.find(j => j.id === jobId);
        if (job) App.state.currentJob = job;
        App.navigateTo('transcript');
        try {
            const res = await App.authFetch(`${App.API_URL}/jobs/${jobId}/transcript`);
            if (res.ok) {
                const data = await res.json();
                if (App.state.currentJob) {
                    App.state.currentJob.text_content = data.text_content;
                    App.state.currentJob.json_metadata = data.json_metadata;
                    App.renderTranscript();
                }
            } else {
                const contentEl = document.getElementById('transcriptContent');
                if (contentEl) {
                    contentEl.innerHTML = `<div class="p-8 text-center text-red-500 font-medium">Failed to load transcript. <button onclick="App.openTranscript('${jobId}')" class="underline text-blue-600 hover:text-blue-800 ml-2">Retry</button></div>`;
                }
            }
        } catch (e) {
            console.error("Failed to load transcript text", e);
            const contentEl = document.getElementById('transcriptContent');
            if (contentEl) {
                contentEl.innerHTML = `<div class="p-8 text-center text-red-500 font-medium">Network error loading transcript. <button onclick="App.openTranscript('${jobId}')" class="underline text-blue-600 hover:text-blue-800 ml-2">Retry</button></div>`;
            }
        }
    },

    renderTranscript: () => {
        const titleEl = document.getElementById('transcriptTitle');
        const contentEl = document.getElementById('transcriptContent');
        if (!App.state.currentJob) return;
        if (titleEl) titleEl.textContent = App.state.currentJob.original_filename;

        const statusEl = document.getElementById('transcriptMetaStatus');

        if (contentEl) {
            const job = App.state.currentJob;
            const hasSegments = job.json_metadata && job.json_metadata.segments && job.json_metadata.segments.length > 0;

            // Update Debug Status Badge
            if (statusEl) {
                if (hasSegments) {
                    statusEl.textContent = "✓ Metadata";
                    statusEl.className = "text-xs text-green-600 font-medium px-2 border-r border-slate-200";
                } else {
                    statusEl.textContent = "⚠ No Metadata";
                    statusEl.className = "text-xs text-amber-500 font-medium px-2 border-r border-slate-200";
                }
            }

            let htmlContent = '';

            // 1. If we have structured segments, render the appropriate version
            if (hasSegments) {
                // VERSION B: Plain Text (Clean)
                const cleanText = job.json_metadata.segments.map(seg => seg.text).join(' ');
                htmlContent = `<div class="leading-relaxed text-slate-800">${cleanText}</div>`;
            }
            // 2. Fallback if no metadata (Old files or Parse Error)
            else {
                const text = job.text_content || "";
                const paragraphs = text.split('\n').filter(p => p.trim() !== '');

                htmlContent = paragraphs.map(p => `<p class="mb-4">${p}</p>`).join('');
            }

            contentEl.innerHTML = htmlContent;
        }
    },

    toggleDownloadModal: (show = true) => {
        const modal = document.getElementById('downloadModal');
        if (modal) {
            if (show) modal.classList.remove('hidden');
            else modal.classList.add('hidden');
        }
    },

    downloadTranscript: async (triggerBtn) => {
        if (!App.state.currentJob) return false;
        const jobId = App.state.currentJob.id;

        // Duplicate guard
        const dlKey = `transcript-${jobId}`;
        if (App._activeDownloads.has(dlKey)) return false;
        App._activeDownloads.add(dlKey);

        const downloadModal = document.getElementById('downloadModal');
        const downloadBtn = triggerBtn || (downloadModal ? (document.getElementById('downloadTranscriptBtn') || downloadModal.querySelector('button.bg-blue-600')) : null);
        const originalBtnHtml = downloadBtn ? downloadBtn.innerHTML : '';

        if (downloadBtn) {
            downloadBtn.disabled = true;
            downloadBtn.innerHTML = `${ThinkingLoader.inline('working', 'Preparing…')}`;
            ThinkingLoader.init(downloadBtn);
        }

        try {
            const res = await App.authFetch(`${App.API_URL}/jobs/${jobId}/download`);
            if (res.status === 401) {
                alert("Session expired. Please log in again.");
                App.logout();
                return false;
            }
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const fallbackName = `transcript-${App.state.currentJob.original_filename || 'job'}.docx`;
                a.download = App._getFilenameFromResponse(res, fallbackName);
                document.body.appendChild(a);
                a.click();
                a.remove();

                // Clean up object URL after browser download has started (60s to allow large files to stream)
                setTimeout(() => window.URL.revokeObjectURL(url), 60000);
                App.toggleDownloadModal(false);
                return true;
            } else {
                const err = await res.json().catch(() => ({}));
                alert("Download failed: " + (err.detail || res.statusText || "Unknown error"));
                return false;
            }
        } catch (e) {
            console.error("Download error", e);
            alert("Download failed: " + (e.message || "Network error"));
            return false;
        } finally {
            App._activeDownloads.delete(dlKey);
            if (downloadBtn) {
                downloadBtn.disabled = false;
                downloadBtn.innerHTML = originalBtnHtml;
            }
        }
    },

    toggleEmailModal: (show = true) => {
        const modal = document.getElementById('emailModal');
        if (modal) {
            if (show) modal.classList.remove('hidden');
            else modal.classList.add('hidden');
        }
    },

    sendEmail: async (email) => {
        if (!App.state.currentJob) return;
        const jobId = App.state.currentJob.id;
        const btn = document.getElementById('sendEmailBtn');
        const originalText = btn ? btn.innerText : 'Send';

        if (btn) {
            btn.disabled = true;
            btn.innerText = "Sending...";
        }

        try {
            const res = await App.authFetch(`${App.API_URL}/jobs/${jobId}/email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (res.ok) {
                alert("Email sent successfully!");
                App.toggleEmailModal(false);
            } else {
                const err = await res.json();
                alert("Email failed: " + (err.detail || "Unknown error"));
            }
        } catch (e) {
            console.error("Email error", e);
            alert("Email failed");
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerText = originalText;
            }
        }
    },

    // =====================================================
    // Redesigned Ledger & Client Management Functions
    // =====================================================

    escapeHtml: (str) => {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    formatFileSize: (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },

    loadClients: async (search = App.state.ledgerSearchQuery) => {
        App.state.loadingClients = true;
        const tbody = document.getElementById('ledgerTableBody');
        if (tbody && (!App.state.clients || App.state.clients.length === 0)) {
            tbody.innerHTML = '<tr><td colspan="4" class="py-16 text-center">' + ThinkingLoader.section('weaving', 'Loading client records…') + '</td></tr>';
            ThinkingLoader.init(tbody);
        }

        try {
            const params = new URLSearchParams();
            if (search && search.trim()) {
                params.set('search', search.trim());
            }
            params.set('limit', '100');
            const res = await App.authFetch(`${App.API_URL}/api/ledger/clients?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                App.state.clients = data.items || [];
                App.state.clientCount = data.total || 0;
            } else {
                console.error("Failed to load clients:", res.status);
            }
        } catch (e) {
            console.error("Error loading clients:", e);
        } finally {
            App.state.loadingClients = false;
            if (App.state.view === 'ledger') {
                App.renderLedgerList();
                const badge = document.getElementById('ledgerClientCountBadge');
                if (badge) {
                    badge.textContent = App.state.clientCount === 1 ? '1 client' : `${App.state.clientCount} clients`;
                }
            }
        }
    },

    renderLedgerList: () => {
        const tbody = document.getElementById('ledgerTableBody');
        if (!tbody) return;

        if (App.state.loadingClients && (!App.state.clients || App.state.clients.length === 0)) {
            tbody.innerHTML = '<tr><td colspan="4" class="py-16 text-center">' + ThinkingLoader.section('weaving', 'Loading client records…') + '</td></tr>';
            ThinkingLoader.init(tbody);
            return;
        }

        const clients = App.state.clients || [];
        if (clients.length === 0) {
            tbody.innerHTML = Components.LedgerEmptyState(!!App.state.ledgerSearchQuery);
            return;
        }

        tbody.innerHTML = clients.map(c => Components.LedgerRow(c, App.state.editingClientId === c.id)).join('');
        ThinkingLoader.init(tbody);
    },

    onLedgerSearch: (query) => {
        App.state.ledgerSearchQuery = query;
        clearTimeout(App._ledgerSearchTimeout);
        App._ledgerSearchTimeout = setTimeout(() => {
            App.loadClients(query);
        }, 250);
    },

    clearLedgerSearch: () => {
        App.state.ledgerSearchQuery = '';
        const input = document.getElementById('ledgerSearchInput');
        if (input) input.value = '';
        App.loadClients('');
    },

    openNewClientModal: () => {
        const container = document.getElementById('newClientModalContainer') || document.body;
        let wrapper = document.getElementById('newClientModalWrapper');
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.id = 'newClientModalWrapper';
            container.appendChild(wrapper);
        }
        wrapper.innerHTML = Components.NewClientModal();
        const fnInput = document.getElementById('newClientFirstName');
        if (fnInput) fnInput.focus();
    },

    closeNewClientModal: () => {
        const wrapper = document.getElementById('newClientModalWrapper');
        if (wrapper) wrapper.innerHTML = '';
    },

    updateNewClientPreview: () => {
        const fn = (document.getElementById('newClientFirstName')?.value || '').trim();
        const sn = (document.getElementById('newClientSurname')?.value || '').trim();
        const derived = `${fn} ${sn}`.trim() || 'None';
        const previewEl = document.getElementById('newClientDerivedPreview');
        if (previewEl) previewEl.textContent = derived;
    },

    submitNewClient: async () => {
        const fn = (document.getElementById('newClientFirstName')?.value || '').trim();
        const sn = (document.getElementById('newClientSurname')?.value || '').trim();
        const phone = (document.getElementById('newClientPhone')?.value || '').trim();
        const dob = document.getElementById('newClientDob')?.value || null;
        const errEl = document.getElementById('newClientError');
        const btn = document.getElementById('saveNewClientBtn');

        if (!fn || !sn) {
            if (errEl) {
                errEl.textContent = 'First Name and Surname are both required.';
                errEl.classList.remove('hidden');
            }
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = ThinkingLoader.inline('working', 'Saving…');
            ThinkingLoader.init(btn);
        }

        try {
            const res = await App.authFetch(`${App.API_URL}/api/ledger/clients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    first_name: fn,
                    surname: sn,
                    phone_number: phone || null,
                    date_of_birth: dob || null
                })
            });

            if (res.ok) {
                const newClient = await res.json();
                App.closeNewClientModal();
                await App.loadClients();
            } else {
                const errData = await res.json().catch(() => ({}));
                if (errEl) {
                    errEl.textContent = errData.detail || 'Failed to save client record.';
                    errEl.classList.remove('hidden');
                }
            }
        } catch (e) {
            console.error("Save client error:", e);
            if (errEl) {
                errEl.textContent = 'Network error saving client.';
                errEl.classList.remove('hidden');
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Save Client';
            }
        }
    },

    toggleLedgerActionMenu: (clientId, event) => {
        if (event) event.stopPropagation();
        const menu = document.getElementById(`ledgerMenu-${clientId}`);
        if (!menu) return;
        const isHidden = menu.classList.contains('hidden');
        document.querySelectorAll('.action-menu-dropdown').forEach(d => d.classList.add('hidden'));
        if (isHidden) {
            menu.classList.remove('hidden');
        }
    },

    startInlineEdit: (clientId, event) => {
        if (event) event.stopPropagation();
        document.querySelectorAll('.action-menu-dropdown').forEach(d => d.classList.add('hidden'));
        App.state.editingClientId = clientId;
        App.renderLedgerList();
    },

    updateInlineNamePreview: (clientId) => {
        const fn = (document.getElementById(`edit-fn-${clientId}`)?.value || '').trim();
        const sn = (document.getElementById(`edit-sn-${clientId}`)?.value || '').trim();
        const derived = `${fn} ${sn}`.trim() || '—';
        const el = document.getElementById(`edit-preview-${clientId}`);
        if (el) el.textContent = derived;
    },

    saveInlineEdit: async (clientId) => {
        const fn = (document.getElementById(`edit-fn-${clientId}`)?.value || '').trim();
        const sn = (document.getElementById(`edit-sn-${clientId}`)?.value || '').trim();
        const phone = (document.getElementById(`edit-phone-${clientId}`)?.value || '').trim();
        const dob = document.getElementById(`edit-dob-${clientId}`)?.value || null;
        const btn = document.getElementById(`saveInlineBtn-${clientId}`);

        if (!fn || !sn) {
            alert('First Name and Surname are required.');
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = ThinkingLoader.inline('working', '');
            ThinkingLoader.init(btn);
        }

        try {
            const res = await App.authFetch(`${App.API_URL}/api/ledger/clients/${clientId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    first_name: fn,
                    surname: sn,
                    phone_number: phone || null,
                    date_of_birth: dob || null
                })
            });

            if (res.ok) {
                const updated = await res.json();
                App.state.editingClientId = null;
                const idx = (App.state.clients || []).findIndex(c => c.id === clientId);
                if (idx !== -1) {
                    App.state.clients[idx] = updated;
                }
                App.renderLedgerList();
            } else {
                const err = await res.json().catch(() => ({}));
                alert('Failed to save changes: ' + (err.detail || 'Validation error'));
            }
        } catch (e) {
            console.error("Save inline edit error:", e);
            alert('Network error saving changes.');
        } finally {
            if (btn) btn.disabled = false;
        }
    },

    cancelInlineEdit: (clientId) => {
        App.state.editingClientId = null;
        App.renderLedgerList();
    },

    openClientProfile: async (clientId) => {
        try {
            const res = await App.authFetch(`${App.API_URL}/api/ledger/clients/${clientId}`);
            if (res.ok) {
                App.state.currentClient = await res.json();
                App.state.activeProfileSection = null;
                App.navigateTo('client-profile');
            } else {
                alert('Could not open client profile.');
            }
        } catch (e) {
            console.error("Error opening profile:", e);
            alert('Network error loading profile.');
        }
    },

    startProfileSectionEdit: (clientId, sectionName) => {
        App.state.activeProfileSection = sectionName;
        const main = document.getElementById('main-content');
        if (main && App.state.view === 'client-profile') {
            main.innerHTML = Components.ClientProfileView(App.state.currentClient, App.state.activeProfileSection);
            ThinkingLoader.init(main);
        }
    },

    cancelProfileSectionEdit: (clientId) => {
        App.state.activeProfileSection = null;
        const main = document.getElementById('main-content');
        if (main && App.state.view === 'client-profile') {
            main.innerHTML = Components.ClientProfileView(App.state.currentClient, null);
            ThinkingLoader.init(main);
        }
    },

    saveProfileSection: async (clientId, sectionName) => {
        const btn = document.getElementById(`save${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}-btn`);
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = ThinkingLoader.inline('working', 'Saving…');
            ThinkingLoader.init(btn);
        }

        let payload = {};
        if (sectionName === 'sectionA') {
            payload = {
                first_name: document.getElementById('secA-first_name')?.value?.trim(),
                surname: document.getElementById('secA-surname')?.value?.trim(),
                date_of_birth: document.getElementById('secA-date_of_birth')?.value || null,
                gender: document.getElementById('secA-gender')?.value?.trim() || null,
                nationality: document.getElementById('secA-nationality')?.value?.trim() || null,
                place_of_birth: document.getElementById('secA-place_of_birth')?.value?.trim() || null,
                current_country: document.getElementById('secA-current_country')?.value?.trim() || null,
                marital_status: document.getElementById('secA-marital_status')?.value?.trim() || null,
                preferred_language: document.getElementById('secA-preferred_language')?.value?.trim() || null,
            };
        } else if (sectionName === 'sectionB') {
            payload = {
                phone_number: document.getElementById('secB-phone_number')?.value?.trim() || null,
                secondary_phone: document.getElementById('secB-secondary_phone')?.value?.trim() || null,
                email: document.getElementById('secB-email')?.value?.trim() || null,
                address: document.getElementById('secB-address')?.value?.trim() || null,
                previous_address: document.getElementById('secB-previous_address')?.value?.trim() || null,
                city: document.getElementById('secB-city')?.value?.trim() || null,
                state_province: document.getElementById('secB-state_province')?.value?.trim() || null,
                postal_code: document.getElementById('secB-postal_code')?.value?.trim() || null,
                country: document.getElementById('secB-country')?.value?.trim() || null,
            };
        } else if (sectionName === 'sectionC') {
            payload = {
                identification_info: {
                    passport_number: document.getElementById('secC-passport_number')?.value?.trim() || null,
                    passport_country: document.getElementById('secC-passport_country')?.value?.trim() || null,
                    passport_issue_date: document.getElementById('secC-passport_issue_date')?.value || null,
                    passport_expiry_date: document.getElementById('secC-passport_expiry_date')?.value || null,
                    national_id: document.getElementById('secC-national_id')?.value?.trim() || null,
                    other_id: document.getElementById('secC-other_id')?.value?.trim() || null,
                }
            };
        } else if (sectionName === 'sectionD') {
            payload = {
                case_info: {
                    case_reference: document.getElementById('secD-case_reference')?.value?.trim() || null,
                    case_type: document.getElementById('secD-case_type')?.value?.trim() || null,
                    case_status: document.getElementById('secD-case_status')?.value?.trim() || null,
                    assigned_worker: document.getElementById('secD-assigned_worker')?.value?.trim() || null,
                    date_case_opened: document.getElementById('secD-date_case_opened')?.value || null,
                    country_of_origin: document.getElementById('secD-country_of_origin')?.value?.trim() || null,
                    country_of_application: document.getElementById('secD-country_of_application')?.value?.trim() || null,
                    legal_reference: document.getElementById('secD-legal_reference')?.value?.trim() || null,
                    case_summary: document.getElementById('secD-case_summary')?.value?.trim() || null,
                    case_notes: document.getElementById('secD-case_notes')?.value?.trim() || null,
                }
            };
        } else if (sectionName === 'sectionE') {
            payload = {
                background_info: {
                    education: document.getElementById('secE-education')?.value?.trim() || null,
                    employment: document.getElementById('secE-employment')?.value?.trim() || null,
                    family_info: document.getElementById('secE-family_info')?.value?.trim() || null,
                    personal_history: document.getElementById('secE-personal_history')?.value?.trim() || null,
                    previous_applications: document.getElementById('secE-previous_applications')?.value?.trim() || null,
                }
            };
        } else if (sectionName === 'sectionF') {
            payload = {
                additional_info: {
                    notes: document.getElementById('secF-notes')?.value?.trim() || null,
                    important_dates: document.getElementById('secF-important_dates')?.value?.trim() || null,
                    other_details: document.getElementById('secF-other_details')?.value?.trim() || null,
                }
            };
        }

        try {
            const res = await App.authFetch(`${App.API_URL}/api/ledger/clients/${clientId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                App.state.currentClient = await res.json();
                App.state.activeProfileSection = null;
                const main = document.getElementById('main-content');
                if (main && App.state.view === 'client-profile') {
                    main.innerHTML = Components.ClientProfileView(App.state.currentClient, null);
                    ThinkingLoader.init(main);
                }
            } else {
                const err = await res.json().catch(() => ({}));
                alert('Failed to save section: ' + (err.detail || 'Validation error'));
            }
        } catch (e) {
            console.error("Save section error:", e);
            alert('Network error saving section.');
        } finally {
            if (btn) btn.disabled = false;
        }
    },

    confirmDeleteClient: (clientId, clientName, event) => {
        if (event) event.stopPropagation();
        document.querySelectorAll('.action-menu-dropdown').forEach(d => d.classList.add('hidden'));
        const container = document.getElementById('ledgerConfirmModalContainer') || document.body;
        let wrapper = document.getElementById('ledgerConfirmModalWrapper');
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.id = 'ledgerConfirmModalWrapper';
            container.appendChild(wrapper);
        }
        wrapper.innerHTML = Components.DeleteConfirmModal(
            'Delete Client Record',
            `Are you sure you want to delete "${clientName}"? This will permanently delete the client profile and all associated files.`,
            `App.executeDeleteClient('${clientId}')`
        );
    },

    closeLedgerConfirmModal: () => {
        const wrapper = document.getElementById('ledgerConfirmModalWrapper');
        if (wrapper) wrapper.innerHTML = '';
    },

    executeDeleteClient: async (clientId) => {
        App.closeLedgerConfirmModal();
        try {
            const res = await App.authFetch(`${App.API_URL}/api/ledger/clients/${clientId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                if (App.state.view === 'client-profile') {
                    App.navigateTo('ledger');
                } else {
                    await App.loadClients();
                }
            } else {
                alert('Failed to delete client.');
            }
        } catch (e) {
            console.error("Delete client error:", e);
            alert('Network error deleting client.');
        }
    },

    handleClientFilesUpload: async (clientId, fileList) => {
        if (!fileList || fileList.length === 0) return;
        const progressEl = document.getElementById('clientFileUploadProgress');
        if (progressEl) {
            progressEl.classList.remove('hidden');
            progressEl.innerHTML = `<div class="p-3 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-2">${ThinkingLoader.inline('working', 'Uploading files…')}</div>`;
            ThinkingLoader.init(progressEl);
        }

        const formData = new FormData();
        for (let i = 0; i < fileList.length; i++) {
            formData.append('files', fileList[i]);
        }

        try {
            const res = await App.authFetch(`${App.API_URL}/api/ledger/clients/${clientId}/files`, {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const clientRes = await App.authFetch(`${App.API_URL}/api/ledger/clients/${clientId}`);
                if (clientRes.ok) {
                    App.state.currentClient = await clientRes.json();
                    const main = document.getElementById('main-content');
                    if (main && App.state.view === 'client-profile') {
                        main.innerHTML = Components.ClientProfileView(App.state.currentClient, App.state.activeProfileSection);
                        ThinkingLoader.init(main);
                    }
                }
            } else {
                const err = await res.json().catch(() => ({}));
                alert('Upload failed: ' + (err.detail || 'Could not upload files'));
            }
        } catch (e) {
            console.error("File upload error:", e);
            alert('Network error during file upload.');
        } finally {
            if (progressEl) progressEl.classList.add('hidden');
        }
    },

    downloadClientFile: async (clientId, fileId) => {
        try {
            const res = await App.authFetch(`${App.API_URL}/api/ledger/clients/${clientId}/files/${fileId}/download`);
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const disposition = res.headers.get('Content-Disposition') || '';
                let filename = 'download';
                const filenameMatch = disposition.match(/filename\*=UTF-8''([^;]+)|filename="([^"]+)"/);
                if (filenameMatch) {
                    filename = decodeURIComponent(filenameMatch[1] || filenameMatch[2]);
                }
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => window.URL.revokeObjectURL(url), 60000);
            } else {
                alert('Failed to download file.');
            }
        } catch (e) {
            console.error("Download error:", e);
            alert('Error downloading file.');
        }
    },

    previewClientFile: (clientId, fileId, filename, ext) => {
        const previewUrl = `${App.API_URL}/api/ledger/clients/${clientId}/files/${fileId}/preview`;
        let contentHtml = '';

        if (['jpg', 'jpeg', 'png'].includes(ext)) {
            contentHtml = `<img src="${previewUrl}" alt="${App.escapeHtml(filename)}" class="max-w-full max-h-[75vh] object-contain rounded shadow">`;
        } else if (ext === 'pdf') {
            contentHtml = `<iframe src="${previewUrl}" class="w-full h-[75vh] rounded border-0 bg-white"></iframe>`;
        } else if (['mp3', 'wav', 'm4a'].includes(ext)) {
            contentHtml = `
                <div class="p-8 bg-white rounded-xl shadow-sm text-center max-w-md w-full">
                    <p class="font-bold text-slate-900 mb-4">${App.escapeHtml(filename)}</p>
                    <audio controls src="${previewUrl}" class="w-full"></audio>
                </div>
            `;
        } else if (ext === 'mp4') {
            contentHtml = `<video controls src="${previewUrl}" class="max-w-full max-h-[75vh] rounded shadow"></video>`;
        } else {
            contentHtml = `
                <div class="p-8 bg-white rounded-xl shadow-sm text-center max-w-sm w-full">
                    <p class="text-slate-600 mb-4">Preview not available for this file type (.${ext}).</p>
                    <button onclick="App.downloadClientFile('${clientId}', '${fileId}')" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition">Download File</button>
                </div>
            `;
        }

        const container = document.getElementById('filePreviewModalContainer') || document.body;
        let wrapper = document.getElementById('filePreviewModalWrapper');
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.id = 'filePreviewModalWrapper';
            container.appendChild(wrapper);
        }
        wrapper.innerHTML = Components.FilePreviewModal(filename, contentHtml);
    },

    closeFilePreview: () => {
        const wrapper = document.getElementById('filePreviewModalWrapper');
        if (wrapper) wrapper.innerHTML = '';
    },

    confirmDeleteClientFile: (clientId, fileId, filename) => {
        const container = document.getElementById('ledgerConfirmModalContainer') || document.body;
        let wrapper = document.getElementById('ledgerConfirmModalWrapper');
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.id = 'ledgerConfirmModalWrapper';
            container.appendChild(wrapper);
        }
        wrapper.innerHTML = Components.DeleteConfirmModal(
            'Delete File',
            `Are you sure you want to delete "${filename}"? This action cannot be undone.`,
            `App.executeDeleteClientFile('${clientId}', '${fileId}')`
        );
    },

    executeDeleteClientFile: async (clientId, fileId) => {
        App.closeLedgerConfirmModal();
        try {
            const res = await App.authFetch(`${App.API_URL}/api/ledger/clients/${clientId}/files/${fileId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                const clientRes = await App.authFetch(`${App.API_URL}/api/ledger/clients/${clientId}`);
                if (clientRes.ok) {
                    App.state.currentClient = await clientRes.json();
                    const main = document.getElementById('main-content');
                    if (main && App.state.view === 'client-profile') {
                        main.innerHTML = Components.ClientProfileView(App.state.currentClient, App.state.activeProfileSection);
                        ThinkingLoader.init(main);
                    }
                }
            } else {
                alert('Failed to delete file.');
            }
        } catch (e) {
            console.error("Delete file error:", e);
            alert('Network error deleting file.');
        }
    },

    // Legacy Job Supporting Document Handlers (Preserved for backward compatibility)
    uploadSupportingDocument: async (jobId) => {
        const fileInput = document.getElementById('suppDocFile');
        const descInput = document.getElementById('suppDocDesc');
        if (!fileInput || !fileInput.files[0]) {
            alert('Please select a file');
            return;
        }
        const file = fileInput.files[0];
        const description = descInput ? descInput.value.trim() : '';
        const uploadKey = `supp-doc-${jobId}`;
        if (App._activeUploads.has(uploadKey)) return;
        App._activeUploads.add(uploadKey);

        const formData = new FormData();
        formData.append('file', file);
        if (description) formData.append('description', description);

        const btn = document.getElementById('uploadSuppBtn');
        const originalBtnHtml = btn ? btn.innerHTML : 'Upload';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `${ThinkingLoader.inline('working', 'Uploading…')}`;
            ThinkingLoader.init(btn);
        }

        try {
            const res = await App.authFetch(`${App.API_URL}/jobs/${jobId}/documents`, {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                const doc = await res.json();
                if (App.state.currentJob) {
                    if (!App.state.currentJob.supporting_documents) App.state.currentJob.supporting_documents = [];
                    App.state.currentJob.supporting_documents.push(doc);
                }
            } else {
                alert('Upload failed');
            }
        } catch(e) {
            console.error(e);
            alert('Upload error');
        } finally {
            App._activeUploads.delete(uploadKey);
            App.toggleSuppDocModal(false);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalBtnHtml;
            }
            if (fileInput) fileInput.value = '';
            if (descInput) descInput.value = '';
        }
    },

    toggleSuppDocModal: (show = true) => {
        const modal = document.getElementById('suppDocModal');
        if (modal) {
            if (show) modal.classList.remove('hidden');
            else modal.classList.add('hidden');
        }
    },

    downloadSupportingDocument: async (jobId, docId, filename, triggerBtn) => {
        if (!filename) {
            const doc = (App.state.currentJob?.supporting_documents || []).find(d => d.id === docId);
            filename = doc ? doc.original_filename : 'document';
        }

        const dlKey = `supp-doc-${docId}`;
        if (App._activeDownloads.has(dlKey)) return false;
        App._activeDownloads.add(dlKey);

        const docBtn = triggerBtn || document.getElementById(`suppDocDlBtn-${docId}`) || document.querySelector(`button[onclick*="downloadSupportingDocument"][onclick*="${docId}"]`);
        const originalDocBtnHtml = docBtn ? docBtn.innerHTML : '';
        if (docBtn) {
            docBtn.disabled = true;
            docBtn.classList.add('opacity-75', 'cursor-not-allowed');
            const iconBox = docBtn.querySelector('.bg-blue-50') || docBtn;
            iconBox.innerHTML = `${ThinkingLoader.inline('working', '')}`;
            ThinkingLoader.init(iconBox);
        }

        try {
            const res = await App.authFetch(`${App.API_URL}/jobs/${jobId}/documents/${docId}/download`);
            if (res.status === 401) {
                alert("Session expired. Please log in again.");
                App.logout();
                return false;
            }
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const finalFilename = App._getFilenameFromResponse(res, filename);
                
                if (blob.type === 'application/pdf' || blob.type === 'text/plain') {
                    window.open(url, '_blank');
                } else {
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = finalFilename;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                }
                setTimeout(() => window.URL.revokeObjectURL(url), 60000);
                return true;
            } else {
                const err = await res.json().catch(() => ({}));
                alert("Download failed: " + (err.detail || res.statusText || "Unknown error"));
                return false;
            }
        } catch (e) {
            console.error("Download error", e);
            alert("Download failed: " + (e.message || "Network error"));
            return false;
        } finally {
            App._activeDownloads.delete(dlKey);
            const restoredDocBtn = document.getElementById(`suppDocDlBtn-${docId}`) || document.querySelector(`button[onclick*="downloadSupportingDocument"][onclick*="${docId}"]`);
            if (restoredDocBtn) {
                restoredDocBtn.disabled = false;
                restoredDocBtn.classList.remove('opacity-75', 'cursor-not-allowed');
                restoredDocBtn.innerHTML = originalDocBtnHtml;
            }
        }
    },

    // =====================================================
    // Audio Player
    // =====================================================

    initAudioPlayer: async () => {
        const audio = document.getElementById('audioElement');
        const seekBar = document.getElementById('audioSeekBar');
        const currentTimeEl = document.getElementById('audioCurrentTime');
        const durationEl = document.getElementById('audioDuration');
        const slab = document.getElementById('audioPlayerSlab');

        if (!audio || !App.state.currentJob) return;

        // Fetch audio with auth and create blob URL
        const jobId = App.state.currentJob.id;
        try {
            const res = await App.authFetch(`${App.API_URL}/jobs/${jobId}/audio`);
            if (res.ok) {
                const blob = await res.blob();
                const blobUrl = URL.createObjectURL(blob);
                audio.src = blobUrl;
                // Store for cleanup
                App._audioBlobUrl = blobUrl;
            } else {
                console.error('Failed to load audio:', res.status);
            }
        } catch (e) {
            console.error('Failed to fetch audio:', e);
        }

        // Restore playback rate
        audio.playbackRate = App.state.audioPlaybackRate;
        App._updateSpeedBadge();

        // Time update handler
        audio.addEventListener('timeupdate', () => {
            if (!App._seeking) {
                const pct = (audio.currentTime / audio.duration) * 100 || 0;
                if (seekBar) seekBar.value = pct;
                if (currentTimeEl) currentTimeEl.textContent = App._formatTime(audio.currentTime);
            }
        });

        // Metadata loaded
        audio.addEventListener('loadedmetadata', () => {
            if (durationEl) durationEl.textContent = App._formatTime(audio.duration);
            if (seekBar) seekBar.max = 100;
        });

        // Audio buffering and loading event handlers
        const playIcon = document.getElementById('playIcon');
        const pauseIcon = document.getElementById('pauseIcon');
        const bufferIcon = document.getElementById('audioBufferIcon');

        const showBuffering = () => {
            if (bufferIcon) {
                bufferIcon.classList.remove('hidden');
                ThinkingLoader.init(bufferIcon);
            }
            if (playIcon) playIcon.classList.add('hidden');
            if (pauseIcon) pauseIcon.classList.add('hidden');
        };

        const hideBuffering = () => {
            if (bufferIcon) bufferIcon.classList.add('hidden');
            if (audio.paused) {
                if (playIcon) playIcon.classList.remove('hidden');
                if (pauseIcon) pauseIcon.classList.add('hidden');
            } else {
                if (playIcon) playIcon.classList.add('hidden');
                if (pauseIcon) pauseIcon.classList.remove('hidden');
            }
        };

        audio.addEventListener('waiting', showBuffering);
        audio.addEventListener('seeking', showBuffering);
        audio.addEventListener('canplay', hideBuffering);
        audio.addEventListener('playing', hideBuffering);

        // Audio ended
        audio.addEventListener('ended', () => {
            App.stopAudio();
        });

        // Keyboard handler — only when hovered
        App._audioKeyHandler = (e) => {
            if (!App.audioPlayerHovered) return;

            // Don't intercept if user is editing transcript
            const activeEl = document.activeElement;
            if (activeEl && activeEl.getAttribute('contenteditable') === 'true') return;

            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    App.togglePlayPause();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    App.seekForward(10);
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    App.seekBackward(10);
                    break;
                case '+':
                case '=':
                    e.preventDefault();
                    App.speedUp();
                    break;
                case '-':
                    e.preventDefault();
                    App.speedDown();
                    break;
            }
        };

        if (slab) {
            slab.addEventListener('keydown', App._audioKeyHandler);
        }

        // Initialize drag functionality
        App.initDragPlayer();
    },

    initDragPlayer: () => {
        const slab = document.getElementById('audioPlayerSlab');
        const handle = document.getElementById('audioDragHandle');
        if (!slab || !handle) return;

        let isDragging = false;
        let startX, startY, startLeft, startTop;

        const onMouseDown = (e) => {
            e.preventDefault();
            isDragging = true;

            const rect = slab.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            startLeft = rect.left;
            startTop = rect.top;

            slab.style.transition = 'none';
            slab.classList.add('audio-player-dragging');

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            let newLeft = startLeft + dx;
            let newTop = startTop + dy;

            // Clamp to viewport
            const slabW = slab.offsetWidth;
            const slabH = slab.offsetHeight;
            newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - slabW));
            newTop = Math.max(0, Math.min(newTop, window.innerHeight - slabH));

            slab.style.left = newLeft + 'px';
            slab.style.top = newTop + 'px';
            slab.style.bottom = 'auto';
            slab.style.right = 'auto';
        };

        const onMouseUp = () => {
            isDragging = false;
            slab.style.transition = '';
            slab.classList.remove('audio-player-dragging');
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        handle.addEventListener('mousedown', onMouseDown);

        // Store cleanup ref
        App._dragCleanup = () => {
            handle.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    },

    destroyAudioPlayer: () => {
        const audio = document.getElementById('audioElement');
        if (audio) {
            audio.pause();
            audio.src = '';
        }

        // Revoke blob URL to free memory
        if (App._audioBlobUrl) {
            URL.revokeObjectURL(App._audioBlobUrl);
            App._audioBlobUrl = null;
        }

        const slab = document.getElementById('audioPlayerSlab');
        if (slab && App._audioKeyHandler) {
            slab.removeEventListener('keydown', App._audioKeyHandler);
        }
        App._audioKeyHandler = null;
        App.audioPlayerHovered = false;

        // Cleanup drag
        if (App._dragCleanup) {
            App._dragCleanup();
            App._dragCleanup = null;
        }

        // Reset player position
        if (slab) {
            slab.style.left = '';
            slab.style.top = '';
            slab.style.bottom = '';
            slab.style.right = '';
        }
    },

    _setAudioPlayerUIState: (state) => {
        const playBtn = document.getElementById('audioPlayPauseBtn');
        const stopBtn = document.getElementById('audioStopBtn');
        const playIcon = document.getElementById('playIcon');
        const pauseIcon = document.getElementById('pauseIcon');
        const bufferIcon = document.getElementById('audioBufferIcon');

        if (!playBtn) return;

        if (state === 'INITIALIZING' || state === 'PAUSING' || state === 'LOADING') {
            playBtn.disabled = true;
            if (playIcon) playIcon.classList.add('hidden');
            if (pauseIcon) pauseIcon.classList.add('hidden');
            if (bufferIcon) {
                bufferIcon.classList.remove('hidden');
                if (typeof ThinkingLoader !== 'undefined') ThinkingLoader.init(bufferIcon);
            }
            if (stopBtn) stopBtn.disabled = false;
        } else if (state === 'PLAYING') {
            playBtn.disabled = false;
            if (playIcon) playIcon.classList.add('hidden');
            if (pauseIcon) pauseIcon.classList.remove('hidden');
            if (bufferIcon) bufferIcon.classList.add('hidden');
            if (stopBtn) stopBtn.disabled = false;
        } else if (state === 'PAUSED') {
            playBtn.disabled = false;
            if (playIcon) playIcon.classList.remove('hidden');
            if (pauseIcon) pauseIcon.classList.add('hidden');
            if (bufferIcon) bufferIcon.classList.add('hidden');
            if (stopBtn) stopBtn.disabled = false;
        } else {
            // IDLE
            playBtn.disabled = false;
            if (playIcon) playIcon.classList.remove('hidden');
            if (pauseIcon) pauseIcon.classList.add('hidden');
            if (bufferIcon) bufferIcon.classList.add('hidden');
            if (stopBtn) stopBtn.disabled = false;
        }
    },

    stopAudio: () => {
        if (App._stoppingAudio) return;
        App._stoppingAudio = true;
        try {
            App._currentAudioOpId = (App._currentAudioOpId || 0) + 1;
            const audio = document.getElementById('audioElement');
            if (audio) {
                try {
                    audio.pause();
                    audio.currentTime = 0;
                } catch (e) {}
            }

            // Stop all audio across the application
            if (App.audioController) {
                App.audioController.stopAll();
            }
            if (App.sharedAudioQueueManager) {
                App.sharedAudioQueueManager.handleGlobalStop();
            }
            if (App._ledgerAudio) {
                try {
                    App._ledgerAudio.pause();
                    App._ledgerAudio.currentTime = 0;
                } catch (e) {}
                App._ledgerAudioPlaying = false;
            }

            // Reset player UI
            App._setAudioPlayerUIState('IDLE');
            const seekBar = document.getElementById('audioSeekBar');
            const currentTimeEl = document.getElementById('audioCurrentTime');
            if (seekBar) seekBar.value = 0;
            if (currentTimeEl) currentTimeEl.textContent = '0:00';
        } finally {
            App._stoppingAudio = false;
        }
    },

    togglePlayPause: async () => {
        const audio = document.getElementById('audioElement');
        if (!audio || !App.state.currentJob) return;

        const jobId = App.state.currentJob.id;
        const recordingId = 'job-' + jobId;

        // If currently playing, perform Pause flow
        if (!audio.paused) {
            App._setAudioPlayerUIState('PAUSING');
            try {
                await new Promise((resolve) => {
                    let resolved = false;
                    const done = () => {
                        if (!resolved) {
                            resolved = true;
                            audio.removeEventListener('pause', done);
                            resolve();
                        }
                    };
                    if (audio.paused) {
                        done();
                        return;
                    }
                    audio.addEventListener('pause', done, { once: true });
                    try {
                        audio.pause();
                    } catch (e) {
                        done();
                    }
                    setTimeout(done, 100);
                });
            } catch (e) {
                console.warn('Audio pause failed:', e);
            }
            App._setAudioPlayerUIState('PAUSED');
            return;
        }

        // Otherwise, perform Play flow
        // 1. Enforce single active audio instance: stop any other playing audio
        if (App.audioController) {
            App.audioController.notifyActive(recordingId, () => App.stopAudio());
        }
        if (App.sharedAudioQueueManager) {
            await App.sharedAudioQueueManager.handleGlobalStop();
        }
        if (App._ledgerAudio) {
            try {
                App._ledgerAudio.pause();
                App._ledgerAudio.currentTime = 0;
            } catch (e) {}
            App._ledgerAudioPlaying = false;
        }

        // 2. Loading state: disable button, show spinner
        App._setAudioPlayerUIState('INITIALIZING');
        App._currentAudioOpId = (App._currentAudioOpId || 0) + 1;
        const opId = App._currentAudioOpId;

        try {
            if (App.audioController) {
                App.audioController.setActiveAudio(audio, recordingId);
            }

            await new Promise((resolve, reject) => {
                let resolved = false;
                const done = () => {
                    if (!resolved) {
                        resolved = true;
                        audio.removeEventListener('playing', done);
                        audio.removeEventListener('play', done);
                        audio.removeEventListener('error', onErr);
                        resolve();
                    }
                };
                const onErr = (e) => {
                    if (!resolved) {
                        resolved = true;
                        audio.removeEventListener('playing', done);
                        audio.removeEventListener('play', done);
                        audio.removeEventListener('error', onErr);
                        reject(e || new Error('Playback error'));
                    }
                };
                audio.addEventListener('playing', done, { once: true });
                audio.addEventListener('play', done, { once: true });
                audio.addEventListener('error', onErr, { once: true });

                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        setTimeout(done, 10);
                    }).catch(onErr);
                }
            });

            if (opId !== App._currentAudioOpId) {
                try { audio.pause(); } catch (e) {}
                return;
            }

            App._setAudioPlayerUIState('PLAYING');
        } catch (e) {
            if (opId !== App._currentAudioOpId || (e && e.name === 'AbortError')) {
                return;
            }
            console.error('Audio play failed:', e);
            App._setAudioPlayerUIState('IDLE');
        }
    },

    seekForward: (secs) => {
        const audio = document.getElementById('audioElement');
        if (!audio) return;
        audio.currentTime = Math.min(audio.currentTime + secs, audio.duration || 0);
    },

    seekBackward: (secs) => {
        const audio = document.getElementById('audioElement');
        if (!audio) return;
        audio.currentTime = Math.max(audio.currentTime - secs, 0);
    },

    seekTo: (pct) => {
        const audio = document.getElementById('audioElement');
        if (!audio || !audio.duration) return;
        audio.currentTime = (pct / 100) * audio.duration;
    },

    speedUp: () => {
        const audio = document.getElementById('audioElement');
        if (!audio) return;
        App.state.audioPlaybackRate = Math.min(App.state.audioPlaybackRate + 0.25, 3.0);
        audio.playbackRate = App.state.audioPlaybackRate;
        App._updateSpeedBadge();
    },

    speedDown: () => {
        const audio = document.getElementById('audioElement');
        if (!audio) return;
        App.state.audioPlaybackRate = Math.max(App.state.audioPlaybackRate - 0.25, 0.5);
        audio.playbackRate = App.state.audioPlaybackRate;
        App._updateSpeedBadge();
    },

    _updateSpeedBadge: () => {
        const badge = document.getElementById('audioSpeedBadge');
        if (badge) {
            badge.textContent = `${App.state.audioPlaybackRate.toFixed(1)}×`;
            // Highlight if not 1.0
            if (App.state.audioPlaybackRate !== 1.0) {
                badge.classList.add('audio-speed-badge--active');
            } else {
                badge.classList.remove('audio-speed-badge--active');
            }
        }
    },

    _formatTime: (secs) => {
        if (!secs || isNaN(secs)) return '0:00';
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    },

    // =====================================================
    // Text Editing
    // =====================================================

    toggleEditMode: () => {
        const contentEl = document.getElementById('transcriptContent');
        const btnText = document.getElementById('editBtnText');
        const btnEl = document.getElementById('editToggleBtn');
        const btnIcon = document.getElementById('editBtnIcon');

        if (!contentEl) return;

        if (App.state.isEditing) {
            // Save and exit edit mode
            App.saveTranscriptEdit();
            contentEl.setAttribute('contenteditable', 'false');
            contentEl.classList.remove('editing-active');
            if (btnText) btnText.textContent = 'Edit';
            if (btnEl) {
                btnEl.classList.remove('bg-green-50', 'text-green-700', 'border-green-300');
                btnEl.classList.add('text-slate-600', 'border-slate-300');
            }
            if (btnIcon) btnIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>';
            App.state.isEditing = false;
        } else {
            // Enter edit mode
            contentEl.setAttribute('contenteditable', 'true');
            contentEl.classList.add('editing-active');
            contentEl.focus();
            if (btnText) btnText.textContent = 'Save';
            if (btnEl) {
                btnEl.classList.remove('text-slate-600', 'border-slate-300');
                btnEl.classList.add('bg-green-50', 'text-green-700', 'border-green-300');
            }
            if (btnIcon) btnIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>';
            App.state.isEditing = true;
        }
    },

    saveTranscriptEdit: async () => {
        const contentEl = document.getElementById('transcriptContent');
        const editBtn = document.getElementById('editToggleBtn');
        if (!contentEl || !App.state.currentJob) return;

        const editedText = contentEl.innerText.trim();
        const jobId = App.state.currentJob.id;

        if (editBtn) {
            editBtn.disabled = true;
            editBtn.innerHTML = `${ThinkingLoader.inline('working', 'Saving…')}`;
            ThinkingLoader.init(editBtn);
        }

        try {
            const res = await App.authFetch(`${App.API_URL}/jobs/${jobId}/transcript`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text_content: editedText })
            });

            if (res.ok) {
                const data = await res.json();
                // Update local state
                App.state.currentJob.text_content = data.text_content;
                App.state.currentJob.json_metadata = data.json_metadata;
                console.log('Transcript saved successfully');
            } else {
                const err = await res.json();
                alert('Failed to save: ' + (err.detail || 'Unknown error'));
            }
        } catch (e) {
            console.error('Save transcript error:', e);
            alert('Failed to save transcript');
        } finally {
            if (editBtn) {
                editBtn.disabled = false;
                editBtn.innerHTML = `
                    <svg id="editBtnIcon" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    <span id="editBtnText">Edit</span>
                `;
            }
        }
    },

    playSharedAudio: async (queueItemId, filename) => {
        if (App.sharedAudioQueueManager) {
            return await App.sharedAudioQueueManager.handlePlayPause(queueItemId);
        }
    },

    stopSharedAudio: async (queueItemId) => {
        if (App.sharedAudioQueueManager) {
            return await App.sharedAudioQueueManager.handleGlobalStop(queueItemId);
        }
    },

    downloadSharedAudio: async (queueItemId, filename, triggerBtn) => {
        if (!filename) {
            const item = (App.state.sharedQueueItems || []).find(i => i.id === queueItemId);
            filename = item ? item.original_filename : 'audio.mp3';
        }

        // Duplicate guard
        const dlKey = `shared-${queueItemId}`;
        if (App._activeDownloads.has(dlKey)) return false;
        App._activeDownloads.add(dlKey);

        // Find and update the download button for this row
        const downloadBtn = triggerBtn || document.getElementById(`sharedDlBtn-${queueItemId}`) || document.querySelector(`button[onclick*="downloadSharedAudio"][onclick*="${queueItemId}"]`);
        const originalBtnHtml = downloadBtn ? downloadBtn.innerHTML : '';
        if (downloadBtn) {
            downloadBtn.disabled = true;
            downloadBtn.innerHTML = `${ThinkingLoader.inline('working', '')}`;
            downloadBtn.title = 'Preparing download…';
            ThinkingLoader.init(downloadBtn);
        }

        try {
            const res = await App.authFetch(`${App.API_URL}/queue/${queueItemId}/download`);
            if (res.status === 401) {
                alert("Session expired. Please log in again.");
                App.logout();
                return false;
            }
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = App._getFilenameFromResponse(res, filename);
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => window.URL.revokeObjectURL(url), 60000);
                return true;
            } else {
                const err = await res.json().catch(() => ({}));
                alert("Download failed: " + (err.detail || res.statusText || "Unknown error"));
                return false;
            }
        } catch (e) {
            console.error("Download error", e);
            alert("Download failed: " + (e.message || "Network error"));
            return false;
        } finally {
            App._activeDownloads.delete(dlKey);
            // Restore button (it may have been re-rendered by polling, so re-query)
            const restoredBtn = document.getElementById(`sharedDlBtn-${queueItemId}`) || document.querySelector(`button[onclick*="downloadSharedAudio"][onclick*="${queueItemId}"]`);
            if (restoredBtn) {
                restoredBtn.disabled = false;
                restoredBtn.innerHTML = originalBtnHtml;
                restoredBtn.title = 'Download';
            }
        }
    },

    // Download audio for a personal job (My Files page)
    downloadJobAudio: async (jobId, filename, triggerBtn) => {
        if (!filename) {
            const job = (App.state.jobs || []).find(j => j.id === jobId) || App.state.currentJob;
            filename = job ? job.original_filename : 'audio.mp3';
        }

        // Duplicate guard
        const dlKey = `job-audio-${jobId}`;
        if (App._activeDownloads.has(dlKey)) return false;
        App._activeDownloads.add(dlKey);

        const downloadBtn = triggerBtn || document.getElementById(`downloadJobAudioBtn-${jobId}`);
        const originalBtnHtml = downloadBtn ? downloadBtn.innerHTML : '';
        if (downloadBtn) {
            downloadBtn.disabled = true;
            downloadBtn.innerHTML = `<span class="flex items-center gap-2">${ThinkingLoader.inline('working', 'Preparing…')}</span>`;
            ThinkingLoader.init(downloadBtn);
        }

        try {
            const res = await App.authFetch(`${App.API_URL}/jobs/${jobId}/audio`);
            if (res.status === 401) {
                alert("Session expired. Please log in again.");
                App.logout();
                return false;
            }
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = App._getFilenameFromResponse(res, filename);
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => window.URL.revokeObjectURL(url), 60000);
                return true;
            } else {
                const err = await res.json().catch(() => ({}));
                alert("Download failed: " + (err.detail || res.statusText || "Unknown error"));
                return false;
            }
        } catch (e) {
            console.error("Download error", e);
            alert("Download failed: " + (e.message || "Network error"));
            return false;
        } finally {
            App._activeDownloads.delete(dlKey);
            const restoredBtn = document.getElementById(`downloadJobAudioBtn-${jobId}`);
            if (restoredBtn) {
                restoredBtn.disabled = false;
                restoredBtn.innerHTML = originalBtnHtml;
            }
        }
    },

    // Ledger detail audio play/pause (pause resets to beginning)
    _ledgerAudio: null,
    _ledgerAudioJobId: null,
    _ledgerAudioPlaying: false,

    toggleLedgerAudio: async (jobId) => {
        const playBtn = document.getElementById('ledgerPlayBtn');
        const playIcon = document.getElementById('ledgerPlayIcon');
        const playText = document.getElementById('ledgerPlayText');

        // If currently playing, pause and reset
        if (App._ledgerAudio && App._ledgerAudioPlaying) {
            App._ledgerAudio.pause();
            App._ledgerAudio.currentTime = 0;
            App._ledgerAudioPlaying = false;
            if (playIcon) playIcon.innerHTML = '<path d="M8 5v14l11-7z"></path>';
            if (playText) playText.textContent = 'Play Audio';
            if (playBtn) {
                playBtn.classList.remove('bg-amber-500', 'hover:bg-amber-600');
                playBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
            }
            return;
        }

        // Enforce single active audio instance: stop any other playing audio
        if (App.audioController) {
            App.audioController.notifyActive('ledger-' + jobId, () => {
                if (App._ledgerAudio) {
                    try {
                        App._ledgerAudio.pause();
                        App._ledgerAudio.currentTime = 0;
                    } catch (e) {}
                    App._ledgerAudioPlaying = false;
                    if (playIcon) playIcon.innerHTML = '<path d="M8 5v14l11-7z"></path>';
                    if (playText) playText.textContent = 'Play Audio';
                    if (playBtn) {
                        playBtn.classList.remove('bg-amber-500', 'hover:bg-amber-600');
                        playBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
                    }
                }
            });
        }
        if (App.sharedAudioQueueManager) {
            await App.sharedAudioQueueManager.handleGlobalStop();
        }
        const transcriptAudio = document.getElementById('audioElement');
        if (transcriptAudio && !transcriptAudio.paused) {
            transcriptAudio.pause();
            transcriptAudio.currentTime = 0;
            App._setAudioPlayerUIState('IDLE');
        }

        // Show loading state
        if (playBtn) {
            playBtn.disabled = true;
            if (playText) playText.textContent = 'Loading…';
        }

        // If different job or no audio loaded, load it
        if (!App._ledgerAudio || App._ledgerAudioJobId !== jobId) {
            if (App._ledgerAudio) {
                App._ledgerAudio.pause();
                App._ledgerAudio = null;
            }

            try {
                const res = await App.authFetch(`${App.API_URL}/jobs/${jobId}/audio`);
                if (res.ok) {
                    const blob = await res.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    App._ledgerAudio = new Audio(blobUrl);
                    App._ledgerAudioJobId = jobId;

                    App._ledgerAudio.onended = () => {
                        App._ledgerAudioPlaying = false;
                        App._ledgerAudio.currentTime = 0;
                        if (playIcon) playIcon.innerHTML = '<path d="M8 5v14l11-7z"></path>';
                        if (playText) playText.textContent = 'Play Audio';
                        if (playBtn) {
                            playBtn.disabled = false;
                            playBtn.classList.remove('bg-amber-500', 'hover:bg-amber-600');
                            playBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
                        }
                    };
                } else {
                    if (playBtn) playBtn.disabled = false;
                    if (playText) playText.textContent = 'Play Audio';
                    alert('Failed to load audio');
                    return;
                }
            } catch (e) {
                console.error('Audio load failed:', e);
                if (playBtn) playBtn.disabled = false;
                if (playText) playText.textContent = 'Play Audio';
                alert('Failed to load audio');
                return;
            }
        }

        // Play from beginning
        App._ledgerAudio.currentTime = 0;
        try {
            const p = App._ledgerAudio.play();
            if (p !== undefined) await p;
        } catch (e) {
            console.error('Ledger audio play failed:', e);
            if (playBtn) playBtn.disabled = false;
            if (playText) playText.textContent = 'Play Audio';
            return;
        }

        if (App.audioController) {
            App.audioController.setActiveAudio(App._ledgerAudio, 'ledger-' + jobId);
        }

        App._ledgerAudioPlaying = true;
        if (playBtn) playBtn.disabled = false;
        if (playIcon) playIcon.innerHTML = '<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"></path>';
        if (playText) playText.textContent = 'Pause';
        if (playBtn) {
            playBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            playBtn.classList.add('bg-amber-500', 'hover:bg-amber-600');
        }
    }
};

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', App.init);

    // Global click handler to close action menus
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.action-menu-dropdown') && !e.target.closest('button[title="Actions"]')) {
            document.querySelectorAll('.action-menu-dropdown').forEach(d => d.classList.add('hidden'));
        }
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { App, CentralizedAudioController, SharedAudioQueueManager };
}
