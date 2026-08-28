const Components = {
    Login: () => `
        <div class="min-h-screen w-full flex items-center justify-center bg-slate-50">
            <div class="max-w-md w-full bg-white rounded-lg shadow-sm border border-slate-200 p-8">
                <div class="text-center mb-8">
                    <h1 class="text-2xl font-bold text-slate-900 flex items-center justify-center gap-2">
                        <img src="/static/img/logo.png" alt="TunAIde Logo" class="h-16">
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
                    <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition font-medium">
                        Sign In
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
                    <div id="activityChart" class="activity-chart">
                        <div class="activity-chart-loading">
                            <div class="animate-pulse flex gap-3 items-end h-32">
                                <div class="flex-1 bg-slate-100 rounded h-8"></div>
                                <div class="flex-1 bg-slate-100 rounded h-16"></div>
                                <div class="flex-1 bg-slate-100 rounded h-12"></div>
                                <div class="flex-1 bg-slate-100 rounded h-20"></div>
                                <div class="flex-1 bg-slate-100 rounded h-10"></div>
                                <div class="flex-1 bg-slate-100 rounded h-14"></div>
                                <div class="flex-1 bg-slate-100 rounded h-6"></div>
                            </div>
                        </div>
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
                        <tbody class="divide-y divide-slate-100">
                            ${stats.length ? stats.map(u => `
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
                                    <td colspan="5" class="px-6 py-8 text-center text-slate-400">No user data available</td>
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
                            ${users.length ? users.map(u => `
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
                                    <td colspan="3" class="px-6 py-8 text-center text-slate-400">No users found</td>
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

        const ledgerClass = activeView === 'ledger' || activeView === 'ledger-detail'
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
                    <img src="/static/img/logo.png" alt="TunAIde Logo" class="h-12">
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
                        <button id="sharedPlayBtn-${item.id}" onclick="App.playSharedAudio('${item.id}', '${item.original_filename.replace(/'/g, "\\'")}')" class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-md transition" title="Play">
                            <svg id="sharedPlayIcon-${item.id}" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
                        </button>
                        <button onclick="App.downloadSharedAudio('${item.id}', '${item.original_filename.replace(/'/g, "\\'")}')" class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-md transition" title="Download">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        </button>
                        <button onclick="event.stopPropagation(); App.deleteSharedQueueItem('${item.id}')" class="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition" title="Delete">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                        <button onclick="App.showClaimModal('${item.id}', '${item.original_filename.replace(/'/g, "\\'")}')" class="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-100 transition shadow-sm">
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
                    <button onclick="document.getElementById('sharedFileInput').click()" class="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition shadow-sm flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                        Upload to Shared Queue
                    </button>
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
                <div id="sharedUploadArea" class="hidden mb-8 bg-white p-6 rounded-lg shadow-sm border border-slate-200 animate-pulse">
                     <div class="flex items-center gap-4">
                         <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                             <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                         </div>
                         <div>
                             <p class="font-medium text-slate-900" id="sharedUploadText">Uploading to shared queue...</p>
                             <p class="text-sm text-slate-500">Please do not close this tab.</p>
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
                            ${items.length ? listHtml : `
                                <tr><td colspan="6" class="px-6 py-12 text-center text-slate-400">No files currently in the shared queue.</td></tr>
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
                    <button onclick="App.claimWithDownload()" class="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        Claim & Download
                    </button>
                    <button onclick="App.claimWithoutDownload()" class="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-200 transition border border-slate-200">
                        Claim Without Downloading
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
            actionButton = `
                <button onclick="document.getElementById('fileInput').click()" class="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition shadow-sm flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                    New Transcription
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
                <div id="uploadArea" class="hidden mb-8 bg-white p-6 rounded-lg shadow-sm border border-slate-200 animate-pulse">
                     <div class="flex items-center gap-4">
                         <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                             <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                         </div>
                         <div>
                             <p class="font-medium text-slate-900" id="uploadText">Uploading...</p>
                             <p class="text-sm text-slate-500">Please do not close this tab.</p>
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
                        <!-- Content or Skeleton -->
                        <div class="animate-pulse space-y-4">
                            <div class="h-4 bg-slate-100 rounded w-3/4"></div>
                            <div class="h-4 bg-slate-100 rounded w-full"></div>
                            <div class="h-4 bg-slate-100 rounded w-5/6"></div>
                        </div>
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

                    <!-- Play/Pause -->
                    <button id="audioPlayPauseBtn" onclick="App.togglePlayPause()" class="audio-play-btn" title="Play/Pause (Space)">
                        <svg id="playIcon" class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
                        <svg id="pauseIcon" class="w-6 h-6 hidden" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"></path></svg>
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
                        <button onclick="App.downloadTranscript()" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md shadow-sm transition">
                            Download DOCX
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
            'PROCESSING': 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse',
            'TRANSCRIBING': 'bg-purple-50 text-purple-700 border-purple-200 animate-pulse',
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
                        <button onclick="event.stopPropagation(); App.downloadJobAudio('${job.id}', '${job.original_filename.replace(/'/g, "\\\'")}')" class="text-left w-full block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                            <span class="flex items-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                Download Audio
                            </span>
                        </button>
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
                    <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeClass}">
                        ${job.status}
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

    LedgerPopup: (job) => `
        <div id="ledgerPopupModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
            <div class="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
                <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 class="text-lg font-semibold text-slate-900">Transcription Complete</h3>
                        <p class="text-sm text-slate-500 mt-1">${job.original_filename}</p>
                    </div>
                    <button onclick="App.closeLedgerPopup('${job.id}')" class="text-slate-400 hover:text-slate-600 transition p-2 hover:bg-slate-100 rounded-full">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div class="p-6 space-y-5">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Type of Service</label>
                        <select id="ledgerPopupService" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm transition">
                            <option value="">Select a service...</option>
                            <option value="Recours">Recours</option>
                            <option value="OFPRA">OFPRA</option>
                            <option value="Réexamin">Réexamin</option>
                            <option value="Tribunal">Tribunal</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Client Full Name</label>
                        <input type="text" id="ledgerPopupName" placeholder="e.g. Jean Dupont" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition">
                    </div>
                </div>
                <div class="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                    <button onclick="App.closeLedgerPopup('${job.id}')" class="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition">Skip</button>
                    <button onclick="App.saveLedgerPopup('${job.id}', document.getElementById('ledgerPopupService').value, document.getElementById('ledgerPopupName').value)" class="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 hover:shadow-md transition">Save to Ledger</button>
                </div>
            </div>
        </div>
    `,

    LedgerView: () => `
        <div class="pl-64 min-h-screen bg-slate-50">
            <div class="max-w-[95%] mx-auto p-8">
                <div class="flex justify-between items-center mb-8">
                    <h2 class="text-2xl font-semibold text-slate-900">Ledger</h2>
                </div>
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left whitespace-nowrap">
                            <thead class="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                                <tr>
                                    <th class="px-6 py-4 rounded-tl-xl">Name</th>
                                    <th class="px-6 py-4">Surname</th>
                                    <th class="px-6 py-4">Type of Service</th>
                                    <th class="px-6 py-4">Date of Birth</th>
                                    <th class="px-6 py-4">Login Date</th>
                                    <th class="px-6 py-4">Phone Number</th>
                                    <th class="px-6 py-4">Payment</th>
                                    <th class="px-6 py-4 rounded-tr-xl">Modified</th>
                                </tr>
                            </thead>
                            <tbody id="ledgerTableBody" class="divide-y divide-slate-100 text-sm">
                                <!-- Ledger rows injected here -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `,

    LedgerRow: (job) => {
        // Editable inline logic: double click or simple input depending on preference.
        // We'll use inputs that trigger save on blur for simplicity, or just simple text that navigates to detail.
        // The user asked to "edit and add in these fields".
        const formatVal = (v) => v || '';
        const formatDate = (v) => v ? new Date(v).toISOString().split('T')[0] : '';
        const formatDateTime = (v) => v ? new Date(v).toLocaleString('en-GB', { timeZone: 'Europe/Paris' }) : '';

        return `
            <tr class="hover:bg-blue-50/50 transition cursor-pointer group" onclick="if(!event.target.closest('input') && !event.target.closest('select')) App.openLedgerDetail('${job.id}')">
                <td class="px-6 py-4">
                    <input type="text" value="${formatVal(job.client_name)}" onchange="App.saveLedgerEntry('${job.id}', 'client_name', this.value)" class="bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:ring-0 px-0 py-1 w-full text-sm font-medium text-slate-900 transition" placeholder="Add name">
                </td>
                <td class="px-6 py-4">
                    <input type="text" value="${formatVal(job.client_surname)}" onchange="App.saveLedgerEntry('${job.id}', 'client_surname', this.value)" class="bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:ring-0 px-0 py-1 w-full text-sm font-medium text-slate-900 transition" placeholder="Add surname">
                </td>
                <td class="px-6 py-4">
                    <select onchange="App.saveLedgerEntry('${job.id}', 'service_type', this.value)" class="bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:ring-0 px-0 py-1 w-full text-sm text-slate-700 transition">
                        <option value="Recours" ${job.service_type === 'Recours' ? 'selected' : ''}>Recours</option>
                        <option value="OFPRA" ${job.service_type === 'OFPRA' ? 'selected' : ''}>OFPRA</option>
                        <option value="Réexamin" ${job.service_type === 'Réexamin' ? 'selected' : ''}>Réexamin</option>
                        <option value="Tribunal" ${job.service_type === 'Tribunal' ? 'selected' : ''}>Tribunal</option>
                    </select>
                </td>
                <td class="px-6 py-4">
                    <input type="date" value="${formatDate(job.date_of_birth)}" onchange="App.saveLedgerEntry('${job.id}', 'date_of_birth', this.value ? new Date(this.value).toISOString() : null)" class="bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:ring-0 px-0 py-1 text-sm text-slate-700 transition w-32">
                </td>
                <td class="px-6 py-4 text-slate-500 tabular-nums">
                    ${formatDateTime(job.login_date)}
                </td>
                <td class="px-6 py-4">
                    <input type="text" value="${formatVal(job.phone_number)}" onchange="App.saveLedgerEntry('${job.id}', 'phone_number', this.value)" class="bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:ring-0 px-0 py-1 w-full text-sm text-slate-700 transition tabular-nums" placeholder="Add phone">
                </td>
                <td class="px-6 py-4">
                    <input type="text" value="${formatVal(job.payment)}" onchange="App.saveLedgerEntry('${job.id}', 'payment', this.value)" class="bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:ring-0 px-0 py-1 w-full text-sm text-slate-700 transition" placeholder="Add payment">
                </td>
                <td class="px-6 py-4 text-slate-400 tabular-nums text-xs">
                    ${formatDateTime(job.updated_at)}
                </td>
            </tr>
        `;
    },

    LedgerDetailView: (job) => {
        if(!job) return '';
        const docs = job.supporting_documents || [];
        
        return `
        <div class="pl-64 min-h-screen bg-slate-50">
            <div class="max-w-5xl mx-auto p-8">
                
                <!-- Header -->
                <div class="flex items-center gap-4 mb-8">
                    <button onclick="App.navigateTo('ledger')" class="p-2 -ml-2 rounded-full hover:bg-slate-200 text-slate-500 transition">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    </button>
                    <div>
                        <h2 class="text-3xl font-bold text-slate-900 tracking-tight">${job.client_name || ''} ${job.client_surname || ''}</h2>
                        <p class="text-slate-500 mt-1 font-medium">${job.service_type || 'No Service Type'} &middot; Uploaded ${new Date(job.login_date).toLocaleDateString('en-GB', { timeZone: 'Europe/Paris' })}</p>
                    </div>
                </div>

                <!-- Document Actions -->
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-8">
                    <h3 class="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                        <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        Documents
                    </h3>
                    <div class="flex flex-wrap gap-4 items-center">
                        <button onclick="App.openTranscript('${job.id}')" class="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-800 transition shadow-sm">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                            View Transcript
                        </button>
                        
                        <button id="ledgerPlayBtn" onclick="App.toggleLedgerAudio('${job.id}')" class="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-lg font-medium hover:bg-blue-700 transition shadow-sm">
                            <svg id="ledgerPlayIcon" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
                            <span id="ledgerPlayText">Play Audio</span>
                        </button>
                        
                        <button onclick="App.toggleSuppDocModal(true)" class="flex items-center justify-center w-12 h-12 rounded-lg border-2 border-dashed border-slate-300 text-slate-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition" title="Add Document">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                        </button>
                        
                        ${docs.map(doc => `
                            <button onclick="App.downloadSupportingDocument('${job.id}', '${doc.id}', '${doc.original_filename}')" class="flex items-center gap-3 bg-white border border-slate-200 shadow-sm px-4 py-3 rounded-lg hover:border-blue-300 hover:shadow-md transition group text-left">
                                <div class="bg-blue-50 text-blue-600 p-2 rounded-md group-hover:bg-blue-100 transition">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                                </div>
                                <div>
                                    <p class="font-semibold text-slate-900 text-sm truncate max-w-[200px]">${doc.description || doc.original_filename}</p>
                                    <p class="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">${doc.original_filename}</p>
                                </div>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>

        <!-- Document Upload Modal -->
        <div id="suppDocModal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
            <div class="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
                <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 class="text-lg font-semibold text-slate-900">Upload Document</h3>
                    <button onclick="App.toggleSuppDocModal(false)" class="text-slate-400 hover:text-slate-600 transition p-2 hover:bg-slate-100 rounded-full">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div class="p-6 space-y-5">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Description / Title</label>
                        <input type="text" id="suppDocDesc" placeholder="e.g. Identity Card" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Select File</label>
                        <input type="file" id="suppDocFile" class="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition cursor-pointer">
                    </div>
                </div>
                <div class="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                    <button onclick="App.toggleSuppDocModal(false)" class="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition">Cancel</button>
                    <button id="uploadSuppBtn" onclick="App.uploadSupportingDocument('${job.id}')" class="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 hover:shadow-md transition">Upload</button>
                </div>
            </div>
        </div>
    `
    }
};
