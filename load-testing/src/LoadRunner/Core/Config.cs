using Microsoft.Extensions.Configuration;

namespace LoadRunner.Core;

public static class Config
{
    private static IConfiguration _configuration;

    public static void Load(string[] args)
    {
        var builder = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
            .AddEnvironmentVariables()
            .AddCommandLine(args);

        // Load .env file if present
        if (File.Exists(".env"))
        {
            foreach (var line in File.ReadAllLines(".env"))
            {
                var parts = line.Split('=', 2);
                if (parts.Length != 2) continue;
                Environment.SetEnvironmentVariable(parts[0], parts[1]);
            }
            // Re-add environment variables to capture the newly set ones
            builder.AddEnvironmentVariables();
        }

        _configuration = builder.Build();
    }

    public static string UrlPath => _configuration["URL_PATH"] ?? "https://example.com";
    public static string DataIdValuePath => _configuration["DATA_ID_VALUE_PATH"] ?? "data/locators.json";
    public static bool HeadlessTest => bool.Parse(_configuration["HEADLESS_TEST"] ?? "true");
    public static int Users => int.Parse(_configuration["USERS"] ?? "1");
    public static int DurationMinutes => int.Parse(_configuration["DURATION_MINUTES"] ?? "1");
}
