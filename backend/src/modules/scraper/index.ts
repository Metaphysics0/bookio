import { Elysia, t } from "elysia";
import { ScraperService } from "./service";
import { getNextScheduledRun, isSchedulerRunning } from "./scheduler";

export const scraperModule = new Elysia({ prefix: "/scraper" })
	// Get status of all scrapers
	.get("/status", () => {
		const statuses = ScraperService.getAllStatus();
		return {
			scheduler: {
				running: isSchedulerRunning(),
				nextRun: getNextScheduledRun()?.toISOString() ?? null,
			},
			sources: statuses,
		};
	})

	// Get status of a specific scraper
	.get(
		"/status/:sourceId",
		({ params }) => {
			const status = ScraperService.getStatus(params.sourceId);
			return status;
		},
		{
			params: t.Object({
				sourceId: t.String(),
			}),
		},
	)

	// Manually trigger a scrape for a specific source
	.post(
		"/run/:sourceId",
		async ({ params, set }) => {
			const source = ScraperService.getSource(params.sourceId);

			if (!source) {
				set.status = 404;
				return { error: "Source not found" };
			}

			try {
				const count = await ScraperService.scrapeSource(params.sourceId);
				return {
					success: true,
					source: params.sourceId,
					torrentsScraped: count,
				};
			} catch (err) {
				set.status = 500;
				return {
					error: "Scrape failed",
					message: err instanceof Error ? err.message : "Unknown error",
				};
			}
		},
		{
			params: t.Object({
				sourceId: t.String(),
			}),
		},
	)

	// Manually trigger a scrape for all sources
	.post("/run", async () => {
		const results = await ScraperService.scrapeAll();
		const summary: Record<string, number> = {};

		for (const [source, count] of results) {
			summary[source] = count;
		}

		return {
			success: true,
			results: summary,
		};
	})

	// List available sources
	.get("/sources", () => {
		const sources = ScraperService.getSources();
		return {
			sources: sources.map((s) => ({
				id: s.id,
				name: s.name,
				enabled: s.enabled,
			})),
		};
	});
