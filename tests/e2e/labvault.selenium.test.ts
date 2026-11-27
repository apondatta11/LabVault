import assert from "node:assert/strict";
import { Builder, By, until, type WebDriver } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";

const BASE_URL = process.env.LABVAULT_URL ?? "http://localhost:3000";

async function runE2E() {
  const options = new chrome.Options();
  options.addArguments(
    "--headless=new",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--window-size=1280,900"
  );

  let driver: WebDriver | null = null;
  try {
    driver = await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(options)
      .build();

    await driver.manage().setTimeouts({ implicit: 5000 });

    // Scenario 1: Dashboard KPIs load
    await driver.get(BASE_URL);
    await driver.wait(until.elementLocated(By.xpath("//h1[contains(., 'Lab Operations Overview')]")), 10000);
    console.log("✓ Scenario 1: Dashboard KPIs loaded");

    // Scenario 2: Equipment Inventory search
    await driver.get(`${BASE_URL}/inventory`);
    const searchInput = await driver.wait(
      until.elementLocated(By.css("[data-testid='inventory-search']")),
      10000
    );
    await searchInput.sendKeys("STM32");
    await driver.wait(
      until.elementLocated(By.css("[data-testid='equipment-row-MCU-STM32-F446']")),
      10000
    );
    console.log("✓ Scenario 2: Inventory search filtered to STM32 Nucleo-F446RE");

    // Scenario 3: Borrow Checkout flow
    await driver.get(`${BASE_URL}/loans`);
    const newCheckoutBtn = await driver.wait(
      until.elementLocated(By.css("[data-testid='new-checkout-btn']")),
      10000
    );
    await newCheckoutBtn.click();

    const submitCheckoutBtn = await driver.wait(
      until.elementLocated(By.css("[data-testid='submit-checkout-btn']")),
      10000
    );
    await driver.sleep(250);
    await driver.executeScript("arguments[0].click();", submitCheckoutBtn);

    const banner = await driver.wait(
      until.elementLocated(By.css("[data-testid='loan-status-banner']")),
      10000
    );
    const bannerText = await banner.getText();
    assert.ok(bannerText.includes("Checked out"), `Expected checkout banner, got: ${bannerText}`);
    console.log("✓ Scenario 3: Borrow checkout confirmed");

    // Scenario 4: Return & Fine Calculation flow
    const returnButtons = await driver.findElements(By.css("button[data-testid^='return-btn-']"));
    assert.ok(returnButtons.length > 0, "Expected at least one active loan with a Return button");
    await returnButtons[0].click();

    const confirmReturnBtn = await driver.wait(
      until.elementLocated(By.css("[data-testid='confirm-return-btn']")),
      10000
    );
    await driver.sleep(250);
    await driver.executeScript("arguments[0].click();", confirmReturnBtn);

    await driver.wait(async () => {
      const text = await driver!.findElement(By.css("[data-testid='loan-status-banner']")).getText();
      return text.includes("Returned");
    }, 10000);
    console.log("✓ Scenario 4: Return & fine assessment completed");

    console.log("ALL SELENIUM E2E SCENARIOS PASSED!");
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
}

runE2E().catch((err) => {
  console.error("Selenium E2E failed:", err);
  process.exit(1);
});
