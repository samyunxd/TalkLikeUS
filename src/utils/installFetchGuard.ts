declare global {
  interface Window {
    __talkLikeUsFetchGuardInstalled?: boolean;
  }
}

function ensureWritableFetchAccessor(target: object | null | undefined): void {
  if (!target) return;
  try {
    const desc = Object.getOwnPropertyDescriptor(target, 'fetch');
    if (
      desc &&
      typeof desc.get === 'function' &&
      typeof desc.set !== 'function' &&
      desc.configurable !== false
    ) {
      Object.defineProperty(target, 'fetch', {
        configurable: true,
        enumerable: desc.enumerable !== false,
        get: desc.get,
        set: () => {
          // Intentionally absorb third-party extension monkey-patch assignments
          // so strict-mode `window.fetch = ...` does not throw TypeError.
        },
      });
    }
  } catch {
    // Ignore non-configurable host descriptors
  }
}

function isExtensionOrReadOnlyFetchError(message: unknown, filename: unknown): boolean {
  const msg = String(message ?? '');
  const file = String(filename ?? '');
  if (
    msg.includes('Cannot set property fetch') ||
    (msg.includes('fetch') && msg.includes('only a getter'))
  ) {
    return true;
  }
  if (
    file.startsWith('chrome-extension://') ||
    file.startsWith('moz-extension://') ||
    file.startsWith('safari-web-extension://')
  ) {
    return true;
  }
  return false;
}

export function installFetchGuard(): void {
  if (typeof window === 'undefined') return;

  ensureWritableFetchAccessor(window);
  if (typeof Window !== 'undefined' && Window.prototype) {
    ensureWritableFetchAccessor(Window.prototype);
  }

  if (window.__talkLikeUsFetchGuardInstalled) return;
  window.__talkLikeUsFetchGuardInstalled = true;

  try {
    const origDefineProperty = Object.defineProperty;
    Object.defineProperty = function <T>(
      target: T,
      prop: PropertyKey,
      attributes: PropertyDescriptor & ThisType<unknown>
    ): T {
      const isWindowFetch =
        (target === (window as unknown) ||
          target === (globalThis as unknown) ||
          (typeof Window !== 'undefined' && target === (Window.prototype as unknown))) &&
        prop === 'fetch';

      if (
        isWindowFetch &&
        attributes &&
        typeof attributes.get === 'function' &&
        typeof attributes.set === 'undefined'
      ) {
        return origDefineProperty.call(Object, target, prop, {
          configurable: attributes.configurable !== false,
          enumerable: attributes.enumerable !== false,
          get: attributes.get,
          set: () => {},
        }) as T;
      }

      return origDefineProperty.call(Object, target, prop, attributes) as T;
    };
  } catch {
    // Ignore if Object.defineProperty cannot be wrapped
  }

  window.addEventListener(
    'error',
    (event: ErrorEvent) => {
      const errMessage =
        event.message || (event.error instanceof Error ? event.error.message : '');
      if (isExtensionOrReadOnlyFetchError(errMessage, event.filename)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );

  window.addEventListener(
    'unhandledrejection',
    (event: PromiseRejectionEvent) => {
      const reason: unknown = event.reason;
      const msg =
        typeof reason === 'string'
          ? reason
          : reason instanceof Error
            ? reason.message
            : '';
      const stack = reason instanceof Error && typeof reason.stack === 'string' ? reason.stack : '';
      const extensionOnlyStack =
        stack.includes('chrome-extension://') &&
        !stack.includes('/src/') &&
        !stack.includes('/assets/');
      if (isExtensionOrReadOnlyFetchError(msg, extensionOnlyStack ? 'chrome-extension://' : '')) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );
}

installFetchGuard();
