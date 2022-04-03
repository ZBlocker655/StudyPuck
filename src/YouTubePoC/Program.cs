using System;
using System.Threading.Tasks;

using Google.Apis.Services;
using Google.Apis.YouTube.v3;

namespace YouTubePoC
{

    class Program
    {
        private const string SampleChannelId = "UCxqLWT3swHvP9_4bv7Qssxw"; // Unconventional Chinese with Keren

        /// <summary>
        /// Adapted from https://github.com/youtube/api-samples/blob/master/dotnet/Google.Apis.YouTube.Samples.Search/Search.cs
        /// </summary>
        static void Main(string[] args)
        {
            Console.WriteLine("YouTube Data API: Search");
            Console.WriteLine("========================");

            try
            {
                Run().Wait();
            }
            catch (AggregateException ex)
            {
                foreach (var e in ex.InnerExceptions)
                {
                    Console.WriteLine("Error: " + e.Message);
                }
            }

            Console.WriteLine("Press any key to continue...");
            Console.ReadKey();
        }

        private async static Task Run()
        {
            var youtubeApiKey = Environment.GetEnvironmentVariable("YOUTUBE_API_KEY", EnvironmentVariableTarget.User);
            if (youtubeApiKey != null)
            {
                Console.WriteLine(youtubeApiKey.Substring(0, 4));
            }
            else
            {
                Console.WriteLine("No API key found");
            }

            var youtubeService = new YouTubeService(new BaseClientService.Initializer()
            {
                ApiKey = youtubeApiKey,
                ApplicationName = "StudyPuck YouTube PoC"
            });

            var search = youtubeService.Search.List("snippet");
            search.ChannelId = SampleChannelId;
            search.Order = SearchResource.ListRequest.OrderEnum.Date;
            search.PublishedAfter = DateTime.UtcNow.AddMonths(-1);
            search.Type = "video";
            search.MaxResults = 50;

            var response = await search.ExecuteAsync();

            // Print out results.
            foreach (var result in response.Items)
            {
                Console.WriteLine($"{result.Snippet.Title} ({result.Id.VideoId}) - {result.Snippet.PublishedAt}");
            }
        }
    }
}
