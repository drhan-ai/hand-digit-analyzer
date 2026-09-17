(function () {
    const network = new NeuralNetwork();
    const drawingCanvas = new DrawingCanvas(document.getElementById('drawing-canvas'));
    const networkCanvas = document.getElementById('network-canvas');
    const visualizer = new NetworkVisualizer(networkCanvas);

    // How long ago someone last drew or cleared.
    // The idle check at the bottom of animate() compares against this.
    let lastInteraction = performance.now();
    function touched() { lastInteraction = performance.now(); }

    // The face a visitor meets first. Tapping it hands the page over to
    // the demo; the idle check below brings it back.
    // Timings (including the auto-return delay) are in js/face.js.
    const landing = new FaceLanding(document.getElementById('face-landing'), touched);

    const outputCards = document.getElementById('output-grid').querySelectorAll('.output-card');
    const btnClear = document.getElementById('btn-clear');
    const btnCheck = document.getElementById('btn-check');
    const sectionTitle = document.querySelector('.drawing-section .section-title');
    const TITLE_DRAW = sectionTitle.textContent;

    // STAGES. 'draw' is one big canvas on black; 'result' is the normal
    // page. What each looks like is entirely in style.css — this only
    // says which one is on. Nothing in the HTML moves between them.
    function setStage(next) {
        document.body.classList.toggle('stage-draw', next === 'draw');
        document.body.classList.toggle('stage-result', next === 'result');
    }

    setStage('draw');   // the face is on top of it until someone taps
    btnCheck.disabled = true;   // nothing drawn yet

    network.loadWeights();
    visualizer.setWeights(network);

    function updateOutputDisplay(activations) {
        let maxIdx = 0, maxVal = 0;
        for (let i = 0; i < 10; i++) {
            if (activations[i] > maxVal) { maxVal = activations[i]; maxIdx = i; }
        }
        outputCards.forEach((card) => {
            const digit = parseInt(card.dataset.digit);
            const confidence = activations[digit] || 0;
            card.querySelector('.confidence-fill').style.width = `${confidence * 100}%`;
            card.querySelector('.confidence-value').textContent = `${(confidence * 100).toFixed(1)}%`;
            card.classList.toggle('winner', digit === maxIdx && maxVal > 0.1);
        });
    }

    function resetOutputDisplay() {
        outputCards.forEach((card) => {
            card.querySelector('.confidence-fill').style.width = '0%';
            card.querySelector('.confidence-value').textContent = '0%';
            card.classList.remove('winner');
        });
    }

    function resetAll() {
        drawingCanvas.clear();
        btnCheck.disabled = true;    // nothing left to check
        network.reset();
        visualizer.update(network.hidden1Activations, network.hidden2Activations,
                          network.outputActivations);
        resetOutputDisplay();
    }

    // ----------------------------------------------------------------
    // What happens after Check digit: the drawing is centred, softened,
    // carried back into its card, and only then does the network light up
    // a layer at a time. Every duration below is SETTINGS, in js/face.js.
    // ----------------------------------------------------------------

    const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

    // run step(t) every frame for ms, with t travelling 0 -> 1
    function over(ms, step) {
        return new Promise((done) => {
            const start = performance.now();
            (function frame(now) {
                const t = Math.min(1, (now - start) / ms);
                step(t);
                if (t < 1) requestAnimationFrame(frame);
                else done();
            })(performance.now());
        });
    }

    // dark stand-ins, so a layer can be held back while the ones before it
    // are already lit. Sized from the loaded model, not hard-coded.
    const zerosH1 = new Float32Array(network.hidden1Activations.length);
    const zerosH2 = new Float32Array(network.hidden2Activations.length);
    const zerosOut = new Float32Array(network.outputActivations.length);

    function setBusy(on) {
        document.body.classList.toggle('is-busy', on);
        btnClear.disabled = on;
        btnCheck.disabled = on || drawingCanvas.isEmpty();
    }

    // The big canvas flies back to the size and place it has inside the
    // card: measure where it is, switch pages, measure again, then play
    // the difference out as a transform.
    function settleIntoCard() {
        const el = drawingCanvas.canvas;
        const from = el.getBoundingClientRect();
        setStage('result');
        const to = el.getBoundingClientRect();

        const scale = from.width / to.width;
        el.style.transformOrigin = 'top left';
        el.style.position = 'relative';
        el.style.zIndex = '950';
        el.style.transform =
            `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${scale})`;

        return new Promise((done) => {
            requestAnimationFrame(() => {
                el.style.transition = `transform ${SETTINGS.SETTLE_MS}ms ease`;
                el.style.transform = 'none';
                setTimeout(() => {
                    el.style.cssText = '';   // hand the canvas back to style.css
                    done();
                }, SETTINGS.SETTLE_MS);
            });
        });
    }

    async function runCheck() {
        setBusy(true);

        // fills stageRaw / stageCentered / stageBlurred and shiftX / shiftY
        const input = drawingCanvas.getPixels();
        network.forward(input);

        const { stageRaw, stageCentered, stageBlurred, shiftX, shiftY } = drawingCanvas;

        sectionTitle.textContent = 'Centering…';
        await over(SETTINGS.CENTER_MS, (t) => {
            drawingCanvas.renderStage(stageRaw, shiftX * t, shiftY * t);
        });

        sectionTitle.textContent = 'Smoothing…';
        const mixed = new Float32Array(784);
        await over(SETTINGS.SMOOTH_MS, (t) => {
            for (let i = 0; i < 784; i++) {
                mixed[i] = stageCentered[i] * (1 - t) + stageBlurred[i] * t;
            }
            drawingCanvas.renderStage(mixed);
        });

        sectionTitle.textContent = TITLE_DRAW;

        // the answer must not be sitting there before the network gets to it
        resetOutputDisplay();
        visualizer.update(zerosH1, zerosH2, zerosOut);

        await settleIntoCard();

        // On a narrow screen the results sit below the fold, and the reveal
        // would play where nobody can see it. Bring them up first.
        const results = document.querySelector('.panel-right');
        if (results.getBoundingClientRect().top > window.innerHeight * 0.5) {
            results.scrollIntoView({ behavior: 'smooth', block: 'start' });
            await sleep(350);
        }

        visualizer.update(network.hidden1Activations, zerosH2, zerosOut);
        await sleep(SETTINGS.LAYER_MS);
        visualizer.update(network.hidden1Activations, network.hidden2Activations, zerosOut);
        await sleep(SETTINGS.LAYER_MS);
        visualizer.update(network.hidden1Activations, network.hidden2Activations,
                          network.outputActivations);
        updateOutputDisplay(network.outputActivations);

        setBusy(false);
        touched();
    }

    btnCheck.addEventListener('click', () => {
        if (drawingCanvas.isEmpty()) return;
        touched();
        runCheck();
    });

    // Clear always empties the canvas. From the result page it is also
    // the way back to the big canvas, so a visitor can try another digit.
    btnClear.addEventListener('click', () => {
        resetAll();
        sectionTitle.textContent = TITLE_DRAW;
        setStage('draw');
        touched();
    });

    function animate() {
        if (drawingCanvas.dirty) {
            drawingCanvas.dirty = false;
            touched();               // pixels changed, so somebody is drawing
            drawingCanvas.render();
            btnCheck.disabled = drawingCanvas.isEmpty();

            if (!drawingCanvas.isEmpty() && network.loaded) {
                network.forward(drawingCanvas.getPixels());
                updateOutputDisplay(network.outputActivations);
                visualizer.update(network.hidden1Activations, network.hidden2Activations,
                                  network.outputActivations);
            }
        }
        // The network graphic is off screen during the drawing stage, where
        // its canvas measures 0 and the layout maths turns negative.
        if (networkCanvas.clientWidth > 0) visualizer.render();

        // AUTO-RETURN TO THE LANDING SCREEN.
        // To change the delay, edit SETTINGS.IDLE_RETURN_MS in js/face.js
        // (0 there switches this off). Nothing to change here.
        if (SETTINGS.IDLE_RETURN_MS > 0 && !landing.isVisible &&
            performance.now() - lastInteraction > SETTINGS.IDLE_RETURN_MS) {
            resetAll();              // next visitor should not see the last drawing
            sectionTitle.textContent = TITLE_DRAW;
            setStage('draw');        // ... and starts where the last one did
            landing.show();
        }

        requestAnimationFrame(animate);
    }

    animate();
})();
