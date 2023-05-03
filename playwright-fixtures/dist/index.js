"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.test = void 0;
const test_1 = require("@playwright/test");
class PubSub {
    #subscribers = new Set();
    messages = [];
    subscribe(subscriber) {
        this.#subscribers.add(subscriber);
    }
    unsubscribe(subscriber) {
        this.#subscribers.delete(subscriber);
    }
    publish(message) {
        this.messages.push(message);
        for (const subscriber of this.#subscribers)
            subscriber(message);
    }
    waitForMessage(config) {
        return new Promise((resolve, reject) => {
            if (config?.timeout)
                setTimeout(reject, config.timeout, 'timeout');
            const subscriber = (message) => {
                if (config?.regex && !config?.regex?.test(message))
                    return;
                if (config?.matchObject) {
                    try {
                        // usado para testar partes de objetos de dataLayer
                        (0, test_1.expect)(message).toMatchObject(config.matchObject);
                    }
                    catch (error) {
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
function flatRequestUrl(req) {
    return (req.url() + '&' + (req.postData() || ''))
        .replace(/\r\n|\n|\r/g, '&')
        .replace(/&&/g, '&')
        .replace(/&$/g, '');
}
exports.test = test_1.test.extend({
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
        await page.exposeFunction('dlTransfer', (o) => dataLayer.publish(o));
        await page.addInitScript(() => {
            Object.defineProperty(window, 'dataLayer', {
                enumerable: true,
                configurable: true,
                set(value) {
                    if (Array.isArray(value)) {
                        // Se o dataLayer foi inicializado já com algum objeto.
                        for (const o of value)
                            window.dlTransfer(o);
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
                            const o = argArray[0];
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
//# sourceMappingURL=index.js.map