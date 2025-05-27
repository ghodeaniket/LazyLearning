import type { ComponentType } from 'react';
import type { DynamicComponentProps } from '../types/renderer';

export class ComponentRegistry {
  private components: Map<string, ComponentType<DynamicComponentProps>> = new Map();

  register(type: string, component: ComponentType<DynamicComponentProps>): void {
    this.components.set(type, component);
  }

  get(type: string): ComponentType<DynamicComponentProps> | undefined {
    return this.components.get(type);
  }

  has(type: string): boolean {
    return this.components.has(type);
  }

  // Get all registered component types
  getTypes(): string[] {
    return Array.from(this.components.keys());
  }

  // Clear all registrations (useful for testing)
  clear(): void {
    this.components.clear();
  }
}
