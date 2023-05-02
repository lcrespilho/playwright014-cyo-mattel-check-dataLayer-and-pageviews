import { expect } from '@playwright/test';
import { test } from '../playwright-fixtures';

test('dataLayer e collect', async ({ page, dataLayer, collects_ga3 }, testInfo) => {
  // Bloqueia disparo de algumas mídias
  await page.route(/fbevents|pinterest|bing|twitter|google.*collect/, (route, req) => route.abort());

  // Navega para a Home e valida dataLayer + collect
  await Promise.all([
    // Navega para a Home
    page.goto('https://www.americangirl.com/', { waitUntil: 'commit' }),
    // Valida dataLayer
    dataLayer.waitForMessage({
      matchObject: {
        event: 'pageLoad',
        page_name: 'ag:us:homepage',
        page_type: 'homepage',
        page_section: 'homepage',
      },
      timeout: 5000,
    }),
    // Valida collect
    collects_ga3.waitForMessage({
      timeout: 30000,
      regex: /&t=pageview&.*dp=%2F&.*&cd33=homepage/,
    }),
    // Aceita cookies
    page.frameLocator('iframe[name="trustarc_cm"]').getByText('ACCEPT ALL').click(),
    page.frameLocator('iframe[name="trustarc_cm"]').getByText('Close').click(),
  ]);

  // Navega para CYO e valida dataLayer + collects (tem 2 pageviews)
  await Promise.all([
    page.getByRole('link', { name: 'Create Your Own' }).first().click(),
    page.getByRole('button', { name: 'Start playing' }).first().click(),
    dataLayer.waitForMessage({
      matchObject: {
        event: 'pageLoad',
        page_name: 'ag:us:create your own:doll configuration:main',
        page_type: 'create your own',
        page_section: 'create your own',
      },
      timeout: 15000,
    }),
    // Pageview para dp=/create
    collects_ga3.waitForMessage({
      timeout: 30000,
      regex: /&t=pageview&.*&dp=%2Fcreate&(?!.*&cd33=homepage)/,
    }),
    // Pageview para dp=/create/main
    collects_ga3.waitForMessage({
      timeout: 30000,
      regex: /&t=pageview&.*&dp=%2Fcreate%2Fmain&.*&cd33=create%20your%20own/,
    }),
  ]);

  // Aguarda um pouquinho mais para ver se não terá algum pageview de GA3 disparando errado.
  await page.waitForTimeout(2000);

  // Validação final, para saber se não foi disparado mais eventos de DL ou GA3 do que o esperado.

  // Precisa ter 3 collects de pageview de GA3:
  expect((collects_ga3.messages as string[]).filter(s => /&t=pageview&/.test(s)).length).toBe(3);
  // Precisa ter 2 pushes de dataLayer pageLoad:
  expect((dataLayer.messages as Record<string, unknown>[]).filter(o => o.event === 'pageLoad').length).toBe(2);

  // Loga pushes e collects no report html
  testInfo.attach('dataLayer', {
    contentType: 'application/json',
    body: JSON.stringify(dataLayer.messages)
  });
  testInfo.attach('collects_ga3', {
    contentType: 'text/plain',
    body: JSON.stringify(collects_ga3.messages)
  });
});
