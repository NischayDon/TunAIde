const Components = {
    Login: () => `
        <div class="min-h-screen w-full flex items-center justify-center bg-slate-50">
            <div class="max-w-md w-full bg-white rounded-lg shadow-sm border border-slate-200 p-8">
                <div class="text-center mb-8">
                    <h1 class="text-2xl font-bold text-slate-900 flex items-center justify-center gap-2">
                        <span class="w-2 h-6 bg-blue-600 rounded-sm"></span>
                        TunAIde
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
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${stats.length ? stats.map(u => `
                                <tr class="hover:bg-slate-50">
                                    <td class="px-6 py-4 font-medium text-slate-900">${u.username}</td>
                                    <td class="px-6 py-4 text-right tabular-nums">${u.upload_count}</td>
                                    <td class="px-6 py-4 text-right tabular-nums">${u.transcribed_minutes.toFixed(2)}</td>
                                    <td class="px-6 py-4 text-right text-slate-500 text-sm">${u.last_login ? new Date(u.last_login).toLocaleString() : '-'}</td>
                                </tr>
                            `).join('') : `
                                <tr>
                                    <td colspan="4" class="px-6 py-8 text-center text-slate-400">No user data available</td>
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
                                        ${u.last_login ? new Date(u.last_login).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td class="px-6 py-4 text-right">
                                        ${u.username !== App.state.user.username ? `
                                            <button onclick="App.deleteUser('${u.username}')" class="text-red-600 hover:text-red-900 text-sm font-medium">
                                                Delete
                                            </button>
                                        ` : '<span class="text-slate-400 text-sm italic">Current User</span>'}
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
            ? "bg-blue-50 text-blue-700"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900";

        const trashClass = activeView === 'trash'
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
            <div class="p-6">
                <h1 class="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <span class="w-2 h-6 bg-blue-600 rounded-sm"></span>
                    TunAIde
                </h1>
            </div>
            
            <nav class="flex-1 px-4 space-y-1">
                <button onclick="App.navigateTo('dashboard')" class="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md ${dashboardClass}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                    My Files
                </button>
                <button onclick="App.navigateTo('trash')" class="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md ${trashClass}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    Trash
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

                <!-- File List -->
                <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-visible min-h-[300px]">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-medium">
                            <tr>
                                <th class="px-6 py-3">Name</th>
                                <th class="px-6 py-3">Status</th>
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
                    <button onclick="App.toggleTimestamps()" class="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
                        <span>Timestamps:</span>
                        <span id="timestampToggleInfo" class="font-semibold text-slate-500">Off</span>
                    </button>
                    <div class="h-6 w-px bg-slate-200"></div>
                     <button onclick="App.toggleEmailModal(true)" class="text-slate-600 hover:text-slate-900 px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-md hover:bg-slate-50">
                        Email
                    </button>
                    <button onclick="App.toggleDownloadModal(true)" class="text-blue-600 hover:text-blue-900 px-3 py-1.5 text-sm font-medium border border-blue-200 bg-blue-50 rounded-md hover:bg-blue-100">
                        Download
                    </button>
                </div>
            </header>

            <!-- Editor -->
            <div class="flex-1 overflow-y-auto p-8" id="transcriptContainer">
                <div class="max-w-3xl mx-auto bg-white min-h-[800px] p-12 shadow-sm rounded-sm border border-slate-200">
                    <div id="transcriptContent" class="prose prose-slate max-w-none prose-lg">
                        <!-- Content or Skeleton -->
                        <div class="animate-pulse space-y-4">
                            <div class="h-4 bg-slate-100 rounded w-3/4"></div>
                            <div class="h-4 bg-slate-100 rounded w-full"></div>
                            <div class="h-4 bg-slate-100 rounded w-5/6"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Download Modal -->
            <div id="downloadModal" class="fixed inset-0 bg-slate-900/50 z-50 hidden flex items-center justify-center backdrop-blur-sm" onclick="if(event.target === this) App.toggleDownloadModal(false)">
                <div class="bg-white rounded-lg shadow-xl border border-slate-200 p-6 w-full max-w-sm" onclick="event.stopPropagation()">
                    <h3 class="text-lg font-semibold text-slate-900 mb-4">Download Transcript</h3>
                    
                    <div class="mb-6 space-y-3">
                        <p class="text-sm text-slate-500 mb-2">Select options for your DOCX download:</p>
                        <label class="flex items-center gap-3 p-3 border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50 transition">
                            <input type="checkbox" id="downloadTimestamps" class="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500">
                            <span class="text-sm font-medium text-slate-700">Include Timestamps</span>
                        </label>
                    </div>

                    <div class="flex items-center justify-end gap-3">
                        <button onclick="App.toggleDownloadModal(false)" class="text-slate-600 hover:text-slate-900 text-sm font-medium px-4 py-2">
                            Cancel
                        </button>
                        <button onclick="App.downloadTranscript(document.getElementById('downloadTimestamps').checked)" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md shadow-sm transition">
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
                        <label class="flex items-center gap-3 p-3 border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50 transition">
                            <input type="checkbox" id="emailTimestamps" class="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500">
                            <span class="text-sm font-medium text-slate-700">Include Timestamps</span>
                        </label>
                    </div>

                    <div class="flex items-center justify-end gap-3">
                        <button onclick="App.toggleEmailModal(false)" class="text-slate-600 hover:text-slate-900 text-sm font-medium px-4 py-2">
                            Cancel
                        </button>
                        <button id="sendEmailBtn" onclick="App.sendEmail(document.getElementById('emailInput').value, document.getElementById('emailTimestamps').checked)" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md shadow-sm transition">
                            Send Email
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `,

    JobRow: (job, isTrash, showMenu) => {
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

        const menuHTML = showMenu ? `
            <div class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-slate-100 actions-menu animate-in fade-in zoom-in duration-200">
                <div class="py-1">
                    ${isTrash ? `
                        <button onclick="event.stopPropagation(); App.restoreJob('${job.id}')" class="text-left w-full block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Restore</button>
                        <button onclick="event.stopPropagation(); App.deleteJobPermanent('${job.id}')" class="text-left w-full block px-4 py-2 text-sm text-red-600 hover:bg-red-50">Delete Permanently</button>
                    ` : `
                        <button onclick="event.stopPropagation(); App.deleteJob('${job.id}')" class="text-left w-full block px-4 py-2 text-sm text-red-600 hover:bg-red-50">Delete</button>
                    `}
                </div>
            </div>
        ` : '';

        return `
            <tr class="hover:bg-slate-50 transition cursor-pointer group relative" onclick="${job.status === 'COMPLETED' ? `App.openTranscript('${job.id}')` : ''}">
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
                <td class="px-6 py-4 text-slate-500 text-sm">
                    ${new Date(job.created_at).toLocaleDateString()}
                </td>
                <td class="px-6 py-4 text-right relative">
                    <button onclick="App.toggleActions(event, '${job.id}')" class="actions-menu-btn text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                    </button>
                    ${menuHTML}
                </td>
            </tr>
        `;
    }
};
