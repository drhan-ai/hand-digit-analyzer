(function () {
    const network = new NeuralNetwork();
    const drawingCanvas = new DrawingCanvas(document.getElementById('drawing-canvas'));
    const networkCanvas = document.getElementById('network-canvas');
    const visualizer = new NetworkVisualizer(networkCanvas);

    // How long ago someone last drew, cleared, or moved the brush slider.
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
    const brushSlider = document.getElementById('brush-size');

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

    btnCheck.addEventListener('click', () => {
        if (drawingCanvas.isEmpty()) return;
        touched();
        setStage('result');
    });

    // Clear always empties the canvas. From the result page it is also
    // the way back to the big canvas, so a visitor can try another digit.
    btnClear.addEventListener('click', () => {
        resetAll();
        setStage('draw');
        touched();
    });

    brushSlider.addEventListener('input', (e) => {
        drawingCanvas.setBrushSize(parseFloat(e.target.value));
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
            setStage('draw');        // ... and starts where the last one did
            landing.show();
        }

        requestAnimationFrame(animate);
    }

    animate();
})();
