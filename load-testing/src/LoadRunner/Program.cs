using LoadRunner.Core;
using NUnit.Framework;
using System.Reflection;
using System.Diagnostics;

namespace LoadRunner;

class Program
{
    static async Task Main(string[] args)
    {
        Console.WriteLine("Initializing Load Runner...");
        
        // 1. Load Config
        Config.Load(args);
        LocatorMap.Load(Config.DataIdValuePath);
        
        Console.WriteLine($"Target: {Config.UrlPath}");
        Console.WriteLine($"Users: {Config.Users}");
        Console.WriteLine($"Duration: {Config.DurationMinutes} minutes");

        // 2. Discover Tests (Reqnroll generated NUnit tests)
        var testAssembly = Assembly.GetExecutingAssembly();
        var testFixtures = testAssembly.GetTypes()
            .Where(t => t.GetCustomAttributes(typeof(TestFixtureAttribute), true).Any())
            .ToList();

        if (!testFixtures.Any())
        {
            Console.WriteLine("No tests found! Ensure .feature files are compiled.");
            return;
        }

        Console.WriteLine($"Found {testFixtures.Count} test fixtures.");

        // 3. Run Load - Users running in parallel
        var endTime = DateTime.UtcNow.AddMinutes(Config.DurationMinutes);
        var tasks = new List<Task>();

        Console.WriteLine("Starting Load Test loops...");

        for (int i = 0; i < Config.Users; i++)
        {
            int userId = i;
            tasks.Add(Task.Run(async () => 
            {
                await RunUserLoad(userId, testFixtures, endTime);
            }));
        }

        await Task.WhenAll(tasks);
        
        Console.WriteLine("Load Test Completed.");
        ReportManager.SaveMetrics("reports/metrics.csv");
    }

    static async Task RunUserLoad(int userId, List<Type> fixtures, DateTime endTime)
    {
        // For each user, we iterate through fixtures
        // Note: Instantiating TestFixture might share static state if Reqnroll is not thread-safe.
        // Ideally, we run separate processes, but for lightweight runner we assume parallelism.
        
        foreach (var fixtureType in fixtures)
        {
            try 
            {
                var instance = Activator.CreateInstance(fixtureType);
                
                // OneTimeSetUp (FeatureSetup)
                await InvokeAttributeMethod(instance, typeof(OneTimeSetUpAttribute));

                while (DateTime.UtcNow < endTime)
                {
                    var testMethods = fixtureType.GetMethods()
                        .Where(m => m.GetCustomAttributes(typeof(TestAttribute), true).Any())
                        .ToList();

                    foreach (var method in testMethods)
                    {
                        var sw = Stopwatch.StartNew();
                        string status = "Pass";
                        string error = null;

                        try
                        {
                            // SetUp (ScenarioSetup / TestInitialize)
                            await InvokeAttributeMethod(instance, typeof(SetUpAttribute));
                            
                            // Test Execution
                            if (method.ReturnType == typeof(Task))
                                await (Task)method.Invoke(instance, null);
                            else
                                method.Invoke(instance, null);
                        }
                        catch (Exception ex)
                        {
                            status = "Fail";
                            error = ex.InnerException?.Message ?? ex.Message;
                        }
                        finally
                        {
                            // TearDown (ScenarioTearDown / TestCleanup)
                            try { await InvokeAttributeMethod(instance, typeof(TearDownAttribute)); } catch { }
                            
                            sw.Stop();
                            ReportManager.AddMetric($"{fixtureType.Name}.{method.Name}", sw.Elapsed.TotalMilliseconds, status, error);
                        }
                    }
                    
                    // Small delay to prevent CPU spinning if tests are instant
                    await Task.Delay(100); 
                }

                // OneTimeTearDown (FeatureTearDown)
                await InvokeAttributeMethod(instance, typeof(OneTimeTearDownAttribute));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in User {userId}: {ex.Message}");
            }
        }
    }

    static async Task InvokeAttributeMethod(object instance, Type attributeType)
    {
        var methods = instance.GetType().GetMethods()
            .Where(m => m.GetCustomAttributes(attributeType, true).Any());
            
        foreach (var method in methods)
        {
            try
            {
                if (method.ReturnType == typeof(Task))
                    await (Task)method.Invoke(instance, null);
                else
                    method.Invoke(instance, null);
            }
            catch (TargetInvocationException ex)
            {
                throw ex.InnerException ?? ex;
            }
        }
    }
}
