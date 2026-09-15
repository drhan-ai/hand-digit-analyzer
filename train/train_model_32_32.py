#!/usr/bin/env python3
"""
Train a 784 -> 32 -> 32 -> 10 network on MNIST and export weights
for the browser visualisation.

Only numpy is required. Backprop is written out by hand, so there is
no PyTorch / TensorFlow install and no GPU.

    python train_model_32_32.py

Writes ../data/weights.json and ../data/weights.js
"""
import numpy as np, gzip, struct, json, os, urllib.request

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MNIST_DIR = os.path.join(SCRIPT_DIR, 'mnist_data')
OUT_DIR = os.path.join(SCRIPT_DIR, '..', 'data')

H1, H2 = 32, 32          # <-- layer sizes live here
EPOCHS, BATCH, LR = 30, 128, 0.2
AUGMENT = True           # random shifts, so off-centre drawings still work

URLS = {
    'train_images': 'https://github.com/golbin/TensorFlow-MNIST/raw/master/mnist/data/train-images-idx3-ubyte.gz',
    'train_labels': 'https://github.com/golbin/TensorFlow-MNIST/raw/master/mnist/data/train-labels-idx1-ubyte.gz',
    'test_images':  'https://github.com/golbin/TensorFlow-MNIST/raw/master/mnist/data/t10k-images-idx3-ubyte.gz',
    'test_labels':  'https://github.com/golbin/TensorFlow-MNIST/raw/master/mnist/data/t10k-labels-idx1-ubyte.gz',
}


def download():
    os.makedirs(MNIST_DIR, exist_ok=True)
    for name, url in URLS.items():
        p = os.path.join(MNIST_DIR, f'{name}.gz')
        if not os.path.exists(p):
            print(f'downloading {name} ...')
            urllib.request.urlretrieve(url, p)


def load_images(p):
    with gzip.open(p, 'rb') as f:
        _, n, r, c = struct.unpack('>IIII', f.read(16))
        return np.frombuffer(f.read(), np.uint8).reshape(n, r * c).astype(np.float32) / 255.0


def load_labels(p):
    with gzip.open(p, 'rb') as f:
        struct.unpack('>II', f.read(8))
        return np.frombuffer(f.read(), np.uint8)


def shift_batch(X, max_shift=2):
    """Random ±2px translation. Visitors never draw dead centre."""
    imgs = X.reshape(-1, 28, 28)
    out = np.zeros_like(imgs)
    dx = np.random.randint(-max_shift, max_shift + 1, len(imgs))
    dy = np.random.randint(-max_shift, max_shift + 1, len(imgs))
    for i in range(len(imgs)):
        out[i] = np.roll(np.roll(imgs[i], dy[i], 0), dx[i], 1)
    return out.reshape(len(imgs), 784)


class Net:
    def __init__(self, sizes):
        self.sizes = sizes
        self.W, self.b = [], []
        for a, z in zip(sizes[:-1], sizes[1:]):
            self.W.append(np.random.randn(a, z).astype(np.float32) * np.sqrt(2.0 / a))
            self.b.append(np.zeros(z, dtype=np.float32))

    def forward(self, X):
        self.z, self.a = [], [X]
        h = X
        for i in range(len(self.W)):
            zi = h @ self.W[i] + self.b[i]
            self.z.append(zi)
            h = np.maximum(0, zi) if i < len(self.W) - 1 else self._softmax(zi)
            self.a.append(h)
        return h

    @staticmethod
    def _softmax(x):
        e = np.exp(x - x.max(axis=1, keepdims=True))
        return e / e.sum(axis=1, keepdims=True)

    def backward(self, y_onehot, lr):
        m = y_onehot.shape[0]
        d = self.a[-1] - y_onehot
        for i in range(len(self.W) - 1, -1, -1):
            dW = (self.a[i].T @ d) / m
            db = d.mean(axis=0)
            if i > 0:
                d = (d @ self.W[i].T) * (self.z[i - 1] > 0)
            self.W[i] -= lr * dW
            self.b[i] -= lr * db

    def accuracy(self, X, y):
        return (self.forward(X).argmax(1) == y).mean()

    def train(self, Xtr, ytr, Xte, yte, epochs, batch, lr):
        onehot = np.eye(10, dtype=np.float32)[ytr]
        best = 0.0
        for ep in range(epochs):
            idx = np.random.permutation(len(Xtr))
            Xs, ys = Xtr[idx], onehot[idx]
            if AUGMENT:
                Xs = shift_batch(Xs)
            for i in range(0, len(Xs), batch):
                self.forward(Xs[i:i + batch])
                self.backward(ys[i:i + batch], lr)
            lr *= 0.95
            acc = self.accuracy(Xte, yte)
            best = max(best, acc)
            print(f'  epoch {ep + 1:2d}/{epochs}   test accuracy {acc:.4f}')
        return best

    def export(self, out_dir):
        os.makedirs(out_dir, exist_ok=True)
        r = lambda a: np.round(a, 4).tolist()
        payload = {
            'architecture': self.sizes,
            'W1': r(self.W[0]), 'b1': r(self.b[0]),
            'W2': r(self.W[1]), 'b2': r(self.b[1]),
            'W3': r(self.W[2]), 'b3': r(self.b[2]),
        }
        jpath = os.path.join(out_dir, 'weights.json')
        with open(jpath, 'w') as f:
            json.dump(payload, f)
        with open(os.path.join(out_dir, 'weights.js'), 'w') as f:
            f.write('const PRETRAINED_WEIGHTS = ')
            json.dump(payload, f)
            f.write(';\n')
        print(f'  weights.json  {os.path.getsize(jpath) / 1024:.0f} KB')


if __name__ == '__main__':
    np.random.seed(42)
    download()
    Xtr = load_images(os.path.join(MNIST_DIR, 'train_images.gz'))
    ytr = load_labels(os.path.join(MNIST_DIR, 'train_labels.gz'))
    Xte = load_images(os.path.join(MNIST_DIR, 'test_images.gz'))
    yte = load_labels(os.path.join(MNIST_DIR, 'test_labels.gz'))
    print(f'train {Xtr.shape}  test {Xte.shape}')

    net = Net([784, H1, H2, 10])
    print(f'architecture 784 -> {H1} -> {H2} -> 10   augment={AUGMENT}')
    net.train(Xtr, ytr, Xte, yte, EPOCHS, BATCH, LR)
    print(f'final: {net.accuracy(Xte, yte):.4f}')
    net.export(OUT_DIR)
