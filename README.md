# Abell Model 3D Generator

A web app to create, edit, and visualize 3D boxes on the Abell model quickly and interactively.

## Overview

This project lets you:

- define model axes (x customers, y needs, z modalities/technologies),
- add multiple boxes with custom origin and size,
- assign a color to each box,
- use zoom and pan on the canvas,
- save and load configurations in JSON format.

## Local Demo

This is a static project and does not require a build step.

1. Clone or download the repository.
2. Open [index.html](index.html) in your browser.

Alternatively, you can run a small local server (recommended for development):

1. `python3 -m http.server 8000`
2. Open `http://localhost:8000`

## Project Structure

- [index.html](index.html): user interface.
- [css/styles.css](css/styles.css): main styling.
- [js/app.js](js/app.js): application logic and canvas rendering.

## Credits

Created by EhiPi with the help of his friend Claude Code.

## License

Free use is allowed for personal and educational purposes only.
Commercial use is not allowed without explicit authorization from the author.
