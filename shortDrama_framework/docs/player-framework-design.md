# Short Drama Player Framework Design

Step 1 establishes the Web + Server project skeleton.

The framework follows the v2 boundary: the player base owns playback, time, state, event scheduling, plugin mounting, and analytics plumbing. Highlight recognition will provide standardized `TimelineEvent` data later, while interaction UI will attach through `InteractionPlugin`.

## Step 2 Backend Boundary

The server is split by responsibility:

- `routes/` owns HTTP request and response shape.
- `services/` owns business mapping and persistence operations.
- `db/` owns SQLite initialization, schema, and seed data.
- `types/` owns shared backend domain types.

The highlights API returns `TimelineEvent[]` converted from the `highlights` table. Client-only events such as `episode_ending` and `episode_ended` are intentionally not returned by the backend.

## Future Highlight Labeling Extension

The MVP uses seed/mock highlight data instead of a full labeling backend. Future labeling can be added without changing the player contract by implementing:

```txt
POST   /api/highlights
PUT    /api/highlights/:highlightId
DELETE /api/highlights/:highlightId
```

Those endpoints should write the same `highlights` table and continue returning standardized `TimelineEvent` data to the player.

## Frontend Refactor Boundary

The frontend now follows a feature-based MVVM-style structure:

- `app/routes/WatchPage.tsx` is a thin page composition layer.
- `features/watch/useWatchEpisode.ts` loads episode and highlight timeline data.
- `features/timeline/useTimelineRuntime.ts` owns timeline scheduling and system end events.
- `features/analytics/usePlaybackAnalytics.ts` owns playback and interaction reporting.
- `features/player/usePlayerRuntime.ts` owns the controller reference and interaction context.
- `components/player/PlayerShell.tsx` and `VideoStage.tsx` provide stable player UI slots.

This keeps future extensions localized: fullscreen controls can attach to the player feature, danmaku can attach as another `VideoStage` overlay, and wheel/swipe episode switching can attach as an episode-navigation feature without rewriting the player core.
