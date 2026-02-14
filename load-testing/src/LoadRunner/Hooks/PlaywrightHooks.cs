using LoadRunner.Core;
using Microsoft.Playwright;
using Reqnroll;

namespace LoadRunner.Hooks;

[Binding]
public class PlaywrightHooks
{
    private static IPlaywright _playwright;
    private static IBrowser _browser;
    private IBrowserContext _context;
    private IPage _page;
    private readonly ScenarioContext _scenarioContext;

    public PlaywrightHooks(ScenarioContext scenarioContext)
    {
        _scenarioContext = scenarioContext;
    }

    [BeforeTestRun]
    public static async Task BeforeTestRun()
    {
        _playwright = await Playwright.CreateAsync();
        // Config.HeadlessTest is used here
        _browser = await _playwright.Chromium.LaunchAsync(new BrowserTypeLaunchOptions
        {
            Headless = Config.HeadlessTest
        });
    }

    [AfterTestRun]
    public static async Task AfterTestRun()
    {
        if (_browser != null) await _browser.CloseAsync();
        _playwright?.Dispose();
    }

    [BeforeScenario]
    public async Task BeforeScenario()
    {
        _context = await _browser.NewContextAsync();
        _page = await _context.NewPageAsync();
        _scenarioContext["Page"] = _page;
    }

    [AfterScenario]
    public async Task AfterScenario()
    {
        if (_page != null) await _page.CloseAsync();
        if (_context != null) await _context.CloseAsync();
    }
    
    [AfterStep]
    public async Task AfterStep()
    {
        if (_scenarioContext.TestError != null)
        {
             // Capture screenshot on failure
             var path = $"reports/screenshots/{Guid.NewGuid()}.png";
             await _page.ScreenshotAsync(new PageScreenshotOptions { Path = path });
             Console.WriteLine($"Screenshot saved: {path}");
        }
    }
}
