# Playwright fixtures for dataLayer, collects_ga3 and collects_ga4

Utilizes the Observer Pattern, where the [Page](https://playwright.dev/docs/api/class-page) is the producer and the Node Playwright Test is the consumer. Every time the Page produces a message (window.dataLayer.push, or GA-Universal/GA4 network request), the consumer's subscribers callbacks are called.

### How to publish to npm registry

https://www.youtube.com/watch?v=Nh9xW2-ZOEU

