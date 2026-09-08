"use client";

import { Component, type ReactNode } from "react";

interface Props {
  fallback: ReactNode;
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/**
 * WebGL context creation (and other three.js/R3F setup) can throw synchronously
 * during mount — e.g. no GPU, WebGL disabled, a headless/sandboxed browser.
 * React error boundaries are the only way to catch that and recover; there's no
 * hook equivalent. Swaps to `fallback` (the static backdrop) instead of taking
 * the whole hero down.
 */
export class HeroCanvasBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[hero] 3D terrain canvas failed, falling back to static backdrop:", error);
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
