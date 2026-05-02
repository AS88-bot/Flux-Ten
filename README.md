# Flux Ten: An Interactive Particle Countdown

**[Live Demo](https://flux-ten-581657913143.asia-east1.run.app)**

A premium, cinematic interactive web experience featuring thousands of physics-based glowing particles that form a living countdown.

## 🌟 Overview

**Flux Ten** is a high-end visual demonstration inspired by major global tech event keynotes. It transforms a standard numeric countdown into a fluid, organic simulation where each digit is composed of thousands of reactive particles.

## ✨ Key Features

- **Living Particles**: Over 3,000 individual particles with integrated physics (friction, repulsion, attraction).
- **Interactive Response**: Particles smoothly repel away from mouse/touch movement and exhibit a natural "magnetic" return to their original positions.
- **Cinematic Transitions**: Each number change triggers an outward dispersion followed by a controlled vortex/swirl motion before re-forming the next digit.
- **Visual Depth**: Multi-layer rendering system with sharp, responsive foreground particles and smaller, blurred background layers for a sense of atmosphere.
- **Dynamic Camera**: Subtle parallax and camera drift synchronized with cursor movement for a focused, high-end feel.
- **Immersive Audio**: Procedural, futuristic sound effects generated via the Web Audio API that sync perfectly with numeric transitions.
- **Polished HUD**: A minimal, technical user interface (HUD) overlay providing context and status information.

## 🛠️ Technical Stack

- **Framework**: React 19 + TypeScript
- **Rendering**: HTML5 Canvas (High performance)
- **Styling**: Tailwind CSS
- **Interactions**: Custom physics engine with `requestAnimationFrame` optimization.
- **Audio**: Web Audio API (Synthesized procedural whooshes and shimmers)

## 🚀 Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Development Server**:
   ```bash
   npm run dev
   ```

3. **Production Build**:
   ```bash
   npm run build
   ```

## 🎨 Design Philosophy

The project prioritizes **refinement over complexity**. The color palette is intentionally restrained, using a gradient of electric blue, violet, and soft pink against a deep navy background. The motion is governed by ease-in-out functions to ensure every movement feels intentional and cinematic.

## 📂 Project Structure

- `src/components/ParticleCanvas.tsx`: The core logic for simulation, rendering, and interaction.
- `src/services/soundService.ts`: Procedural audio generation using the Web Audio API.
- `src/index.css`: Global theme definitions and typography.
