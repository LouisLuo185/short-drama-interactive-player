import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchImportPipelineJob,
  importDrama,
  startImportPipelineJob,
  type ImportPipelineJob
} from "../../services/adminImportApi";
import type { ImportDramaInput } from "../../types/adminImport";

const sampleImportJson = JSON.stringify(
  {
    title: "导入示例短剧",
    description: "这是兼容旧流程的 JSON 导入示例。新的推荐流程请使用上方智能流水线命令。",
    tags: ["导入", "MVP", "反转"],
    coverUrl: "/media/covers/default_drama.jpg",
    episodes: [
      {
        episodeNo: 1,
        title: "第1集 ep_001",
        videoUrl: "/media/videos/demo/ep_001.mp4",
        coverUrl: "/media/covers/default_episode.jpg",
        durationSec: 90,
        highlights: []
      }
    ]
  },
  null,
  2
);

export function AdminImportPage() {
  const navigate = useNavigate();
  const [sourcePath, setSourcePath] = useState("C:\\Users\\Louis\\Desktop\\Short_Drama\\dataset\\diyiwanku");
  const [dramaSlug, setDramaSlug] = useState("diyiwanku");
  const [title, setTitle] = useState("第一碗苦");
  const [jsonText, setJsonText] = useState(sampleImportJson);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pipelineJob, setPipelineJob] = useState<ImportPipelineJob | null>(null);
  const [isStartingPipeline, setIsStartingPipeline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const smartImportCommand = useMemo(() => {
    const args = [
      "npm run import:pipeline -w apps/server --",
      `--source ${quotePowerShell(sourcePath)}`,
      `--drama-slug ${dramaSlug.trim() || "your-drama-slug"}`,
      `--title ${quotePowerShell(title.trim() || "短剧标题")}`,
      "--config tools/asr-highlight-pipeline/config.local.json"
    ];

    return args.join(" ");
  }, [dramaSlug, sourcePath, title]);

  useEffect(() => {
    if (!pipelineJob || (pipelineJob.status !== "queued" && pipelineJob.status !== "running")) return;

    const timer = window.setInterval(() => {
      void fetchImportPipelineJob(pipelineJob.jobId)
        .then((job) => {
          setPipelineJob(job);
          if (job.status === "success") {
            setSuccess(`智能导入完成：${job.dramaSlug}`);
          }
          if (job.status === "error") {
            setError(job.error ?? "智能导入失败");
          }
        })
        .catch((pollError) => {
          setError(pollError instanceof Error ? pollError.message : "查询导入进度失败");
        });
    }, 3000);

    return () => window.clearInterval(timer);
  }, [pipelineJob]);

  async function handleSubmit() {
    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      const payload = JSON.parse(jsonText) as ImportDramaInput;
      const result = await importDrama(payload);

      setSuccess(`旧 JSON 导入成功：${result.dramaId}`);
      navigate(`/dramas/${result.dramaId}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "导入失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleFormat() {
    try {
      setJsonText(JSON.stringify(JSON.parse(jsonText), null, 2));
      setError(null);
    } catch (formatError) {
      setError(formatError instanceof Error ? formatError.message : "JSON 格式错误");
    }
  }

  async function handleStartPipeline() {
    try {
      setIsStartingPipeline(true);
      setError(null);
      setSuccess(null);

      const job = await startImportPipelineJob({
        sourceDir: sourcePath,
        dramaSlug,
        title,
        configPath: "tools/asr-highlight-pipeline/config.local.json"
      });
      setPipelineJob(job);
      setSuccess(`智能导入已启动：${job.jobId}`);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "智能导入启动失败");
    } finally {
      setIsStartingPipeline(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#66401a,transparent_34%),linear-gradient(135deg,#120f0b,#24180f)] px-5 py-8 text-amber-50 md:px-8 md:py-12">
      <section className="mx-auto max-w-6xl">
        <Link className="text-sm font-semibold text-amber-300 hover:text-amber-200" to="/dramas">
          返回短剧列表
        </Link>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-amber-200/70">Smart Import Pipeline</p>
            <h1 className="mt-3 text-4xl font-black md:text-6xl">智能导入短剧</h1>
            <p className="mt-4 max-w-3xl text-amber-50/72">
              推荐使用文件夹流水线导入：自动复制视频、抽取音频、运行 WhisperX、调用豆包预处理、构建全局剧情上下文、生成简介标签和高光点。
            </p>
          </div>
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] border border-amber-200/15 bg-black/30 p-6 shadow-2xl shadow-black/25">
            <h2 className="text-2xl font-black">一键流水线命令</h2>
            <p className="mt-3 text-sm leading-6 text-amber-50/65">
              浏览器不能直接把本地任意文件夹交给后端复制和跑 WhisperX，所以这里生成命令；你在项目根目录执行后，导入、识别、总结和高光分发会走同一套服务端流水线。
            </p>

            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm font-bold text-amber-100">
                短剧源文件夹
                <input className="input" value={sourcePath} onChange={(event) => setSourcePath(event.currentTarget.value)} />
              </label>
              <label className="grid gap-2 text-sm font-bold text-amber-100">
                dramaSlug
                <input className="input" value={dramaSlug} onChange={(event) => setDramaSlug(event.currentTarget.value)} />
              </label>
              <label className="grid gap-2 text-sm font-bold text-amber-100">
                短剧标题
                <input className="input" value={title} onChange={(event) => setTitle(event.currentTarget.value)} />
              </label>
            </div>

            <pre className="mt-5 overflow-x-auto rounded-2xl border border-amber-200/15 bg-stone-950/80 p-4 text-xs leading-6 text-amber-100">
              <code>{smartImportCommand}</code>
            </pre>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={isStartingPipeline || pipelineJob?.status === "queued" || pipelineJob?.status === "running"}
                className="rounded-full bg-amber-300 px-5 py-3 text-sm font-black text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void handleStartPipeline()}
              >
                {isStartingPipeline ? "正在启动..." : "一键开始智能导入"}
              </button>
              {pipelineJob?.result?.dramaId ? (
                <button
                  type="button"
                  className="rounded-full border border-amber-200/25 px-5 py-3 text-sm font-bold text-amber-100 transition hover:bg-amber-50/10"
                  onClick={() => navigate(`/dramas/${pipelineJob.result?.dramaId}`)}
                >
                  查看导入结果
                </button>
              ) : null}
            </div>

            {pipelineJob ? <PipelineJobStatus job={pipelineJob} /> : null}

            <div className="mt-5 rounded-2xl border border-amber-200/15 bg-amber-50/[0.06] p-4 text-sm leading-6 text-amber-50/75">
              运行前确认：`config.local.json` 已填豆包 API 信息；本机可用 `ffmpeg/ffprobe`；WhisperX 命令模板已写入配置或通过命令参数传入。这个页面不会读取你的 API Key。
            </div>
          </div>

          <PipelineSpecCard />
        </section>

        <section className="mt-8 rounded-[2rem] border border-amber-200/15 bg-amber-50/[0.05] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-black">高级兼容：JSON / URL 导入</h2>
              <p className="mt-2 text-sm leading-6 text-amber-50/62">
                保留给快速测试和旧数据迁移。它只写入短剧、剧集和手工高光，不会自动跑 ASR、LLM 上下文和深度高光分析。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-full border border-amber-200/25 px-5 py-3 text-sm font-bold text-amber-100 transition hover:bg-amber-50/10"
                onClick={handleFormat}
              >
                格式化 JSON
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                className="rounded-full bg-amber-300 px-5 py-3 text-sm font-black text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void handleSubmit()}
              >
                {isSubmitting ? "导入中" : "提交旧 JSON 导入"}
              </button>
            </div>
          </div>

          <textarea
            className="mt-5 min-h-[420px] w-full rounded-[1.5rem] border border-amber-200/15 bg-black/40 p-5 font-mono text-sm leading-6 text-amber-50 outline-none shadow-2xl shadow-black/30 focus:border-amber-200/45"
            value={jsonText}
            onChange={(event) => setJsonText(event.currentTarget.value)}
            spellCheck={false}
          />

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-300/30 bg-red-500/10 p-4 text-sm text-red-100">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="mt-5 rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              {success}
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}

function PipelineJobStatus(props: { job: ImportPipelineJob }) {
  const steps = props.job.report?.steps ?? [];

  return (
    <div className="mt-5 rounded-2xl border border-amber-200/15 bg-black/35 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-mono text-xs text-amber-200/70">{props.job.jobId}</div>
          <div className="mt-1 text-sm font-black text-amber-50">
            状态：{formatJobStatus(props.job.status)}
          </div>
        </div>
        {props.job.error ? <div className="text-sm font-bold text-red-200">{props.job.error}</div> : null}
      </div>
      {steps.length > 0 ? (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {steps.map((step, index) => (
            <div
              key={`${step.step}_${index}`}
              className="rounded-xl border border-amber-200/10 bg-amber-50/[0.04] px-3 py-2 text-sm"
            >
              <span className="font-mono text-amber-200">{step.step}</span>
              <span className="ml-2 text-amber-50/70">{formatJobStatus(step.status)}</span>
              {step.message ? <div className="mt-1 text-xs text-amber-50/48">{step.message}</div> : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-amber-50/58">等待流水线写入进度...</p>
      )}
    </div>
  );
}

function formatJobStatus(status: string) {
  const labels: Record<string, string> = {
    queued: "排队中",
    running: "运行中",
    success: "已完成",
    error: "失败",
    pending: "等待中",
    skipped: "已跳过"
  };
  return labels[status] ?? status;
}

function PipelineSpecCard() {
  const rows = [
    ["0.source", "源文件扫描、导入清单、pipeline_report.json"],
    ["media/videos", "复制后的 ep_001.mp4、ep_002.mp4 等播放源"],
    ["1.ffmpeg--audio", "ffmpeg 分离出的 audio.wav"],
    ["2.whisperX--asr", "WhisperX 输出的 srt/json/segments"],
    ["3.doubao--llm_preprocess", "LLM 语义断句后的 refined_srt 与句级时间轴"],
    ["3.5.doubao--story_context", "整部剧人物关系、剧情上下文、弹幕信号、简介标签"],
    ["4.doubao--llm_highlights", "最终高光点、人工校对覆盖文件、播放条标记来源"]
  ];

  return (
    <div className="rounded-[2rem] border border-amber-200/15 bg-amber-50/[0.06] p-6 shadow-2xl shadow-black/20">
      <h2 className="text-2xl font-black">目录对接规范</h2>
      <p className="mt-3 text-sm leading-6 text-amber-50/65">
        流水线各步骤只通过文件目录和标准 JSON/SRT 交接，前端播放器只读取服务端分发出的剧集、高光和互动数据，模块之间不会互相嵌套。
      </p>
      <div className="mt-5 space-y-3">
        {rows.map(([name, description]) => (
          <div key={name} className="rounded-2xl border border-amber-200/10 bg-black/25 p-4">
            <div className="font-mono text-sm font-bold text-amber-200">{name}</div>
            <div className="mt-1 text-sm leading-6 text-amber-50/70">{description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function quotePowerShell(value: string) {
  return `"${value.replace(/"/g, '\\"')}"`;
}
