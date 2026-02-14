using LoadRunner.Core;
using Microsoft.Playwright;
using NUnit.Framework;
using Reqnroll;

namespace LoadRunner.Steps;

[Binding]
public class LoadSteps
{
    private readonly IPage _page;

    // Reqnroll via DI or Context? 
    // In standard Reqnroll + Playwright setup, we either use a Hooks class to init Page
    // or use a base class. 
    // For this custom runner, let's assume valid DI setup or standard Reqnroll behavior.
    
    // BUT! Since we are using Reqnroll.Playwright, it might handle Page creation.
    // If not, we need a Hook.
    
    // Let's create a Hooks class to manage the Playwright Page.
    
    public LoadSteps(ScenarioContext scenarioContext)
    {
        // ScenarioContext can be used to retrieve the page if set by hooks
        if (scenarioContext.TryGetValue("Page", out IPage page))
        {
            _page = page;
        }
    }

    [Given("I navigate to the homepage")]
    public async Task GivenINavigateToTheHomepage()
    {
        if (_page == null) throw new Exception("Page not initialized");
        await _page.GotoAsync(Config.UrlPath);
    }

    [Then("I should see the login button")]
    public async Task ThenIShouldSeeTheLoginButton()
    {
        var locatorDef = LocatorMap.Get("login_btn");
        if (locatorDef == null) Assert.Fail("Locator 'login_btn' not found in map");

        ILocator locator = null;
        
        // Try primary
        try 
        {
            locator = _page.Locator(locatorDef.Primary);
            await locator.WaitForAsync(new LocatorWaitForOptions { Timeout = 2000 });
            if (await locator.IsVisibleAsync()) return;
        }
        catch { /* Fallback */ }

        // Try fallbacks
        foreach (var fb in locatorDef.Fallbacks)
        {
            try
            {
                locator = _page.Locator(fb);
                await locator.WaitForAsync(new LocatorWaitForOptions { Timeout = 2000 });
                if (await locator.IsVisibleAsync()) return;
            }
            catch { continue; }
        }

        Assert.Fail("Login button not found with any selector");
    }
}
