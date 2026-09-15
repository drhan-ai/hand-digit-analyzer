/**
 * 784 -> 32 -> 32 -> 10 feedforward network.
 *
 * Runs entirely in the browser. No libraries, no server: the whole
 * "prediction" is two ReLU layers and a softmax, about 26,000
 * multiply-adds, which takes well under a millisecond.
 */
class NeuralNetwork {
    constructor() {
        this.loaded = false;
        this.arch = [784, 32, 32, 10];
        this.W1 = null; this.b1 = null;
        this.W2 = null; this.b2 = null;
        this.W3 = null; this.b3 = null;

        this.hidden1Activations = new Float32Array(32);
        this.hidden2Activations = new Float32Array(32);
        this.outputActivations = new Float32Array(10);
    }

    loadWeights() {
        const d = PRETRAINED_WEIGHTS;
        this.arch = d.architecture || [784, 32, 32, 10];
        this.W1 = d.W1; this.b1 = d.b1;
        this.W2 = d.W2; this.b2 = d.b2;
        this.W3 = d.W3; this.b3 = d.b3;

        this.h1Size = this.arch[1];
        this.h2Size = this.arch[2];
        this.hidden1Activations = new Float32Array(this.h1Size);
        this.hidden2Activations = new Float32Array(this.h2Size);
        this.loaded = true;
    }

    /** dense layer + ReLU */
    _reluLayer(input, W, b, outSize) {
        const out = new Float32Array(outSize);
        for (let j = 0; j < outSize; j++) {
            let sum = b[j];
            for (let i = 0; i < input.length; i++) sum += input[i] * W[i][j];
            out[j] = sum > 0 ? sum : 0;
        }
        return out;
    }

    forward(pixels) {
        if (!this.loaded) return this.outputActivations;

        const h1 = this._reluLayer(pixels, this.W1, this.b1, this.h1Size);
        const h2 = this._reluLayer(h1, this.W2, this.b2, this.h2Size);
        this.hidden1Activations = h1;
        this.hidden2Activations = h2;

        // output layer + softmax
        const logits = new Float32Array(10);
        let maxVal = -Infinity;
        for (let j = 0; j < 10; j++) {
            let sum = this.b3[j];
            for (let i = 0; i < this.h2Size; i++) sum += h2[i] * this.W3[i][j];
            logits[j] = sum;
            if (sum > maxVal) maxVal = sum;
        }
        let expSum = 0;
        for (let j = 0; j < 10; j++) {
            logits[j] = Math.exp(logits[j] - maxVal);
            expSum += logits[j];
        }
        for (let j = 0; j < 10; j++) logits[j] /= expSum;

        this.outputActivations = logits;
        return logits;
    }

    getPrediction() {
        let maxIdx = 0, maxVal = this.outputActivations[0];
        for (let i = 1; i < 10; i++) {
            if (this.outputActivations[i] > maxVal) {
                maxVal = this.outputActivations[i];
                maxIdx = i;
            }
        }
        return { digit: maxIdx, confidence: maxVal };
    }

    reset() {
        this.hidden1Activations.fill(0);
        this.hidden2Activations.fill(0);
        this.outputActivations.fill(0);
    }
}
