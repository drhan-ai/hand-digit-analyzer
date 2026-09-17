// ---------------------------------------------------------------
// PALETTE — colors of the network graphic.
// Canvas-drawn, so CSS cannot restyle it. Keep in sync with :root
// in style.css. Tuned for a LIGHT background.
//   active   = a neuron firing            (MGA purple #633393)
//   positive = weight pushing a digit UP  (purple)
//   negative = weight pushing it DOWN     (warm accent, for contrast)
// ---------------------------------------------------------------
const PALETTE = {
    active:   [99, 51, 147],
    inactive: [214, 210, 222],
    positive: [99, 51, 147],
    negative: [194, 87, 31],
    ring:     [170, 164, 184],
    accentHex: '#633393',
    labelHex:  '#5C5470',
    mutedHex:  '#8C85A0',
    bgHex:     '#FFFFFF',
    font:      '"Montserrat", sans-serif',
    mono:      '"JetBrains Mono", monospace',
};
const A = PALETTE.active, I = PALETTE.inactive, P = PALETTE.positive,
      N = PALETTE.negative, R = PALETTE.ring;
const ACCENT_HEX = PALETTE.accentHex, LABEL_HEX = PALETTE.labelHex,
      LABEL_MUTED = PALETTE.mutedHex, BG_HEX = PALETTE.bgHex,
      LABEL_FONT = PALETTE.font, MONO_FONT = PALETTE.mono;

/**
 * Top-to-bottom network graphic.
 *
 *   hidden 1   ● ● ● ● ● ● ● ● ...        32 neurons
 *   hidden 2   ● ● ● ● ● ● ● ● ...        32 neurons
 *   output     ⓪ ① ② ③ ④ ⑤ ⑥ ⑦ ⑧ ⑨       10 digits
 *
 * Drawn on a <canvas>, so CSS cannot restyle any of it. Colors live in
 * the PALETTE block at the top of this file.
 */
class NetworkVisualizer {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.h1 = new Float32Array(32);
        this.h2 = new Float32Array(32);
        this.out = new Float32Array(10);
        this.weights = null;
        this.conn12 = [];   // hidden 1 -> hidden 2
        this.conn23 = [];   // hidden 2 -> output
    }

    setWeights(network) {
        this.setFlow();      // nothing is travelling until someone says so
        this.weights = network;
        this.h1Size = network.h1Size || 32;
        this.h2Size = network.h2Size || 32;
        this.conn12 = this._topOf(network.W2, this.h1Size, this.h2Size, 55);
        this.conn23 = this._topOf(network.W3, this.h2Size, 10, 90);
    }

    /** keep only the strongest `keep` weights — drawing all of them is unreadable */
    _topOf(W, rows, cols, keep) {
        if (!W) return [];
        const all = [];
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                all.push({ from: i, to: j, weight: W[i][j], magnitude: Math.abs(W[i][j]) });
            }
        }
        all.sort((a, b) => b.magnitude - a.magnitude);
        return all.slice(0, keep);
    }

    update(h1, h2, out) {
        this.h1 = h1;
        this.h2 = h2;
        this.out = out;
    }

    /**
     * How far the signal has travelled down each set of wires, 0 to 1.
     * Below 1 the wires are drawn only as far as it has reached and their
     * dashes march, so a layer is seen arriving rather than appearing.
     * Both default to 1 — fully arrived — which is every other moment.
     */
    setFlow(toHidden2 = 1, toOutput = 1) {
        this.flow12 = toHidden2;
        this.flow23 = toOutput;
    }

    render() {
        const ctx = this.ctx;
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const w = rect.width, h = rect.height;
        ctx.fillStyle = BG_HEX;
        ctx.fillRect(0, 0, w, h);

        const pad = 34;
        const y1 = 46;              // hidden 1
        const y2 = h * 0.52;        // hidden 2
        const y3 = h - 52;          // output

        const winner = this._winner();

        this._connections(ctx, this.conn12, this.h1, w, pad, y1, y2, this.h1Size, this.h2Size, 5, -1, 0.45, this.flow12);
        this._connections(ctx, this.conn23, this.h2, w, pad, y2, y3, this.h2Size, 10, 7, winner, 1, this.flow23);

        this._hiddenRow(ctx, this.h1, w, pad, y1, this.h1Size);
        this._hiddenRow(ctx, this.h2, w, pad, y2, this.h2Size);
        this._outputRow(ctx, w, pad, y3, winner);

        ctx.fillStyle = LABEL_MUTED;
        ctx.font = '10px ' + LABEL_FONT;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(`HIDDEN 1  (${this.h1Size} neurons, ReLU)`, pad, y1 - 20);
        ctx.fillText(`HIDDEN 2  (${this.h2Size} neurons, ReLU)`, pad, y2 - 20);
        ctx.fillText('OUTPUT  (10 digits, Softmax)', pad, y3 - 26);
    }

    _winner() {
        let idx = 0, best = 0;
        for (let i = 0; i < 10; i++) {
            if (this.out[i] > best) { best = this.out[i]; idx = i; }
        }
        return best > 0.1 ? idx : -1;
    }

    _x(i, n, w, pad) {
        return n <= 1 ? w / 2 : pad + i * ((w - pad * 2) / (n - 1));
    }

    /**
     * `winner` >= 0 means: draw only the edges arriving at that digit brightly
     * and fade everything else. That is what makes the picture readable —
     * you can see which neurons voted for the answer.
     */
    _connections(ctx, list, acts, w, pad, yA, yB, nA, nB, radius, winner, dim = 1, flow = 1) {
        // Mid-flight: show the wires only as far down as the signal has got,
        // and march the dashes so the direction of travel is visible.
        const travelling = flow < 1;
        if (travelling) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, yA, w, (yB - yA + radius + 8) * flow);
            ctx.clip();
        }

        ctx.setLineDash([5, 3]);
        if (travelling) ctx.lineDashOffset = -(performance.now() / 45) % 8;
        for (const c of list) {
            const focused = winner < 0 || c.to === winner;
            const act = acts[c.from] || 0;
            const strength = Math.min(act * c.magnitude * 2, 1);

            const alpha = (focused ? 0.16 + strength * 0.68 : 0.05 + strength * 0.06) * dim;
            const col = c.weight > 0 ? P : N;
            ctx.strokeStyle = `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${alpha})`;
            ctx.lineWidth = focused ? 1.4 : 0.8;

            const xA = this._x(c.from, nA, w, pad);
            const xB = this._x(c.to, nB, w, pad);
            ctx.beginPath();
            ctx.moveTo(xA, yA + 7);
            ctx.bezierCurveTo(xA, (yA + yB) / 2, xB, (yA + yB) / 2, xB, yB - radius);
            ctx.stroke();
        }

        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;
        if (travelling) ctx.restore();
    }

    _hiddenRow(ctx, acts, w, pad, y, n) {
        const spacing = (w - pad * 2) / (n - 1);
        const r = Math.min(spacing * 0.32, 7);
        for (let i = 0; i < n; i++) {
            const x = this._x(i, n, w, pad);
            const a = Math.min((acts[i] || 0) / 3, 1);
            const cr = Math.round(I[0] + (A[0] - I[0]) * a);
            const cg = Math.round(I[1] + (A[1] - I[1]) * a);
            const cb = Math.round(I[2] + (A[2] - I[2]) * a);

            // A firing neuron grows slightly and gains a solid ring. On a light
            // background that reads far better than a glow, which just smudges.
            ctx.beginPath();
            ctx.arc(x, y, r + a * 2.2, 0, Math.PI * 2);
            ctx.fillStyle = `rgb(${cr}, ${cg}, ${cb})`;
            ctx.fill();

            ctx.strokeStyle = `rgba(${R[0]}, ${R[1]}, ${R[2]}, ${0.55 + a * 0.45})`;
            ctx.lineWidth = a > 0.35 ? 1.6 : 1;
            ctx.stroke();
        }
    }

    _outputRow(ctx, w, pad, y, winner) {
        const rBase = 17;
        for (let i = 0; i < 10; i++) {
            const x = this._x(i, 10, w, pad);
            const a = this.out[i] || 0;
            const isWin = i === winner;
            const r = isWin ? rBase + 8 : rBase;

            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            if (isWin) {
                ctx.fillStyle = `rgb(${A[0]}, ${A[1]}, ${A[2]})`;
            } else {
                ctx.fillStyle = `rgba(${I[0]}, ${I[1]}, ${I[2]}, ${0.45 + a * 0.55})`;
            }
            ctx.fill();

            ctx.strokeStyle = isWin ? ACCENT_HEX
                : `rgba(${R[0]}, ${R[1]}, ${R[2]}, ${0.3 + a * 0.5})`;
            ctx.lineWidth = isWin ? 2 : 1;
            ctx.stroke();

            ctx.fillStyle = isWin ? '#FFFFFF' : LABEL_HEX;
            ctx.font = `${isWin ? '600' : '400'} ${isWin ? 21 : 13}px ` + MONO_FONT;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(i), x, y);

            if (a > 0.01) {
                ctx.beginPath();
                ctx.arc(x, y, r + 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * a);
                ctx.strokeStyle = isWin
                    ? `rgba(${A[0]}, ${A[1]}, ${A[2]}, ${0.6 + a * 0.4})`
                    : `rgba(${P[0]}, ${P[1]}, ${P[2]}, ${a * 0.6})`;
                ctx.lineWidth = isWin ? 3 : 2;
                ctx.stroke();
            }
        }
    }
}
