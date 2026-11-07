<h1 align="center">Scramjet</h1>
<div align="center">
  <img src="assets/scramjet.png" height="200" />
</div>

<div align="center">
  <a href="https://www.npmjs.com/package/@mercuryworkshop/scramjet"><img src="https://img.shields.io/npm/v/@stringshot/proxswera.svg?maxAge=3600" alt="npm version" /></a>
  <img src="https://img.shields.io/github/issues/StringShot/Proxswera?style=flat&color=orange" />
  <img src="https://img.shields.io/github/stars/StringShot/Proxswera?style=flat&color=orange" />
</div>

---

Proxswera is an open-source browser and web proxy built upon Scramjet, designed to help users access the open web in environments affected by internet censorship and network restrictions.<br><br>
Proxswera builds on Scramjet's interception, rewriting, and sandboxing techniques, with ongoing development maintained through a combination of AI-assisted updates and human contributions. This collaborative approach aims to keep the project up to date while continually improving compatibility, performance, and reliability.<br><br>

<div align="center">
 <a href="https://github.com/MercuryWorkshop/scramjet/wiki">Documentation</a> | <a href="https://scramjet.mercurywork.shop">Playground</a> | <a href="https://discord.gg/tmApqGqfX2">Discord</a>
</div>

## Supported Sites

Some of the popular websites that Proxswera supports include:

- [Google](https://google.com)
- [Youtube](https://youtube.com)
- [Instagram](https://instagram.com)
- [ChatGPT](https://chatgpt.com)
- [Reddit](https://reddit.com)
- [Twitter](https://twitter.com)
- [Discord](https://discord.com)
- [Spotify](https://spotify.com)
- [GeForce NOW](https://play.geforcenow.com/)
- [now.gg](https://now.gg)

## Development

### Dependencies

- Recent versions of `node.js` and `pnpm`
- `rustup`
- `wasm-bindgen`
- [Binaryen's `wasm-opt`](https://github.com/WebAssembly/binaryen)
- [this `wasm-snip` fork](https://github.com/r58Playz/wasm-snip)

#### Building

- Clone the repository with `git clone --recursive https://github.com/StringShot/Proxswera`
- Install the dependencies with `pnpm i`
- Change directories with `cd packages/core`
- Build the rewriter with `pnpm rewriter:build`
- Build Scramjet with `pnpm build`

### Running Proxswera Locally

You can run the Proxswera dev server when running this command at the root

```sh
pnpm dev
```

The demo page for Proxswera should now be running at <http://localhost:4141> and should rebuild upon a file being changed (excluding the rewriter).
