# Contributing

Thanks for your interest in contributing to **How AI Sees Numbers**! This project is intentionally simple — vanilla JS, no build tools, no dependencies — and we'd like to keep it that way.

## Ground Rules

- **No frameworks or build tools.** The project must remain a set of static files you can open directly in a browser. No React, no Webpack, no npm.
- **No external JS dependencies.** Everything runs with vanilla JavaScript. The only external resources are Google Fonts.
- **Keep it simple.** This is an educational tool. Code should be readable by someone learning about neural networks.

## Ways to Contribute

### Bug Fixes

If something doesn't work — drawing doesn't respond, predictions are wrong, visualization glitches — please open an issue or submit a fix.

### Improvements We'd Love

- **Touch/mobile improvements:** Better drawing experience on phones and tablets
- **Accessibility:** Screen reader support, keyboard navigation, high-contrast mode
- **Visualization enhancements:** New ways to show what the network is doing (e.g., weight heatmaps, input saliency, per-neuron feature visualization)
- **Performance:** Faster forward pass (e.g., using typed arrays more aggressively)
- **Training script improvements:** Better accuracy, training visualization, different architectures

### Things to Avoid

- Adding npm, webpack, or any build step
- Adding external JS libraries
- Over-engineering simple code
- Changing the architecture in a way that breaks the visualizer without updating it

## How to Submit Changes

1. Fork the repository
2. Create a branch for your change (`git checkout -b my-change`)
3. Make your changes
4. Test by opening `index.html` directly in a browser (no server) — make sure everything works
5. If you changed the training script, re-train and include the updated `data/weights.js` and `data/weights.json`
6. Submit a pull request with a clear description of what you changed and why

## Development Setup

There's nothing to install. Clone the repo and open `index.html`.

If you're working on the training script:

```bash
pip install numpy
cd train
python train_model.py
cd ..
echo "const PRETRAINED_WEIGHTS = $(cat data/weights.json);" > data/weights.js
```

## Code Style

- Use `const` and `let`, not `var`
- Use classes for major components (`NeuralNetwork`, `DrawingCanvas`, `NetworkVisualizer`)
- Keep functions short and focused
- Comment non-obvious math (activation functions, weight updates, etc.) but don't over-comment
- Match the existing formatting — 4-space indentation, single quotes in JS

## Reporting Issues

When reporting a bug, include:

- What browser and OS you're using
- Whether you opened `index.html` directly or through a server
- What you expected to happen vs. what actually happened
- A screenshot if it's a visual issue

## Questions?

Open an issue with the "question" label. We're happy to help.
