import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ADMIN_MODE } from "../../features/admin/adminConfig";
import {
  mergeDramaCard,
  removeDrama,
  updateDramaDescription,
  updateDramaTitle
} from "../../features/admin/adminDramaActions";
import { ConfirmDialog } from "../../features/admin/ConfirmDialog";
import { EditableText } from "../../features/admin/EditableText";
import { fetchDramas } from "../../services/dramaApi";
import { resolveBackendUrl } from "../../services/http";
import type { DramaCard } from "../../types/drama";

export function DramasPage() {
  const [dramas, setDramas] = useState<DramaCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DramaCard | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadDramas() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchDramas();

        if (!ignore) {
          setDramas(data);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "短剧列表加载失败");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadDramas();

    return () => {
      ignore = true;
    };
  }, []);

  async function handleDeleteDrama() {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);
      await removeDrama(deleteTarget.id);
      setDramas((current) => current.filter((drama) => drama.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除短剧失败");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#8d3c17,transparent_32%),linear-gradient(135deg,#15120e,#2c2115_55%,#120f0b)] px-5 py-8 text-amber-50 md:px-8 md:py-12">
      <section className="mx-auto max-w-6xl">
        <p className="text-sm uppercase tracking-[0.35em] text-amber-200/70">
          Short Drama MVP
        </p>
        <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight md:text-6xl">短剧片库</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-amber-50/70 md:text-lg">
              选择一部短剧进入详情页，继续完成选集、播放、高光互动和弹幕演示。
              {ADMIN_MODE ? " 管理员模式已开启：可双击标题或简介编辑。" : null}
            </p>
          </div>
          <div className="rounded-full border border-amber-200/20 bg-black/25 px-4 py-2 text-sm text-amber-100/80">
            {isLoading ? "加载中" : `${dramas.length} 部短剧`}
          </div>
        </div>

        <div className="mt-8">
          <Link
            to="/admin/import"
            className="inline-flex rounded-full bg-amber-300 px-5 py-3 text-sm font-black text-stone-950 transition hover:-translate-y-0.5 hover:bg-amber-200"
          >
            导入短剧 JSON / URL
          </Link>
        </div>

        {error ? <StateCard title="操作失败" description={error} /> : null}
        {isLoading ? (
          <StateCard title="正在拉取短剧列表" description="后端服务启动后，这里会展示短剧数据。" />
        ) : null}

        {!isLoading && !error ? (
          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {dramas.map((drama) => (
              <Link
                key={drama.id}
                to={`/dramas/${drama.id}`}
                className="group relative overflow-hidden rounded-[2rem] border border-amber-200/15 bg-amber-50/[0.06] shadow-2xl shadow-black/25 transition duration-300 hover:-translate-y-1 hover:border-amber-200/45 hover:bg-amber-50/[0.09]"
              >
                {ADMIN_MODE ? (
                  <button
                    type="button"
                    className="absolute right-4 top-4 z-10 rounded-full bg-red-500 px-3 py-1.5 text-sm font-black text-white shadow-lg shadow-black/30 transition hover:bg-red-400"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setDeleteTarget(drama);
                    }}
                  >
                    删除
                  </button>
                ) : null}
                <CoverImage src={drama.coverUrl} alt={drama.title} />
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="min-w-0 text-2xl font-black text-amber-50">
                      <EditableText
                        value={drama.title}
                        disabled={!ADMIN_MODE}
                        onSave={async (title) => {
                          const updated = await updateDramaTitle(drama.id, title);
                          setDramas((current) => mergeDramaCard(current, updated));
                        }}
                      />
                    </h2>
                    <span className="shrink-0 rounded-full bg-amber-300 px-3 py-1 text-sm font-bold text-stone-950">
                      {drama.episodeCount} 集
                    </span>
                  </div>
                  <div className="mt-3 line-clamp-3 min-h-20 text-sm leading-7 text-amber-50/68">
                    <EditableText
                      value={drama.description}
                      multiline
                      disabled={!ADMIN_MODE}
                      placeholder="暂无简介"
                      onSave={async (description) => {
                        const updated = await updateDramaDescription(drama.id, description);
                        setDramas((current) => mergeDramaCard(current, updated));
                      }}
                    />
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {drama.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-amber-200/20 px-3 py-1 text-xs text-amber-100/80"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      {deleteTarget ? (
        <ConfirmDialog
          title="删除短剧"
          description={`确定要删除短剧《${deleteTarget.title}》吗？删除后该短剧及其剧集、高光点和相关本地记录将从当前数据库中移除。`}
          confirmLabel="确认删除"
          isLoading={isDeleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void handleDeleteDrama()}
        />
      ) : null}
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

function CoverImage(props: { src: string; alt: string }) {
  const [hasError, setHasError] = useState(false);
  const resolvedSrc = resolveBackendUrl(props.src);

  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-[radial-gradient(circle_at_30%_20%,#f5c15d,transparent_28%),linear-gradient(135deg,#3f1f12,#110c08)]">
      {!hasError ? (
        <img
          src={resolvedSrc}
          alt={props.alt}
          className="h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-105"
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="flex h-full items-center justify-center px-6 text-center text-2xl font-black text-amber-50/80">
          {props.alt}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
    </div>
  );
}
