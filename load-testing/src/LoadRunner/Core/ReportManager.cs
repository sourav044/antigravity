using CsvHelper;
using System.Globalization;

namespace LoadRunner.Core;

public class Metric
{
    public DateTime Timestamp { get; set; }
    public string Scenario { get; set; }
    public double DurationMs { get; set; }
    public string Status { get; set; }
    public string ErrorMessage { get; set; }
}

public static class ReportManager
{
    private static List<Metric> _metrics = new();
    private static object _lock = new();

    public static void AddMetric(string scenario, double durationMs, string status, string error = null)
    {
        lock (_lock)
        {
            _metrics.Add(new Metric
            {
                Timestamp = DateTime.UtcNow,
                Scenario = scenario,
                DurationMs = durationMs,
                Status = status,
                ErrorMessage = error
            });
        }
    }

    public static void SaveMetrics(string path)
    {
        using var writer = new StreamWriter(path);
        using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);
        csv.WriteRecords(_metrics);
    }
}
