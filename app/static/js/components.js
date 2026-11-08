const Components = {
    Login: () => `
        <div class="min-h-screen w-full flex items-center justify-center bg-slate-50">
            <div class="max-w-md w-full bg-white rounded-lg shadow-sm border border-slate-200 p-8">
                <div class="text-center mb-8">
                    <h1 class="text-2xl font-bold text-slate-900 flex items-center justify-center gap-2">
                        <img src="/static/img/logo.png" alt="TunAIde Logo" class="h-64 object-contain max-w-full">
                    </h1>
                    <p class="text-slate-500 text-sm mt-2">Sign in to your account</p>
                </div>
                <form onsubmit="event.preventDefault(); App.login(this.username.value, this.password.value)">
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-slate-700 mb-1">Username</label>
                        <input type="text" name="username" required class="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-slate-700 mb-1">Password</label>
                        <input type="password" name="password" required class="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <button type="submit" id="loginBtn" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2">
                        <span id="loginBtnText">Sign In</span>
                    </button>
                </form>
            </div>
        </div>
    `,

    AdminDashboard: (stats = []) => `
        <div class="pl-64 min-h-screen bg-slate-50">
            <div class="max-w-6xl mx-auto p-8">
                <h2 class="text-2xl font-semibold text-slate-900 mb-8">Admin Dashboard</h2>
                
                <!-- Activity Chart (7-Day Bar Graph) -->
                <div id="activityChartContainer" class="mb-6 bg-white rounded-lg shadow-sm border border-slate-200 p-5">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
                            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                        </div>
                        <div>
                            <p class="text-sm font-semibold text-slate-900">Weekly Activity</p>
                            <p class="text-xs text-slate-500">Uploads & completions over the last 7 days</p>
                        </div>
                    </div>
                    <div id="activityChart" class="activity-chart min-h-[140px] flex items-center justify-center">
                        ${ThinkingLoader.section('weaving', 'Loading weekly activity…')}
                    </div>
                    <div class="flex items-center gap-4 mt-3 justify-end">
                        <div class="flex items-center gap-1.5">
                            <span class="w-2.5 h-2.5 rounded-sm bg-blue-500"></span>
                            <span class="text-xs text-slate-500">Uploaded</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <span class="w-2.5 h-2.5 rounded-sm bg-green-500"></span>
                            <span class="text-xs text-slate-500">Completed</span>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                    <div class="p-6 border-b border-slate-200">
                        <h3 class="text-lg font-medium text-slate-900">User Statistics</h3>
                        <p class="text-sm text-slate-500">Activity overview</p>
                    </div>
                    <table class="w-full text-left">
                        <thead class="bg-slate-50 text-xs uppercase text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th class="px-6 py-3">Username</th>
                                <th class="px-6 py-3 text-right">Files Uploaded</th>
                                <th class="px-6 py-3 text-right">Transcribed (Min)</th>
                                <th class="px-6 py-3 text-right">Last Login</th>
                                <th class="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="userStatsTableBody" class="divide-y divide-slate-100">
                            ${stats && stats.length ? stats.map(u => `
                                <tr class="hover:bg-slate-50">
                                    <td class="px-6 py-4 font-medium text-slate-900">${u.username}</td>
                                    <td class="px-6 py-4 text-right tabular-nums">${u.upload_count}</td>
                                    <td class="px-6 py-4 text-right tabular-nums">${u.transcribed_minutes.toFixed(2)}</td>
                                    <td class="px-6 py-4 text-right text-slate-500 text-sm">${u.last_login ? new Date(u.last_login).toLocaleString('en-GB', { timeZone: 'Europe/Paris' }) : '-'}</td>
                                    <td class="px-6 py-4 text-right text-sm">
                                        ${(u.is_admin && u.username !== App.state.user.username) 
                                            ? '<span class="text-slate-400 italic">Cannot Reset</span>'
                                            : `<button onclick="App.resetTracker('${u.username}')" class="text-red-600 hover:text-red-900 font-medium border border-red-200 bg-red-50 px-3 py-1 rounded">Reset Tracker</button>`
                                        }
                                    </td>
                                </tr>
                            `).join('') : `
                                <tr>
                                    <td colspan="5" class="px-6 py-8 text-center text-slate-400">
                                        ${(stats === null) ? ThinkingLoader.section('searching', 'Loading user statistics…') : 'No user data available'}
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `,

    UserManagement: (users = []) => `
        <div class="pl-64 min-h-screen bg-slate-50">
            <div class="max-w-4xl mx-auto p-8">
                <h2 class="text-2xl font-semibold text-slate-900 mb-8">User Management</h2>
                
                <!-- Create User Form -->
                <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-8">
                    <h3 class="text-lg font-medium text-slate-900 mb-4">Create New User</h3>
                    <form onsubmit="event.preventDefault(); App.createUser(this.username.value, this.password.value); this.reset();" class="flex gap-4 items-end">
                        <div class="flex-1">
                            <label class="block text-sm font-medium text-slate-700 mb-1">Username</label>
                            <input type="text" name="username" required class="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div class="flex-1">
                            <label class="block text-sm font-medium text-slate-700 mb-1">Password</label>
                            <input type="password" name="password" required class="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition font-medium">
                            Create User
                        </button>
                    </form>
                </div>

                <!-- User List -->
                <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                    <div class="p-6 border-b border-slate-200">
                        <h3 class="text-lg font-medium text-slate-900">Existing Users</h3>
                    </div>
                    <table class="w-full text-left">
                        <thead class="bg-slate-50 text-xs uppercase text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th class="px-6 py-3">Username</th>
                                <th class="px-6 py-3">Created</th>
                                <th class="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${users && users.length ? users.map(u => `
                                <tr class="hover:bg-slate-50">
                                    <td class="px-6 py-4 font-medium text-slate-900">${u.username}</td>
                                    <td class="px-6 py-4 text-slate-500 text-sm">
                                        ${u.last_login ? new Date(u.last_login).toLocaleDateString('en-GB', { timeZone: 'Europe/Paris' }) : 'N/A'}
                                    </td>
                                    <td class="px-6 py-4 text-right">
                                        ${u.username === App.state.user.username ?
            '<span class="text-slate-400 text-sm italic">Current User</span>' :
            u.is_admin ?
                '<span class="text-slate-400 text-sm italic">Admin</span>' :
                `
                                            <button onclick="App.deleteUser('${u.username}')" class="text-red-600 hover:text-red-900 text-sm font-medium">
                                                Delete
                                            </button>
                                        `}
                                    </td>
                                </tr>
                            `).join('') : `
                                <tr>
                                    <td colspan="3" class="px-6 py-8 text-center text-slate-400">
                                        ${(users === null) ? ThinkingLoader.section('searching', 'Loading users…') : 'No users found'}
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `,

    Sidebar: (activeView = 'dashboard', user = { username: 'User' }) => {
        // Debugging user state
        console.log("Sidebar rendering for user:", user);

        const dashboardClass = activeView === 'dashboard'
            ? "myfiles-active"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900";

        const trashClass = activeView === 'trash'
            ? "bg-blue-50 text-blue-700"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900";

        const sharedClass = activeView === 'shared-queue'
            ? "bg-blue-50 text-blue-700"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900";

        const ledgerClass = activeView === 'ledger' || activeView === 'ledger-detail' || activeView === 'client-profile'
            ? "bg-blue-50 text-blue-700"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900";

        const adminClass = activeView === 'admin'
            ? "bg-purple-50 text-purple-700"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900";

        const userMgmtClass = activeView === 'user-management'
            ? "bg-purple-50 text-purple-700"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900";

        // DEBUG: Force show what user is
        const debugInfo = `<!-- User: ${JSON.stringify(user)} -->`;

        return `
        <div class="w-64 bg-white border-r border-slate-200 flex flex-col h-full fixed left-0 top-0 z-10 transition-all">
            <div class="p-6 flex items-center justify-center">
                <h1 class="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <img src="/static/img/logo.png" alt="TunAIde Logo" class="h-40 object-contain max-w-full">
                </h1>
            </div>
            
            <nav class="flex-1 px-4 space-y-1">
                <button onclick="App.navigateTo('dashboard')" class="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md ${dashboardClass}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                    My Files
                </button>
                <button onclick="App.navigateTo('shared-queue')" class="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md ${sharedClass}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                    Shared Queue
                </button>
                <button onclick="App.navigateTo('trash')" class="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md ${trashClass}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    Trash
                </button>
                <button onclick="App.navigateTo('ledger')" class="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md ${ledgerClass}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    Ledger
                </button>
                
                ${user && user.is_admin ? `
                <div class="pt-4 pb-2">
                    <p class="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Admin</p>
                </div>
                <button onclick="App.navigateTo('admin')" class="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md ${adminClass}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                    Dashboard
                </button>
                <button onclick="App.navigateTo('user-management')" class="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md ${userMgmtClass}">
                   <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                   User Management
                </button>
                ` : ''}
            </nav>

            <div class="p-4 border-t border-slate-200">
                <div class="flex items-center gap-3 justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                             ${user && user.username ? user.username[0].toUpperCase() : 'U'}
                        </div>
                        <div class="text-sm">
                            <p class="font-medium text-slate-900">${user ? user.username : 'User'}</p>
                            <p class="text-slate-500 text-xs">${user && user.is_admin ? 'Admin' : 'Free Plan'}</p>
                        </div>
                    </div>
                    <button onclick="App.logout()" class="text-slate-400 hover:text-red-600 transition p-1" title="Sign out">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    </button>
                </div>
            </div>
        </div>
    `},

    SharedQueuePlayPauseButton: (itemId, state = 'IDLE', isStopping = false) => {
        if (state === 'INITIALIZING' || state === 'PAUSING' || state === 'STOPPING' || state === 'LOADING' || isStopping) {
            const title = (isStopping || state === 'STOPPING') ? 'Stopping…' : (state === 'PAUSING') ? 'Pausing…' : 'Loading…';
            return `
                <button id="sharedPlayBtn-${itemId}" disabled class="p-1.5 text-blue-600 bg-blue-50 rounded-md cursor-not-allowed opacity-75 inline-flex items-center justify-center" title="${title}">
                    <svg class="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </button>
            `;
        }

        if (state === 'PLAYING') {
            return `
                <button id="sharedPlayBtn-${itemId}" onclick="App.sharedAudioQueueManager ? App.sharedAudioQueueManager.handlePlayPause('${itemId}') : App.playSharedAudio('${itemId}')" class="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition shadow-sm inline-flex items-center justify-center" title="Pause">
                    <svg id="sharedPlayIcon-${itemId}" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path>
                    </svg>
                </button>
            `;
        }

        if (state === 'PAUSED') {
            return `
                <button id="sharedPlayBtn-${itemId}" onclick="App.sharedAudioQueueManager ? App.sharedAudioQueueManager.handlePlayPause('${itemId}') : App.playSharedAudio('${itemId}')" class="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition inline-flex items-center justify-center" title="Resume">
                    <svg id="sharedPlayIcon-${itemId}" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"></path>
                    </svg>
                </button>
            `;
        }

        if (state === 'ERROR') {
            return `
                <button id="sharedPlayBtn-${itemId}" onclick="App.sharedAudioQueueManager ? App.sharedAudioQueueManager.handlePlayPause('${itemId}') : App.playSharedAudio('${itemId}')" class="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-md transition inline-flex items-center justify-center" title="Playback error – click to retry">
                    <svg id="sharedPlayIcon-${itemId}" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"></path>
                    </svg>
                </button>
            `;
        }

        // Default: IDLE
        return `
            <button id="sharedPlayBtn-${itemId}" onclick="App.sharedAudioQueueManager ? App.sharedAudioQueueManager.handlePlayPause('${itemId}') : App.playSharedAudio('${itemId}')" class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-md transition inline-flex items-center justify-center" title="Play">
                <svg id="sharedPlayIcon-${itemId}" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"></path>
                </svg>
            </button>
        `;
    },

    SharedQueueStopButton: (itemId, state = 'IDLE', isStopping = false) => {
        if (isStopping || state === 'STOPPING') {
            return `
                <button id="sharedStopBtn-${itemId}" disabled class="p-1.5 text-amber-600 bg-amber-50 rounded-md cursor-not-allowed opacity-75 inline-flex items-center justify-center" title="Stopping…">
                    <svg class="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </button>
            `;
        }

        return `
            <button id="sharedStopBtn-${itemId}" onclick="App.sharedAudioQueueManager ? App.sharedAudioQueueManager.handleGlobalStop('${itemId}') : App.stopSharedAudio('${itemId}')" class="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition inline-flex items-center justify-center" title="Stop">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6h12v12H6z"></path>
                </svg>
            </button>
        `;
    },

    SharedQueuePlaybackControls: (itemId) => {
        const state = (typeof App !== 'undefined' && App.sharedAudioQueueManager) ? App.sharedAudioQueueManager.getItemState(itemId) : 'IDLE';
        const isStopping = (typeof App !== 'undefined' && App.sharedAudioQueueManager) ? App.sharedAudioQueueManager.isGlobalStopping() : false;

        return `
            <div id="sq-playback-controls-${itemId}" class="inline-flex items-center gap-1">
                ${Components.SharedQueuePlayPauseButton(itemId, state, isStopping)}
                ${Components.SharedQueueStopButton(itemId, state, isStopping)}
            </div>
        `;
    },

    SharedAudioQueue: (items = []) => {
        // Format duration
        const formatDuration = (seconds) => {
            if (!seconds && seconds !== 0) return '—';
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = seconds % 60;
            if (h > 0) {
                return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            }
            return `${m}:${s.toString().padStart(2, '0')}`;
        };

        const formatSize = (bytes) => {
            if (!bytes) return '—';
            return (bytes / 1024 / 1024).toFixed(2) + ' MB';
        };

        const listHtml = items.map((item, index) => `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100 last:border-0">
                <td class="px-4 py-4 text-center">
                    <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-xs font-bold text-slate-500 tabular-nums">${index + 1}</span>
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <div class="bg-slate-100 p-2 rounded text-slate-500">
                             <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 3-2 3-2 3 2zm0 0v-8"></path></svg>
                        </div>
                        <span class="font-medium text-slate-900 group-hover:text-blue-600 transition">${item.original_filename}</span>
                    </div>
                </td>
                <td class="px-6 py-4 text-slate-500 text-sm tabular-nums">
                    ${formatDuration(item.duration_seconds)}
                </td>
                <td class="px-6 py-4 text-slate-500 text-sm tabular-nums">
                    ${formatSize(item.file_size_bytes)}
                </td>
                <td class="px-6 py-4 text-slate-500 text-sm">
                    ${new Date(item.uploaded_at).toLocaleString('en-GB', { timeZone: 'Europe/Paris' })}
                </td>
                <td class="px-6 py-4 text-right relative">
                    <div class="flex items-center justify-end gap-2">
                        ${Components.SharedQueuePlaybackControls(item.id)}
                        ${(App._activeDownloads && App._activeDownloads.has('shared-' + item.id)) ? `
                            <button id="sharedDlBtn-${item.id}" disabled class="p-1.5 text-blue-600 bg-blue-50 rounded-md cursor-not-allowed" title="Preparing download…">
                                ${ThinkingLoader.inline('working', '')}
                            </button>
                        ` : `
                            <button id="sharedDlBtn-${item.id}" onclick="App.downloadSharedAudio('${item.id}', null, this)" class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-md transition" title="Download">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            </button>
                        `}
                        <button onclick="event.stopPropagation(); App.deleteSharedQueueItem('${item.id}')" class="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition" title="Delete">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                        <button onclick="App.showClaimModal('${item.id}')" class="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-100 transition shadow-sm">
                            Claim Audio
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        return `
        <div class="pl-64 min-h-screen bg-slate-50">
            <div class="max-w-6xl mx-auto p-8">
                <!-- Header -->
                <div class="flex justify-between items-center mb-8">
                    <h2 class="text-2xl font-semibold text-slate-900">Shared Audio Queue</h2>
                    ${(App._activeUploads && App._activeUploads.has('shared-queue')) ? `
                        <button id="sharedUploadBtn" disabled class="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium opacity-75 cursor-not-allowed flex items-center gap-2 shadow-sm">
                            ${ThinkingLoader.inline('working', 'Uploading…')}
                        </button>
                    ` : `
                        <button id="sharedUploadBtn" onclick="document.getElementById('sharedFileInput').click()" class="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition shadow-sm flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                            <span>Upload to Shared Queue</span>
                        </button>
                    `}
                    <input type="file" id="sharedFileInput" class="hidden" accept="audio/*,video/*" onchange="App.handleSharedQueueUpload(this)">
                </div>

                <div class="mb-6 bg-blue-50 border border-blue-200 rounded-md p-4 text-blue-800 text-sm flex items-start gap-3">
                    <svg class="w-5 h-5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <div>
                        <p class="font-bold mb-1">How it works</p>
                        <p>Upload files here to make them available to all team members. When you claim an audio file, it will be moved to your personal "My Files" dashboard for transcription, and will no longer be available in this shared queue.</p>
                    </div>
                </div>

                <!-- Upload Status -->
                <div id="sharedUploadArea" class="hidden mb-8 thinking-orb-upload-card" data-orb-container="sharedUploadOrb">
                    <div id="sharedUploadOrbContainer" class="thinking-orb-container thinking-orb-inline"
                         role="status" aria-label="Uploading to shared queue" aria-live="polite"
                         data-orb-state="working" data-orb-size="64">
                        <canvas class="thinking-orb-canvas" width="128" height="128" style="width:64px;height:64px;" aria-hidden="true"></canvas>
                    </div>
                    <div class="thinking-orb-upload-info">
                        <p class="thinking-orb-upload-title" id="sharedUploadText">Uploading to shared queue...</p>
                        <p class="thinking-orb-upload-subtitle" id="sharedUploadSubText">Please do not close this tab.</p>
                        <div class="thinking-orb-progress">
                            <div class="thinking-orb-progress-bar">
                                <div id="sharedUploadProgressBar" class="thinking-orb-progress-fill" style="width: 0%;"></div>
                            </div>
                            <span id="sharedUploadProgressText" class="thinking-orb-progress-text">0%</span>
                        </div>
                    </div>
                </div>

                <!-- File List -->
                <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-visible min-h-[300px]">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-medium">
                            <tr>
                                <th class="px-4 py-3 w-12 text-center">#</th>
                                <th class="px-6 py-3">Name</th>
                                <th class="px-6 py-3">Duration</th>
                                <th class="px-6 py-3">Size</th>
                                <th class="px-6 py-3">Uploaded</th>
                                <th class="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${items && items.length ? listHtml : `
                                <tr>
                                    <td colspan="6" class="px-6 py-12 text-center text-slate-400">
                                        ${(items === null) ? ThinkingLoader.section('searching', 'Loading shared audio queue…') : 'No files currently in the shared queue.'}
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Claim Audio Modal -->
        <div id="claimModal" class="hidden fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center backdrop-blur-sm" onclick="if(event.target === this) App.hideClaimModal()">
            <div class="bg-white rounded-xl shadow-xl border border-slate-200 p-6 w-full max-w-sm" onclick="event.stopPropagation()">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold text-slate-900">Claim Audio</h3>
                    <button onclick="App.hideClaimModal()" class="text-slate-400 hover:text-slate-600 transition p-1 hover:bg-slate-100 rounded-full">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <p class="text-sm text-slate-600 mb-6">Would you like to download the audio file while claiming it?</p>
                <div class="space-y-3">
                    <button id="claimWithDlBtn" onclick="App.claimWithDownload(this)" class="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        <span>Claim & Download</span>
                    </button>
                    <button id="claimWithoutDlBtn" onclick="App.claimWithoutDownload(this)" class="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-200 transition border border-slate-200">
                        <span>Claim Without Downloading</span>
                    </button>
                </div>
            </div>
        </div>
        `;
    },

    Dashboard: (view = 'dashboard') => {
        const title = view === 'trash' ? "Trash" : "My Files";

        let actionButton = '';
        if (view === 'trash') {
            actionButton = `
                <button onclick="App.emptyTrash()" class="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-100 transition shadow-sm flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    Empty Trash
                </button>
             `;
        } else {
            const isUploading = App._activeUploads && App._activeUploads.has('dashboard');
            actionButton = isUploading ? `
                <button id="uploadNewBtn" disabled class="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium opacity-75 cursor-not-allowed flex items-center gap-2 shadow-sm">
                    ${ThinkingLoader.inline('working', 'Uploading…')}
                </button>
            ` : `
                <button id="uploadNewBtn" onclick="document.getElementById('fileInput').click()" class="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition shadow-sm flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                    <span>New Transcription</span>
                </button>
             `;
        }

        return `
        <div class="pl-64 min-h-screen bg-slate-50">
            <div class="max-w-6xl mx-auto p-8">
                <!-- Header -->
                <div class="flex justify-between items-center mb-8">
                    <h2 class="text-2xl font-semibold text-slate-900">${title}</h2>
                    ${actionButton}
                    <input type="file" id="fileInput" class="hidden" accept="audio/*,video/*" onchange="App.handleUpload(this)">
                </div>

                <!-- Upload Status -->
                <div id="uploadArea" class="hidden mb-8 thinking-orb-upload-card" data-orb-container="uploadOrb">
                    <div id="uploadOrbContainer" class="thinking-orb-container thinking-orb-inline"
                         role="status" aria-label="Uploading file" aria-live="polite"
                         data-orb-state="working" data-orb-size="64">
                        <canvas class="thinking-orb-canvas" width="128" height="128" style="width:64px;height:64px;" aria-hidden="true"></canvas>
                    </div>
                    <div class="thinking-orb-upload-info">
                        <p class="thinking-orb-upload-title" id="uploadText">Uploading file...</p>
                        <p class="thinking-orb-upload-subtitle" id="uploadSubText">Please do not close this tab.</p>
                        <div class="thinking-orb-progress">
                            <div class="thinking-orb-progress-bar">
                                <div id="uploadProgressBar" class="thinking-orb-progress-fill" style="width: 0%;"></div>
                            </div>
                            <span id="uploadProgressText" class="thinking-orb-progress-text">0%</span>
                        </div>
                    </div>
                </div>

                <!-- Completion Tracker (Lifetime) -->
                <div id="completionTracker" class="mb-6 bg-white rounded-lg shadow-sm border border-slate-200 p-5">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center">
                                <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            </div>
                            <div>
                                <p class="text-sm font-semibold text-slate-900">All-Time Transcription Progress</p>
                                <p class="text-xs text-slate-500" id="trackerText">0 of 0 files completed</p>
                            </div>
                        </div>
                        <span id="trackerPercent" class="text-lg font-bold text-green-600 tabular-nums">0%</span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div id="trackerBar" class="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500 ease-out" style="width: 0%"></div>
                    </div>
                </div>

                </div>

                <!-- File List -->
                <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-visible min-h-[300px]">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-medium">
                            <tr>
                                <th class="px-4 py-3 w-12 text-center">#</th>
                                <th class="px-6 py-3">Name</th>
                                <th class="px-6 py-3">Status</th>
                                <th class="px-6 py-3">Duration</th>
                                <th class="px-6 py-3">Date</th>
                                <th class="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="jobsTableBody" class="divide-y divide-slate-100">
                            <!-- Rows injected here -->
                        </tbody>
                    </table>
                    <div id="emptyState" class="hidden p-12 text-center">
                        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                            <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                        </div>
                        <h3 class="text-lg font-medium text-slate-900" id="emptyTitle">No files yet</h3>
                        <p class="text-slate-500 mt-1" id="emptyDesc">Upload an audio or video file to get started.</p>
                    </div>
                </div>
            </div>
        </div>
    `},

    TranscriptView: () => `
        <div class="pl-64 h-screen flex flex-col bg-slate-50">
            <!-- Toolbar -->
            <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm z-10">
                <div class="flex items-center gap-4">
                    <button onclick="App.navigateTo('dashboard')" class="text-slate-400 hover:text-slate-600 transition p-1">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    </button>
                    <div class="h-6 w-px bg-slate-200"></div>
                    <h2 class="font-semibold text-slate-900 truncate max-w-lg" id="transcriptTitle">Filename.mp3</h2>
                </div>
                <div class="flex items-center gap-4">
                    <div id="transcriptMetaStatus" class="text-xs text-slate-400 px-2 border-r border-slate-200"></div>

                     <button onclick="App.toggleEmailModal(true)" class="text-slate-600 hover:text-slate-900 px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-md hover:bg-slate-50">
                        Email
                    </button>
                    <button onclick="App.toggleDownloadModal(true)" class="text-blue-600 hover:text-blue-900 px-3 py-1.5 text-sm font-medium border border-blue-200 bg-blue-50 rounded-md hover:bg-blue-100">
                        Download
                    </button>
                </div>
            </header>

            <!-- Editor -->
            <div class="flex-1 overflow-y-auto p-8 pb-48" id="transcriptContainer">
                <div class="max-w-3xl mx-auto bg-white min-h-[800px] p-12 shadow-sm rounded-sm border border-slate-200 relative">
                    <!-- Edit Toggle Button -->
                    <button id="editToggleBtn" onclick="App.toggleEditMode()" class="edit-toggle-btn absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border transition-all duration-200 text-slate-600 border-slate-300 hover:bg-slate-50 hover:text-slate-900" title="Edit transcript">
                        <svg id="editBtnIcon" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        <span id="editBtnText">Edit</span>
                    </button>
                    <div id="transcriptContent" class="prose prose-slate max-w-none prose-lg transcript-editable-area">
                        ${ThinkingLoader.section('searching', 'Loading transcript content…')}
                    </div>
                </div>
            </div>

            <!-- Audio Player Slab -->
            <div id="audioPlayerSlab" class="audio-player-slab" tabindex="-1"
                 onmouseenter="App.audioPlayerHovered = true; this.focus();"
                 onmouseleave="App.audioPlayerHovered = false; this.blur();">
                
                <!-- Drag Handle -->
                <div id="audioDragHandle" class="audio-drag-handle" title="Drag to reposition">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>
                </div>
                
                <audio id="audioElement" preload="auto"></audio>

                <!-- Top Row: Progress Bar -->
                <div class="audio-progress-row">
                    <span id="audioCurrentTime" class="audio-time-label">0:00</span>
                    <input type="range" id="audioSeekBar" class="audio-seek-bar" min="0" max="100" value="0" step="0.1"
                           oninput="App.seekTo(this.value)"
                           onmousedown="App._seeking = true"
                           onmouseup="App._seeking = false">
                    <span id="audioDuration" class="audio-time-label">0:00</span>
                </div>

                <!-- Bottom Row: Controls -->
                <div class="audio-controls-row">
                    <!-- Speed Down -->
                    <button onclick="App.speedDown()" class="audio-ctrl-btn" title="Speed Down (-)">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12H9"></path></svg>
                    </button>

                    <!-- Speed Badge -->
                    <span id="audioSpeedBadge" class="audio-speed-badge" title="Playback speed">1.0×</span>

                    <!-- Speed Up -->
                    <button onclick="App.speedUp()" class="audio-ctrl-btn" title="Speed Up (+)">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v12m6-6H6"></path></svg>
                    </button>

                    <div class="audio-ctrl-divider"></div>

                    <!-- Rewind 10s -->
                    <button onclick="App.seekBackward(10)" class="audio-ctrl-btn" title="Rewind 10s (←)">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z"></path></svg>
                    </button>

                    <!-- Play/Pause & Buffering -->
                    <button id="audioPlayPauseBtn" onclick="App.togglePlayPause()" class="audio-play-btn relative" title="Play/Pause (Space)">
                        <svg id="playIcon" class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
                        <svg id="pauseIcon" class="w-6 h-6 hidden" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"></path></svg>
                        <div id="audioBufferIcon" class="hidden absolute inset-0 flex items-center justify-center">
                            ${ThinkingLoader.inline('listening', '')}
                        </div>
                    </button>

                    <!-- Dedicated Stop Button immediately beside Play/Pause -->
                    <button id="audioStopBtn" onclick="App.stopAudio()" class="audio-ctrl-btn" title="Stop">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"></path></svg>
                    </button>

                    <!-- Forward 10s -->
                    <button onclick="App.seekForward(10)" class="audio-ctrl-btn" title="Forward 10s (→)">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z"></path></svg>
                    </button>

                    <div class="audio-ctrl-divider"></div>

                    <!-- Keyboard hint -->
                    <span class="audio-hint">Hover for keyboard shortcuts</span>
                </div>
            </div>

            <!-- Download Modal -->
            <div id="downloadModal" class="fixed inset-0 bg-slate-900/50 z-50 hidden flex items-center justify-center backdrop-blur-sm" onclick="if(event.target === this) App.toggleDownloadModal(false)">
                <div class="bg-white rounded-lg shadow-xl border border-slate-200 p-6 w-full max-w-sm" onclick="event.stopPropagation()">
                    <h3 class="text-lg font-semibold text-slate-900 mb-4">Download Transcript</h3>
                    


                    <div class="flex items-center justify-end gap-3">
                        <button onclick="App.toggleDownloadModal(false)" class="text-slate-600 hover:text-slate-900 text-sm font-medium px-4 py-2">
                            Cancel
                        </button>
                        <button id="downloadTranscriptBtn" onclick="App.downloadTranscript(this)" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md shadow-sm transition flex items-center justify-center gap-2">
                            <span>Download DOCX</span>
                        </button>
                    </div>
                </div>
            </div>
            <!-- Email Modal -->
            <div id="emailModal" class="fixed inset-0 bg-slate-900/50 z-50 hidden flex items-center justify-center backdrop-blur-sm" onclick="if(event.target === this) App.toggleEmailModal(false)">
                <div class="bg-white rounded-lg shadow-xl border border-slate-200 p-6 w-full max-w-sm" onclick="event.stopPropagation()">
                    <h3 class="text-lg font-semibold text-slate-900 mb-4">Email Transcript</h3>
                    
                    <div class="mb-6 space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                            <input type="email" id="emailInput" class="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="recipient@example.com">
                        </div>

                    </div>

                    <div class="flex items-center justify-end gap-3">
                        <button onclick="App.toggleEmailModal(false)" class="text-slate-600 hover:text-slate-900 text-sm font-medium px-4 py-2">
                            Cancel
                        </button>
                        <button id="sendEmailBtn" onclick="App.sendEmail(document.getElementById('emailInput').value)" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md shadow-sm transition">
                            Send Email
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `,

    JobRow: (job, isTrash, showMenu, serialNumber) => {
        const statusColors = {
            'UPLOADED': 'bg-slate-100 text-slate-700',
            'QUEUED': 'bg-yellow-50 text-yellow-700 border-yellow-200',
            'PROCESSING': 'bg-blue-50 text-blue-700 border-blue-200',
            'TRANSCRIBING': 'bg-purple-50 text-purple-700 border-purple-200',
            'COMPLETED': 'bg-green-50 text-green-700 border-green-200',
            'FAILED': 'bg-red-50 text-red-700 border-red-200',
            'TRASHED': 'bg-slate-100 text-slate-400 border-slate-200'
        };
        const badgeClass = statusColors[job.status] || statusColors['UPLOADED'];

        // Format duration
        const formatDuration = (seconds) => {
            if (!seconds && seconds !== 0) return '—';
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = seconds % 60;
            if (h > 0) {
                return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            }
            return `${m}:${s.toString().padStart(2, '0')}`;
        };

        const menuHTML = showMenu ? `
            <div class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-slate-100 actions-menu animate-in fade-in zoom-in duration-200">
                <div class="py-1">
                    ${isTrash ? `
                        <button onclick="event.stopPropagation(); App.restoreJob('${job.id}')" class="text-left w-full block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Restore</button>
                        <button onclick="event.stopPropagation(); App.deleteJobPermanent('${job.id}')" class="text-left w-full block px-4 py-2 text-sm text-red-600 hover:bg-red-50">Delete Permanently</button>
                    ` : `
                        ${(App._activeDownloads && App._activeDownloads.has('job-audio-' + job.id)) ? `
                            <button id="downloadJobAudioBtn-${job.id}" disabled class="text-left w-full block px-4 py-2 text-sm text-slate-400 cursor-not-allowed">
                                <span class="flex items-center gap-2">
                                    ${ThinkingLoader.inline('working', 'Preparing…')}
                                </span>
                            </button>
                        ` : `
                            <button id="downloadJobAudioBtn-${job.id}" onclick="event.stopPropagation(); App.downloadJobAudio('${job.id}', null, this)" class="text-left w-full block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                <span class="flex items-center gap-2">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                    Download Audio
                                </span>
                            </button>
                        `}
                        <button onclick="event.stopPropagation(); App.deleteJob('${job.id}')" class="text-left w-full block px-4 py-2 text-sm text-red-600 hover:bg-red-50">Delete</button>
                    `}
                </div>
            </div>
        ` : '';

        return `
            <tr class="hover:bg-slate-50 transition cursor-pointer group relative" onclick="${job.status === 'COMPLETED' ? `App.openTranscript('${job.id}')` : ''}">
                <td class="px-4 py-4 text-center">
                    <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-xs font-bold text-slate-500 tabular-nums">${serialNumber}</span>
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <div class="bg-slate-100 p-2 rounded text-slate-500">
                             <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 3-2 3-2 3 2zm0 0v-8"></path></svg>
                        </div>
                        <span class="font-medium text-slate-900 group-hover:text-blue-600 transition">${job.original_filename}</span>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeClass}">
                        ${(job.status === 'PROCESSING' || job.status === 'TRANSCRIBING')
                            ? ThinkingLoader.inline('solving', '')
                            : (job.status === 'QUEUED'
                                ? ThinkingLoader.inline('connecting', '')
                                : '')}
                        <span>${job.status}</span>
                    </span>
                </td>
                <td class="px-6 py-4 text-slate-500 text-sm tabular-nums">
                    <div class="flex items-center gap-1.5">
                        <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        ${formatDuration(job.duration_seconds)}
                    </div>
                </td>
                <td class="px-6 py-4 text-slate-500 text-sm">
                    ${new Date(job.created_at).toLocaleDateString('en-GB', { timeZone: 'Europe/Paris' })}
                </td>
                <td class="px-6 py-4 text-right relative">
                    <button onclick="App.toggleActions(event, '${job.id}')" class="actions-menu-btn text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                    </button>
                    ${menuHTML}
                </td>
            </tr>
        `;
    },

    // =====================================================
    // TunAIde Enhanced Ledger & Client Details Components
    // =====================================================

    RichTextEditor: (id, initialContent = '', placeholder = 'Enter remarks here...') => {
        return `
        <div class="rich-text-editor border border-slate-300 rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 shadow-xs">
            <div class="rich-text-toolbar bg-slate-100/90 border-b border-slate-200 px-2 py-1.5 flex flex-wrap items-center gap-1 text-slate-700">
                <button type="button" onmousedown="event.preventDefault(); App.execRichCommand('${id}', 'bold')" title="Bold" class="px-2 py-1 text-xs font-bold hover:bg-slate-200 hover:text-slate-900 rounded transition">B</button>
                <button type="button" onmousedown="event.preventDefault(); App.execRichCommand('${id}', 'italic')" title="Italic" class="px-2 py-1 text-xs font-serif italic hover:bg-slate-200 hover:text-slate-900 rounded transition">I</button>
                <button type="button" onmousedown="event.preventDefault(); App.execRichCommand('${id}', 'underline')" title="Underline" class="px-2 py-1 text-xs underline hover:bg-slate-200 hover:text-slate-900 rounded transition">U</button>
                <span class="w-px h-4 bg-slate-300 mx-1"></span>
                <button type="button" onmousedown="event.preventDefault(); App.execRichCommand('${id}', 'insertUnorderedList')" title="Bullet List" class="px-2 py-1 text-xs hover:bg-slate-200 hover:text-slate-900 rounded transition flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                </button>
                <button type="button" onmousedown="event.preventDefault(); App.execRichCommand('${id}', 'insertOrderedList')" title="Numbered List" class="px-2 py-1 text-xs hover:bg-slate-200 hover:text-slate-900 rounded transition flex items-center gap-1">
                    <span class="font-mono text-[11px] font-bold">1.</span>
                </button>
                <span class="w-px h-4 bg-slate-300 mx-1"></span>
                <button type="button" onmousedown="event.preventDefault(); App.execRichCommand('${id}', 'formatBlock', '<p>')" title="Paragraph" class="px-2 py-1 text-xs hover:bg-slate-200 hover:text-slate-900 rounded transition">P</button>
                <button type="button" onmousedown="event.preventDefault(); App.execRichCommand('${id}', 'formatBlock', '<h3>')" title="Heading" class="px-2 py-1 text-xs font-semibold hover:bg-slate-200 hover:text-slate-900 rounded transition">H3</button>
                <button type="button" onmousedown="event.preventDefault(); App.execRichCommand('${id}', 'removeFormat')" title="Clear Formatting" class="px-2 py-1 text-xs text-slate-500 hover:bg-slate-200 hover:text-slate-800 rounded transition">Clear</button>
            </div>
            <div 
                id="${id}" 
                contenteditable="true" 
                class="rich-text-content prose prose-sm max-w-none p-3.5 min-h-[140px] text-slate-800 focus:outline-none"
                data-placeholder="${App.escapeHtml(placeholder)}"
            >${initialContent || ''}</div>
        </div>
        `;
    },

    getPriorityBadge: (priority) => {
        const p = (priority || 'Normal').trim();
        if (p === 'Urgent') {
            return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300" title="Urgent Priority">
                <svg class="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                Urgent
            </span>`;
        }
        if (p === 'Very Urgent') {
            return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300" title="Very Urgent Priority">
                <svg class="w-3.5 h-3.5 text-orange-600" fill="currentColor" viewBox="0 0 24 24"><path d="M17.66 11.2C17.43 10.9 17.15 10.64 16.89 10.38C16.22 9.78 15.46 9.35 14.82 8.72C13.33 7.26 13 4.85 13.95 3C13 3.23 12.17 3.75 11.46 4.32C8.87 6.4 7.85 10.07 9.07 13.22C9.11 13.32 9.15 13.42 9.15 13.55C9.15 13.77 9 13.97 8.8 14.05C8.57 14.15 8.33 14.09 8.14 13.93C8.08 13.88 8.04 13.83 8 13.76C6.87 12.33 6.69 10.28 7.45 8.64C5.78 10 4.87 12.3 5.03 14.47C5.2 16.74 6.67 18.77 8.67 19.66C11.55 20.95 15.03 20.07 16.96 17.61C18.61 15.5 18.88 12.43 17.66 11.2Z"/></svg>
                Very Urgent
            </span>`;
        }
        if (p === 'Critical') {
            return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300 ring-2 ring-red-400/30" title="Critical Priority">
                <svg class="w-3.5 h-3.5 text-red-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Critical
            </span>`;
        }
        if (p === 'Rework') {
            return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300" title="Rework Priority">
                <svg class="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                Rework
            </span>`;
        }
        // Normal priority: standard appearance, no warning indicator
        return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">Normal</span>`;
    },

    getStatusBadge: (status) => {
        const s = (status || 'Inwarded').trim();
        if (s === 'Ready to delivered') {
            return `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300/60" title="Ready to delivered">
                <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                Ready to delivered
            </span>`;
        }
        if (s === 'On Process') {
            return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">On Process</span>`;
        }
        if (s === 'Delivered') {
            return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800">Delivered</span>`;
        }
        if (s === 'Closed') {
            return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">Closed</span>`;
        }
        return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">Inwarded</span>`;
    },

    getRefBadge: (ref) => {
        if (!ref) return '<span class="text-slate-400">—</span>';
        return `<span class="font-mono font-bold text-xs px-2.5 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs">${App.escapeHtml(ref)}</span>`;
    },

    getServiceTypeBadge: (st) => {
        if (!st) return '<span class="text-slate-400">—</span>';
        return `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">${App.escapeHtml(st)}</span>`;
    },

    formatDisplayDate: (dateStr) => {
        if (!dateStr || dateStr === '—') return '—';
        const clean = String(dateStr).split('T')[0];
        const parts = clean.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
    },

    LedgerView: (clients = [], totalCount = 0, searchQuery = '', loading = false) => {
        const countText = totalCount === 1 ? '1 client' : `${totalCount} clients`;
        const serviceTypes = ["CONSEIL", "OFPRA", "RECOURS", "TA", "REEXAIN", "RERECOURS"];
        const priorities = ["Normal", "Urgent", "Very Urgent", "Critical", "Rework"];
        const statuses = ["Inwarded", "On Process", "Ready to delivered", "Delivered", "Closed"];
        const users = App.state.assignableUsers || [];

        const hasActiveFilters = !!(
            App.state.ledgerSearchQuery ||
            App.state.ledgerServiceTypeFilter ||
            App.state.ledgerPriorityFilter ||
            App.state.ledgerStatusFilter ||
            App.state.ledgerAssigneeFilter
        );
        
        return `
        <div class="pl-64 min-h-screen bg-slate-50">
            <div class="max-w-7xl mx-auto p-8">
                <!-- Header with Title, Count, and New Entry Button -->
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <div class="flex items-center gap-3">
                            <h2 class="text-2xl font-bold text-slate-900 tracking-tight">Ledger</h2>
                            <span id="ledgerClientCountBadge" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                ${countText}
                            </span>
                        </div>
                        <p class="text-sm text-slate-500 mt-1">Manage client records, workflow status, and associated files</p>
                    </div>

                    <div class="flex items-center gap-3">
                        <button 
                            id="newEntryBtn" 
                            onclick="App.openNewClientModal()" 
                            class="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 hover:shadow-md transition shadow-sm whitespace-nowrap"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
                            + New Entry
                        </button>
                    </div>
                </div>

                <!-- Filter & Search Toolbar Card -->
                <div class="bg-white rounded-xl shadow-xs border border-slate-200 p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div class="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                        <!-- Search Box -->
                        <div class="relative w-64">
                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                            </div>
                            <input 
                                type="text" 
                                id="ledgerSearchInput"
                                value="${App.escapeHtml(App.state.ledgerSearchQuery || '')}"
                                placeholder="Search Ref #, name, phone..."
                                oninput="App.onLedgerSearch(this.value)"
                                class="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            >
                            ${App.state.ledgerSearchQuery ? `
                                <button onclick="App.clearLedgerSearch()" class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                </button>
                            ` : ''}
                        </div>

                        <!-- Service Type Filter -->
                        <select 
                            id="ledgerFilterServiceType" 
                            onchange="App.onLedgerFilterChange('service_type', this.value)"
                            class="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                        >
                            <option value="">All Service Types</option>
                            ${serviceTypes.map(st => `<option value="${st}" ${App.state.ledgerServiceTypeFilter === st ? 'selected' : ''}>${st}</option>`).join('')}
                        </select>

                        <!-- Priority Filter -->
                        <select 
                            id="ledgerFilterPriority" 
                            onchange="App.onLedgerFilterChange('priority', this.value)"
                            class="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                        >
                            <option value="">All Priorities</option>
                            ${priorities.map(p => `<option value="${p}" ${App.state.ledgerPriorityFilter === p ? 'selected' : ''}>${p}</option>`).join('')}
                        </select>

                        <!-- Status Filter -->
                        <select 
                            id="ledgerFilterStatus" 
                            onchange="App.onLedgerFilterChange('status', this.value)"
                            class="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                        >
                            <option value="">All Statuses</option>
                            ${statuses.map(s => `<option value="${s}" ${App.state.ledgerStatusFilter === s ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>

                        <!-- Assigned To Filter -->
                        <select 
                            id="ledgerFilterAssignee" 
                            onchange="App.onLedgerFilterChange('assigned_to_id', this.value)"
                            class="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                        >
                            <option value="">All Assignees</option>
                            ${users.map(u => `<option value="${u.id}" ${App.state.ledgerAssigneeFilter === u.id ? 'selected' : ''}>${App.escapeHtml(u.username)}</option>`).join('')}
                        </select>
                    </div>

                    ${hasActiveFilters ? `
                        <button 
                            onclick="App.clearAllLedgerFilters()" 
                            class="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition flex items-center gap-1"
                        >
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            Reset Filters
                        </button>
                    ` : ''}
                </div>

                <!-- Ledger Table Card -->
                <div class="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left">
                            <thead class="bg-slate-50 text-[11px] uppercase text-slate-500 font-bold border-b border-slate-200">
                                <tr>
                                    <th class="px-5 py-3.5 rounded-tl-xl w-32">Ref #</th>
                                    <th class="px-5 py-3.5">Client Name</th>
                                    <th class="px-5 py-3.5">Primary Phone</th>
                                    <th class="px-5 py-3.5">Service Type</th>
                                    <th class="px-5 py-3.5">Priority</th>
                                    <th class="px-5 py-3.5">Status</th>
                                    <th class="px-5 py-3.5">Assigned To</th>
                                    <th class="px-5 py-3.5">Date</th>
                                    <th class="px-5 py-3.5 rounded-tr-xl text-right w-20">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="ledgerTableBody" class="divide-y divide-slate-100 text-sm">
                                ${loading ? `
                                    <tr>
                                        <td colspan="9" class="py-16 text-center">
                                            ${ThinkingLoader.section('weaving', 'Loading client records…')}
                                        </td>
                                    </tr>
                                ` : (clients.length === 0 ? Components.LedgerEmptyState(hasActiveFilters) : clients.map(client => Components.LedgerRow(client, App.state.editingClientId === client.id)).join(''))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- New Client Modal Container -->
        <div id="newClientModalContainer"></div>
        <!-- Global Confirm Modal Container -->
        <div id="ledgerConfirmModalContainer"></div>
        <!-- Family Dynamic Item Modal Container -->
        <div id="familyModalContainer"></div>
        `;
    },

    LedgerEmptyState: (hasSearch = false) => `
        <tr>
            <td colspan="9" class="py-16 text-center">
                <div class="max-w-sm mx-auto flex flex-col items-center">
                    <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                    </div>
                    <h3 class="text-base font-semibold text-slate-900">${hasSearch ? 'No matching clients found' : 'No client entries yet'}</h3>
                    <p class="text-xs text-slate-500 mt-1 mb-4">${hasSearch ? 'Try adjusting your search criteria or clear the filters.' : 'Get started by creating your first client record in the ledger.'}</p>
                    ${hasSearch ? `
                        <button onclick="App.clearAllLedgerFilters()" class="px-3.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition">Clear All Filters</button>
                    ` : `
                        <button onclick="App.openNewClientModal()" class="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition">+ New Entry</button>
                    `}
                </div>
            </td>
        </tr>
    `,

    LedgerRow: (client, isEditing = false) => {
        const fullName = client.full_name || `${(client.surname || '').toUpperCase()} ${client.first_name || ''}`.trim() || '—';
        const phone = client.phone_number || '—';
        const serviceType = client.service_type || '—';
        const priority = client.priority || 'Normal';
        const statusVal = client.status || 'Inwarded';
        const assignedName = client.assigned_to_name || '—';
        const dateVal = client.client_date || (client.created_at ? client.created_at.split('T')[0] : '—');

        // Priority warning border on row
        let priorityBorderClass = '';
        if (priority === 'Urgent') priorityBorderClass = 'border-l-4 border-l-amber-500';
        else if (priority === 'Very Urgent') priorityBorderClass = 'border-l-4 border-l-orange-500';
        else if (priority === 'Critical') priorityBorderClass = 'border-l-4 border-l-red-500 bg-red-50/15';
        else if (priority === 'Rework') priorityBorderClass = 'border-l-4 border-l-purple-500';

        // Ready to delivered highlight
        let statusHighlightClass = '';
        if (statusVal === 'Ready to delivered') {
            statusHighlightClass = 'bg-emerald-50/40 ring-1 ring-inset ring-emerald-200';
        }

        if (isEditing) {
            const serviceTypes = ["CONSEIL", "OFPRA", "RECOURS", "TA", "REEXAIN", "RERECOURS"];
            const priorities = ["Normal", "Urgent", "Very Urgent", "Critical", "Rework"];
            const statuses = ["Inwarded", "On Process", "Ready to delivered", "Delivered", "Closed"];
            const users = App.state.assignableUsers || [];

            return `
            <tr data-client-id="${client.id}" class="bg-blue-50/70 border-l-4 border-blue-600 transition">
                <td class="px-5 py-3 font-mono text-xs font-bold text-slate-800">
                    ${App.escapeHtml(client.reference_number || '—')}
                </td>
                <td class="px-5 py-3">
                    <div class="space-y-1">
                        <div class="flex gap-2">
                            <input 
                                type="text" 
                                id="edit-sn-${client.id}" 
                                value="${App.escapeHtml(client.surname || '')}" 
                                placeholder="SURNAME" 
                                class="px-2.5 py-1 text-xs uppercase bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none w-28 font-semibold text-slate-900 shadow-xs"
                                oninput="this.value = this.value.toUpperCase(); App.updateInlineNamePreview('${client.id}')"
                            >
                            <input 
                                type="text" 
                                id="edit-fn-${client.id}" 
                                value="${App.escapeHtml(client.first_name || '')}" 
                                placeholder="First Name" 
                                class="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none w-28 font-semibold text-slate-900 shadow-xs"
                                oninput="App.updateInlineNamePreview('${client.id}')"
                            >
                        </div>
                        <div class="text-[11px] text-slate-500">
                            Derived: <span id="edit-preview-${client.id}" class="font-bold text-blue-700">${App.escapeHtml(fullName)}</span>
                        </div>
                    </div>
                </td>
                <td class="px-5 py-3">
                    <input 
                        type="text" 
                        id="edit-phone-${client.id}" 
                        value="${App.escapeHtml(client.phone_number || '')}" 
                        placeholder="0763796000" 
                        class="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none w-32 tabular-nums text-slate-800 shadow-xs"
                    >
                </td>
                <td class="px-5 py-3">
                    <select id="edit-st-${client.id}" class="px-2 py-1 text-xs bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 text-slate-800 shadow-xs">
                        <option value="">None</option>
                        ${serviceTypes.map(st => `<option value="${st}" ${client.service_type === st ? 'selected' : ''}>${st}</option>`).join('')}
                    </select>
                </td>
                <td class="px-5 py-3">
                    <select id="edit-pr-${client.id}" class="px-2 py-1 text-xs bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 text-slate-800 shadow-xs">
                        ${priorities.map(p => `<option value="${p}" ${client.priority === p ? 'selected' : ''}>${p}</option>`).join('')}
                    </select>
                </td>
                <td class="px-5 py-3">
                    <select id="edit-status-${client.id}" class="px-2 py-1 text-xs bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 text-slate-800 shadow-xs">
                        ${statuses.map(s => `<option value="${s}" ${client.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </td>
                <td class="px-5 py-3">
                    <select id="edit-assignee-${client.id}" class="px-2 py-1 text-xs bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 text-slate-800 shadow-xs">
                        <option value="">Unassigned</option>
                        ${users.map(u => `<option value="${u.id}" ${client.assigned_to_id === u.id ? 'selected' : ''}>${App.escapeHtml(u.username)}</option>`).join('')}
                    </select>
                </td>
                <td class="px-5 py-3">
                    <input 
                        type="date" 
                        id="edit-date-${client.id}" 
                        value="${client.client_date || (client.created_at ? client.created_at.split('T')[0] : '')}" 
                        class="px-2 py-1 text-xs bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 tabular-nums text-slate-800 shadow-xs"
                    >
                </td>
                <td class="px-5 py-3 text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-1.5">
                        <button 
                            id="saveInlineBtn-${client.id}"
                            onclick="App.saveInlineEdit('${client.id}')" 
                            title="Save Changes" 
                            class="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition shadow-xs"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                        </button>
                        <button 
                            onclick="App.cancelInlineEdit('${client.id}')" 
                            title="Cancel" 
                            class="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md transition"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                </td>
            </tr>
            `;
        }

        return `
        <tr 
            data-client-id="${client.id}" 
            class="hover:bg-blue-50/40 transition cursor-pointer group ${priorityBorderClass} ${statusHighlightClass}" 
            onclick="if(!event.target.closest('button') && !event.target.closest('.action-menu-dropdown')) App.openClientProfile('${client.id}')"
        >
            <td class="px-5 py-4 whitespace-nowrap">
                ${Components.getRefBadge(client.reference_number)}
            </td>
            <td class="px-5 py-4">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition">
                        ${(client.first_name || 'C')[0]}
                    </div>
                    <div>
                        <span class="font-semibold text-slate-900 group-hover:text-blue-600 transition">${App.escapeHtml(fullName)}</span>
                        ${client.email ? `<p class="text-xs text-slate-400 mt-0.5">${App.escapeHtml(client.email)}</p>` : ''}
                    </div>
                </div>
            </td>
            <td class="px-5 py-4 text-slate-700 tabular-nums text-xs whitespace-nowrap">
                ${App.escapeHtml(phone)}
            </td>
            <td class="px-5 py-4 whitespace-nowrap">
                ${Components.getServiceTypeBadge(serviceType)}
            </td>
            <td class="px-5 py-4 whitespace-nowrap">
                ${Components.getPriorityBadge(priority)}
            </td>
            <td class="px-5 py-4 whitespace-nowrap">
                ${Components.getStatusBadge(statusVal)}
            </td>
            <td class="px-5 py-4 text-slate-700 text-xs whitespace-nowrap">
                ${App.escapeHtml(assignedName)}
            </td>
            <td class="px-5 py-4 text-slate-600 text-xs tabular-nums whitespace-nowrap">
                ${App.escapeHtml(Components.formatDisplayDate(dateVal))}
            </td>
            <td class="px-5 py-4 text-right whitespace-nowrap" onclick="event.stopPropagation()">
                <div class="relative inline-block text-left">
                    <button 
                        onclick="App.toggleLedgerActionMenu('${client.id}', event)" 
                        class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                        title="Actions"
                    >
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                    </button>
                    <div 
                        id="ledgerMenu-${client.id}" 
                        class="hidden absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-30 action-menu-dropdown text-left"
                    >
                        <button 
                            onclick="App.openClientProfile('${client.id}')" 
                            class="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition"
                        >
                            <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                            View Details
                        </button>
                        <button 
                            onclick="App.startInlineEdit('${client.id}', event)" 
                            class="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition"
                        >
                            <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            Edit
                        </button>
                        <button 
                            onclick="App.confirmDeleteClient('${client.id}', '${App.escapeHtml(fullName).replace(/'/g, "\\'")}', event)" 
                            class="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2.5 border-t border-slate-100 transition"
                        >
                            <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            Delete
                        </button>
                    </div>
                </div>
            </td>
        </tr>
        `;
    },

    NewClientModal: () => {
        const todayStr = new Date().toISOString().split('T')[0];
        const users = App.state.assignableUsers || [];

        return `
        <div id="newClientModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto" onclick="if(event.target === this) App.closeNewClientModal()">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 my-8" onclick="event.stopPropagation()">
                <!-- Modal Header -->
                <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
                        </div>
                        <div>
                            <h3 class="text-lg font-bold text-slate-900">New Client Entry</h3>
                            <p class="text-xs text-slate-500">Create a client record. Ref # is automatically generated upon submission.</p>
                        </div>
                    </div>
                    <button onclick="App.closeNewClientModal()" class="text-slate-400 hover:text-slate-600 transition p-2 hover:bg-slate-200 rounded-full">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <form id="newClientForm" onsubmit="event.preventDefault(); App.submitNewClient();" class="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                    <div id="newClientError" class="hidden p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700 flex items-center gap-2"></div>

                    <!-- 1. Header / Workflow Section -->
                    <div class="p-5 bg-slate-50/60 rounded-xl border border-slate-200 space-y-4">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div class="flex items-center gap-3 text-xs">
                                <span class="flex items-center gap-1 font-semibold text-blue-700">
                                    <span class="text-blue-600 font-bold">*</span> Mandatory
                                </span>
                                <span class="flex items-center gap-1 text-slate-500">
                                    <span class="text-red-500 font-bold">*</span> Standard
                                </span>
                            </div>
                            <span class="text-[11px] text-blue-600 font-medium">Ref # auto-generated (SURNAME 1st 3 chars + phone last 4 digits)</span>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <!-- Ref # (Auto-generated & filled in) -->
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">
                                    Ref # <span class="text-blue-600 font-bold ml-0.5" title="Mandatory">*</span>
                                </label>
                                <input 
                                    type="text" 
                                    id="newClientRefNumber" 
                                    readonly 
                                    placeholder="Auto (e.g. SRI6000)" 
                                    class="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-100 border border-slate-300 rounded-lg text-blue-700 cursor-not-allowed shadow-inner"
                                >
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">Date <span class="text-red-500">*</span></label>
                                <input type="date" id="newClientDate" value="${todayStr}" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">Service Type <span class="text-red-500">*</span></label>
                                <select id="newClientServiceType" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
                                    <option value="CONSEIL">CONSEIL</option>
                                    <option value="OFPRA" selected>OFPRA</option>
                                    <option value="RECOURS">RECOURS</option>
                                    <option value="TA">TA</option>
                                    <option value="REEXAIN">REEXAIN</option>
                                    <option value="RERECOURS">RERECOURS</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                                <select id="newClientPriority" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
                                    <option value="Normal" selected>Normal</option>
                                    <option value="Urgent">Urgent</option>
                                    <option value="Very Urgent">Very Urgent</option>
                                    <option value="Critical">Critical</option>
                                    <option value="Rework">Rework</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                                <select id="newClientStatus" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
                                    <option value="Inwarded" selected>Inwarded</option>
                                    <option value="On Process">On Process</option>
                                    <option value="Ready to delivered">Ready to delivered</option>
                                    <option value="Delivered">Delivered</option>
                                    <option value="Closed">Closed</option>
                                </select>
                            </div>
                            <div class="md:col-span-2 lg:col-span-5">
                                <label class="block text-xs font-semibold text-slate-700 mb-1">Assigned To</label>
                                <select id="newClientAssignedTo" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
                                    <option value="">Unassigned</option>
                                    ${users.map(u => `<option value="${u.id}">${App.escapeHtml(u.username)}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- 2. Personal Information Card -->
                    <div class="border border-slate-200 rounded-xl p-5 bg-white space-y-4">
                        <div class="flex items-center gap-2 pb-2 border-b border-slate-100">
                            <span class="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">A</span>
                            <h4 class="text-sm font-bold text-slate-900">Personal Information</h4>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">Surname <span class="text-blue-600 font-bold ml-0.5" title="Mandatory">*</span></label>
                                <input 
                                    type="text" 
                                    id="newClientSurname" 
                                    required 
                                    placeholder="e.g. SRIKARAN" 
                                    oninput="this.value = this.value.toUpperCase(); this.value = this.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s\-']/g, ''); App.updateNewClientPreview(); App.updateNewClientRefPreview();"
                                    class="w-full px-3 py-2 text-xs uppercase font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">First Name <span class="text-blue-600 font-bold ml-0.5" title="Mandatory">*</span></label>
                                <input 
                                    type="text" 
                                    id="newClientFirstName" 
                                    required 
                                    placeholder="e.g. Sivakumar" 
                                    oninput="this.value = this.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s\-']/g, ''); App.updateNewClientPreview();"
                                    class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-500 mb-1">Derived Full Name <span class="text-blue-600 font-bold ml-0.5" title="Mandatory">*</span></label>
                                <div class="px-3 py-2 text-xs font-bold text-blue-900 bg-blue-50/70 border border-blue-200 rounded-lg truncate min-h-[36px] flex items-center" id="newClientDerivedPreview">
                                    —
                                </div>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">Date of Birth <span class="text-blue-600 font-bold ml-0.5" title="Mandatory">*</span></label>
                                <input type="date" id="newClientDob" required max="${todayStr}" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">Place of Birth <span class="text-red-500">*</span></label>
                                <input type="text" id="newClientPlaceOfBirth" placeholder="e.g. Jaffna" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">Birth Place <span class="text-red-500">*</span></label>
                                <input type="text" id="newClientBirthPlace" placeholder="e.g. Northern Province" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">Nationality</label>
                                <input type="text" id="newClientNationality" value="SRI LANKAISE" placeholder="SRI LANKAISE" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                                <input type="text" id="newClientPersonalCountry" placeholder="e.g. Sri Lanka" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">SP <span class="text-red-500">*</span></label>
                                <input type="date" id="newClientSp" max="${todayStr}" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">EF <span class="text-red-500">*</span></label>
                                <input type="date" id="newClientEf" max="${todayStr}" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            </div>
                            <!-- Gender (Single-selection checkbox-style) -->
                            <div class="space-y-1">
                                <label class="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                                <div class="flex flex-wrap items-center gap-2 pt-0.5">
                                    <label class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700 transition">
                                        <input type="radio" name="newClientGender" value="Male" class="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500">
                                        <span>Male</span>
                                    </label>
                                    <label class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700 transition">
                                        <input type="radio" name="newClientGender" value="Female" class="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500">
                                        <span>Female</span>
                                    </label>
                                    <label class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700 transition">
                                        <input type="radio" name="newClientGender" value="Not Revealed" checked class="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500">
                                        <span>Not Revealed</span>
                                    </label>
                                </div>
                            </div>
                            <!-- Marital Status (Single-selection checkbox-style) -->
                            <div class="space-y-1">
                                <label class="block text-xs font-semibold text-slate-700 mb-1">Marital Status</label>
                                <div class="flex flex-wrap items-center gap-2 pt-0.5">
                                    <label class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700 transition">
                                        <input type="radio" name="newClientMaritalStatus" value="Single" checked class="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500">
                                        <span>Single</span>
                                    </label>
                                    <label class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700 transition">
                                        <input type="radio" name="newClientMaritalStatus" value="Married" class="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500">
                                        <span>Married</span>
                                    </label>
                                    <label class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700 transition">
                                        <input type="radio" name="newClientMaritalStatus" value="Separated" class="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500">
                                        <span>Separated</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 3. Service Information Card -->
                    <div class="border border-slate-200 rounded-xl p-5 bg-white space-y-4">
                        <div class="flex items-center gap-2 pb-2 border-b border-slate-100">
                            <span class="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">B</span>
                            <h4 class="text-sm font-bold text-slate-900">Service Information</h4>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">Numéro OFPRA</label>
                                <input type="text" id="newClientOfpra" placeholder="OFPRA identifier" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">Numéro APS (10 digits)</label>
                                <input type="text" id="newClientAps" maxlength="10" placeholder="10 numeric digits" oninput="this.value = this.value.replace(/\D/g, '')" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 tabular-nums">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">Delivered By</label>
                                <input type="text" id="newClientDeliveredBy" placeholder="Issuing authority" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">From Date</label>
                                <input type="date" id="newClientFrom" max="${todayStr}" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">To Date</label>
                                <input type="date" id="newClientTo" max="${todayStr}" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            </div>
                        </div>
                    </div>

                    <!-- 4. Contact Information Card -->
                    <div class="border border-slate-200 rounded-xl p-5 bg-white space-y-4">
                        <div class="flex items-center gap-2 pb-2 border-b border-slate-100">
                            <span class="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">C</span>
                            <h4 class="text-sm font-bold text-slate-900">Contact Information</h4>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">Primary Phone <span class="text-blue-600 font-bold ml-0.5" title="Mandatory">*</span></label>
                                <input type="text" id="newClientPhone" required maxlength="10" placeholder="0763796000 (10 digits starts with 0)" oninput="this.value = this.value.replace(/\D/g, ''); App.updateNewClientRefPreview();" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 tabular-nums">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">Secondary Phone</label>
                                <input type="text" id="newClientSecPhone" maxlength="10" placeholder="0XXXXXXXXX (optional)" oninput="this.value = this.value.replace(/\D/g, '')" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 tabular-nums">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                                <input type="email" id="newClientEmail" placeholder="client@example.com" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div class="md:col-span-2 lg:col-span-3">
                                <label class="block text-xs font-semibold text-slate-700 mb-1">Address <span class="text-red-500">*</span></label>
                                <input type="text" id="newClientAddress" placeholder="Street address" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">Ville <span class="text-red-500">*</span></label>
                                <input type="text" id="newClientVille" placeholder="City / Ville" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">Postal Code <span class="text-red-500">*</span></label>
                                <input type="text" id="newClientPostalCode" maxlength="5" placeholder="75001 (5 digits)" oninput="this.value = this.value.replace(/\D/g, '')" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 tabular-nums">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                                <input type="text" id="newClientContactCountry" placeholder="France" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            </div>
                        </div>
                    </div>

                    <!-- Modal Actions -->
                    <div class="pt-4 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white py-3">
                        <button 
                            type="button" 
                            onclick="App.closeNewClientModal()" 
                            class="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            id="saveNewClientBtn" 
                            class="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 hover:shadow-md transition shadow-xs flex items-center gap-2"
                        >
                            Save Client Record
                        </button>
                    </div>
                </form>
            </div>
        </div>
        `;
    },

    ClientProfileView: (client, activeSection = null) => {
        if (!client) return '';
        const fullName = client.full_name || `${(client.surname || '').toUpperCase()} ${client.first_name || ''}`.trim() || 'Client Profile';
        const files = client.files || [];
        const isEditing = (sec) => activeSection === sec;

        // Default all cards except header card to collapsed on open
        if (!App.state.collapsedCards) {
            App.state.collapsedCards = {
                'section-A': true,
                'section-B': true,
                'section-C': true,
                'profile-files': true
            };
        }

        const isCollapsed = (cardId) => {
            if (cardId === 'section-A' && (activeSection === 'sectionA' || activeSection === 'personal')) return false;
            if (cardId === 'section-B' && (activeSection === 'sectionB' || activeSection === 'service')) return false;
            if (cardId === 'section-C' && (activeSection === 'sectionC' || activeSection === 'contact')) return false;
            if (!App.state.collapsedCards) return true;
            return App.state.collapsedCards[cardId] !== false;
        };

        const serviceTypes = ["CONSEIL", "OFPRA", "RECOURS", "TA", "REEXAIN", "RERECOURS"];
        const priorities = ["Normal", "Urgent", "Very Urgent", "Critical", "Rework"];
        const statuses = ["Inwarded", "On Process", "Ready to delivered", "Delivered", "Closed"];
        const users = App.state.assignableUsers || [];
        const todayStr = new Date().toISOString().split('T')[0];

        // Clean form-style field renderer (NO TABLES)
        const renderFormField = (label, value, starType = null, colSpan = "") => {
            let starHtml = '';
            if (starType === 'blue' || (starType === true && ['Surname', 'First Name', 'Date of Birth', 'Primary Phone', 'Ref #'].includes(label))) {
                starHtml = ' <span class="text-blue-600 font-bold ml-0.5" title="Mandatory">*</span>';
            } else if (starType === 'red' || starType === true) {
                starHtml = ' <span class="text-red-500">*</span>';
            }
            return `
            <div class="space-y-1 ${colSpan}">
                <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    ${label}${starHtml}
                </label>
                <div class="w-full px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-50/70 border border-slate-200/80 rounded-lg min-h-[36px] flex items-center break-words">
                    ${value ? App.escapeHtml(value) : '<span class="text-slate-400 font-normal">—</span>'}
                </div>
            </div>
            `;
        };

        return `
        <div class="pl-64 min-h-screen bg-slate-50">
            <div class="max-w-5xl mx-auto p-8">
                <!-- Top Navigation Bar -->
                <div class="flex items-center justify-between mb-6">
                    <button 
                        onclick="App.navigateTo('ledger')" 
                        class="p-2 -ml-2 rounded-lg hover:bg-slate-200 text-slate-600 transition flex items-center gap-1.5 text-sm font-semibold"
                        title="Back to Ledger"
                    >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                        Back to Ledger
                    </button>

                    <div class="flex items-center gap-2">
                        <button 
                            id="toggleAllCardsBtn"
                            onclick="App.toggleAllCardsCollapse()"
                            class="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition flex items-center gap-1.5 shadow-2xs"
                            title="Expand or collapse all cards"
                        >
                            <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
                            <span id="toggleAllCardsText">${['section-A', 'section-B', 'section-C', 'profile-files'].some(id => isCollapsed(id)) ? 'Expand All' : 'Collapse All'}</span>
                        </button>
                        <button 
                            onclick="App.confirmDeleteClient('${client.id}', '${App.escapeHtml(fullName).replace(/'/g, "\\'")}')" 
                            class="px-3.5 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition flex items-center gap-1.5"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            Delete Client
                        </button>
                    </div>
                </div>

                <!-- Visual Legend (Blue star = actual mandatory, Red star = standard) -->
                <div class="flex items-center gap-3 text-xs mb-3">
                    <span class="flex items-center gap-1 font-semibold text-blue-700">
                        <span class="text-blue-600 font-bold">*</span> Mandatory
                    </span>
                    <span class="flex items-center gap-1 text-slate-500">
                        <span class="text-red-500 font-bold">*</span> Standard
                    </span>
                </div>

                <!-- 1. Header Card (ONLY the 6 required header fields, labeled with client full name) -->
                <div class="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden mb-6">
                    <div class="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div class="flex items-center gap-2.5">
                            <span class="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                            </span>
                            <h3 class="text-lg font-bold text-slate-900 tracking-tight">${App.escapeHtml(fullName)} <span class="text-blue-600 font-bold ml-0.5" title="Mandatory">*</span></h3>
                        </div>
                        <div>
                            ${isEditing('header') ? `
                                <div class="flex items-center gap-2">
                                    <button onclick="App.cancelProfileSectionEdit('${client.id}')" class="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
                                    <button id="saveHeader-btn" onclick="App.saveProfileSection('${client.id}', 'header')" class="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition shadow-xs">Save</button>
                                </div>
                            ` : `
                                <button onclick="App.startProfileSectionEdit('${client.id}', 'header')" class="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-md transition flex items-center gap-1.5">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                    Edit
                                </button>
                            `}
                        </div>
                    </div>

                    <div class="p-6">
                        ${isEditing('header') ? `
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                                <!-- 1. Ref # (Non-editable) -->
                                <div>
                                    <label class="block text-xs font-semibold text-slate-700 mb-1">Ref # <span class="text-blue-600 font-bold ml-0.5" title="Mandatory">*</span></label>
                                    <input 
                                        type="text" 
                                        value="${App.escapeHtml(client.reference_number || '—')}" 
                                        disabled 
                                        class="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-100 border border-slate-300 rounded-lg text-slate-600 cursor-not-allowed"
                                    >
                                </div>

                                <!-- 2. Date* (Date Picker, Editable, DD/MM/YYYY) -->
                                <div>
                                    <label class="block text-xs font-semibold text-slate-700 mb-1">Date <span class="text-red-500">*</span></label>
                                    <input 
                                        type="date" 
                                        id="secHdr-date" 
                                        value="${client.client_date ? client.client_date.split('T')[0] : todayStr}" 
                                        class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                                    >
                                </div>

                                <!-- 3. Service Type* (Combo Box) -->
                                <div>
                                    <label class="block text-xs font-semibold text-slate-700 mb-1">Service Type <span class="text-red-500">*</span></label>
                                    <select 
                                        id="secHdr-service_type" 
                                        class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                                    >
                                        <option value="">Select Service Type</option>
                                        ${serviceTypes.map(st => `<option value="${st}" ${client.service_type === st ? 'selected' : ''}>${st}</option>`).join('')}
                                    </select>
                                </div>

                                <!-- 4. Priority (Combo Box, default Normal) -->
                                <div>
                                    <label class="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                                    <select 
                                        id="secHdr-priority" 
                                        class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                                    >
                                        ${priorities.map(p => `<option value="${p}" ${(client.priority || 'Normal') === p ? 'selected' : ''}>${p}</option>`).join('')}
                                    </select>
                                </div>

                                <!-- 5. Status (Combo Box, default Inwarded) -->
                                <div>
                                    <label class="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                                    <select 
                                        id="secHdr-status" 
                                        class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                                    >
                                        ${statuses.map(s => `<option value="${s}" ${(client.status || 'Inwarded') === s ? 'selected' : ''}>${s}</option>`).join('')}
                                    </select>
                                </div>

                                <!-- 6. Assigned To (Combo Box) -->
                                <div>
                                    <label class="block text-xs font-semibold text-slate-700 mb-1">Assigned To</label>
                                    <select 
                                        id="secHdr-assigned_to" 
                                        class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                                    >
                                        <option value="">Unassigned</option>
                                        ${users.map(u => `<option value="${u.id}" ${client.assigned_to_id === u.id ? 'selected' : ''}>${App.escapeHtml(u.username)}</option>`).join('')}
                                    </select>
                                </div>
                            </div>
                        ` : `
                            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                                <!-- 1. Ref # (Auto-generated, Non-editable) -->
                                <div class="space-y-1">
                                    <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Ref # <span class="text-blue-600 font-bold ml-0.5" title="Mandatory">*</span></span>
                                    ${Components.getRefBadge(client.reference_number)}
                                </div>

                                <!-- 2. Date* (Date Picker, Editable, display format: DD/MM/YYYY) -->
                                <div class="space-y-1">
                                    <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Date <span class="text-red-500">*</span></span>
                                    <p class="text-sm font-semibold font-mono text-slate-800 tabular-nums">
                                        ${Components.formatDisplayDate(client.client_date || (client.created_at ? client.created_at.split('T')[0] : ''))}
                                    </p>
                                </div>

                                <!-- 3. Service Type* (Combo Box, Required) -->
                                <div class="space-y-1">
                                    <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Service Type <span class="text-red-500">*</span></span>
                                    ${Components.getServiceTypeBadge(client.service_type)}
                                </div>

                                <!-- 4. Priority (Combo Box, Default Normal, indication if not Normal) -->
                                <div class="space-y-1">
                                    <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Priority</span>
                                    ${Components.getPriorityBadge(client.priority || 'Normal')}
                                </div>

                                <!-- 5. Status (Combo Box, Default Inwarded, indication if Ready to delivered) -->
                                <div class="space-y-1">
                                    <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Status</span>
                                    ${Components.getStatusBadge(client.status || 'Inwarded')}
                                </div>

                                <!-- 6. Assigned To (Combo Box, Eligible users) -->
                                <div class="space-y-1">
                                    <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Assigned To</span>
                                    <p class="text-sm font-semibold text-slate-800">
                                        ${client.assigned_to_name ? App.escapeHtml(client.assigned_to_name) : '<span class="text-slate-400 font-normal">—</span>'}
                                    </p>
                                </div>
                            </div>
                        `}
                    </div>
                </div>

                <!-- The 3 Information Cards (Personal, Service, Contact) -->
                <div class="space-y-6">

                    <!-- 2. Personal Information Card (Strictly 11 fields) -->
                    <div id="section-A" class="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden transition-all">
                        <div class="p-5 flex items-center justify-between bg-slate-50/50">
                            <div class="flex items-center gap-2.5">
                                <span class="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">A</span>
                                <h3 class="text-base font-bold text-slate-900">Personal Information</h3>
                            </div>
                            <div class="flex items-center gap-2">
                                ${isEditing('sectionA') || isEditing('personal') ? `
                                    <button onclick="App.cancelProfileSectionEdit('${client.id}')" class="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
                                    <button id="saveSectionA-btn" onclick="App.saveProfileSection('${client.id}', 'sectionA')" class="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition shadow-xs">Save</button>
                                ` : `
                                    <button onclick="App.startProfileSectionEdit('${client.id}', 'sectionA')" class="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-md transition flex items-center gap-1.5">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                        Edit
                                    </button>
                                `}
                                <button 
                                    id="section-A-collapse-btn"
                                    onclick="App.toggleCardCollapse('section-A')"
                                    class="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-md transition flex items-center gap-1.5 shadow-2xs"
                                    title="${isCollapsed('section-A') ? 'Expand' : 'Collapse'}"
                                >
                                    <span id="section-A-collapse-text">${isCollapsed('section-A') ? 'Expand' : 'Collapse'}</span>
                                    <svg id="section-A-chevron" class="w-3.5 h-3.5 transition-transform duration-200 ${isCollapsed('section-A') ? '' : 'rotate-180'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div id="section-A-body" class="border-t border-slate-100 p-6 ${isCollapsed('section-A') ? 'hidden' : ''}">
                            ${isEditing('sectionA') || isEditing('personal') ? `
                                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    <!-- 1. Surname* -->
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Surname <span class="text-blue-600 font-bold ml-0.5" title="Mandatory">*</span></label>
                                        <input type="text" id="secA-surname" value="${App.escapeHtml(client.surname || '')}" oninput="this.value = this.value.toUpperCase(); this.value = this.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s\-']/g, '')" class="w-full px-3 py-2 text-xs uppercase font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                    </div>
                                    <!-- 2. First Name* -->
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">First Name <span class="text-blue-600 font-bold ml-0.5" title="Mandatory">*</span></label>
                                        <input type="text" id="secA-first_name" value="${App.escapeHtml(client.first_name || '')}" oninput="this.value = this.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s\-']/g, '')" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                    </div>
                                    <!-- 3. Date of Birth* -->
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Date of Birth <span class="text-blue-600 font-bold ml-0.5" title="Mandatory">*</span></label>
                                        <input type="date" id="secA-date_of_birth" value="${client.date_of_birth ? client.date_of_birth.split('T')[0] : ''}" max="${todayStr}" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                    </div>
                                    <!-- 4. Place of Birth* -->
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Place of Birth <span class="text-red-500">*</span></label>
                                        <input type="text" id="secA-place_of_birth" value="${App.escapeHtml(client.place_of_birth || '')}" oninput="this.value = this.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s\-']/g, '')" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                    </div>
                                    <!-- 5. Birth Place* -->
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Birth Place <span class="text-red-500">*</span></label>
                                        <input type="text" id="secA-birth_place" value="${App.escapeHtml(client.birth_place || '')}" oninput="this.value = this.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s\-']/g, '')" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                    </div>
                                    <!-- 6. Nationality -->
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Nationality</label>
                                        <input type="text" id="secA-nationality" value="${App.escapeHtml(client.nationality || 'SRI LANKAISE')}" oninput="this.value = this.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s\-']/g, '')" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                    </div>
                                    <!-- 7. Country -->
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                                        <input type="text" id="secA-personal_country" value="${App.escapeHtml(client.personal_country || '')}" oninput="this.value = this.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s\-']/g, '')" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                    </div>
                                    <!-- 8. SP* -->
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">SP <span class="text-red-500">*</span></label>
                                        <input type="date" id="secA-sp" value="${client.sp ? client.sp.split('T')[0] : ''}" max="${todayStr}" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                    </div>
                                    <!-- 9. EF* -->
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">EF <span class="text-red-500">*</span></label>
                                        <input type="date" id="secA-ef" value="${client.ef ? client.ef.split('T')[0] : ''}" max="${todayStr}" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                    </div>
                                    <!-- 10. Gender (Single-selection checkbox-style) -->
                                    <div class="space-y-1">
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                                        <div class="flex flex-wrap items-center gap-2 pt-0.5">
                                            <label class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700 transition">
                                                <input type="radio" name="secA-gender" value="Male" ${client.gender === 'Male' ? 'checked' : ''} class="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500">
                                                <span>Male</span>
                                            </label>
                                            <label class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700 transition">
                                                <input type="radio" name="secA-gender" value="Female" ${client.gender === 'Female' ? 'checked' : ''} class="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500">
                                                <span>Female</span>
                                            </label>
                                            <label class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700 transition">
                                                <input type="radio" name="secA-gender" value="Not Revealed" ${(!client.gender || client.gender === 'Not Revealed') ? 'checked' : ''} class="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500">
                                                <span>Not Revealed</span>
                                            </label>
                                        </div>
                                    </div>
                                    <!-- 11. Marital Status (Single-selection checkbox-style) -->
                                    <div class="space-y-1">
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Marital Status</label>
                                        <div class="flex flex-wrap items-center gap-2 pt-0.5">
                                            <label class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700 transition">
                                                <input type="radio" name="secA-marital_status" value="Single" ${(client.marital_status === 'Single' || !client.marital_status) ? 'checked' : ''} class="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500">
                                                <span>Single</span>
                                            </label>
                                            <label class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700 transition">
                                                <input type="radio" name="secA-marital_status" value="Married" ${client.marital_status === 'Married' ? 'checked' : ''} class="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500">
                                                <span>Married</span>
                                            </label>
                                            <label class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700 transition">
                                                <input type="radio" name="secA-marital_status" value="Separated" ${client.marital_status === 'Separated' ? 'checked' : ''} class="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500">
                                                <span>Separated</span>
                                            </label>
                                            ${(client.marital_status && !['Single', 'Married', 'Separated'].includes(client.marital_status)) ? `
                                            <label class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700 transition">
                                                <input type="radio" name="secA-marital_status" value="${App.escapeHtml(client.marital_status)}" checked class="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500">
                                                <span>${App.escapeHtml(client.marital_status)}</span>
                                            </label>` : ''}
                                        </div>
                                    </div>
                                </div>
                            ` : `
                                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    ${renderFormField('Surname', client.surname, 'blue')}
                                    ${renderFormField('First Name', client.first_name, 'blue')}
                                    ${renderFormField('Date of Birth', Components.formatDisplayDate(client.date_of_birth), 'blue')}
                                    ${renderFormField('Place of Birth', client.place_of_birth, 'red')}
                                    ${renderFormField('Birth Place', client.birth_place, 'red')}
                                    ${renderFormField('Nationality', client.nationality || 'SRI LANKAISE')}
                                    ${renderFormField('Country', client.personal_country)}
                                    ${renderFormField('SP', Components.formatDisplayDate(client.sp), 'red')}
                                    ${renderFormField('EF', Components.formatDisplayDate(client.ef), 'red')}

                                    <!-- Gender Display -->
                                    <div class="space-y-1">
                                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Gender</label>
                                        <div class="flex flex-wrap items-center gap-2 pt-0.5">
                                            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${client.gender === 'Male' ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs' : 'bg-slate-50/70 border-slate-200 text-slate-400 opacity-60'}">
                                                <span class="w-2 h-2 rounded-full ${client.gender === 'Male' ? 'bg-blue-600' : 'bg-slate-300'}"></span>
                                                Male
                                            </span>
                                            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${client.gender === 'Female' ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs' : 'bg-slate-50/70 border-slate-200 text-slate-400 opacity-60'}">
                                                <span class="w-2 h-2 rounded-full ${client.gender === 'Female' ? 'bg-blue-600' : 'bg-slate-300'}"></span>
                                                Female
                                            </span>
                                            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${(!client.gender || client.gender === 'Not Revealed') ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs' : 'bg-slate-50/70 border-slate-200 text-slate-400 opacity-60'}">
                                                <span class="w-2 h-2 rounded-full ${(!client.gender || client.gender === 'Not Revealed') ? 'bg-blue-600' : 'bg-slate-300'}"></span>
                                                Not Revealed
                                            </span>
                                        </div>
                                    </div>

                                    <!-- Marital Status Display -->
                                    <div class="space-y-1">
                                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Marital Status</label>
                                        <div class="flex flex-wrap items-center gap-2 pt-0.5">
                                            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${client.marital_status === 'Single' ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs' : 'bg-slate-50/70 border-slate-200 text-slate-400 opacity-60'}">
                                                <span class="w-2 h-2 rounded-full ${client.marital_status === 'Single' ? 'bg-blue-600' : 'bg-slate-300'}"></span>
                                                Single
                                            </span>
                                            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${client.marital_status === 'Married' ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs' : 'bg-slate-50/70 border-slate-200 text-slate-400 opacity-60'}">
                                                <span class="w-2 h-2 rounded-full ${client.marital_status === 'Married' ? 'bg-blue-600' : 'bg-slate-300'}"></span>
                                                Married
                                            </span>
                                            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${client.marital_status === 'Separated' ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs' : 'bg-slate-50/70 border-slate-200 text-slate-400 opacity-60'}">
                                                <span class="w-2 h-2 rounded-full ${client.marital_status === 'Separated' ? 'bg-blue-600' : 'bg-slate-300'}"></span>
                                                Separated
                                            </span>
                                            ${(client.marital_status && !['Single', 'Married', 'Separated'].includes(client.marital_status)) ? `
                                            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold bg-blue-50 border-blue-300 text-blue-700 shadow-2xs">
                                                <span class="w-2 h-2 rounded-full bg-blue-600"></span>
                                                ${App.escapeHtml(client.marital_status)}
                                            </span>` : ''}
                                        </div>
                                    </div>
                                </div>
                            `}
                        </div>
                    </div>

                    <!-- 3. Service Information Card (Strictly 5 fields) -->
                    <div id="section-B" class="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden transition-all">
                        <div class="p-5 flex items-center justify-between bg-slate-50/50">
                            <div class="flex items-center gap-2.5">
                                <span class="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">B</span>
                                <h3 class="text-base font-bold text-slate-900">Service Information</h3>
                            </div>
                            <div class="flex items-center gap-2">
                                ${isEditing('sectionB') || isEditing('service') ? `
                                    <button onclick="App.cancelProfileSectionEdit('${client.id}')" class="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
                                    <button id="saveSectionB-btn" onclick="App.saveProfileSection('${client.id}', 'sectionB')" class="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition shadow-xs">Save</button>
                                ` : `
                                    <button onclick="App.startProfileSectionEdit('${client.id}', 'sectionB')" class="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-md transition flex items-center gap-1.5">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                        Edit
                                    </button>
                                `}
                                <button 
                                    id="section-B-collapse-btn"
                                    onclick="App.toggleCardCollapse('section-B')"
                                    class="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-md transition flex items-center gap-1.5 shadow-2xs"
                                    title="${isCollapsed('section-B') ? 'Expand' : 'Collapse'}"
                                >
                                    <span id="section-B-collapse-text">${isCollapsed('section-B') ? 'Expand' : 'Collapse'}</span>
                                    <svg id="section-B-chevron" class="w-3.5 h-3.5 transition-transform duration-200 ${isCollapsed('section-B') ? '' : 'rotate-180'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div id="section-B-body" class="border-t border-slate-100 p-6 ${isCollapsed('section-B') ? 'hidden' : ''}">
                            ${isEditing('sectionB') || isEditing('service') ? `
                                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    <!-- 1. Numéro OFPRA -->
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Numéro OFPRA</label>
                                        <input type="text" id="secB-numero_ofpra" value="${App.escapeHtml(client.numero_ofpra || '')}" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                    </div>
                                    <!-- 2. Numéro APS (10 digits) -->
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Numéro APS (10 digits)</label>
                                        <input type="text" id="secB-numero_aps" maxlength="10" value="${App.escapeHtml(client.numero_aps || '')}" oninput="this.value = this.value.replace(/\D/g, '')" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 tabular-nums">
                                    </div>
                                    <!-- 3. Delivered By -->
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Delivered By</label>
                                        <input type="text" id="secB-delivered_by" value="${App.escapeHtml(client.delivered_by || '')}" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                    </div>
                                    <!-- 4. From Date -->
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">From</label>
                                        <input type="date" id="secB-from_date" value="${client.from_date ? client.from_date.split('T')[0] : ''}" max="${todayStr}" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                    </div>
                                    <!-- 5. To Date -->
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">To</label>
                                        <input type="date" id="secB-to_date" value="${client.to_date ? client.to_date.split('T')[0] : ''}" max="${todayStr}" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                    </div>
                                </div>
                            ` : `
                                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    ${renderFormField('Numéro OFPRA', client.numero_ofpra)}
                                    ${renderFormField('Numéro APS', client.numero_aps)}
                                    ${renderFormField('Delivered By', client.delivered_by)}
                                    ${renderFormField('From', Components.formatDisplayDate(client.from_date))}
                                    ${renderFormField('To', Components.formatDisplayDate(client.to_date))}
                                </div>
                            `}
                        </div>
                    </div>

                    <!-- 4. Contact Information Card (Strictly 7 fields) -->
                    <div id="section-C" class="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden transition-all">
                        <div class="p-5 flex items-center justify-between bg-slate-50/50">
                            <div class="flex items-center gap-2.5">
                                <span class="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">C</span>
                                <h3 class="text-base font-bold text-slate-900">Contact Information</h3>
                            </div>
                            <div class="flex items-center gap-2">
                                ${isEditing('sectionC') || isEditing('contact') ? `
                                    <button onclick="App.cancelProfileSectionEdit('${client.id}')" class="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md transition">Cancel</button>
                                    <button id="saveSectionC-btn" onclick="App.saveProfileSection('${client.id}', 'sectionC')" class="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition shadow-xs">Save</button>
                                ` : `
                                    <button onclick="App.startProfileSectionEdit('${client.id}', 'sectionC')" class="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-md transition flex items-center gap-1.5">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                        Edit
                                    </button>
                                `}
                                <button 
                                    id="section-C-collapse-btn"
                                    onclick="App.toggleCardCollapse('section-C')"
                                    class="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-md transition flex items-center gap-1.5 shadow-2xs"
                                    title="${isCollapsed('section-C') ? 'Expand' : 'Collapse'}"
                                >
                                    <span id="section-C-collapse-text">${isCollapsed('section-C') ? 'Expand' : 'Collapse'}</span>
                                    <svg id="section-C-chevron" class="w-3.5 h-3.5 transition-transform duration-200 ${isCollapsed('section-C') ? '' : 'rotate-180'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div id="section-C-body" class="border-t border-slate-100 p-6 ${isCollapsed('section-C') ? 'hidden' : ''}">
                            ${isEditing('sectionC') || isEditing('contact') ? `
                                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    <!-- 1. Primary Phone* (10 digits starts with 0) -->
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Primary Phone <span class="text-blue-600 font-bold ml-0.5" title="Mandatory">*</span></label>
                                        <input type="text" id="secC-phone_number" value="${App.escapeHtml(client.phone_number || '')}" maxlength="10" placeholder="0763796000" oninput="this.value = this.value.replace(/\D/g, '')" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 tabular-nums">
                                    </div>
                                    <!-- 2. Secondary Phone (10 digits starts with 0) -->
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Secondary Phone</label>
                                        <input type="text" id="secC-secondary_phone" value="${App.escapeHtml(client.secondary_phone || '')}" maxlength="10" placeholder="0XXXXXXXXX" oninput="this.value = this.value.replace(/\D/g, '')" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 tabular-nums">
                                    </div>
                                    <!-- 3. Email Address -->
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                                        <input type="email" id="secC-email" value="${App.escapeHtml(client.email || '')}" placeholder="client@example.com" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                    </div>
                                    <!-- 4. Address* -->
                                    <div class="md:col-span-2 lg:col-span-3">
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Address <span class="text-red-500">*</span></label>
                                        <input type="text" id="secC-address" value="${App.escapeHtml(client.address || '')}" placeholder="Street address" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                    </div>
                                    <!-- 5. Ville* -->
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Ville <span class="text-red-500">*</span></label>
                                        <input type="text" id="secC-ville" value="${App.escapeHtml(client.ville || client.city || '')}" placeholder="City / Ville" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                    </div>
                                    <!-- 6. Postal Code* -->
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Postal Code <span class="text-red-500">*</span></label>
                                        <input type="text" id="secC-postal_code" value="${App.escapeHtml(client.postal_code || '')}" maxlength="5" placeholder="75001 (5 digits)" oninput="this.value = this.value.replace(/\D/g, '')" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 tabular-nums">
                                    </div>
                                    <!-- 7. Country -->
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                                        <input type="text" id="secC-country" value="${App.escapeHtml(client.country || '')}" placeholder="France" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                    </div>
                                </div>
                            ` : `
                                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    ${renderFormField('Primary Phone', client.phone_number, 'blue')}
                                    ${renderFormField('Secondary Phone', client.secondary_phone)}
                                    ${renderFormField('Email Address', client.email)}
                                    ${renderFormField('Address', client.address, 'red', 'md:col-span-2 lg:col-span-3')}
                                    ${renderFormField('Ville', client.ville || client.city, 'red')}
                                    ${renderFormField('Postal Code', client.postal_code, 'red')}
                                    ${renderFormField('Country', client.country)}
                                </div>
                            `}
                        </div>
                    </div>

                    <!-- 5. CLIENT FILES SECTION (Preserved below the 4 cards) -->
                    <div id="profile-files-section" class="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden transition-all">
                        <div class="p-5 flex items-center justify-between bg-slate-50/50">
                            <div class="flex items-center gap-2.5">
                                <span class="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                                </span>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <h3 class="text-base font-bold text-slate-900">Client Files</h3>
                                        <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">${files.length}</span>
                                    </div>
                                    <p class="text-xs text-slate-500">Supporting documents, IDs, audio/video recordings</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <label for="clientFilesInput" class="cursor-pointer inline-flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-blue-700 hover:shadow-xs transition">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
                                    Add Files
                                </label>
                                <input 
                                    type="file" 
                                    id="clientFilesInput" 
                                    multiple 
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp3,.mp4,.wav,.m4a" 
                                    onchange="App.handleClientFilesUpload('${client.id}', this.files)" 
                                    class="hidden"
                                >
                                <button 
                                    id="profile-files-collapse-btn"
                                    onclick="App.toggleCardCollapse('profile-files')"
                                    class="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-md transition flex items-center gap-1.5 shadow-2xs"
                                    title="${isCollapsed('profile-files') ? 'Expand' : 'Collapse'}"
                                >
                                    <span id="profile-files-collapse-text">${isCollapsed('profile-files') ? 'Expand' : 'Collapse'}</span>
                                    <svg id="profile-files-chevron" class="w-3.5 h-3.5 transition-transform duration-200 ${isCollapsed('profile-files') ? '' : 'rotate-180'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div id="profile-files-body" class="border-t border-slate-100 ${isCollapsed('profile-files') ? 'hidden' : ''}">
                            <!-- Upload Drop Zone -->
                            <div 
                                id="clientFileDropZone"
                                ondragover="event.preventDefault(); this.classList.add('border-blue-500', 'bg-blue-50/40')"
                                ondragleave="this.classList.remove('border-blue-500', 'bg-blue-50/40')"
                                ondrop="event.preventDefault(); this.classList.remove('border-blue-500', 'bg-blue-50/40'); App.handleClientFilesUpload('${client.id}', event.dataTransfer.files)"
                                class="p-4 mx-6 mt-6 border-2 border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/20 transition cursor-pointer"
                                onclick="document.getElementById('clientFilesInput').click()"
                            >
                                <svg class="w-8 h-8 mx-auto text-slate-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                                <p class="text-xs font-medium text-slate-700">Drag & drop files here, or <span class="text-blue-600 font-semibold">browse</span></p>
                                <p class="text-[11px] text-slate-400 mt-0.5">Supports PDF, DOC, DOCX, JPG, PNG, MP3, MP4, WAV, M4A up to 50MB</p>
                            </div>

                            <div id="clientFileUploadProgress" class="hidden px-6 pt-3"></div>

                            <!-- Files List -->
                            <div class="p-6">
                                ${files.length === 0 ? `
                                    <div class="text-center py-8 text-slate-400 text-xs">
                                        No documents or media uploaded for this client yet.
                                    </div>
                                ` : `
                                    <div class="overflow-x-auto">
                                        <table class="w-full text-left">
                                            <thead class="text-xs uppercase text-slate-400 font-medium border-b border-slate-100">
                                                <tr>
                                                    <th class="pb-3">File Name</th>
                                                    <th class="pb-3">Type</th>
                                                    <th class="pb-3">Size</th>
                                                    <th class="pb-3">Uploaded</th>
                                                    <th class="pb-3 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody class="divide-y divide-slate-100 text-xs">
                                                ${files.map(f => {
                                                    const ext = f.original_filename.split('.').pop().toLowerCase();
                                                    const sizeStr = App.formatFileSize(f.file_size_bytes);
                                                    const uploadDate = f.uploaded_at ? Components.formatDisplayDate(f.uploaded_at) : '—';
                                                    
                                                    return `
                                                    <tr class="hover:bg-slate-50/70 transition">
                                                        <td class="py-3 font-semibold text-slate-800 flex items-center gap-2.5 max-w-xs truncate">
                                                            <svg class="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                                                            <span class="truncate" title="${App.escapeHtml(f.original_filename)}">${App.escapeHtml(f.original_filename)}</span>
                                                        </td>
                                                        <td class="py-3 text-slate-500 uppercase font-bold text-[10px]">
                                                            <span class="px-2 py-0.5 bg-slate-100 rounded text-slate-600">${ext}</span>
                                                        </td>
                                                        <td class="py-3 text-slate-500 tabular-nums">${sizeStr}</td>
                                                        <td class="py-3 text-slate-500 tabular-nums">${uploadDate}</td>
                                                        <td class="py-3 text-right whitespace-nowrap">
                                                            <div class="flex items-center justify-end gap-1.5">
                                                                <button 
                                                                    onclick="App.previewClientFile('${client.id}', '${f.id}', '${App.escapeHtml(f.original_filename)}', '${ext}')" 
                                                                    title="Preview" 
                                                                    class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                                                                >
                                                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                                                </button>
                                                                <button 
                                                                    onclick="App.downloadClientFile('${client.id}', '${f.id}')" 
                                                                    title="Download" 
                                                                    class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition"
                                                                >
                                                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                                                </button>
                                                                <button 
                                                                    onclick="App.confirmDeleteClientFile('${client.id}', '${f.id}', '${App.escapeHtml(f.original_filename)}')" 
                                                                    title="Delete File" 
                                                                    class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                                                                >
                                                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    `;
                                                }).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- File Preview Modal Container -->
        <div id="filePreviewModalContainer"></div>
        <!-- Global Confirm Modal Container -->
        <div id="ledgerConfirmModalContainer"></div>
        `;
    },

    FilePreviewModal: (title, previewContent) => `
        <div id="filePreviewModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs" onclick="if(event.target === this) App.closeFilePreview()">
            <div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200" onclick="event.stopPropagation()">
                <div class="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 class="text-sm font-bold text-slate-900 truncate pr-4">${App.escapeHtml(title)}</h3>
                    <button onclick="App.closeFilePreview()" class="text-slate-400 hover:text-slate-600 transition p-1.5 hover:bg-slate-200 rounded-full">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
                <div class="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-100 min-h-[300px]">
                    ${previewContent}
                </div>
            </div>
        </div>
    `,

    DeleteConfirmModal: (title, message, onConfirmCall) => `
        <div id="ledgerConfirmModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs" onclick="if(event.target === this) App.closeLedgerConfirmModal()">
            <div class="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200 p-6" onclick="event.stopPropagation()">
                <div class="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                </div>
                <h3 class="text-base font-bold text-slate-900 mb-1">${App.escapeHtml(title)}</h3>
                <p class="text-xs text-slate-500 mb-5">${App.escapeHtml(message)}</p>
                <div class="flex justify-end gap-3">
                    <button onclick="App.closeLedgerConfirmModal()" class="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition">Cancel</button>
                    <button onclick="${onConfirmCall}" class="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs transition">Delete</button>
                </div>
            </div>
        </div>
    `

};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Components;
}
