describe('LazyLearner App', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show welcome screen after launch', async () => {
    // This test will be updated once we have actual screens
    await expect(element(by.text('LazyLearner'))).toBeVisible();
  });
});
