declare global {
    interface Window {
        dataLayer: Record<string, unknown>[];
        dlTransfer: Function;
    }
    type WaitForMessageOptions = {
        timeout?: number;
        regex?: RegExp;
        matchObject?: never;
    } | {
        timeout?: number;
        matchObject?: Record<string, unknown>;
        regex?: never;
    };
}
declare class PubSub {
    #private;
    messages: (string | Record<string, unknown>)[];
    subscribe(subscriber: Function): void;
    unsubscribe(subscriber: Function): void;
    publish(message: string | Record<string, unknown>): void;
    waitForMessage(config?: WaitForMessageOptions): Promise<unknown>;
}
type PageFixtures = {
    collects_ga3: PubSub;
    collects_ga4: PubSub;
    dataLayer: PubSub;
};
export declare const test: import("@playwright/test").TestType<import("@playwright/test").PlaywrightTestArgs & import("@playwright/test").PlaywrightTestOptions & PageFixtures, import("@playwright/test").PlaywrightWorkerArgs & import("@playwright/test").PlaywrightWorkerOptions>;
export {};
