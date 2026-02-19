import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { Config } from '../core/config';
import * as readline from 'readline';

export interface RecordedEvent {
    type: 'click' | 'input' | 'navigation';
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
    private featureName: string = "NewFeature"; // Default
    private completionPromise: Promise<void> | null = null;
    private resolveCompletion: (() => void) | null = null;

    async start(initialFeatureName: string): Promise<{ events: RecordedEvent[], featureName: string }> {
        this.featureName = initialFeatureName || "NewFeature";
        this.events = [];

        // Create a promise that resolves when the user clicks 'Stop' in the browser
        this.completionPromise = new Promise((resolve) => {
            this.resolveCompletion = resolve;
        });

        console.log(`\n--- Launching Recorder UI ---`);

        // Launch Chrome (Headed)
        this.browser = await chromium.launch({
            headless: false,
            channel: 'chrome',
            args: ['--start-maximized'] // Try to maximize for better UI visibility
        });
        const context = await this.browser.newContext({ viewport: null }); // allow full window
        this.page = await context.newPage();

        // Expose bindings BEFORE navigation
        await this.exposeBindings(this.page);

        // Inject UI and Listeners on every nav
        await this.injectScripts(this.page);

        // Navigate to base URL to start
        await this.page.goto(Config.UrlPath);

        console.log("Waiting for user to finish recording in browser...");

        // Wait for the stop signal
        await this.completionPromise;

        // Close using the proper flow
        await this.browser.close();

        return { events: this.events, featureName: this.featureName };
    }

    private async exposeBindings(page: Page) {
        // Binding for recording events
        await page.exposeFunction('recordAction', (event: any) => {
            if (this.isRecording) {
                console.log(`[Captured] ${event.type}: ${event.selector || event.url}`);
                this.events.push({ ...event, timestamp: Date.now() });
            }
        });

        // Binding to get current state (Sync UI on reload)
        await page.exposeFunction('getRecordingState', () => {
            return {
                isRecording: this.isRecording,
                featureName: this.featureName
            };
        });

        // Binding for Control Panel actions
        await page.exposeFunction('controlAction', (action: any) => {
            console.log(`[Control] ${action.type}`, action.payload || '');

            if (action.type === 'start') {
                if (!this.isRecording) {
                    this.isRecording = true;
                    // Only reset events if it's a fresh start (not a navigation resume)
                    // But here, 'start' is clicked by user.
                    // If UI was out of sync, user might click start again.
                    // If we sync properly, user won't click start.
                    // So if we receive 'start', we assume user intends to restart/start.
                    this.events = [];
                    if (action.payload) this.featureName = action.payload;
                    console.log(`🔴 Recording Started for ${this.featureName}`);
                }
            }

            if (action.type === 'stop') {
                this.isRecording = false;
                console.log("⏹️ Recording Stopped. Generating...");
                if (this.resolveCompletion) this.resolveCompletion();
            }

            if (action.type === 'updateName') {
                this.featureName = action.payload;
            }
        });
    }

    private async injectScripts(page: Page) {
        await page.addInitScript(() => {
            // --- UI Injection ---
            const uiId = 'antigravity-recorder-ui';

            async function createUI() {
                if (document.getElementById(uiId)) return;

                // fetch state first
                const state = await (window as any).getRecordingState();

                const container = document.createElement('div');
                container.id = uiId;
                container.style.cssText = `
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    width: 300px;
                    background: #1e1e1e;
                    color: white;
                    padding: 15px;
                    border-radius: 8px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.5);
                    z-index: 999999;
                    font-family: sans-serif;
                    border: 1px solid #333;
                `;

                container.innerHTML = `
                    <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #4CAF50;">Agent Recorder</h3>
                    <input id="${uiId}-name" type="text" placeholder="Feature Name" value="${state.featureName || ''}" style="
                        width: 100%; padding: 8px; margin-bottom: 10px; box-sizing: border-box;
                        background: #333; border: 1px solid #444; color: white; border-radius: 4px;
                    " />
                    <div style="display: flex; gap: 10px;">
                        <button id="${uiId}-start" style="
                            flex: 1; padding: 8px; background: #2196F3; color: white; border: none;
                            border-radius: 4px; cursor: pointer; font-weight: bold;
                        ">START</button>
                        <button id="${uiId}-stop" style="
                            flex: 1; padding: 8px; background: #F44336; color: white; border: none;
                            border-radius: 4px; cursor: pointer; font-weight: bold;
                        ">STOP</button>
                    </div>
                    <div id="${uiId}-status" style="margin-top: 10px; font-size: 12px; color: #aaa;">
                        Status: Ready
                    </div>
                `;

                document.body.appendChild(container);

                // Event Handlers
                const nameInput = document.getElementById(`${uiId}-name`) as HTMLInputElement;
                const btnStart = document.getElementById(`${uiId}-start`);
                const btnStop = document.getElementById(`${uiId}-stop`);
                const status = document.getElementById(`${uiId}-status`);

                // Restore UI state based on persisted Node state
                if (state.isRecording && status) {
                    status.innerText = "Status: 🔴 Recording...";
                    status.style.color = "#FF5252";
                }

                btnStart?.addEventListener('click', () => {
                    const name = nameInput.value || "NewFeature";
                    (window as any).controlAction({ type: 'start', payload: name });
                    if (status) {
                        status.innerText = "Status: 🔴 Recording...";
                        status.style.color = "#FF5252";
                    }
                });

                btnStop?.addEventListener('click', () => {
                    (window as any).controlAction({ type: 'stop' });
                    if (status) {
                        status.innerText = "Status: ⏹️ Processing...";
                        status.style.color = "#4CAF50";
                    }
                    container.style.opacity = '0.5';
                    btnStop.setAttribute('disabled', 'true');
                });

                nameInput?.addEventListener('change', () => {
                    (window as any).controlAction({ type: 'updateName', payload: nameInput.value });
                });
            }

            // --- Event Listeners ---
            function setupListeners() {
                document.addEventListener('click', (e: any) => {
                    // Ignore clicks on our own UI
                    if (e.target.closest(`#${uiId}`)) return;

                    const target = e.target as HTMLElement;
                    let selector = target.tagName.toLowerCase();
                    if (target.id) selector = `#${target.id}`;
                    else if (target.className) selector = `.${target.className.split(' ').join('.')}`;
                    else if (target.innerText) selector = `text=${target.innerText.substring(0, 20)}`;

                    (window as any).recordAction({
                        type: 'click',
                        selector: selector
                    });
                }, true);

                document.addEventListener('change', (e: any) => {
                    if (e.target.closest(`#${uiId}`)) return;

                    const target = e.target as HTMLInputElement;
                    (window as any).recordAction({
                        type: 'input',
                        selector: target.id ? `#${target.id}` : target.tagName,
                        value: target.value
                    });
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

        // Navigation listener
        page.on('framenavigated', async (frame) => {
            if (frame === page.mainFrame() && this.isRecording) {
                const url = frame.url();
                console.log(`[Captured] Navigation: ${url}`);
                this.events.push({
                    type: 'navigation',
                    url: url,
                    timestamp: Date.now()
                });
            }
        });
    }
}
