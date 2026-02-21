import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { Config } from '../core/config';
import * as crypto from 'crypto';

export interface RecordedEvent {
    id: string; // Unique ID for each event for UI tracking
    type: 'click' | 'input' | 'navigation' | 'url-change' | 'drag-select' | 'manual' | 'assert';
    selectorType?: 'ID' | 'CSS' | 'XPath' | 'Text' | 'Data-testid' | 'Name' | 'Role' | 'Manual';
    selector?: string;
    value?: string;
    url?: string;
    timestamp: number;
}

export class InteractiveRecorder {
    private browser: Browser | null = null;
    private page: Page | null = null;
    private events: RecordedEvent[] = [];
    private isRecording: boolean = false;
    private isExpanded: boolean = true;
    private featureName: string = "NewFeature";
    private completionPromise: Promise<void> | null = null;
    private resolveCompletion: (() => void) | null = null;

    async start(initialFeatureName: string): Promise<{ events: RecordedEvent[], featureName: string }> {
        this.featureName = initialFeatureName || "NewFeature";
        this.events = [];

        this.completionPromise = new Promise((resolve) => {
            this.resolveCompletion = resolve;
        });

        console.log(`\n--- Launching Agent Recorder UI ---`);

        // Launch Chrome (Headed)
        this.browser = await chromium.launch({
            headless: false,
            channel: 'chrome',
            args: ['--start-maximized']
        });
        const context = await this.browser.newContext({ viewport: null });
        this.page = await context.newPage();

        await this.exposeBindings(this.page);
        await this.injectScripts(this.page);

        await this.page.goto(Config.UrlPath);

        console.log("Waiting for user to finish recording in browser...");

        // Wait for user to click Stop/Generate
        await this.completionPromise;

        await this.browser.close();

        return { events: this.events, featureName: this.featureName };
    }

    private async exposeBindings(page: Page) {
        await page.exposeFunction('recordAction', (actionRaw: Omit<RecordedEvent, 'id' | 'timestamp'>) => {
            if (this.isRecording) {
                const event: RecordedEvent = {
                    ...actionRaw,
                    id: crypto.randomUUID(),
                    timestamp: Date.now()
                };
                console.log(`[Captured] ${event.type}: ${event.selector || event.url}`);
                this.events.push(event);

                // Trigger UI update
                this.syncUiState();
            }
        });

        await page.exposeFunction('getRecordingState', () => {
            return {
                isRecording: this.isRecording,
                isExpanded: this.isExpanded,
                featureName: this.featureName,
                events: this.events
            };
        });

        await page.exposeFunction('controlAction', (action: any) => {
            if (action.type === 'start') {
                if (!this.isRecording) {
                    this.isRecording = true;
                    // Don't clear events on start so user can pause/resume
                    if (action.payload) this.featureName = action.payload;
                    console.log(`🔴 Recording Started for ${this.featureName}`);
                }
            } else if (action.type === 'stop') {
                if (this.isRecording) {
                    this.isRecording = false;
                    console.log(`⏸️ Recording Paused`);
                }
            } else if (action.type === 'generate') {
                this.isRecording = false;
                console.log("🛠️ Generating test files...");
                if (this.resolveCompletion) this.resolveCompletion();
            } else if (action.type === 'updateName') {
                this.featureName = action.payload;
            } else if (action.type === 'toggleExpand') {
                this.isExpanded = !this.isExpanded;
            } else if (action.type === 'updateEvent') {
                const { id, field, value } = action.payload;
                const eventIndex = this.events.findIndex(e => e.id === id);
                if (eventIndex !== -1) {
                    (this.events[eventIndex] as any)[field] = value;
                }
            } else if (action.type === 'deleteEvent') {
                this.events = this.events.filter(e => e.id !== action.payload);
                this.syncUiState();
            } else if (action.type === 'addManualEvent') {
                const newEvent: RecordedEvent = {
                    id: crypto.randomUUID(),
                    type: 'manual',
                    selectorType: 'Manual',
                    selector: action.payload.selector || '{#id}',
                    value: action.payload.value || 'Action value',
                    timestamp: Date.now()
                };
                this.events.push(newEvent);
                this.syncUiState();
            } else if (action.type === 'reset') {
                this.events = [];
                console.log(`🔄 Recording Reset. Navigating to start...`);
                // Clear state
                this.syncUiState();
                // Navigate back to the initial page
                if (this.page && !this.page.isClosed()) {
                    // Navigate asynchronously to avoid blocking the evaluate call
                    setTimeout(() => {
                        this.page?.goto(Config.UrlPath).catch(err => console.error("Reset navigation failed:", err));
                    }, 10);
                }
            }
        });
    }

    private async syncUiState() {
        if (!this.page || this.page.isClosed()) return;
        try {
            await this.page.evaluate(`
                if (window.updateRecorderUI) {
                    window.updateRecorderUI();
                }
            `);
        } catch (e) {
            // Ignore context destroyed errors during navigation
        }
    }

    private async injectScripts(page: Page) {
        await page.addInitScript(() => {
            const uiId = 'antigravity-recorder-ui';

            // --- UI Injection ---
            async function createUI() {
                if (document.getElementById(uiId)) return;

                const wrapper = document.createElement('div');
                wrapper.id = uiId;

                // Important: CSS resets so our UI isn't affected by site styles
                wrapper.innerHTML = `
                    <style>
                        #${uiId}-container {
                            position: fixed;
                            top: 10px;
                            right: 20px;
                            width: 350px;
                            background: #1e1e1e;
                            color: #eee;
                            padding: 0;
                            border-radius: 8px;
                            box-shadow: 0 4px 20px rgba(0,0,0,0.6);
                            z-index: 2147483647; /* Max z-index */
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            border: 1px solid #444;
                            display: flex;
                            flex-direction: column;
                        }

                        #${uiId}-header {
                            padding: 12px 15px;
                            background: #2d2d2d;
                            border-top-left-radius: 8px;
                            border-top-right-radius: 8px;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            cursor: move;
                            border-bottom: 1px solid #444;
                            user-select: none;
                        }

                        #${uiId}-title {
                            margin: 0;
                            font-size: 14px;
                            font-weight: 600;
                            color: #fff;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        }

                        .${uiId}-dot {
                            width: 10px;
                            height: 10px;
                            border-radius: 50%;
                            background: #555;
                        }
                        .${uiId}-dot.recording {
                            background: #FF5252;
                            box-shadow: 0 0 8px rgba(255, 82, 82, 0.6);
                            animation: ${uiId}-pulse 1.5s infinite;
                        }

                        @keyframes ${uiId}-pulse {
                            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 82, 82, 0.7); }
                            70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(255, 82, 82, 0); }
                            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 82, 82, 0); }
                        }

                        .${uiId}-btn-icon {
                            background: none;
                            border: none;
                            color: #aaa;
                            cursor: pointer;
                            padding: 4px;
                            border-radius: 4px;
                        }
                        .${uiId}-btn-icon:hover { color: #fff; background: #444; }

                        #${uiId}-controls {
                            padding: 15px;
                            display: flex;
                            flex-direction: column;
                            gap: 12px;
                        }

                        .${uiId}-input {
                            width: 100%;
                            padding: 8px;
                            background: #111;
                            border: 1px solid #444;
                            color: white;
                            border-radius: 4px;
                            box-sizing: border-box;
                            font-size: 13px;
                            font-family: monospace;
                        }
                        .${uiId}-input:focus { border-color: #2196F3; outline: none; }

                        .${uiId}-row {
                            display: flex;
                            gap: 8px;
                        }

                        .${uiId}-btn {
                            flex: 1;
                            padding: 8px;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            font-weight: bold;
                            font-size: 12px;
                            color: white;
                            text-transform: uppercase;
                        }
                        .${uiId}-btn-start { background: #4CAF50; }
                        .${uiId}-btn-start:hover { background: #43A047; }
                        .${uiId}-btn-stop { background: #FF9800; }
                        .${uiId}-btn-stop:hover { background: #F57C00; }
                        .${uiId}-btn-generate { background: #2196F3; }
                        .${uiId}-btn-generate:hover { background: #1E88E5; }

                        .${uiId}-btn-add { background: #607D8B; flex: none; width: auto; padding: 8px 12px;}
                        .${uiId}-btn-add:hover { background: #546E7A; }
                        .${uiId}-btn-toggle { background: #333; margin-top: 4px; transition: background 0.2s; }
                        .${uiId}-btn-toggle:hover { background: #444; }

                        #${uiId}-steps-wrapper {
                            display: flex;
                            flex-direction: column;
                            border-top: 1px solid #444;
                            background: #1a1a1a;
                            border-bottom-left-radius: 8px;
                            border-bottom-right-radius: 8px;
                        }

                        #${uiId}-steps-header-row {
                            padding: 10px 15px;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            background: #252525;
                        }

                        #${uiId}-steps-container {
                            padding: 10px 15px;
                            overflow-y: auto;
                            max-height: 250px;
                            display: flex;
                            flex-direction: column;
                            gap: 8px;
                        }

                        .${uiId}-step {
                            background: #2d2d2d;
                            border: 1px solid #444;
                            border-radius: 4px;
                            padding: 8px;
                            font-size: 12px;
                        }

                        .${uiId}-step-header {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            margin-bottom: 6px;
                            color: #bbb;
                        }
                        .${uiId}-step-type { font-weight: bold; color: #fff; text-transform: uppercase;}
                        .${uiId}-step-badge {
                            background: #444; padding: 2px 6px; border-radius: 10px; font-size: 10px;
                        }

                        .${uiId}-step-actions { display: flex; gap: 4px; }
                        .${uiId}-step-input {
                            width: 100%; padding: 4px 6px; background: #111; border: 1px solid #555;
                            color: #ddd; border-radius: 3px; font-size: 11px; margin-bottom: 4px; box-sizing: border-box; font-family: monospace;
                        }

                        .collapsed #${uiId}-steps-wrapper { display: none; }
                        
                    </style>
                    <div id="${uiId}-container">
                        <div id="${uiId}-header">
                            <div id="${uiId}-title">
                                <div id="${uiId}-dot" class="${uiId}-dot"></div>
                                Agent Recorder
                            </div>
                            <button id="${uiId}-btn-reset" class="${uiId}-btn-icon" title="Reset Recording & Reload Page" style="font-size: 14px;">
                                🔄
                            </button>
                        </div>
                        <div id="${uiId}-controls">
                            <input id="${uiId}-name" class="${uiId}-input" type="text" placeholder="Feature Name" />
                            
                            <div class="${uiId}-row">
                                <button id="${uiId}-btn-start" class="${uiId}-btn ${uiId}-btn-start">Record</button>
                                <button id="${uiId}-btn-stop" class="${uiId}-btn ${uiId}-btn-stop">Pause</button>
                                <button id="${uiId}-btn-generate" class="${uiId}-btn ${uiId}-btn-generate">Generate</button>
                            </div>
                            <button id="${uiId}-toggle-btn" class="${uiId}-btn ${uiId}-btn-toggle">▲ Hide Steps</button>
                        </div>
                        
                        <div id="${uiId}-steps-wrapper">
                            <div id="${uiId}-steps-header-row">
                                <span style="font-size: 12px; font-weight: 600; color: #aaa;">Captured Steps</span>
                                <button id="${uiId}-btn-add" class="${uiId}-btn ${uiId}-btn-add">+ Add Step</button>
                            </div>
                            <div id="${uiId}-steps-container">
                                <!-- Steps injected here -->
                            </div>
                        </div>
                    </div>
                `;

                document.body.appendChild(wrapper);

                const c = window as any;

                // Expose a global function to update UI from node
                c.updateRecorderUI = async () => {
                    const state = await c.getRecordingState();
                    renderUI(state);
                };

                // Panel Dragging Logic
                const header = document.getElementById(`${uiId}-header`);
                let isDraggingPanel = false;
                let dragStartX = 0, dragStartY = 0, initialLeft = 0, initialTop = 0;

                header?.addEventListener('mousedown', (e) => {
                    isDraggingPanel = true;
                    dragStartX = e.clientX;
                    dragStartY = e.clientY;

                    const container = document.getElementById(`${uiId}-container`);
                    if (!container) return;

                    const rect = container.getBoundingClientRect();
                    initialLeft = rect.left;
                    initialTop = rect.top;

                    // Switch to absolute positioning with left/top
                    container.style.right = 'auto';
                    container.style.bottom = 'auto';
                    container.style.left = `${initialLeft}px`;
                    container.style.top = `${initialTop}px`;

                    e.preventDefault(); // prevents text selection while dragging
                });

                document.addEventListener('mousemove', (e) => {
                    if (!isDraggingPanel) return;
                    const dx = e.clientX - dragStartX;
                    const dy = e.clientY - dragStartY;

                    const container = document.getElementById(`${uiId}-container`);
                    if (container) {
                        container.style.left = `${initialLeft + dx}px`;
                        container.style.top = `${initialTop + dy}px`;
                    }
                });

                document.addEventListener('mouseup', () => {
                    isDraggingPanel = false;
                });

                // Initial render
                c.updateRecorderUI();

                // Setup Static Listeners
                document.getElementById(`${uiId}-toggle-btn`)?.addEventListener('click', () => {
                    c.controlAction({ type: 'toggleExpand' });
                    c.updateRecorderUI();
                });

                document.getElementById(`${uiId}-btn-start`)?.addEventListener('click', () => {
                    const name = (document.getElementById(`${uiId}-name`) as HTMLInputElement).value;
                    c.controlAction({ type: 'start', payload: name });
                    c.updateRecorderUI();
                });

                document.getElementById(`${uiId}-btn-stop`)?.addEventListener('click', () => {
                    c.controlAction({ type: 'stop' });
                    c.updateRecorderUI();
                });

                document.getElementById(`${uiId}-btn-generate`)?.addEventListener('click', () => {
                    c.controlAction({ type: 'generate' });
                });

                document.getElementById(`${uiId}-btn-add`)?.addEventListener('click', () => {
                    c.controlAction({ type: 'addManualEvent', payload: {} });
                });

                document.getElementById(`${uiId}-btn-reset`)?.addEventListener('click', () => {
                    if (confirm('Are you sure you want to reset all steps and reload the page?')) {
                        c.controlAction({ type: 'reset' });
                    }
                });

                document.getElementById(`${uiId}-name`)?.addEventListener('change', (e) => {
                    c.controlAction({ type: 'updateName', payload: (e.target as HTMLInputElement).value });
                });
            }

            function renderUI(state: any) {
                const uiId = 'antigravity-recorder-ui';
                const container = document.getElementById(`${uiId}-container`);
                const dot = document.getElementById(`${uiId}-dot`);
                const nameInput = document.getElementById(`${uiId}-name`) as HTMLInputElement;
                const toggleBtn = document.getElementById(`${uiId}-toggle-btn`);
                const stepsContainer = document.getElementById(`${uiId}-steps-container`);

                if (!container || !dot || !nameInput || !toggleBtn || !stepsContainer) return;

                // State
                if (state.isExpanded) {
                    container.classList.remove('collapsed');
                    toggleBtn.innerText = '▲ Hide Steps';
                } else {
                    container.classList.add('collapsed');
                    toggleBtn.innerText = '▼ Show Steps';
                }

                if (state.isRecording) {
                    dot.classList.add('recording');
                } else {
                    dot.classList.remove('recording');
                }

                const btnVerify = document.getElementById(`${uiId}-btn-verify-mode`) as HTMLButtonElement | null;
                if (btnVerify) {
                    if (state.isVerifyMode) {
                        btnVerify.classList.add('active');
                        btnVerify.innerHTML = `Verify: ON <span class="${uiId}-info-icon" data-tooltip="When Verify is ON, clicking an element reads its text and adds an 'Assert' step instead of clicking it.">?</span>`;
                    } else {
                        btnVerify.classList.remove('active');
                        btnVerify.innerHTML = `Verify: OFF <span class="${uiId}-info-icon" data-tooltip="When Verify is ON, clicking an element reads its text and adds an 'Assert' step instead of clicking it.">?</span>`;
                    }
                }

                if (document.activeElement !== nameInput) {
                    nameInput.value = state.featureName;
                }

                // Render Steps
                stepsContainer.innerHTML = '';

                if (state.events.length === 0) {
                    stepsContainer.innerHTML = '<div style="color: #666; font-size: 11px; text-align: center; padding: 20px 0;">No steps recorded yet.</div>';
                }

                state.events.forEach((ev: any, index: number) => {
                    const stepEl = document.createElement('div');
                    stepEl.className = `${uiId}-step`;

                    let bgCol = '#444';
                    let typeDisplay = ev.type;

                    if (ev.type === 'click') bgCol = '#4CAF50';
                    if (ev.type === 'input') bgCol = '#FF9800';
                    if (ev.type === 'navigation') bgCol = '#2196F3';
                    if (ev.type === 'url-change') {
                        bgCol = '#00BCD4'; // Cyan
                        typeDisplay = 'URL Change';
                    }
                    if (ev.type === 'assert') bgCol = '#9C27B0'; // Purple
                    if (ev.type === 'drag-select') bgCol = '#9C27B0';
                    if (ev.type === 'manual') bgCol = '#607D8B';

                    stepEl.innerHTML = `
                        <div class="${uiId}-step-header">
                            <div>
                                <span class="${uiId}-step-badge" style="background: ${bgCol}">${index + 1}</span>
                                <span class="${uiId}-step-type">${typeDisplay}</span>
                            </div>
                            <div class="${uiId}-step-actions">
                                <button class="${uiId}-btn-icon delete-btn" data-id="${ev.id}" title="Remove Step">✖</button>
                            </div>
                        </div>
                    `;

                    // Generate editable inputs based on type
                    if (ev.type === 'navigation' || ev.type === 'url-change') {
                        stepEl.innerHTML += `<div style="display:flex; align-items:center; gap:4px; margin-bottom: 4px;">
                            <span style="font-size:10px; color:#888; width: 60px;">URL</span>
                            <input class="${uiId}-step-input step-url" data-id="${ev.id}" value="${ev.url || ''}" />
                        </div>`;
                    } else if (ev.type === 'drag-select') {
                        stepEl.innerHTML += `
                            <div style="display:flex; align-items:center; gap:4px; margin-bottom: 4px;">
                                <input class="${uiId}-step-input step-sel-type" data-id="${ev.id}" value="${ev.selectorType || 'CSS'}" style="width: 70px; margin: 0;" />
                                <input class="${uiId}-step-input step-selector" data-id="${ev.id}" value="${ev.selector || ''}" style="margin: 0;" />
                            </div>
                            <div style="display:flex; align-items:center; gap:4px; margin-bottom: 4px;">
                                <span style="font-size:10px; color:#888; width: 65px; display:inline-block;">Text</span>
                                <input class="${uiId}-step-input step-val" data-id="${ev.id}" value="${ev.value || ''}" style="margin: 0;" />
                            </div>
                        `;
                    } else {
                        stepEl.innerHTML += `
                            <div style="display:flex; align-items:center; gap:4px; margin-bottom: 4px;">
                                <input class="${uiId}-step-input step-sel-type" data-id="${ev.id}" value="${ev.selectorType || 'CSS'}" style="width: 70px; margin: 0;" />
                                <input class="${uiId}-step-input step-selector" data-id="${ev.id}" value="${ev.selector || ''}" style="margin: 0;" />
                            </div>
                        `;
                        if (ev.type === 'input' || ev.type === 'manual' || ev.type === 'assert') {
                            stepEl.innerHTML += `
                                <div style="display:flex; align-items:center; gap:4px; margin-bottom: 4px;">
                                    <span style="font-size:10px; color:#888; width: 65px; display:inline-block;">Value</span>
                                    <input class="${uiId}-step-input step-val" data-id="${ev.id}" value="${ev.value || ''}" style="margin: 0;" />
                                </div>
                            `;
                        }
                    }

                    stepsContainer.appendChild(stepEl);
                });

                // Attach dynamic listeners
                stepsContainer.querySelectorAll('.delete-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
                        (window as any).controlAction({ type: 'deleteEvent', payload: id });
                    });
                });

                stepsContainer.querySelectorAll('.step-url').forEach(input => {
                    input.addEventListener('change', (e) => {
                        const target = e.currentTarget as HTMLInputElement;
                        (window as any).controlAction({ type: 'updateEvent', payload: { id: target.getAttribute('data-id'), field: 'url', value: target.value } });
                    });
                });

                stepsContainer.querySelectorAll('.step-sel-type').forEach(input => {
                    input.addEventListener('change', (e) => {
                        const target = e.currentTarget as HTMLInputElement;
                        (window as any).controlAction({ type: 'updateEvent', payload: { id: target.getAttribute('data-id'), field: 'selectorType', value: target.value } });
                    });
                });

                stepsContainer.querySelectorAll('.step-selector').forEach(input => {
                    input.addEventListener('change', (e) => {
                        const target = e.currentTarget as HTMLInputElement;
                        (window as any).controlAction({ type: 'updateEvent', payload: { id: target.getAttribute('data-id'), field: 'selector', value: target.value } });
                    });
                });

                stepsContainer.querySelectorAll('.step-val').forEach(input => {
                    input.addEventListener('change', (e) => {
                        const target = e.currentTarget as HTMLInputElement;
                        (window as any).controlAction({ type: 'updateEvent', payload: { id: target.getAttribute('data-id'), field: 'value', value: target.value } });
                    });
                });
            }

            // --- Event Listeners for Page Interaction ---
            function setupListeners() {
                const uiId = 'antigravity-recorder-ui';

                function isUiElement(el: Element | null): boolean {
                    return el?.closest(`#${uiId}`) !== null;
                }

                function getBestSelector(target: HTMLElement): { type: RecordedEvent['selectorType'], value: string } {
                    const isUnique = (sel: string) => {
                        try { return document.querySelectorAll(sel).length === 1; } catch (e) { return false; }
                    };

                    const testid = target.getAttribute('data-testid');
                    if (testid && isUnique(`[data-testid="${testid}"]`)) return { type: 'Data-testid', value: `[data-testid="${testid}"]` };

                    if (target.id && isUnique(`#${target.id}`)) return { type: 'ID', value: `#${target.id}` };

                    const name = target.getAttribute('name');
                    if (name && isUnique(`[name="${name}"]`)) return { type: 'Name', value: `[name="${name}"]` };

                    const role = target.getAttribute('role');
                    if (role && isUnique(`[role="${role}"]`)) return { type: 'Role', value: `[role="${role}"]` };

                    if (target.classList && target.classList.length > 0) {
                        const classes = Array.from(target.classList).filter(c => c && typeof c === 'string' && !c.includes(':'));
                        if (classes.length > 0) {
                            const escapedClasses = classes.map(c => CSS.escape(c as string)).join('.');
                            const cssSel = `.${escapedClasses}`;
                            if (isUnique(cssSel)) return { type: 'CSS', value: cssSel };
                        }
                    }

                    const text = target.innerText?.trim();
                    if (text && text.length > 0 && text.length < 30) {
                        try {
                            const escapedText = text.replace(/"/g, '\\"');
                            const xpath = `//${target.tagName.toLowerCase()}[normalize-space(text())="${escapedText}"]`;
                            const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                            if (result.snapshotLength === 1) {
                                return { type: 'Text', value: `text="${text}"` };
                            }
                        } catch (e) { }
                    }

                    // Fallback: Build a hierarchical unique CSS path
                    let path: string[] = [];
                    let current: HTMLElement | null = target;
                    while (current && current.nodeType === 1 && current.tagName !== 'HTML') {
                        let selector = current.tagName.toLowerCase();

                        if (current.id) {
                            selector += `#${CSS.escape(current.id)}`;
                            path.unshift(selector);
                            break; // ID is usually unique, stop bubbling
                        }

                        let sibling: Element | null = current;
                        let nth = 1;
                        while ((sibling = sibling.previousElementSibling)) {
                            if (sibling.tagName.toLowerCase() === current.tagName.toLowerCase()) nth++;
                        }
                        if (nth !== 1) selector += `:nth-of-type(${nth})`;

                        path.unshift(selector);
                        current = current.parentElement;

                        const fullPath = path.join(' > ');
                        if (isUnique(fullPath)) {
                            return { type: 'CSS', value: fullPath };
                        }
                    }

                    const finalPath = path.join(' > ');
                    if (finalPath) return { type: 'CSS', value: finalPath };

                    return { type: 'CSS', value: target.tagName.toLowerCase() };
                }

                function getElementText(el: HTMLElement): string {
                    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                        return (el as HTMLInputElement).value || '';
                    }
                    return el.innerText ? el.innerText.trim() : '';
                }

                // Click / Assert
                document.addEventListener('click', async (e: MouseEvent) => {
                    let target = e.target as HTMLElement;
                    if (isUiElement(target)) return;

                    // Bubble up to find a button or link if the user clicked an inner element (like an icon or span)
                    const clickableParent = target.closest('button, a, [role="button"], [role="link"], [type="button"], [type="submit"]');
                    if (clickableParent && !isUiElement(clickableParent as HTMLElement)) {
                        target = clickableParent as HTMLElement;
                    }

                    const sel = getBestSelector(target);

                    if (e.shiftKey) {
                        e.preventDefault();
                        e.stopPropagation();
                        (window as any).recordAction({
                            type: 'assert',
                            selectorType: sel.type,
                            selector: sel.value,
                            value: getElementText(target)
                        });
                    } else {
                        (window as any).recordAction({
                            type: 'click',
                            selectorType: sel.type,
                            selector: sel.value
                        });
                    }
                }, true);

                // Input
                document.addEventListener('change', (e: Event) => {
                    const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
                    if (isUiElement(target as HTMLElement)) return;

                    const sel = getBestSelector(target);
                    (window as any).recordAction({
                        type: 'input',
                        selectorType: sel.type,
                        selector: sel.value,
                        value: target.value
                    });
                }, true);

                // Drag Select logic
                let mousedownX = 0;
                let mousedownY = 0;
                let isDragging = false;

                document.addEventListener('mousedown', (e: MouseEvent) => {
                    if (isUiElement(e.target as HTMLElement)) return;
                    mousedownX = e.clientX;
                    mousedownY = e.clientY;
                    isDragging = true;
                }, true);

                document.addEventListener('mouseup', (e: MouseEvent) => {
                    if (!isDragging || isUiElement(e.target as HTMLElement)) {
                        isDragging = false;
                        return;
                    }
                    isDragging = false;

                    const dx = e.clientX - mousedownX;
                    const dy = e.clientY - mousedownY;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance > 10) {
                        const selection = window.getSelection();
                        if (selection && selection.toString().trim() !== '') {
                            const text = selection.toString().trim();
                            // Find the parent element of the selection
                            let parent = selection.anchorNode?.parentElement;

                            // If it's a text node, use the parent element
                            while (parent && parent.nodeType !== 1) { // 1 is ELEMENT_NODE
                                parent = parent.parentElement;
                            }

                            if (parent) {
                                const sel = getBestSelector(parent);
                                (window as any).recordAction({
                                    type: 'drag-select',
                                    selectorType: sel.type,
                                    selector: sel.value,
                                    value: text
                                });
                            }
                        }
                    }
                }, true);
            }

            // Initialize both
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    createUI();
                    setupListeners();
                });
            } else {
                createUI();
                setupListeners();
            }
        });

        // Navigation listener (Node side)
        this.page?.on('framenavigated', async (frame) => {
            if (frame === this.page?.mainFrame() && this.isRecording) {
                const url = frame.url();

                // Ignore about:blank or empty urls which occur during startup
                if (url === 'about:blank' || url.trim() === '') return;

                // Check if the last event was a click/navigation trigger. If not, this is a passive URL Change
                const lastEvent = this.events[this.events.length - 1];
                const isPassiveChange = !lastEvent || (lastEvent.type !== 'navigation' && lastEvent.type !== 'click');

                console.log(`[Captured] ${isPassiveChange ? 'URL Change' : 'Navigation'}: ${url}`);
                const event: RecordedEvent = {
                    id: crypto.randomUUID(),
                    type: isPassiveChange ? 'url-change' : 'navigation',
                    url: url,
                    timestamp: Date.now()
                };
                this.events.push(event);
                this.syncUiState();
            }
        });
    }
}
