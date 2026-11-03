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
        if (state === 'INITIALIZING' || state === 'PAUSING' || state === 'STOPPING' || isStopping) {
            const title = (isStopping || state === 'STOPPING') ? 'Stopping…' : state === 'INITIALIZING' ? 'Loading…' : 'Pausing…';
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
    // Redesigned Ledger Components
    // =====================================================

    LedgerView: (clients = [], totalCount = 0, searchQuery = '', loading = false) => {
        const countText = totalCount === 1 ? '1 client' : `${totalCount} clients`;
        
        return `
        <div class="pl-64 min-h-screen bg-slate-50">
            <div class="max-w-6xl mx-auto p-8">
                <!-- Header with Title, Count, Search, and New Entry Button -->
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <div class="flex items-center gap-3">
                            <h2 class="text-2xl font-bold text-slate-900 tracking-tight">Ledger</h2>
                            <span id="ledgerClientCountBadge" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                ${countText}
                            </span>
                        </div>
                        <p class="text-sm text-slate-500 mt-1">Manage client records, profiles, and associated documents</p>
                    </div>

                    <div class="flex items-center gap-3">
                        <!-- Search Box -->
                        <div class="relative w-72">
                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                            </div>
                            <input 
                                type="text" 
                                id="ledgerSearchInput"
                                value="${searchQuery ? App.escapeHtml(searchQuery) : ''}"
                                placeholder="Search name, phone, email..."
                                oninput="App.onLedgerSearch(this.value)"
                                class="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition"
                            >
                            ${searchQuery ? `
                                <button onclick="App.clearLedgerSearch()" class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                </button>
                            ` : ''}
                        </div>

                        <!-- New Entry Button -->
                        <button 
                            id="newEntryBtn" 
                            onclick="App.openNewClientModal()" 
                            class="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 hover:shadow-md transition shadow-sm whitespace-nowrap"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
                            + New Entry
                        </button>
                    </div>
                </div>

                <!-- Ledger Table Card -->
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left">
                            <thead class="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                                <tr>
                                    <th class="px-6 py-4 rounded-tl-xl w-2/5">Name</th>
                                    <th class="px-6 py-4 w-1/4">Phone Number</th>
                                    <th class="px-6 py-4 w-1/4">Date of Birth</th>
                                    <th class="px-6 py-4 rounded-tr-xl text-right w-24">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="ledgerTableBody" class="divide-y divide-slate-100 text-sm">
                                ${loading ? `
                                    <tr>
                                        <td colspan="4" class="py-16 text-center">
                                            ${ThinkingLoader.section('weaving', 'Loading client records…')}
                                        </td>
                                    </tr>
                                ` : (clients.length === 0 ? Components.LedgerEmptyState(!!searchQuery) : clients.map(client => Components.LedgerRow(client, App.state.editingClientId === client.id)).join(''))}
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
        `;
    },

    LedgerEmptyState: (hasSearch = false) => `
        <tr>
            <td colspan="4" class="py-16 text-center">
                <div class="max-w-sm mx-auto flex flex-col items-center">
                    <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                    </div>
                    <h3 class="text-base font-semibold text-slate-900">${hasSearch ? 'No matching clients found' : 'No client entries yet'}</h3>
                    <p class="text-xs text-slate-500 mt-1 mb-4">${hasSearch ? 'Try adjusting your search criteria or clear the search query.' : 'Get started by creating your first client record in the ledger.'}</p>
                    ${hasSearch ? `
                        <button onclick="App.clearLedgerSearch()" class="px-3.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition">Clear Search</button>
                    ` : `
                        <button onclick="App.openNewClientModal()" class="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition">+ New Entry</button>
                    `}
                </div>
            </td>
        </tr>
    `,

    LedgerRow: (client, isEditing = false) => {
        const fullName = client.full_name || `${client.first_name || ''} ${client.surname || ''}`.trim() || '—';
        const phone = client.phone_number || '—';
        const dob = client.date_of_birth || '—';

        if (isEditing) {
            return `
            <tr data-client-id="${client.id}" class="bg-blue-50/60 border-l-4 border-blue-600 transition">
                <td class="px-6 py-3.5">
                    <div class="space-y-1.5">
                        <div class="flex gap-2">
                            <input 
                                type="text" 
                                id="edit-fn-${client.id}" 
                                value="${App.escapeHtml(client.first_name || '')}" 
                                placeholder="First Name" 
                                class="px-2.5 py-1.5 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none w-36 font-semibold text-slate-900 shadow-sm"
                                oninput="App.updateInlineNamePreview('${client.id}')"
                            >
                            <input 
                                type="text" 
                                id="edit-sn-${client.id}" 
                                value="${App.escapeHtml(client.surname || '')}" 
                                placeholder="Surname" 
                                class="px-2.5 py-1.5 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none w-36 font-semibold text-slate-900 shadow-sm"
                                oninput="App.updateInlineNamePreview('${client.id}')"
                            >
                        </div>
                        <div class="text-xs text-slate-500 flex items-center gap-1.5">
                            <span>Name =</span>
                            <span id="edit-preview-${client.id}" class="font-semibold text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded">${App.escapeHtml(fullName)}</span>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-3.5">
                    <input 
                        type="text" 
                        id="edit-phone-${client.id}" 
                        value="${App.escapeHtml(client.phone_number || '')}" 
                        placeholder="+33 6 12 34 56 78" 
                        class="px-2.5 py-1.5 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none w-44 tabular-nums text-slate-800 shadow-sm"
                    >
                </td>
                <td class="px-6 py-3.5">
                    <input 
                        type="date" 
                        id="edit-dob-${client.id}" 
                        value="${client.date_of_birth ? client.date_of_birth.split('T')[0] : ''}" 
                        class="px-2.5 py-1.5 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none w-36 tabular-nums text-slate-800 shadow-sm"
                    >
                </td>
                <td class="px-6 py-3.5 text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-1.5">
                        <button 
                            id="saveInlineBtn-${client.id}"
                            onclick="App.saveInlineEdit('${client.id}')" 
                            title="Save Changes" 
                            class="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition shadow-sm"
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
            class="hover:bg-blue-50/40 transition cursor-pointer group" 
            onclick="if(!event.target.closest('button') && !event.target.closest('.action-menu-dropdown')) App.openClientProfile('${client.id}')"
        >
            <td class="px-6 py-4">
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
            <td class="px-6 py-4 text-slate-700 tabular-nums">
                ${App.escapeHtml(phone)}
            </td>
            <td class="px-6 py-4 text-slate-700 tabular-nums">
                ${App.escapeHtml(dob)}
            </td>
            <td class="px-6 py-4 text-right whitespace-nowrap" onclick="event.stopPropagation()">
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
                            View Profile
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

    NewClientModal: () => `
        <div id="newClientModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm" onclick="if(event.target === this) App.closeNewClientModal()">
            <div class="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200" onclick="event.stopPropagation()">
                <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 class="text-lg font-bold text-slate-900">New Client Entry</h3>
                        <p class="text-xs text-slate-500 mt-0.5">Add a new client record to the ledger</p>
                    </div>
                    <button onclick="App.closeNewClientModal()" class="text-slate-400 hover:text-slate-600 transition p-2 hover:bg-slate-100 rounded-full">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <form id="newClientForm" onsubmit="event.preventDefault(); App.submitNewClient();" class="p-6 space-y-4">
                    <div id="newClientError" class="hidden p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700"></div>

                    <!-- First Name and Surname -->
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 mb-1.5">First Name <span class="text-red-500">*</span></label>
                            <input 
                                type="text" 
                                id="newClientFirstName" 
                                required 
                                placeholder="e.g. Jean" 
                                oninput="App.updateNewClientPreview()"
                                class="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition"
                            >
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 mb-1.5">Surname <span class="text-red-500">*</span></label>
                            <input 
                                type="text" 
                                id="newClientSurname" 
                                required 
                                placeholder="e.g. Dupont" 
                                oninput="App.updateNewClientPreview()"
                                class="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition"
                            >
                        </div>
                    </div>

                    <!-- Derived Full Name Preview -->
                    <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                        <span class="text-xs text-slate-500">Derived Full Name:</span>
                        <p id="newClientDerivedPreview" class="text-sm font-bold text-slate-900 mt-0.5">None</p>
                    </div>

                    <!-- Phone Number -->
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1.5">Phone Number</label>
                        <input 
                            type="text" 
                            id="newClientPhone" 
                            placeholder="e.g. +33 6 12 34 56 78" 
                            class="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition tabular-nums"
                        >
                        <p class="text-[11px] text-slate-400 mt-1">Accepts international and local formats</p>
                    </div>

                    <!-- Date of Birth -->
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1.5">Date of Birth</label>
                        <input 
                            type="date" 
                            id="newClientDob" 
                            class="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition tabular-nums"
                        >
                    </div>

                    <div class="pt-3 border-t border-slate-100 flex justify-end gap-3">
                        <button 
                            type="button" 
                            onclick="App.closeNewClientModal()" 
                            class="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            id="saveNewClientBtn" 
                            class="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 hover:shadow-md transition shadow-sm"
                        >
                            Save Client
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `,

    ClientProfileView: (client, activeSection = null) => {
        if (!client) return '';
        const fullName = client.full_name || `${client.first_name || ''} ${client.surname || ''}`.trim() || 'Client Profile';
        const files = client.files || [];
        const isEditing = (sec) => activeSection === sec;

        // Structured JSON sections helper
        const idInfo = client.identification_info || {};
        const caseInfo = client.case_info || {};
        const bgInfo = client.background_info || {};
        const addInfo = client.additional_info || {};

        const renderField = (label, value) => `
            <div class="space-y-0.5">
                <span class="text-xs font-medium text-slate-400 uppercase tracking-wider">${label}</span>
                <p class="text-sm font-medium text-slate-800 break-words">${value || '—'}</p>
            </div>
        `;

        return `
        <div class="pl-64 min-h-screen bg-slate-50">
            <div class="max-w-5xl mx-auto p-8">
                <!-- Top Navigation Bar -->
                <div class="flex items-center justify-between mb-8">
                    <div class="flex items-center gap-4">
                        <button 
                            onclick="App.navigateTo('ledger')" 
                            class="p-2 -ml-2 rounded-lg hover:bg-slate-200 text-slate-600 transition flex items-center gap-1.5 text-sm font-medium"
                            title="Back to Ledger"
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                            Back to Ledger
                        </button>
                    </div>

                    <div class="flex items-center gap-3">
                        <button 
                            onclick="App.confirmDeleteClient('${client.id}', '${App.escapeHtml(fullName).replace(/'/g, "\\'")}')" 
                            class="px-3.5 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition flex items-center gap-1.5"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            Delete Client
                        </button>
                    </div>
                </div>

                <!-- Client Header Card -->
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div class="flex items-center gap-4">
                        <div class="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold uppercase shadow-sm">
                            ${(client.first_name || 'C')[0]}
                        </div>
                        <div>
                            <h2 class="text-2xl font-bold text-slate-900 tracking-tight">${App.escapeHtml(fullName)}</h2>
                            <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                                ${client.phone_number ? `<span class="flex items-center gap-1"><svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>${App.escapeHtml(client.phone_number)}</span>` : ''}
                                ${client.email ? `<span class="flex items-center gap-1"><svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>${App.escapeHtml(client.email)}</span>` : ''}
                                ${client.date_of_birth ? `<span class="flex items-center gap-1"><svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>DOB: ${App.escapeHtml(client.date_of_birth)}</span>` : ''}
                                <span>&middot;</span>
                                <span>Created ${new Date(client.created_at).toLocaleDateString('en-GB')}</span>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-3">
                        <button onclick="document.getElementById('profile-files-section').scrollIntoView({behavior: 'smooth'})" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1.5">
                            <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                            Files (${files.length})
                        </button>
                    </div>
                </div>

                <!-- Profile Sections Accordion / Cards -->
                <div class="space-y-6">

                    <!-- SECTION A: Personal Information -->
                    <div id="section-A" class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div class="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div class="flex items-center gap-2.5">
                                <span class="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">A</span>
                                <h3 class="text-base font-bold text-slate-900">Personal Information</h3>
                            </div>
                            <div>
                                ${isEditing('sectionA') ? `
                                    <div class="flex items-center gap-2">
                                        <button onclick="App.cancelProfileSectionEdit('${client.id}')" class="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition flex items-center gap-1">
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                            Cancel
                                        </button>
                                        <button id="saveSectionA-btn" onclick="App.saveProfileSection('${client.id}', 'sectionA')" class="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition shadow-sm flex items-center gap-1">
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                                            Save
                                        </button>
                                    </div>
                                ` : `
                                    <button onclick="App.startProfileSectionEdit('${client.id}', 'sectionA')" class="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-md transition flex items-center gap-1.5">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                        Edit
                                    </button>
                                `}
                            </div>
                        </div>

                        <div class="p-6">
                            ${isEditing('sectionA') ? `
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                                        <input type="text" id="secA-first_name" value="${App.escapeHtml(client.first_name || '')}" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Surname *</label>
                                        <input type="text" id="secA-surname" value="${App.escapeHtml(client.surname || '')}" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
                                        <input type="date" id="secA-date_of_birth" value="${client.date_of_birth ? client.date_of_birth.split('T')[0] : ''}" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                                        <input type="text" id="secA-gender" value="${App.escapeHtml(client.gender || '')}" placeholder="e.g. Male, Female, Other" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Nationality</label>
                                        <input type="text" id="secA-nationality" value="${App.escapeHtml(client.nationality || '')}" placeholder="e.g. French, Afghan, etc." class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Place of Birth</label>
                                        <input type="text" id="secA-place_of_birth" value="${App.escapeHtml(client.place_of_birth || '')}" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Current Country</label>
                                        <input type="text" id="secA-current_country" value="${App.escapeHtml(client.current_country || '')}" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Marital Status</label>
                                        <input type="text" id="secA-marital_status" value="${App.escapeHtml(client.marital_status || '')}" placeholder="Single, Married, Divorced" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                    </div>
                                    <div class="md:col-span-2">
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Preferred Language</label>
                                        <input type="text" id="secA-preferred_language" value="${App.escapeHtml(client.preferred_language || '')}" placeholder="e.g. French, Pashto, Arabic" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                    </div>
                                </div>
                            ` : `
                                <div class="grid grid-cols-2 md:grid-cols-3 gap-6">
                                    ${renderField('Full Name (Derived)', client.full_name)}
                                    ${renderField('First Name', client.first_name)}
                                    ${renderField('Surname', client.surname)}
                                    ${renderField('Date of Birth', client.date_of_birth)}
                                    ${renderField('Gender', client.gender)}
                                    ${renderField('Nationality', client.nationality)}
                                    ${renderField('Place of Birth', client.place_of_birth)}
                                    ${renderField('Current Country', client.current_country)}
                                    ${renderField('Marital Status', client.marital_status)}
                                    ${renderField('Preferred Language', client.preferred_language)}
                                </div>
                            `}
                        </div>
                    </div>

                    <!-- SECTION B: Contact Information -->
                    <div id="section-B" class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div class="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div class="flex items-center gap-2.5">
                                <span class="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">B</span>
                                <h3 class="text-base font-bold text-slate-900">Contact Information</h3>
                            </div>
                            <div>
                                ${isEditing('sectionB') ? `
                                    <div class="flex items-center gap-2">
                                        <button onclick="App.cancelProfileSectionEdit('${client.id}')" class="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition flex items-center gap-1">
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                            Cancel
                                        </button>
                                        <button id="saveSectionB-btn" onclick="App.saveProfileSection('${client.id}', 'sectionB')" class="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition shadow-sm flex items-center gap-1">
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                                            Save
                                        </button>
                                    </div>
                                ` : `
                                    <button onclick="App.startProfileSectionEdit('${client.id}', 'sectionB')" class="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-md transition flex items-center gap-1.5">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                        Edit
                                    </button>
                                `}
                            </div>
                        </div>

                        <div class="p-6">
                            ${isEditing('sectionB') ? `
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Primary Phone Number</label>
                                        <input type="text" id="secB-phone_number" value="${App.escapeHtml(client.phone_number || '')}" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none tabular-nums">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Secondary Phone Number</label>
                                        <input type="text" id="secB-secondary_phone" value="${App.escapeHtml(client.secondary_phone || '')}" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none tabular-nums">
                                    </div>
                                    <div class="md:col-span-2">
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                                        <input type="email" id="secB-email" value="${App.escapeHtml(client.email || '')}" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                    </div>
                                    <div class="md:col-span-2">
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Current Residential Address</label>
                                        <textarea id="secB-address" rows="2" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">${App.escapeHtml(client.address || '')}</textarea>
                                    </div>
                                    <div class="md:col-span-2">
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Previous Address</label>
                                        <textarea id="secB-previous_address" rows="2" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">${App.escapeHtml(client.previous_address || '')}</textarea>
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">City</label>
                                        <input type="text" id="secB-city" value="${App.escapeHtml(client.city || '')}" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">State / Province</label>
                                        <input type="text" id="secB-state_province" value="${App.escapeHtml(client.state_province || '')}" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Postal Code</label>
                                        <input type="text" id="secB-postal_code" value="${App.escapeHtml(client.postal_code || '')}" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none tabular-nums">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                                        <input type="text" id="secB-country" value="${App.escapeHtml(client.country || '')}" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                    </div>
                                </div>
                            ` : `
                                <div class="grid grid-cols-2 md:grid-cols-3 gap-6">
                                    ${renderField('Primary Phone', client.phone_number)}
                                    ${renderField('Secondary Phone', client.secondary_phone)}
                                    ${renderField('Email Address', client.email)}
                                    ${renderField('Residential Address', client.address)}
                                    ${renderField('Previous Address', client.previous_address)}
                                    ${renderField('City', client.city)}
                                    ${renderField('State / Province', client.state_province)}
                                    ${renderField('Postal Code', client.postal_code)}
                                    ${renderField('Country', client.country)}
                                </div>
                            `}
                        </div>
                    </div>

                    <!-- SECTION C: Identification Information -->
                    <div id="section-C" class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div class="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div class="flex items-center gap-2.5">
                                <span class="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">C</span>
                                <h3 class="text-base font-bold text-slate-900">Identification Information</h3>
                            </div>
                            <div>
                                ${isEditing('sectionC') ? `
                                    <div class="flex items-center gap-2">
                                        <button onclick="App.cancelProfileSectionEdit('${client.id}')" class="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition flex items-center gap-1">
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                            Cancel
                                        </button>
                                        <button id="saveSectionC-btn" onclick="App.saveProfileSection('${client.id}', 'sectionC')" class="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition shadow-sm flex items-center gap-1">
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                                            Save
                                        </button>
                                    </div>
                                ` : `
                                    <button onclick="App.startProfileSectionEdit('${client.id}', 'sectionC')" class="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-md transition flex items-center gap-1.5">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                        Edit
                                    </button>
                                `}
                            </div>
                        </div>

                        <div class="p-6">
                            ${isEditing('sectionC') ? `
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Passport Number</label>
                                        <input type="text" id="secC-passport_number" value="${App.escapeHtml(idInfo.passport_number || '')}" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Passport Issuing Country</label>
                                        <input type="text" id="secC-passport_country" value="${App.escapeHtml(idInfo.passport_country || '')}" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Passport Issue Date</label>
                                        <input type="date" id="secC-passport_issue_date" value="${idInfo.passport_issue_date || ''}" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Passport Expiry Date</label>
                                        <input type="date" id="secC-passport_expiry_date" value="${idInfo.passport_expiry_date || ''}" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">National ID Number</label>
                                        <input type="text" id="secC-national_id" value="${App.escapeHtml(idInfo.national_id || '')}" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Other Identification Details</label>
                                        <input type="text" id="secC-other_id" value="${App.escapeHtml(idInfo.other_id || '')}" placeholder="Visa, Residence Permit, etc." class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                    </div>
                                </div>
                            ` : `
                                <div class="grid grid-cols-2 md:grid-cols-3 gap-6">
                                    ${renderField('Passport Number', idInfo.passport_number)}
                                    ${renderField('Passport Issuing Country', idInfo.passport_country)}
                                    ${renderField('Passport Issue Date', idInfo.passport_issue_date)}
                                    ${renderField('Passport Expiry Date', idInfo.passport_expiry_date)}
                                    ${renderField('National ID Number', idInfo.national_id)}
                                    ${renderField('Other Identification Details', idInfo.other_id)}
                                </div>
                            `}
                        </div>
                    </div>

                    <!-- SECTION D: Case Information -->
                    <div id="section-D" class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div class="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div class="flex items-center gap-2.5">
                                <span class="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">D</span>
                                <h3 class="text-base font-bold text-slate-900">Case Information</h3>
                            </div>
                            <div>
                                ${isEditing('sectionD') ? `
                                    <div class="flex items-center gap-2">
                                        <button onclick="App.cancelProfileSectionEdit('${client.id}')" class="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition flex items-center gap-1">
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                            Cancel
                                        </button>
                                        <button id="saveSectionD-btn" onclick="App.saveProfileSection('${client.id}', 'sectionD')" class="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition shadow-sm flex items-center gap-1">
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                                            Save
                                        </button>
                                    </div>
                                ` : `
                                    <button onclick="App.startProfileSectionEdit('${client.id}', 'sectionD')" class="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-md transition flex items-center gap-1.5">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                        Edit
                                    </button>
                                `}
                            </div>
                        </div>

                        <div class="p-6">
                            ${isEditing('sectionD') ? `
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Case Reference Number</label>
                                        <input type="text" id="secD-case_reference" value="${App.escapeHtml(caseInfo.case_reference || '')}" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Case Type</label>
                                        <input type="text" id="secD-case_type" value="${App.escapeHtml(caseInfo.case_type || '')}" placeholder="Asylum, Appeal, Recours, etc." class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Case Status</label>
                                        <input type="text" id="secD-case_status" value="${App.escapeHtml(caseInfo.case_status || '')}" placeholder="Active, Pending, Closed" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Assigned Case Worker</label>
                                        <input type="text" id="secD-assigned_worker" value="${App.escapeHtml(caseInfo.assigned_worker || '')}" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Date Case Opened</label>
                                        <input type="date" id="secD-date_case_opened" value="${caseInfo.date_case_opened || ''}" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Country of Origin</label>
                                        <input type="text" id="secD-country_of_origin" value="${App.escapeHtml(caseInfo.country_of_origin || '')}" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Country of Application</label>
                                        <input type="text" id="secD-country_of_application" value="${App.escapeHtml(caseInfo.country_of_application || '')}" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Immigration / Legal Ref Number</label>
                                        <input type="text" id="secD-legal_reference" value="${App.escapeHtml(caseInfo.legal_reference || '')}" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                    </div>
                                    <div class="md:col-span-2">
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Case Summary</label>
                                        <textarea id="secD-case_summary" rows="3" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">${App.escapeHtml(caseInfo.case_summary || '')}</textarea>
                                    </div>
                                    <div class="md:col-span-2">
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Additional Case Notes</label>
                                        <textarea id="secD-case_notes" rows="2" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">${App.escapeHtml(caseInfo.case_notes || '')}</textarea>
                                    </div>
                                </div>
                            ` : `
                                <div class="grid grid-cols-2 md:grid-cols-3 gap-6">
                                    ${renderField('Case Reference', caseInfo.case_reference)}
                                    ${renderField('Case Type', caseInfo.case_type)}
                                    ${renderField('Case Status', caseInfo.case_status)}
                                    ${renderField('Assigned Worker', caseInfo.assigned_worker)}
                                    ${renderField('Date Opened', caseInfo.date_case_opened)}
                                    ${renderField('Country of Origin', caseInfo.country_of_origin)}
                                    ${renderField('Country of Application', caseInfo.country_of_application)}
                                    ${renderField('Legal Ref Number', caseInfo.legal_reference)}
                                    <div class="col-span-2 md:col-span-3">
                                        ${renderField('Case Summary', caseInfo.case_summary)}
                                    </div>
                                    <div class="col-span-2 md:col-span-3">
                                        ${renderField('Case Notes', caseInfo.case_notes)}
                                    </div>
                                </div>
                            `}
                        </div>
                    </div>

                    <!-- SECTION E: Background Information -->
                    <div id="section-E" class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div class="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div class="flex items-center gap-2.5">
                                <span class="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">E</span>
                                <h3 class="text-base font-bold text-slate-900">Background Information</h3>
                            </div>
                            <div>
                                ${isEditing('sectionE') ? `
                                    <div class="flex items-center gap-2">
                                        <button onclick="App.cancelProfileSectionEdit('${client.id}')" class="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition flex items-center gap-1">
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                            Cancel
                                        </button>
                                        <button id="saveSectionE-btn" onclick="App.saveProfileSection('${client.id}', 'sectionE')" class="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition shadow-sm flex items-center gap-1">
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                                            Save
                                        </button>
                                    </div>
                                ` : `
                                    <button onclick="App.startProfileSectionEdit('${client.id}', 'sectionE')" class="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-md transition flex items-center gap-1.5">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                        Edit
                                    </button>
                                `}
                            </div>
                        </div>

                        <div class="p-6">
                            ${isEditing('sectionE') ? `
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div class="md:col-span-2">
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Educational Background</label>
                                        <textarea id="secE-education" rows="2" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">${App.escapeHtml(bgInfo.education || '')}</textarea>
                                    </div>
                                    <div class="md:col-span-2">
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Employment History & Occupations</label>
                                        <textarea id="secE-employment" rows="2" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">${App.escapeHtml(bgInfo.employment || '')}</textarea>
                                    </div>
                                    <div class="md:col-span-2">
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Family Information</label>
                                        <textarea id="secE-family_info" rows="2" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Spouse, dependents, family in country of origin/asylum">${App.escapeHtml(bgInfo.family_info || '')}</textarea>
                                    </div>
                                    <div class="md:col-span-2">
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Relevant Personal History</label>
                                        <textarea id="secE-personal_history" rows="2" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">${App.escapeHtml(bgInfo.personal_history || '')}</textarea>
                                    </div>
                                    <div class="md:col-span-2">
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Previous Applications / History</label>
                                        <textarea id="secE-previous_applications" rows="2" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">${App.escapeHtml(bgInfo.previous_applications || '')}</textarea>
                                    </div>
                                </div>
                            ` : `
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    ${renderField('Educational Background', bgInfo.education)}
                                    ${renderField('Employment History', bgInfo.employment)}
                                    ${renderField('Family Information', bgInfo.family_info)}
                                    ${renderField('Relevant Personal History', bgInfo.personal_history)}
                                    <div class="md:col-span-2">
                                        ${renderField('Previous Applications', bgInfo.previous_applications)}
                                    </div>
                                </div>
                            `}
                        </div>
                    </div>

                    <!-- SECTION F: Additional Information -->
                    <div id="section-F" class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div class="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div class="flex items-center gap-2.5">
                                <span class="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">F</span>
                                <h3 class="text-base font-bold text-slate-900">Additional Information</h3>
                            </div>
                            <div>
                                ${isEditing('sectionF') ? `
                                    <div class="flex items-center gap-2">
                                        <button onclick="App.cancelProfileSectionEdit('${client.id}')" class="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition flex items-center gap-1">
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                            Cancel
                                        </button>
                                        <button id="saveSectionF-btn" onclick="App.saveProfileSection('${client.id}', 'sectionF')" class="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition shadow-sm flex items-center gap-1">
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                                            Save
                                        </button>
                                    </div>
                                ` : `
                                    <button onclick="App.startProfileSectionEdit('${client.id}', 'sectionF')" class="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-md transition flex items-center gap-1.5">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                        Edit
                                    </button>
                                `}
                            </div>
                        </div>

                        <div class="p-6">
                            ${isEditing('sectionF') ? `
                                <div class="space-y-4">
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Additional Notes</label>
                                        <textarea id="secF-notes" rows="3" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="General observations or reminders">${App.escapeHtml(addInfo.notes || '')}</textarea>
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Important Dates</label>
                                        <input type="text" id="secF-important_dates" value="${App.escapeHtml(addInfo.important_dates || '')}" placeholder="e.g. Next court hearing: 15/12/2026" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-700 mb-1">Custom Fields / Other Details</label>
                                        <textarea id="secF-other_details" rows="2" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Any specific requirements or flexible custom info">${App.escapeHtml(addInfo.other_details || '')}</textarea>
                                    </div>
                                </div>
                            ` : `
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div class="md:col-span-2">
                                        ${renderField('Additional Notes', addInfo.notes)}
                                    </div>
                                    ${renderField('Important Dates', addInfo.important_dates)}
                                    ${renderField('Custom Fields / Other Details', addInfo.other_details)}
                                </div>
                            `}
                        </div>
                    </div>

                    <!-- CLIENT FILES SECTION (Requirement 7) -->
                    <div id="profile-files-section" class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div class="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div class="flex items-center gap-2.5">
                                <span class="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                                </span>
                                <div>
                                    <h3 class="text-base font-bold text-slate-900">Client Files</h3>
                                    <p class="text-xs text-slate-500">Supporting documents, IDs, audio/video recordings</p>
                                </div>
                            </div>
                            <div>
                                <label for="clientFilesInput" class="cursor-pointer inline-flex items-center gap-2 bg-blue-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700 hover:shadow-sm transition">
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
                            </div>
                        </div>

                        <!-- Upload Drop Zone & Progress Area -->
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
                                                const uploadDate = f.uploaded_at ? new Date(f.uploaded_at).toLocaleDateString('en-GB') : '—';
                                                
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

        <!-- File Preview Modal Container -->
        <div id="filePreviewModalContainer"></div>
        <!-- Global Confirm Modal Container -->
        <div id="ledgerConfirmModalContainer"></div>
        `;
    },

    FilePreviewModal: (title, previewContent) => `
        <div id="filePreviewModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm" onclick="if(event.target === this) App.closeFilePreview()">
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
        <div id="ledgerConfirmModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm" onclick="if(event.target === this) App.closeLedgerConfirmModal()">
            <div class="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200 p-6" onclick="event.stopPropagation()">
                <div class="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                </div>
                <h3 class="text-base font-bold text-slate-900 mb-1">${App.escapeHtml(title)}</h3>
                <p class="text-xs text-slate-500 mb-5">${App.escapeHtml(message)}</p>
                <div class="flex justify-end gap-3">
                    <button onclick="App.closeLedgerConfirmModal()" class="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition">Cancel</button>
                    <button onclick="${onConfirmCall}" class="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition">Delete</button>
                </div>
            </div>
        </div>
    `
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Components;
}
