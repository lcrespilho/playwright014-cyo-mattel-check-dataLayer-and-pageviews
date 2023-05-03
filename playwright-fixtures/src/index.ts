import { test as base, expect, type Request } from '@playwright/test';

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
    dlTransfer: Function;
  }
  type WaitForMessageOptions =
    | {
        timeout?: number;
        regex?: RegExp;
        matchObject?: never;
      }
    | {
        timeout?: number;
        matchObject?: Record<string, unknown>;
        regex?: never;
      };
}

class PubSub {
  #subscribers: Set<Function> = new Set();
  messages: (string | Record<string, unknown>)[] = [];

  subscribe(subscriber: Function) {
    this.#subscribers.add(subscriber);
  }
  unsubscribe(subscriber: Function) {
    this.#subscribers.delete(subscriber);
  }
  publish(message: string | Record<string, unknown>) {
    this.messages.push(message);
    for (const subscriber of this.#subscribers) subscriber(message);
  }
  waitForMessage(config?: WaitForMessageOptions) {
    return new Promise((resolve, reject) => {
      if (config?.timeout) setTimeout(reject, config.timeout, 'timeout');
      const subscriber = (message: string | Record<string, unknown>) => {
        if (config?.regex && !config?.regex?.test(message as string)) return;
        if (config?.matchObject) {
          try {
            // usado para testar partes de objetos de dataLayer
            expect(message).toMatchObject(config.matchObject as unknown as Record<string, unknown>);
          } catch (error) {
            return;
          }
        }
        this.unsubscribe(subscriber);
        resolve(message);
      };
      this.subscribe(subscriber);
    });
  }
}

function flatRequestUrl(req: Request): string {
  return (req.url() + '&' + (req.postData() || ''))
    .replace(/\r\n|\n|\r/g, '&')
    .replace(/&&/g, '&')
    .replace(/&$/g, '');
}

type PageFixtures = {
  collects_ga3: PubSub;
  collects_ga4: PubSub;
  dataLayer: PubSub;
};

export const test = base.extend<PageFixtures>({
  collects_ga3: async ({ page }, use) => {
    const collects = new PubSub();
    page.on('request', request => {
      const flatUrl = flatRequestUrl(request);
      if (/google.*collect(?!\?v=2)/.test(flatUrl)) {
        collects.publish(flatUrl);
      }
    });
    await use(collects);
  },
  collects_ga4: async ({ page }, use) => {
    const collects = new PubSub();
    page.on('request', request => {
      const flatUrl = flatRequestUrl(request);
      if (/google.*collect\?v=2/.test(flatUrl)) {
        collects.publish(flatUrl);
      }
    });
    await use(collects);
  },
  dataLayer: async ({ page }, use) => {
    const dataLayer = new PubSub();
    await page.exposeFunction('dlTransfer', (o: Record<string, unknown>) => dataLayer.publish(o));
    await page.addInitScript(() => {
      Object.defineProperty(window, 'dataLayer', {
        enumerable: true,
        configurable: true,
        set(value: Record<string, unknown>[]) {
          if (Array.isArray(value)) {
            // Se o dataLayer foi inicializado já com algum objeto.
            for (const o of value) window.dlTransfer(o);
          }
          // Não permite sobrescritas futuras do dataLayer.
          Object.defineProperty(window, 'dataLayer', {
            enumerable: true,
            configurable: false,
            value,
            writable: false,
          });
          window.dataLayer.push = new Proxy(window.dataLayer.push, {
            apply(target, thisArg, argArray) {
              const o: Record<string, unknown> = argArray[0];
              window.dlTransfer(o);
              return Reflect.apply(target, thisArg, argArray);
            },
          });
        },
      });
    });
    await use(dataLayer);
  },
});
