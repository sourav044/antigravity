using System.Text.Json;

namespace LoadRunner.Core;

public class Locator
{
    public string Id { get; set; }
    public string Primary { get; set; }
    public List<string> Fallbacks { get; set; }
    public double Score { get; set; }
}

public class LocatorData
{
    public List<Locator> Locators { get; set; }
}

public static class LocatorMap
{
    private static Dictionary<string, Locator> _locators = new();

    public static void Load(string filePath)
    {
        if (!File.Exists(filePath))
        {
            Console.WriteLine($"Locator file not found: {filePath}");
            return;
        }

        var json = File.ReadAllText(filePath);
        var data = JsonSerializer.Deserialize<LocatorData>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        if (data?.Locators != null)
        {
            foreach (var loc in data.Locators)
            {
                _locators[loc.Id] = loc;
            }
        }
    }

    public static Locator Get(string id)
    {
        return _locators.TryGetValue(id, out var loc) ? loc : null;
    }
}
