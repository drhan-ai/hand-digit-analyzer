class DrawingCanvas {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');

        // Internal resolution is 28x28
        this.gridSize = 28;
        this.pixels = new Float32Array(784);

        // Set internal canvas size
        this.canvas.width = 280;
        this.canvas.height = 280;
        this.cellSize = this.canvas.width / this.gridSize;

        this.drawing = false;
        this.brushSize = 2;
        this.lastPos = null;
        this.dirty = false;

        this._bindEvents();
        this.render();
    }

    _bindEvents() {
        const getPos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            let clientX, clientY;
            if (e.touches) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }
            return {
                x: (clientX - rect.left) * scaleX / this.cellSize,
                y: (clientY - rect.top) * scaleY / this.cellSize,
            };
        };

        const startDraw = (e) => {
            e.preventDefault();
            this.drawing = true;
            this.lastPos = getPos(e);
            this._paint(this.lastPos.x, this.lastPos.y);
        };

        const moveDraw = (e) => {
            e.preventDefault();
            if (!this.drawing) return;
            const pos = getPos(e);
            this._interpolate(this.lastPos, pos);
            this.lastPos = pos;
        };

        const endDraw = (e) => {
            e.preventDefault();
            this.drawing = false;
            this.lastPos = null;
        };

        this.canvas.addEventListener('mousedown', startDraw);
        this.canvas.addEventListener('mousemove', moveDraw);
        this.canvas.addEventListener('mouseup', endDraw);
        this.canvas.addEventListener('mouseleave', endDraw);

        this.canvas.addEventListener('touchstart', startDraw, { passive: false });
        this.canvas.addEventListener('touchmove', moveDraw, { passive: false });
        this.canvas.addEventListener('touchend', endDraw);
    }

    _interpolate(from, to) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.max(1, Math.ceil(dist * 2));
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            this._paint(from.x + dx * t, from.y + dy * t);
        }
    }

    _paint(cx, cy) {
        const r = this.brushSize;
        const minX = Math.floor(cx - r);
        const maxX = Math.ceil(cx + r);
        const minY = Math.floor(cy - r);
        const maxY = Math.ceil(cy + r);

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (x < 0 || x >= 28 || y < 0 || y >= 28) continue;
                const dx = x + 0.5 - cx;
                const dy = y + 0.5 - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < r) {
                    const intensity = Math.max(0, 1 - dist / r);
                    const idx = y * 28 + x;
                    this.pixels[idx] = Math.min(1, this.pixels[idx] + intensity * 0.8);
                }
            }
        }
        this.dirty = true;
    }

    getPixels() {
        // Center the drawing based on center of mass, matching MNIST preprocessing
        const centered = new Float32Array(784);
        let totalMass = 0, comX = 0, comY = 0;

        for (let y = 0; y < 28; y++) {
            for (let x = 0; x < 28; x++) {
                const v = this.pixels[y * 28 + x];
                totalMass += v;
                comX += x * v;
                comY += y * v;
            }
        }

        if (totalMass > 0) {
            // Shift so center of mass lands at grid center (13.5, 13.5)
            const shiftX = Math.round(13.5 - comX / totalMass);
            const shiftY = Math.round(13.5 - comY / totalMass);

            for (let y = 0; y < 28; y++) {
                for (let x = 0; x < 28; x++) {
                    const srcX = x - shiftX;
                    const srcY = y - shiftY;
                    if (srcX >= 0 && srcX < 28 && srcY >= 0 && srcY < 28) {
                        centered[y * 28 + x] = this.pixels[srcY * 28 + srcX];
                    }
                }
            }
        }

        // Apply light Gaussian blur to match MNIST style
        const blurred = new Float32Array(784);
        const kernel = [
            [1, 2, 1],
            [2, 4, 2],
            [1, 2, 1],
        ];
        const kSum = 16;

        for (let y = 0; y < 28; y++) {
            for (let x = 0; x < 28; x++) {
                let sum = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const py = Math.min(27, Math.max(0, y + ky));
                        const px = Math.min(27, Math.max(0, x + kx));
                        sum += centered[py * 28 + px] * kernel[ky + 1][kx + 1];
                    }
                }
                blurred[y * 28 + x] = sum / kSum;
            }
        }
        return blurred;
    }

    clear() {
        this.pixels.fill(0);
        this.dirty = true;
    }

    isEmpty() {
        for (let i = 0; i < 784; i++) {
            if (this.pixels[i] > 0.01) return false;
        }
        return true;
    }

    render() {
        const ctx = this.ctx;
        const cs = this.cellSize;

        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid lines
        ctx.strokeStyle = 'rgba(42, 42, 58, 0.3)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 28; i++) {
            ctx.beginPath();
            ctx.moveTo(i * cs, 0);
            ctx.lineTo(i * cs, this.canvas.height);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * cs);
            ctx.lineTo(this.canvas.width, i * cs);
            ctx.stroke();
        }

        // Draw pixels
        for (let y = 0; y < 28; y++) {
            for (let x = 0; x < 28; x++) {
                const v = this.pixels[y * 28 + x];
                if (v > 0.01) {
                    const brightness = Math.floor(v * 255);
                    ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
                    ctx.fillRect(x * cs, y * cs, cs, cs);
                }
            }
        }
    }

    setBrushSize(size) {
        this.brushSize = size;
    }
}
