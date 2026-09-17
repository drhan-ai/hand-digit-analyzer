# The four versions

The demo grew in four steps. Each is kept so they can be shown side by
side — at a booth, or to settle an argument about whether a step was an
improvement.

**Everything except the step itself is identical between them**: colours,
sizes, the header, the brush, the network graphic. A comparison shows the
step and nothing else.

| Version | Branch | Tag | What it adds |
|---|---|---|---|
| 1 | `v1-live` | `v1.0-live` | Nothing — the demo as it began. The network answers while you draw, restating its guess on every stroke. |
| 2 | `v2-landing` | `v2.0-landing` | A face greets the visitor. Tapping it hands over to version 1. It returns after 30 seconds untouched. |
| 3 | `v3-preprocessing` | `v3.0-preprocessing` | Drawing moves to one big square with a **Check digit** button. Pressing it shows the centring and smoothing every drawing goes through before the network sees it. |
| 4 | `v4-animation` | `v4.0-animation` | The prepared grid is read row by row, then the signal is watched travelling down the wires, a layer at a time. |

## Switching

One number decides which version a build is, at the top of `js/face.js`:

```js
const VERSION = 4;
```

Change it and reload. Nothing else moves. The three flags under it are
derived from it, and that is the whole mechanism:

```js
const FEATURES = {
    landing:     VERSION >= 2,
    stagedCheck: VERSION >= 3,
    scanAndFlow: VERSION >= 4,
};
```

## Going back to one

```bash
git checkout v2-landing        # the branch, which can still be worked on
git checkout v2.0-landing      # the tag, which is that moment exactly
```

A branch can move; a tag cannot. If a branch is ever changed by mistake,
the tag is still there.

## Carrying a fix across

Fix it once on `develop`, then bring it to each version:

```bash
git checkout v2-landing
git merge develop              # keep v2-landing's VERSION line
```

The only conflict will be that one line, because that is the only line
the branches disagree about.

## Live

Each branch has its own address once branch deploys are on in Netlify
(Project configuration → Build & deploy → Continuous deployment →
Branches and deploy contexts):

```
v1-live--mga-ai.netlify.app
v2-landing--mga-ai.netlify.app
v3-preprocessing--mga-ai.netlify.app
v4-animation--mga-ai.netlify.app
```

`mga-ai.netlify.app` stays whatever is on `main`.
