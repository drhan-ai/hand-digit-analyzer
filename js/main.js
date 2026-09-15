(function () {
    const network = new NeuralNetwork();
    const drawingCanvas = new DrawingCanvas(document.getElementById('drawing-canvas'));
    const visualizer = new NetworkVisualizer(document.getElementById('network-canvas'));

    const outputCards = document.getElementById('output-grid').querySelectorAll('.output-card');
    const btnClear = document.getElementById('btn-clear');
    const brushSlider = document.getElementById('brush-size');

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

    btnClear.addEventListener('click', () => {
        drawingCanvas.clear();
        network.reset();
        visualizer.update(network.hidden1Activations, network.hidden2Activations,
                          network.outputActivations);
        resetOutputDisplay();
    });

    brushSlider.addEventListener('input', (e) => {
        drawingCanvas.setBrushSize(parseFloat(e.target.value));
    });

    function animate() {
        if (drawingCanvas.dirty) {
            drawingCanvas.dirty = false;
            drawingCanvas.render();

            if (!drawingCanvas.isEmpty() && network.loaded) {
                network.forward(drawingCanvas.getPixels());
                updateOutputDisplay(network.outputActivations);
                visualizer.update(network.hidden1Activations, network.hidden2Activations,
                                  network.outputActivations);
            }
        }
        visualizer.render();
        requestAnimationFrame(animate);
    }

    animate();
})();
