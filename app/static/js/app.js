const App = {
    state: {
        jobs: [],
        currentJob: null,
        view: 'dashboard', // 'dashboard' | 'transcript' | 'trash' | 'admin' | 'login' | 'ledger' | 'ledger-detail'
        activeActionMenu: null,
        token: localStorage.getItem('access_token'),
        user: JSON.parse(localStorage.getItem('user_info') || 'null'),
        adminStats: [],
        showTimestamps: false,
        isEditing: false,
        audioPlaybackRate: 1.0,
        lifetimeStats: null,
        dailyStats: null,
        popupQueue: []
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
            setInterval(App.loadJobs, 5000);
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
            main.innerHTML = Components.LedgerView();
            App.renderLedgerList();
        } else if (App.state.view === 'ledger-detail') {
            main.innerHTML = Components.LedgerDetailView(App.state.currentJob);
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
        }
    },

    navigateTo: (viewName) => {
        // Cleanup audio player if leaving transcript view
        if (App.state.view === 'transcript' && viewName !== 'transcript') {
            App.destroyAudioPlayer();
        }
        // Reset edit mode when navigating away
        App.state.isEditing = false;

        App.state.view = viewName;
        App.state.activeActionMenu = null;

        // Re-render sidebar if needed (to highlight active)
        const root = document.getElementById('app');
        if (App.state.view !== 'login') {
            const sidebar = root.querySelector('.w-64');
            if (sidebar) sidebar.outerHTML = Components.Sidebar(viewName, App.state.user);
        }

        App.updateView();

        if (viewName === 'dashboard' || viewName === 'trash') {
            App.loadJobs();
        }
    },

    login: async (username, password) => {
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
        }
    },

    logout: () => {
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

            // Detect newly completed jobs for ledger popup
            if (App.state.jobs && App.state.jobs.length > 0) {
                const oldJobsMap = {};
                App.state.jobs.forEach(j => oldJobsMap[j.id] = j);
                
                jobs.forEach(j => {
                    const oldJob = oldJobsMap[j.id];
                    if (oldJob && oldJob.status !== 'COMPLETED' && j.status === 'COMPLETED' && !j.service_type) {
                        App.state.popupQueue.push(j);
                    }
                });
            }

            App.state.jobs = jobs;
            App.processPopupQueue();
            if (App.state.view === 'dashboard' || App.state.view === 'trash') {
                App.renderJobsList();
            }
        } catch (e) {
            console.error("Load jobs error:", e);
        }
    },

    loadAdminStats: async () => {
        if (!App.state.token || !App.state.user.is_admin) return;
        try {
            const res = await App.authFetch(`${App.API_URL}/admin/users`);
            if (res.ok) {
                const stats = await res.json();
                App.state.adminStats = stats;
                // Re-render admin view with data
                const main = document.getElementById('main-content');
                if ((App.state.view === 'admin' || App.state.view === 'user-management') && main) {
                    if (App.state.view === 'admin') {
                        main.innerHTML = Components.AdminDashboard(App.state.adminStats);
                        App.loadDailyStats(); // Load activity chart on Admin Dashboard
                    } else {
                        main.innerHTML = Components.UserManagement(App.state.adminStats);
                    }
                }
            }
        } catch (e) { console.error(e); }
    },

    renderJobsList: () => {
        const tbody = document.getElementById('jobsTableBody');
        const emptyState = document.getElementById('emptyState');
        const emptyTitle = document.getElementById('emptyTitle');
        const emptyDesc = document.getElementById('emptyDesc');

        if (!tbody) return;

        // Sort jobs by created_at descending (newest first)
        const sortedJobs = [...App.state.jobs].sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        );

        // Update completion tracker using lifetime stats
        App.loadLifetimeStats();

        if (sortedJobs.length === 0) {
            tbody.innerHTML = '';
            emptyState.classList.remove('hidden');
            if (App.state.view === 'trash') {
                emptyTitle.textContent = "Trash is empty";
                emptyDesc.textContent = "Deleted files will appear here.";
            } else {
                emptyTitle.textContent = "No files yet";
                emptyDesc.textContent = "Upload an audio or video file to get started.";
            }
            return;
        }

        emptyState.classList.add('hidden');
        // Serial numbers: newest = #1
        tbody.innerHTML = sortedJobs.map((job, index) =>
            Components.JobRow(job, App.state.view === 'trash', App.state.activeActionMenu === job.id, index + 1)
        ).join('');
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
            const isToday = d.label === new Date().toLocaleDateString('en-US', { weekday: 'short' });

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

        const uploadArea = document.getElementById('uploadArea');
        const uploadText = document.getElementById('uploadText');
        if (uploadArea) {
            uploadArea.classList.remove('hidden');
            uploadText.textContent = `Uploading ${file.name}...`;
        }

        try {
            const formData = new FormData();
            formData.append('file', file);

            const uploadRes = await App.authFetch(`${App.API_URL}/jobs/upload`, {
                method: 'POST',
                body: formData
            });

            if (!uploadRes.ok) throw new Error("Upload failed");
            const uploadData = await uploadRes.json();

            if (uploadText) uploadText.textContent = "Queuing transcription job...";

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
            }
        } catch (e) {
            console.error("Failed to load transcript text", e);
        }
    },

    renderTranscript: () => {
        const titleEl = document.getElementById('transcriptTitle');
        const contentEl = document.getElementById('transcriptContent');
        const toggleBtn = document.getElementById('timestampToggleInfo');

        if (!App.state.currentJob) return;
        if (titleEl) titleEl.textContent = App.state.currentJob.original_filename;

        // Update toggle text state if it exists
        if (toggleBtn) {
            toggleBtn.textContent = App.state.showTimestamps ? "On" : "Off";
            toggleBtn.className = App.state.showTimestamps ? "font-semibold text-blue-600" : "font-semibold text-slate-500";
        }

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
                if (App.state.showTimestamps) {
                    // VERSION A: With Timestamps (Citation Style)
                    const segmentsHtml = job.json_metadata.segments.map(seg =>
                        `<span class="inline-block bg-slate-100 text-slate-500 rounded px-1 text-xs font-mono mr-1 select-none align-middle" title="${seg.start} - ${seg.end}">[${seg.start}]</span><span>${seg.text}</span>`
                    ).join(' '); // Join with space for flow

                    htmlContent = `<div class="leading-relaxed text-slate-800">${segmentsHtml}</div>`;
                } else {
                    // VERSION B: Plain Text (Clean)
                    const cleanText = job.json_metadata.segments.map(seg => seg.text).join(' ');
                    htmlContent = `<div class="leading-relaxed text-slate-800">${cleanText}</div>`;
                }
            }
            // 2. Fallback if no metadata (Old files or Parse Error)
            else {
                const text = job.text_content || "";
                const paragraphs = text.split('\n').filter(p => p.trim() !== '');

                // WARNING BANNER if user wants timestamps but we can't show them
                let warning = '';
                if (App.state.showTimestamps) {
                    warning = `
                        <div class="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6 text-amber-800 text-sm flex items-start gap-3">
                            <svg class="w-5 h-5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            <div>
                                <p class="font-bold">Timestamps Unavailable</p>
                                <p>This file does not have timestamp data. This happens if:</p>
                                <ul class="list-disc ml-4 mt-1 space-y-1">
                                    <li>It is an old file (upload a new one).</li>
                                    <li>The AI failed to generate timestamps (check logs).</li>
                                    <li>You are using an API Key that doesn't support this.</li>
                                </ul>
                            </div>
                        </div>
                    `;
                }

                htmlContent = warning + paragraphs.map(p => `<p class="mb-4">${p}</p>`).join('');
            }

            contentEl.innerHTML = htmlContent;
        }
    },

    toggleTimestamps: () => {
        App.state.showTimestamps = !App.state.showTimestamps;
        App.renderTranscript();
    },

    toggleDownloadModal: (show = true) => {
        const modal = document.getElementById('downloadModal');
        if (modal) {
            if (show) modal.classList.remove('hidden');
            else modal.classList.add('hidden');
        }
    },

    downloadTranscript: async (includeTimestamps) => {
        if (!App.state.currentJob) return;
        const jobId = App.state.currentJob.id;

        try {
            const res = await App.authFetch(`${App.API_URL}/jobs/${jobId}/download?include_timestamps=${includeTimestamps}`);
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const filename = `transcript-${App.state.currentJob.original_filename}.docx`;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();

                // Cleanup and close modal
                window.URL.revokeObjectURL(url);
                App.toggleDownloadModal(false);
            } else {
                const err = await res.json();
                alert("Download failed: " + (err.detail || "Unknown error"));
            }
        } catch (e) {
            console.error("Download error", e);
            alert("Download failed");
        }
    },

    toggleEmailModal: (show = true) => {
        const modal = document.getElementById('emailModal');
        if (modal) {
            if (show) modal.classList.remove('hidden');
            else modal.classList.add('hidden');
        }
    },

    sendEmail: async (email, includeTimestamps) => {
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
                body: JSON.stringify({ email, include_timestamps: includeTimestamps })
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
    // Ledger Functions
    // =====================================================

    processPopupQueue: () => {
        if (App.state.popupQueue.length > 0) {
            const jobToPopup = App.state.popupQueue[0];
            const modal = document.getElementById('ledgerPopupModal');
            if (!modal) {
                if(!document.getElementById('globalLedgerPopupContainer')) {
                    const container = document.createElement('div');
                    container.id = 'globalLedgerPopupContainer';
                    document.body.appendChild(container);
                }
                document.getElementById('globalLedgerPopupContainer').innerHTML = Components.LedgerPopup(jobToPopup);
            }
        }
    },

    saveLedgerPopup: async (jobId, serviceType, fullName) => {
        if(!serviceType || !fullName) {
            alert('Please fill out all fields.');
            return;
        }
        const nameParts = fullName.trim().split(' ');
        const clientName = nameParts[0];
        const clientSurname = nameParts.slice(1).join(' ');

        try {
            const res = await App.authFetch(`${App.API_URL}/jobs/${jobId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_type: serviceType,
                    client_name: clientName,
                    client_surname: clientSurname
                })
            });
            if (res.ok) {
                // Remove from queue
                App.state.popupQueue = App.state.popupQueue.filter(j => j.id !== jobId);
                
                // Close modal
                const container = document.getElementById('globalLedgerPopupContainer');
                if (container) container.innerHTML = '';
                
                App.loadJobs();
                App.processPopupQueue();
            } else {
                alert('Failed to save ledger data');
            }
        } catch(e) {
            console.error(e);
            alert('Error saving ledger data');
        }
    },

    closeLedgerPopup: (jobId) => {
        App.state.popupQueue = App.state.popupQueue.filter(j => j.id !== jobId);
        const container = document.getElementById('globalLedgerPopupContainer');
        if (container) container.innerHTML = '';
        App.processPopupQueue();
    },

    renderLedgerList: () => {
        const tbody = document.getElementById('ledgerTableBody');
        if (!tbody) return;
        
        // Filter jobs that have service_type (i.e. filled via popup or edited)
        const ledgerJobs = App.state.jobs.filter(j => j.service_type);
        
        if (ledgerJobs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-slate-500">No ledger entries yet.</td></tr>';
            return;
        }
        
        tbody.innerHTML = ledgerJobs.map(job => Components.LedgerRow(job)).join('');
    },

    openLedgerDetail: async (jobId) => {
        const job = App.state.jobs.find(j => j.id === jobId);
        if (job) App.state.currentJob = job;
        App.navigateTo('ledger-detail');
        // Load documents
        try {
            const res = await App.authFetch(`${App.API_URL}/jobs/${jobId}/documents`);
            if (res.ok) {
                const docs = await res.json();
                App.state.currentJob.supporting_documents = docs;
                // Re-render
                const main = document.getElementById('main-content');
                if (main && App.state.view === 'ledger-detail') {
                    main.innerHTML = Components.LedgerDetailView(App.state.currentJob);
                }
            }
        } catch (e) {
            console.error("Failed to load documents", e);
        }
    },
    
    saveLedgerEntry: async (jobId, field, value) => {
        try {
            const res = await App.authFetch(`${App.API_URL}/jobs/${jobId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    [field]: value
                })
            });
            if (res.ok) {
                App.loadJobs();
                // Optionally update currentJob if we are viewing it
                if (App.state.currentJob && App.state.currentJob.id === jobId) {
                    App.state.currentJob[field] = value;
                }
            } else {
                alert('Failed to update field');
            }
        } catch(e) {
            console.error(e);
            alert('Error updating field');
        }
    },

    uploadSupportingDocument: async (jobId) => {
        const fileInput = document.getElementById('suppDocFile');
        const descInput = document.getElementById('suppDocDesc');
        const file = fileInput.files[0];
        const description = descInput.value.trim();
        
        if(!file) {
            alert('Please select a file');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        if (description) {
            formData.append('description', description);
        }
        
        const btn = document.getElementById('uploadSuppBtn');
        btn.disabled = true;
        btn.innerText = 'Uploading...';
        
        try {
            const res = await App.authFetch(`${App.API_URL}/jobs/${jobId}/documents`, {
                method: 'POST',
                body: formData
            });
            if(res.ok) {
                const doc = await res.json();
                if(!App.state.currentJob.supporting_documents) {
                    App.state.currentJob.supporting_documents = [];
                }
                App.state.currentJob.supporting_documents.push(doc);
                // Re-render
                App.navigateTo('ledger-detail');
            } else {
                alert('Upload failed');
            }
        } catch(e) {
            console.error(e);
            alert('Upload error');
        } finally {
            App.toggleSuppDocModal(false);
            if (btn) {
                btn.disabled = false;
                btn.innerText = 'Upload';
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

    downloadSupportingDocument: async (jobId, docId, filename) => {
        try {
            const res = await App.authFetch(`${App.API_URL}/jobs/${jobId}/documents/${docId}/download`);
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                
                // Check if text/pdf to open in new tab instead of forcing download
                if (blob.type === 'application/pdf' || blob.type === 'text/plain') {
                    window.open(url, '_blank');
                } else {
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                }
                setTimeout(() => window.URL.revokeObjectURL(url), 1000);
            } else {
                alert('Download failed');
            }
        } catch (e) {
            console.error("Download error", e);
            alert("Download failed");
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

        // Audio ended
        audio.addEventListener('ended', () => {
            const playIcon = document.getElementById('playIcon');
            const pauseIcon = document.getElementById('pauseIcon');
            if (playIcon) playIcon.classList.remove('hidden');
            if (pauseIcon) pauseIcon.classList.add('hidden');
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

    togglePlayPause: () => {
        const audio = document.getElementById('audioElement');
        const playIcon = document.getElementById('playIcon');
        const pauseIcon = document.getElementById('pauseIcon');
        if (!audio) return;

        if (audio.paused) {
            audio.play().catch(e => console.error('Audio play failed:', e));
            if (playIcon) playIcon.classList.add('hidden');
            if (pauseIcon) pauseIcon.classList.remove('hidden');
        } else {
            audio.pause();
            if (playIcon) playIcon.classList.remove('hidden');
            if (pauseIcon) pauseIcon.classList.add('hidden');
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
        if (!contentEl || !App.state.currentJob) return;

        const editedText = contentEl.innerText.trim();
        const jobId = App.state.currentJob.id;

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
        }
    }
};

document.addEventListener('DOMContentLoaded', App.init);
