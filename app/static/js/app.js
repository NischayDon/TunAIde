const App = {
    state: {
        jobs: [],
        currentJob: null,
        view: 'dashboard', // 'dashboard' | 'transcript' | 'trash' | 'admin' | 'login'
        activeActionMenu: null,
        token: localStorage.getItem('access_token'),
        user: JSON.parse(localStorage.getItem('user_info') || 'null'),
        adminStats: [],
        showTimestamps: false
    },

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
        } else if (App.state.view === 'transcript') {
            main.innerHTML = Components.TranscriptView();
            App.renderTranscript();
        } else if (App.state.view === 'admin') {
            main.innerHTML = Components.AdminDashboard(App.state.adminStats);
            App.loadAdminStats(); // Fetch stats
        } else if (App.state.view === 'user-management') {
            main.innerHTML = Components.UserManagement(App.state.adminStats); // Reusing adminStats as it contains user list
            App.loadAdminStats();
        }
    },

    navigateTo: (viewName) => {
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

            App.state.jobs = jobs;
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

        if (App.state.jobs.length === 0) {
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
        tbody.innerHTML = App.state.jobs.map(job =>
            Components.JobRow(job, App.state.view === 'trash', App.state.activeActionMenu === job.id)
        ).join('');
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
    }
};

document.addEventListener('DOMContentLoaded', App.init);
