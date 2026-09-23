---
status: accepted
---

# React + React Three Fiber for the browser stack

The game is fully 3D in the browser with a lot of UI (speech bubbles, menus, the Tree) layered over the scene. We chose React + React Three Fiber + drei on Vite and TypeScript, in a pnpm workspace, over vanilla Three.js and Threlte. React's overlay and state model make in-world UI cheap, the ecosystem is the largest, and agents author it reliably. The cost is React's render overhead in hot paths, which we accept for a desktop-first game.
