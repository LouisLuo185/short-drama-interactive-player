import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ADMIN_MODE } from "../../features/admin/adminConfig";
import { updateDramaDescription, updateDramaTitle } from "../../features/admin/adminDramaActions";
import { EditableText } from "../../features/admin/EditableText";
import { fetchDramaDetail } from "../../services/dramaApi";
import { resolveBackendUrl } from "../../services/http";
import type { DramaDetail } from "../../types/drama";

export function DramaDetailPage() {
  const { dramaId } = useParams();
  const [drama, setDrama] = useState<DramaDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadDramaDetail() {
      if (!dramaId) {
        setError("缺少 dramaId");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchDramaDetail(dramaId);

        if (!ignore) {
          setDrama(data);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "短剧详情加载失败");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadDramaDetail();

    return () => {
      ignore = true;
    };
  }, [dramaId]);

  return (
    <main className="min-h-screen bg-[linear-gradient(160deg,#0f0c09,#21170f_48%,#0b0907)] px-5 py-8 text-amber-50 md:px-8 md:py-12">
      <section className="mx-auto max-w-6xl">
        <Link className="text-sm font-semibold text-amber-300 hover:text-amber-200" to="/dramas">
          返回短剧列表
        </Link>

        {isLoading ? (
          <StateCard title="正在加载详情" description="正在请求 /api/dramas/:dramaId。" />
        ) : null}
        {error ? <StateCard title="加载失败" description={error} /> : null}

        {!isLoading && !error && drama ? (
          <>
            <section className="mt-8 grid gap-8 rounded-[2rem] border border-amber-200/15 bg-amber-50/[0.06] p-5 shadow-2xl shadow-black/30 md:grid-cols-[320px_1fr] md:p-8">
              <DetailCover src={drama.coverUrl} alt={drama.title} />
              <div className="flex flex-col justify-center">
                <p className="text-sm uppercase tracking-[0.35em] text-amber-200/60">
                  Drama Detail {ADMIN_MODE ? "· Admin Editable" : ""}
                </p>
                <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
                  <EditableText
                    value={drama.title}
                    disabled={!ADMIN_MODE}
                    onSave={async (title) => {
                      const updated = await updateDramaTitle(drama.id, title);
                      setDrama((current) =>
                        current ? { ...current, title: updated.title } : current
                      );
                    }}
                  />
                </h1>
                <div className="mt-5 max-w-2xl text-base leading-8 text-amber-50/70">
                  <EditableText
                    value={drama.description}
                    multiline
                    disabled={!ADMIN_MODE}
                    placeholder="暂无简介"
                    onSave={async (description) => {
                      const updated = await updateDramaDescription(drama.id, description);
                      setDrama((current) =>
                        current ? { ...current, description: updated.description } : current
                      );
                    }}
                  />
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  {drama.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-amber-200/20 bg-black/20 px-3 py-1 text-sm text-amber-100/85"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <section className="mt-8">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-amber-200/60">
                    Episodes
                  </p>
                  <h2 className="mt-2 text-3xl font-black">选择剧集</h2>
                </div>
                <span className="rounded-full bg-amber-300 px-4 py-2 text-sm font-bold text-stone-950">
                  共 {drama.episodes.length} 集
                </span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {drama.episodes.map((episode) => (
                  <Link
                    key={episode.id}
                    to={`/watch/${episode.id}`}
                    className="group rounded-3xl border border-amber-200/15 bg-black/25 p-5 transition duration-300 hover:-translate-y-1 hover:border-amber-200/45 hover:bg-amber-50/[0.08]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full bg-amber-50/10 px-3 py-1 text-sm text-amber-100">
                        第 {episode.episodeNo} 集
                      </span>
                      <span className="text-sm text-amber-50/55">
                        {formatDuration(episode.durationSec)}
                      </span>
                    </div>
                    <h3 className="mt-5 text-xl font-black text-amber-50 group-hover:text-amber-200">
                      {episode.title}
                    </h3>
                    <p className="mt-3 text-sm text-amber-50/55">点击进入播放页</p>
                  </Link>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}

function StateCard(props: { title: string; description: string }) {
  return (
    <div className="mt-10 rounded-3xl border border-amber-200/15 bg-black/25 p-6 text-amber-50 shadow-2xl shadow-black/20">
      <h2 className="text-xl font-bold">{props.title}</h2>
      <p className="mt-2 text-amber-50/65">{props.description}</p>
    </div>
  );
}

function DetailCover(props: { src: string; alt: string }) {
  const [hasError, setHasError] = useState(false);
  const resolvedSrc = resolveBackendUrl(props.src);

  return (
    <div className="aspect-[3/4] overflow-hidden rounded-[1.5rem] bg-[radial-gradient(circle_at_30%_20%,#f5c15d,transparent_30%),linear-gradient(135deg,#4a2213,#120d09)]">
      {!hasError ? (
        <img
          src={resolvedSrc}
          alt={props.alt}
          className="h-full w-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="flex h-full items-center justify-center px-6 text-center text-3xl font-black text-amber-50/80">
          {props.alt}
        </div>
      )}
    </div>
  );
}

function formatDuration(durationSec: number) {
  const minutes = Math.floor(durationSec / 60);
  const seconds = Math.floor(durationSec % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}
