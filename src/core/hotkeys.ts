export type HotkeyHandler = (event: KeyboardEvent) => void;

export interface HotkeyOptions {
  once?: boolean;
  description?: string;
  allowWhileTyping?: boolean;
}

interface Binding {
  handler: HotkeyHandler;
  options: HotkeyOptions;
  triggered?: boolean;
}

const bindings = new Map<string, Set<Binding>>();
let teardown: (() => void) | null = null;

function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

function isInputElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
  return target.isContentEditable;
}

export function isInputFocused(): boolean {
  if (typeof document === 'undefined') return false;
  const active = document.activeElement;
  return isInputElement(active);
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.defaultPrevented) return;
  const key = normalizeKey(event.key);
  const bucket = bindings.get(key);
  if (!bucket || bucket.size === 0) return;
  const allowWhileTyping = Array.from(bucket).some(
    (binding) => binding.options.allowWhileTyping
  );
  if (!allowWhileTyping && isInputElement(event.target)) return;
  bucket.forEach((binding) => {
    binding.handler(event);
    if (binding.options.once) {
      bucket.delete(binding);
    }
    binding.triggered = true;
  });
  if (bucket.size === 0) {
    bindings.delete(key);
  }
  if (!event.defaultPrevented) {
    event.preventDefault();
  }
}

export function initHotkeys(): void {
  if (teardown) return;
  if (typeof window === 'undefined') return;
  const listener = (event: KeyboardEvent) => onKeyDown(event);
  window.addEventListener('keydown', listener, { passive: false });
  teardown = () => {
    window.removeEventListener('keydown', listener);
    teardown = null;
  };
}

export function disposeHotkeys(): void {
  if (teardown) {
    teardown();
  }
  bindings.clear();
}

export function registerHotkey(
  key: string,
  handler: HotkeyHandler,
  options: HotkeyOptions = {}
): () => void {
  const normalized = normalizeKey(key);
  const bucket = bindings.get(normalized) ?? new Set<Binding>();
  const binding: Binding = { handler, options };
  bucket.add(binding);
  bindings.set(normalized, bucket);
  return () => bucket.delete(binding);
}

export function bindOnce(key: string, handler: HotkeyHandler): () => void {
  return registerHotkey(key, handler, { once: true });
}

export function getRegisteredHotkeys(): {
  key: string;
  description?: string;
}[] {
  const entries: { key: string; description?: string }[] = [];
  bindings.forEach((bucket, key) => {
    bucket.forEach((binding) => {
      entries.push({ key, description: binding.options.description });
    });
  });
  return entries;
}
