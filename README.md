# Watch Deep Learning Think — Computer Science, Middle Georgia State University

Handwritten-digit demo for recruiting events. A visitor draws a number and
watches a three-layer network decide what it is, neuron by neuron.

## Run it

Open `index.html` in any browser. No install, no server, no internet.
(If the page is blank, run `python -m http.server 8000` here and open
`localhost:8000`.)

## Design

Light theme following the mga.edu look: purple utility bar, white content
cards on a light gray field, purple accents.

Official MGA colors (brand guide):

| Role | Hex |
|---|---|
| MGA purple | `#633393` |
| Dark purple | `#42337E` |
| Gray | `#B0B6BB` |
| Light gray | `#C9CED1` |

One color is not from the brand: `#C2571F`, the warm accent used for
negative weights in the network graphic. Purple alone cannot show both
"votes for" and "votes against", and its complement gives the clearest
separation. It appears only inside the graphic.

## Logos

`img/mga-logo.png` — institutional logo, trimmed with the white background
knocked out. It is the only logo the page uses.

The MGA Knights athletics shield was removed. Athletics marks need
separate approval from the Athletics Department, so the page does not
carry one.

## Changing colors

Two places, and they must agree:

1. `style.css` — the `:root` block at the top (page UI)
2. `js/visualizer.js` — the `PALETTE` block at the top (network graphic,
   drawn on a canvas, so CSS has no effect on it)

The palette in `visualizer.js` is tuned for a light background: firing
neurons grow and take a solid ring rather than a glow, which smudges on
white.

## Retraining

    cd train
    python train_model_32_32.py

numpy only — no PyTorch, no GPU. Downloads MNIST on first run (12 MB) and
finishes in under a minute on a laptop CPU. Writes `../data/weights.js`.

Layer sizes are one line near the top:

    H1, H2 = 32, 32

Training applies a random ±2px shift to every image so off-centre drawings
still classify. Set `AUGMENT = False` to disable.

Current model: 784 → 32 → 32 → 10, 97.1% on the MNIST test set. The
in-browser forward pass was verified against the Python model and scores
the same (97.3% on a 300-image sample) at 0.11 ms per prediction.

## Files

| File | Role | Changed from original? |
|---|---|---|
| `index.html` | Structure and copy | Rewritten |
| `style.css` | Light theme | Rewritten |
| `js/visualizer.js` | Network graphic (canvas) | Rewritten: top-to-bottom, three layers |
| `js/network.js` | Forward pass, 784 → 32 → 32 → 10 | Rewritten for three layers |
| `js/main.js` | Init, event wiring, animation loop | Passes both hidden layers |
| `js/canvas.js` | Drawing + preprocessing (center-of-mass alignment, blur) | Unchanged |
| `data/weights.js` | Trained weights | Retrained, 32-32, 97.1% |
| `train/train_model_32_32.py` | Training script | New |

## Attribution

Based on [How AI Sees Numbers](https://github.com/williankeller/neural-network-numbers)
by Willian Keller. Rebuilt with a three-layer network and retrained on MNIST
for the Computer Science program, Middle Georgia State University.

The upstream repository ships no LICENSE file. Classroom and outreach use is
normally uncontroversial, but before putting this on the public web, ask the
author to state a license.
