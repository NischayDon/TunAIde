/**
 * ThinkingLoader — Vanilla JS Thinking Orbs integration for TunAIde.
 *
 * Uses the thinking-orbs engine sub-package (canvas-level API) to render
 * animated orbs without requiring React. The engine is loaded as an ES
 * module from node_modules and its MODE_DRAWS + resolvePreset functions
 * drive the canvas animation loop.
 *
 * Architecture:
 *   - Each orb instance is a <canvas> element managed by an animation loop.
 *   - A shared clock ensures all orbs animate in phase.
 *   - Instances auto-pause when offscreen (IntersectionObserver) or when
 *     the tab is hidden (visibilitychange).
 *   - prefers-reduced-motion renders a single static frame.
 */

const ThinkingLoader = (() => {
    // ─── Engine reference (loaded lazily) ────────────────────────────
    let _engine = null;
    let _engineReady = false;
    let _enginePromise = null;

    // ─── Shared clock ────────────────────────────────────────────────
    let _t0 = performance.now();
    let _instances = new Set();
    let _rafId = null;
    let _hidden = false;

    // ─── State → mode mapping (from the library's presets) ───────────
    const STATE_TO_MODE = {
        working:    'orbits',
        searching:  'globe',
        solving:    'rubik',
        listening:  'wave',
        connecting: 'web',
        weaving:    'braid',
        composing:  'ribbon',
        breathing:  'ring',
        shaping:    'morph'
    };

    // ─── Accessibility labels per state ──────────────────────────────
    const STATE_LABELS = {
        working:    'Working…',
        searching:  'Searching…',
        solving:    'Solving…',
        listening:  'Listening…',
        connecting: 'Connecting…',
        weaving:    'Weaving…',
        composing:  'Composing…',
        breathing:  'Breathing…',
        shaping:    'Shaping…'
    };

    // ─── Reduced-motion detection ────────────────────────────────────
    const prefersReducedMotion = () =>
        window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ─── Theme detection ─────────────────────────────────────────────
    const detectDark = () => {
        // Check ancestors for data-theme or class
        let el = document.documentElement;
        while (el) {
            const dt = el.getAttribute('data-theme');
            if (dt === 'dark') return true;
            if (dt === 'light') return false;
            if (el.classList.contains('dark')) return true;
            if (el.classList.contains('light')) return false;
            el = el.parentElement;
        }
        // Fallback: OS preference
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    };

    // ─── Animation loop ──────────────────────────────────────────────
    const _tick = (now) => {
        if (_instances.size === 0 || _hidden) {
            _rafId = null;
            return;
        }
        const elapsed = (now - _t0) / 1000;
        const dark = detectDark();

        for (const inst of _instances) {
            if (!inst._visible || inst._paused) continue;
            _drawInstance(inst, elapsed, dark);
        }
        _rafId = requestAnimationFrame(_tick);
    };

    const _ensureLoop = () => {
        if (_rafId == null && _instances.size > 0 && !_hidden) {
            _rafId = requestAnimationFrame(_tick);
        }
    };

    const _stopLoop = () => {
        if (_rafId != null) {
            cancelAnimationFrame(_rafId);
            _rafId = null;
        }
    };

    // ─── Visibility tracking ─────────────────────────────────────────
    document.addEventListener('visibilitychange', () => {
        _hidden = document.hidden;
        if (!_hidden) {
            _t0 = performance.now(); // reset clock to avoid jump
            _ensureLoop();
        } else {
            _stopLoop();
        }
    });

    // ─── Draw a single instance ──────────────────────────────────────
    const _drawInstance = (inst, t, dark) => {
        if (!_engine) return;
        const canvas = inst.canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const size = inst.size;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const cssW = size;
        const cssH = size;

        // Ensure canvas sizing
        if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
            canvas.width = cssW * dpr;
            canvas.height = cssH * dpr;
            canvas.style.width = cssW + 'px';
            canvas.style.height = cssH + 'px';
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(dpr, dpr);

        const resolved = inst._resolved;
        const speed = resolved.speed * (inst.speed || 1);
        const drawFn = _engine.MODE_DRAWS[resolved.mode];
        if (drawFn) {
            drawFn(ctx, size, t * speed, dark, resolved.opts);
        }

        ctx.restore();
    };

    // ─── Load the engine ─────────────────────────────────────────────
    const _loadEngine = async () => {
        if (_engineReady) return;
        if (_enginePromise) return _enginePromise;

        _enginePromise = (async () => {
            try {
                // The engine is bundled in node_modules — we load the ES module
                // via a <script type="module"> shim that exposes it on window.
                // Since TunAIde serves static files from /static/ and node_modules
                // isn't in the static path, we'll use the inline engine approach:
                // import the pre-bundled ES module functions directly.
                //
                // However, the simplest working approach for a non-bundled vanilla
                // app is to load the UMD/CJS build via a tiny adapter. Since the
                // package ships ESM and CJS, and we can't easily import() from
                // node_modules in a browser context, we'll embed the engine
                // functionality inline using the resolved presets and draw functions.
                //
                // APPROACH: We'll copy the engine bundle to /static/js/ and load it.
                // For now, we use a dynamic import() with the absolute path if
                // importmaps are available, or fall back to a script tag.
                
                // The engine is available because we'll serve it as a static file.
                // See the setup: we copy engine.es.js and its chunk to static/js/vendor/
                const mod = await import('/static/js/vendor/thinking-orbs-engine.es.js');
                _engine = mod;
                _engineReady = true;
                console.log('[ThinkingLoader] Engine loaded successfully');
            } catch (e) {
                console.error('[ThinkingLoader] Failed to load engine:', e);
                // Fallback: render nothing (the label text still shows)
            }
        })();
        return _enginePromise;
    };

    // ─── Public API ──────────────────────────────────────────────────

    /**
     * Create a ThinkingOrb HTML string for injection into templates.
     *
     * @param {object} opts
     * @param {string} opts.state     - Animation state (working, searching, solving, etc.)
     * @param {number} opts.size      - 20, 32, or 64 CSS pixels
     * @param {string} opts.label     - Descriptive loading message
     * @param {string} opts.variant   - 'inline' | 'section' | 'overlay' | 'fullpage'
     * @param {boolean} opts.showLabel - Whether to display the label text (default true)
     * @param {string} opts.className - Additional CSS classes
     * @param {string} opts.id        - Unique ID for the container
     * @returns {string} HTML string
     */
    const html = (opts = {}) => {
        const {
            state = 'working',
            size = 64,
            label = STATE_LABELS[state] || 'Loading…',
            variant = 'section',
            showLabel = true,
            className = '',
            id = 'orb-' + Math.random().toString(36).slice(2, 9),
        } = opts;

        const ariaLabel = label || STATE_LABELS[state] || 'Loading';
        const variantClass = `thinking-orb-${variant}`;
        const labelSize = size <= 20 ? 'text-xs' : size <= 32 ? 'text-xs' : 'text-sm';

        return `
            <div id="${id}" class="thinking-orb-container ${variantClass} ${className}"
                 role="status" aria-label="${ariaLabel}" aria-live="polite"
                 data-orb-state="${state}" data-orb-size="${size}">
                <canvas class="thinking-orb-canvas"
                        width="${size * 2}" height="${size * 2}"
                        style="width:${size}px;height:${size}px;"
                        aria-hidden="true"></canvas>
                ${showLabel ? `<span class="thinking-orb-label ${labelSize}">${label}</span>` : ''}
            </div>
        `;
    };

    /**
     * Initialize all orb canvases in the DOM. Call after innerHTML is set.
     * Finds all [data-orb-state] containers and starts their animation.
     *
     * @param {HTMLElement} root - Root element to search within (default: document)
     */
    const init = async (root = document) => {
        await _loadEngine();
        if (!_engineReady) return;

        const list = [];
        if (root && root.matches && root.matches('.thinking-orb-container[data-orb-state]')) {
            list.push(root);
        }
        if (root && root.querySelectorAll) {
            root.querySelectorAll('.thinking-orb-container[data-orb-state]').forEach(el => list.push(el));
        }

        list.forEach(container => {
            // Skip if already initialized
            if (container._orbInstance) return;

            const canvas = container.querySelector('.thinking-orb-canvas');
            if (!canvas) return;

            const state = container.dataset.orbState || 'working';
            const rawSize = parseInt(container.dataset.orbSize, 10) || 64;
            const size = rawSize <= 24 ? 20 : rawSize <= 48 ? 32 : 64;
            const speed = parseFloat(container.dataset.orbSpeed) || 1;

            const resolved = _engine.resolvePreset(state, size);

            const inst = {
                canvas,
                container,
                state,
                size,
                speed,
                _resolved: resolved,
                _visible: true,
                _paused: prefersReducedMotion(),
            };

            // Intersection observer for auto-pause
            inst._observer = new IntersectionObserver(
                ([entry]) => {
                    inst._visible = entry.isIntersecting;
                    if (inst._visible) _ensureLoop();
                },
                { threshold: 0.01 }
            );
            inst._observer.observe(canvas);

            container._orbInstance = inst;
            _instances.add(inst);

            // If reduced motion, draw one static frame
            if (inst._paused) {
                const dark = detectDark();
                _drawInstance(inst, 0, dark);
            }

            _ensureLoop();
        });
    };

    /**
     * Destroy all orb instances within a root element.
     *
     * @param {HTMLElement} root
     */
    const destroy = (root = document) => {
        const containers = root.querySelectorAll('.thinking-orb-container[data-orb-state]');
        containers.forEach(container => {
            const inst = container._orbInstance;
            if (inst) {
                _instances.delete(inst);
                if (inst._observer) inst._observer.disconnect();
                container._orbInstance = null;
            }
        });
        if (_instances.size === 0) _stopLoop();
    };

    /**
     * Update an orb's state and label without recreating it.
     *
     * @param {string} containerId - The ID of the orb container
     * @param {object} updates     - { state, label }
     */
    const update = (containerId, updates = {}) => {
        const container = document.getElementById(containerId);
        if (!container || !container._orbInstance || !_engine) return;

        const inst = container._orbInstance;

        if (updates.state && updates.state !== inst.state) {
            inst.state = updates.state;
            const rawSize = updates.size || inst.size;
            inst.size = rawSize <= 24 ? 20 : rawSize <= 48 ? 32 : 64;
            inst._resolved = _engine.resolvePreset(inst.state, inst.size);
            container.dataset.orbState = inst.state;
        }

        if (updates.label !== undefined) {
            const labelEl = container.querySelector('.thinking-orb-label');
            if (labelEl) labelEl.textContent = updates.label;
            container.setAttribute('aria-label', updates.label);
        }
    };

    /**
     * Create an inline orb next to text (for buttons, table cells, etc.).
     * Returns HTML string.
     */
    const inline = (state = 'working', label = '') => {
        return html({
            state,
            size: 20,
            label,
            variant: 'inline',
            showLabel: !!label,
        });
    };

    /**
     * Create a section-level loading orb (for table bodies, content areas).
     * Returns HTML string.
     */
    const section = (state = 'searching', label = 'Loading…') => {
        return html({
            state,
            size: 64,
            label,
            variant: 'section',
            showLabel: true,
        });
    };

    /**
     * Create a full-page loading orb.
     * Returns HTML string.
     */
    const fullpage = (state = 'connecting', label = 'Loading TunAIde…') => {
        return html({
            state,
            size: 64,
            label,
            variant: 'fullpage',
            showLabel: true,
        });
    };

    /**
     * Create an overlay loading orb (for upload/download progress).
     * Returns HTML string.
     */
    const overlay = (state = 'working', label = 'Processing…', id = '') => {
        return html({
            state,
            size: 64,
            label,
            variant: 'overlay',
            showLabel: true,
            id: id || undefined,
        });
    };

    return { html, init, destroy, update, inline, section, fullpage, overlay, STATE_LABELS };
})();
