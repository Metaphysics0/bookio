import { Elysia, t } from "elysia";
import { LibraryService } from "./service";
import { AddToLibrarySchema, UpdateProgressSchema } from "./model";

// Note: These endpoints require authentication in production
// For MVP, we'll use a userId from headers or query params

export const libraryModule = new Elysia({ prefix: "/library" })
	// Get recently played (must be before /:audiobookId to avoid route conflict)
	.get(
		"/recent",
		async ({ headers, query, set }) => {
			const userId = headers["x-user-id"];
			if (!userId) {
				set.status = 401;
				return { error: "User ID required" };
			}

			const limit = query.limit ? parseInt(query.limit, 10) : 10;
			const items = await LibraryService.getRecentlyPlayed(userId, limit);
			return { items };
		},
		{
			query: t.Object({
				limit: t.Optional(t.String()),
			}),
		},
	)

	// Get in-progress audiobooks (must be before /:audiobookId to avoid route conflict)
	.get("/in-progress", async ({ headers, set }) => {
		const userId = headers["x-user-id"];
		if (!userId) {
			set.status = 401;
			return { error: "User ID required" };
		}

		const items = await LibraryService.getInProgress(userId);
		return { items };
	})

	// Get user's library
	.get("/", async ({ headers, set }) => {
		const userId = headers["x-user-id"];
		if (!userId) {
			set.status = 401;
			return { error: "User ID required" };
		}

		const items = await LibraryService.getUserLibrary(userId);
		return { items };
	})

	// Get a specific library item
	.get(
		"/:audiobookId",
		async ({ params, headers, set }) => {
			const userId = headers["x-user-id"];
			if (!userId) {
				set.status = 401;
				return { error: "User ID required" };
			}

			const item = await LibraryService.getLibraryItem(
				userId,
				params.audiobookId,
			);
			if (!item) {
				set.status = 404;
				return { error: "Item not in library" };
			}

			return item;
		},
		{
			params: t.Object({
				audiobookId: t.String(),
			}),
		},
	)

	// Add to library
	.post(
		"/",
		async ({ body, headers, set }) => {
			const userId = headers["x-user-id"];
			if (!userId) {
				set.status = 401;
				return { error: "User ID required" };
			}

			await LibraryService.addToLibrary(userId, body.audiobookId);
			return { success: true, audiobookId: body.audiobookId };
		},
		{
			body: AddToLibrarySchema,
		},
	)

	// Update progress
	.patch(
		"/:audiobookId/progress",
		async ({ params, body, headers, set }) => {
			const userId = headers["x-user-id"];
			if (!userId) {
				set.status = 401;
				return { error: "User ID required" };
			}

			await LibraryService.updateProgress(userId, params.audiobookId, body);
			return { success: true };
		},
		{
			params: t.Object({
				audiobookId: t.String(),
			}),
			body: UpdateProgressSchema,
		},
	)

	// Remove from library
	.delete(
		"/:audiobookId",
		async ({ params, headers, set }) => {
			const userId = headers["x-user-id"];
			if (!userId) {
				set.status = 401;
				return { error: "User ID required" };
			}

			await LibraryService.removeFromLibrary(userId, params.audiobookId);
			return { success: true };
		},
		{
			params: t.Object({
				audiobookId: t.String(),
			}),
		},
	);
