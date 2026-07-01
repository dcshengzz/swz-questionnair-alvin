import { Component, ReactNode } from 'react';

export class PluginErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  override state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  override componentDidCatch(err: unknown) { console.error('Plugin render error:', err); }
  override render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}
