/* ===================================================================
   LANDING SCREEN  —  the face that greets a visitor before they draw.

   A full-screen black layer sits over the whole page. The eyes follow
   the pointer, blink, and the face smiles when tapped; then the layer
   fades away and the digit demo is underneath, ready to draw on.

   -------------------------------------------------------------------
   TIMINGS LIVE HERE. Nothing else in the project sets them.
   -------------------------------------------------------------------
   IDLE_RETURN_MS  How long the demo may sit untouched before the face
                   comes back. 30000 = 30 seconds. Set to 0 to switch
                   the automatic return off entirely.
   SMILE_MS        How long the smile plays after a tap, before the
                   layer starts to fade.
   FADE_MS         Length of the fade-out. Pushed into style.css as
                   --face-fade, so the two can never drift apart.

   Then, after Check digit is pressed, the page walks through what it
   does to the drawing before the network sees it:

   CENTER_MS       The digit slides to the middle of the grid.
   SMOOTH_MS       Its edges soften.
   SETTLE_MS       The big canvas shrinks back into its card.
   LAYER_MS        Each layer of the network lights up, one after the
                   next, so three of these pass before the answer.
   =================================================================== */

const SETTINGS = {
    IDLE_RETURN_MS: 30000,   // <-- auto-return delay. This is the number to change.
    SMILE_MS: 700,
    FADE_MS: 300,

    CENTER_MS: 600,
    SMOOTH_MS: 400,
    SETTLE_MS: 600,
    LAYER_MS: 400,
};


class FaceLanding {
    /**
     * @param {HTMLElement} root      the .face-landing overlay
     * @param {Function}    onDismiss run once the layer has finished leaving
     */
    constructor(root, onDismiss) {
        this.root = root;
        this.onDismiss = onDismiss || function () {};
        this.visible = true;
        this.leaving = false;

        this.svg = root.querySelector('svg');
        this.pupils = [
            [root.querySelector('#pL'), 380, 235],
            [root.querySelector('#pR'), 644, 235],
        ];

        // how far a pupil may travel from its resting spot, in viewBox units
        this.AMPLITUDE_X = 30;
        this.AMPLITUDE_Y = 78;

        this.lastPointerMove = 0;

        root.addEventListener('pointermove', (e) => {
            if (!this.visible || this.leaving) return;
            const p = this._toSvg(e);
            this._look(p.x, p.y);
            this.lastPointerMove = Date.now();
        });

        root.addEventListener('pointerdown', () => this._tapped());

        // keyboard route, so the demo is reachable without a pointer
        root.setAttribute('tabindex', '0');
        root.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this._tapped();
            }
        });

        // with nobody moving a pointer, glance around on its own
        this.wanderTimer = setInterval(() => {
            if (!this.visible || this.leaving) return;
            if (Date.now() - this.lastPointerMove > 2000) {
                this._look(512 + (Math.random() - 0.5) * 900,
                           380 + (Math.random() - 0.3) * 300);
            }
        }, 1400);

        this._look(512, 560);   // start off looking down, a little shy
    }

    get isVisible() {
        return this.visible;
    }

    show() {
        if (this.visible) return;
        this.visible = true;
        this.leaving = false;
        this.root.classList.remove('is-hidden');
        // one frame on screen at opacity 0 first, or the fade back in is skipped
        requestAnimationFrame(() => this.root.classList.remove('is-leaving'));
        this._look(512, 560);
    }

    /** Smile, then fade out and hand the page over. */
    _tapped() {
        if (!this.visible || this.leaving) return;
        this.leaving = true;

        this.svg.classList.add('isHappy');

        setTimeout(() => {
            this.svg.classList.remove('isHappy');
            this.root.classList.add('is-leaving');

            setTimeout(() => {
                this.root.classList.add('is-hidden');
                this.visible = false;
                this.leaving = false;
                this.onDismiss();
            }, SETTINGS.FADE_MS);
        }, SETTINGS.SMILE_MS);
    }

    _look(tx, ty) {
        this.pupils.forEach(([pupil, cx, cy]) => {
            if (!pupil) return;
            const dx = tx - cx;
            const dy = ty - cy;
            const dist = Math.hypot(dx, dy) || 1;
            const reach = Math.min(1, dist / 260);
            const ox = (dx / dist * reach * this.AMPLITUDE_X).toFixed(1);
            const oy = (dy / dist * reach * this.AMPLITUDE_Y).toFixed(1);
            pupil.setAttribute('transform', `translate(${ox},${oy})`);
        });
    }

    _toSvg(e) {
        const pt = this.svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        return pt.matrixTransform(this.svg.getScreenCTM().inverse());
    }
}

// keep the CSS fade and the JS timeout on the same number
document.documentElement.style.setProperty('--face-fade', SETTINGS.FADE_MS + 'ms');
