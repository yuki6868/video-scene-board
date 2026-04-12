import { useEffect, useMemo, useState } from "react";
import "./App.css";

import { DndContext, useDraggable, useDroppable, closestCenter, DragOverlay} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  fetchScenes,
  createScene,
  updateScene,
  deleteScene,
  reorderScenes,
  duplicateScene,
} from "./api/sceneApi";
import {
  fetchVideos,
  createVideo,
  updateVideo,
  deleteVideo,
  duplicateVideo,
  uploadVideoThumbnail,
} from "./api/videoApi";
import { fetchTasks, createTask, updateTask, deleteTask } from "./api/taskApi";
import {
  generateVoiceAsset,
  fetchVoiceAssets,
  selectVoiceAsset,
} from "./api/voiceAssetApi";

import AssetEditModal from "./components/modals/AssetEditModal";
import VideoModal from "./components/modals/VideoModal";
import SceneModal from "./components/modals/SceneModal";
import { exportVideoDavinci, getDavinciExportDownloadUrl, } from "./api/videoApi";
import VideoAnalyticsPanel from "./components/analytics/VideoAnalyticsPanel";
import { fetchVideoAnalyticsSummary } from "./api/youtubeAnalyticsApi";
import AudienceGenderChart from "./components/audience/AudienceGenderChart";
import AudienceAgeChart from "./components/audience/AudienceAgeChart";

const initialSceneForm = {
  title: "",
  script: "",
  materials: "",
  position: 0,

  section_type: "",
  status: "未着手",
  duration_seconds: "",

  audio_path: "",
  character_name: "",
  character_expression: "",
  background_path: "",
  background_fit_mode: "cover",
  se_path: "",

  telop: "",
  direction: "",
  edit_note: "",
};

const initialVideoForm = {
  title: "",
  thumbnail_url: "",
  thumbnail_input_type: "upload",
  description: "",
  tags: "",
  video_path: "",
  youtube_url: "",
  youtube_id: "",
  published_at: "",
  concept: "",
  target: "",
  goal: "",
  status: "draft",
  analytics_source: "mock",
  aspect_ratio: "9:16",
  frame_width: 1080,
  frame_height: 1920,
};

const VOICE_STYLE_OPTIONS = [
  { label: "ずんだもん / ノーマル", value: 3 },
  { label: "ずんだもん / あまあま", value: 1 },
  { label: "ずんだもん / ツンツン", value: 7 },
  { label: "ずんだもん / セクシー", value: 5 },
  { label: "ずんだもん / ささやき", value: 22 },
  { label: "ずんだもん / ひそひそ", value: 38 },

  { label: "めたん / ノーマル", value: 2 },
  { label: "めたん / あまあま", value: 0 },
  { label: "めたん / ツンツン", value: 6 },
  { label: "めたん / セクシー", value: 4 },

  { label: "春日部つむぎ / ノーマル", value: 8 },

  { label: "玄野武宏 / ノーマル", value: 11 },
  { label: "玄野武宏 / 喜び", value: 39 },
  { label: "玄野武宏 / ツンギレ", value: 40 },
  { label: "玄野武宏 / 悲しみ", value: 41 },
];

function truncateText(text, maxLength = 80) {
  if (!text) return "未設定";
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function buildDefaultExportName(video) {
  if (!video) return "";

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");

  return `${video.title}_${yyyy}${mm}${dd}_${hh}${mi}`;
}

function buildFileUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `http://127.0.0.1:8000/${path}`;
}

function getStatusLabel(status) {
  switch (status) {
    case "draft":
      return "下書き";
    case "in_progress":
      return "制作中";
    case "done":
      return "完了";
    default:
      return status;
  }
}

function getDisplayText(value, fallback = "未設定") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string" && value.trim() === "") return fallback;
  return value;
}

function truncateDescription(text, maxLength = 100) {
  if (!text || !text.trim()) return "説明なし";
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function TaskDroppableColumn({ status, count, children }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `task-column-${status}`,
    data: {
      type: "task-column",
      status,
    },
  });

  return (
    <section
      ref={setNodeRef}
      className={`task-column ${isOver ? "task-column-over" : ""}`}
    >
      <div className="task-column-header">
        <h3>{status}</h3>
        <span className="task-column-count">{count}件</span>
      </div>

      <div className="task-column-body">
        {children}
      </div>
    </section>
  );
}

function formatAnalyticsNumber(value) {
  if (value == null) return "-";
  return new Intl.NumberFormat("ja-JP").format(value);
}

function formatAnalyticsPercent(value) {
  if (value == null) return "-";
  return `${(value * 100).toFixed(2)}%`;
}

function DraggableTaskCard({ task, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: `task-${task.id}`,
    data: {
      type: "task",
      task,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`task-draggable ${isDragging ? "is-dragging" : ""}`}
      style={{
        width: "100%",
        opacity: isDragging ? 0 : 1,
      }}
    >
      {children({ attributes, listeners, isDragging })}
    </div>
  );
}

function getTaskStatusClassName(status) {
  switch (status) {
    case "未着手":
      return "task-badge task-status-todo";
    case "作業中":
      return "task-badge task-status-doing";
    case "完了":
      return "task-badge task-status-done";
    default:
      return "task-badge";
  }
}

function getPriorityClassName(priority) {
  switch (priority) {
    case "高":
      return "task-badge task-priority-high";
    case "中":
      return "task-badge task-priority-medium";
    case "低":
      return "task-badge task-priority-low";
    default:
      return "task-badge";
  }
}

function getPriorityOrder(priority) {
  switch (priority) {
    case "高":
      return 0;
    case "中":
      return 1;
    case "低":
      return 2;
    default:
      return 3;
  }
}

function getStatusClassName(status) {
  switch (status) {
    case "draft":
      return "status-badge status-draft";
    case "in_progress":
      return "status-badge status-in-progress";
    case "done":
      return "status-badge status-done";
    default:
      return "status-badge";
  }
}

function getSceneStatusClassName(status) {
  switch (status) {
    case "未着手":
      return "scene-status-badge scene-status-todo";
    case "作業中":
      return "scene-status-badge scene-status-doing";
    case "完了":
      return "scene-status-badge scene-status-done";
    default:
      return "scene-status-badge";
  }
}

const dummyAudienceData = {
  1: {
    gender_ratio: {
      male: 62,
      female: 34,
      other: 4,
    },
    age_distribution: {
      "13-17": 8,
      "18-24": 26,
      "25-34": 31,
      "35-44": 19,
      "45-54": 10,
      "55-64": 4,
      "65+": 2,
    },
    metric_date: "2026-04-12",
  },
  2: {
    gender_ratio: {
      male: 48,
      female: 50,
      other: 2,
    },
    age_distribution: {
      "13-17": 5,
      "18-24": 30,
      "25-34": 40,
      "35-44": 15,
      "45-54": 6,
      "55-64": 3,
      "65+": 1,
    },
    metric_date: "2026-04-12",
  },
  3: {
    gender_ratio: {
      male: 70,
      female: 28,
      other: 2,
    },
    age_distribution: {
      "13-17": 10,
      "18-24": 35,
      "25-34": 25,
      "35-44": 15,
      "45-54": 8,
      "55-64": 5,
      "65+": 2,
    },
    metric_date: "2026-04-12",
  },
};

function formatDateTime(value) {
  if (!value) return "未設定";

  const normalizedValue =
    typeof value === "string" && !value.endsWith("Z") && !value.includes("+")
      ? `${value}Z`
      : value;

  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return "未設定";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function SortableItem({ scene, progress, onOpenDetail, onDelete, onDuplicate, dragDisabled }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: scene.id,
      disabled: dragDisabled,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article ref={setNodeRef} style={style} className="scene-card">
      <div className="scene-card-header">
        <button
          type="button"
          className={`drag-handle ${dragDisabled ? "is-disabled" : ""}`}
          {...attributes}
          {...listeners}
          disabled={dragDisabled}
          title={dragDisabled ? "検索中は並び替えできません" : "ドラッグで並び替え"}
        >
          ⠿
        </button>
        <span className="scene-meta">Scene #{scene.position + 1}</span>
      </div>

      <div
        className="scene-card-body"
        onClick={() => onOpenDetail(scene)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") onOpenDetail(scene);
        }}
      >
        <div className="scene-title-row">
          <h3>{scene.title}</h3>
          <span className={getSceneStatusClassName(scene.status)}>
            {scene.status || "未設定"}
          </span>
        </div>

        <div className="scene-info-list">
          <div className="scene-info-item">
            <span className="scene-info-label">セクション</span>
            <span className="scene-info-value">{scene.section_type || "未設定"}</span>
          </div>

          <div className="scene-info-item">
            <span className="scene-info-label">秒数</span>
            <span className="scene-info-value">
              {scene.duration_seconds != null ? `${scene.duration_seconds}秒` : "未設定"}
            </span>
          </div>

          <div className="scene-info-item">
            <span className="scene-info-label">キャラ</span>
            <span className="scene-info-value">
              {scene.character_name
                ? scene.character_expression
                  ? `${scene.character_name}（${scene.character_expression}）`
                  : scene.character_name
                : "未設定"}
            </span>
          </div>
        </div>

        <div className="scene-section">
          <strong>台本</strong>
          <p>{truncateText(scene.script, 100)}</p>
        </div>

        <div className="scene-section">
          <strong>素材</strong>
          <p>{truncateText(scene.materials, 60)}</p>
        </div>

        {scene.background_path && (
          <div className="scene-preview-block">
            <strong>背景プレビュー</strong>
            <img
              src={buildFileUrl(scene.background_path)}
              alt={`${scene.title || "シーン"}の背景`}
              className="scene-preview-image"
            />
          </div>
        )}

        {scene.audio_path && (
          <audio
            controls
            src={buildFileUrl(scene.audio_path)}
            style={{ width: "100%", marginTop: "8px" }}
          />
        )}
      </div>

      <div className="scene-section">
        <strong>進捗バー</strong>
        <div className="scene-progress">
          <div className="scene-progress-track">
            <div
              className="scene-progress-fill"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="scene-progress-text">
            {progress.done}/{progress.total} 完了（{progress.percent}%）
          </p>
        </div>
      </div>

      <div className="scene-updated-at">
        更新: {formatDateTime(scene.updated_at)}
      </div>

      <div className="card-actions">
        <button type="button" className="submit-button" onClick={() => onOpenDetail(scene)}>
          詳細
        </button>
        <button
          type="button"
          className="duplicate-button"
          onClick={() => onDuplicate(scene.id)}
        >
          複製
        </button>
        <button
          type="button"
          className="delete-button"
          onClick={() => onDelete(scene.id)}
        >
          削除
        </button>
      </div>
    </article>
  );
}

function App() {
  const [videos, setVideos] = useState([]);
  const [selectedVideoId, setSelectedVideoId] = useState(null);

  const [scenes, setScenes] = useState([]);
  const [sceneForm, setSceneForm] = useState(initialSceneForm);
  const [videoForm, setVideoForm] = useState(initialVideoForm);

  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState("");

  const [editingSceneId, setEditingSceneId] = useState(null);
  const [selectedScene, setSelectedScene] = useState(null);
  const [isSceneModalOpen, setIsSceneModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const [searchText, setSearchText] = useState("");

  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTask, setEditingTask] = useState(null);

  const [activeTask, setActiveTask] = useState(null);
  const [expandedTaskIds, setExpandedTaskIds] = useState({});

  const [editingAsset, setEditingAsset] = useState(null);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState(null);
  const [isDavinciExporting, setIsDavinciExporting] = useState(false);
  const [videoAnalyticsSummaries, setVideoAnalyticsSummaries] = useState({});
  const [videoAudienceSummaries, setVideoAudienceSummaries] = useState({});

  const initialNewTask = {
    create_mode: "section",
    scene_id: "",
    parent_task_id: "",
    title: "",
    detail: "",
    priority: "中",
    status: "未着手",
  };

  const [newTask, setNewTask] = useState(initialNewTask);

  const [voiceAssets, setVoiceAssets] = useState([]);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceError, setVoiceError] = useState("");

  const [voiceForm, setVoiceForm] = useState({
    text: "",
    style_id: 3,
    speed: 1.0,
    pitch: 0.0,
    intonation: 1.0,
    volume: 1.0,
  });

  const isSearching = searchText.trim() !== "";

  const selectedVideo = useMemo(() => {
    return videos.find((video) => video.id === selectedVideoId) ?? null;
  }, [videos, selectedVideoId]);

  const selectedVideoAudience = useMemo(() => {
    if (!selectedVideo) return null;
    return videoAudienceSummaries[selectedVideo.id] ?? null;
  }, [selectedVideo, videoAudienceSummaries]);

  const hasAudienceData = useMemo(() => {
    if (!selectedVideoAudience) return false;

    const gender = selectedVideoAudience.gender_ratio;
    const age = selectedVideoAudience.age_distribution;

    const hasGender =
      (gender?.male ?? 0) > 0 ||
      (gender?.female ?? 0) > 0 ||
      (gender?.other ?? 0) > 0;

    const hasAge = Object.values(age ?? {}).some((value) => value > 0);

    return hasGender || hasAge;
  }, [selectedVideoAudience]);

  const topVideos = useMemo(() => {
    return videos
      .map((video) => ({
        ...video,
        summary: videoAnalyticsSummaries[video.id] ?? null,
      }))
      .filter((video) => video.summary)
      .sort(
        (a, b) =>
          (b.summary?.views_last_7_days || 0) - (a.summary?.views_last_7_days || 0)
      )
      .slice(0, 3);
  }, [videos, videoAnalyticsSummaries]);

  const loadVideos = async () => {
    const data = await fetchVideos();
    setVideos(data);

    if (data.length > 0 && !selectedVideoId) {
      setSelectedVideoId(data[0].id);
    }

    await loadVideoAnalyticsSummaries(data);
    await loadVideoAudienceSummaries(data);
  };

  function handleStartEdit(task) {
    setEditingTaskId(task.id);
    setEditingTask({
      title: task.title,
      detail: task.detail || "",
      priority: task.priority,
      task_type: task.task_type,
      scene_id: task.scene_id,
    });
  }

  const loadVideoAudienceSummaries = async (videoList) => {
    const summaries = {};

    videoList.forEach((video, index) => {
      if (index === 0) {
        summaries[video.id] = {
          gender_ratio: {
            male: 62,
            female: 34,
            other: 4,
          },
          age_distribution: {
            "13-17": 8,
            "18-24": 26,
            "25-34": 31,
            "35-44": 19,
            "45-54": 10,
            "55-64": 4,
            "65+": 2,
          },
          metric_date: "2026-04-12",
        };
        return;
      }

      if (index === 1) {
        summaries[video.id] = {
          gender_ratio: {
            male: 0,
            female: 0,
            other: 0,
          },
          age_distribution: {
            "13-17": 0,
            "18-24": 0,
            "25-34": 0,
            "35-44": 0,
            "45-54": 0,
            "55-64": 0,
            "65+": 0,
          },
          metric_date: "2026-04-12",
        };
        return;
      }

      summaries[video.id] = {
        gender_ratio: {
          male: 55 + (index % 3) * 8,
          female: 40 - (index % 3) * 6,
          other: 5,
        },
        age_distribution: {
          "13-17": 6,
          "18-24": 24,
          "25-34": 34,
          "35-44": 18,
          "45-54": 10,
          "55-64": 5,
          "65+": 3,
        },
        metric_date: "2026-04-12",
      };
    });

    setVideoAudienceSummaries(summaries);
  };

  async function loadVideoAnalyticsSummaries(videoList) {
    try {
      const results = await Promise.all(
        videoList.map(async (video) => {
          try {
            const summary = await fetchVideoAnalyticsSummary(video.id);
            return [video.id, summary];
          } catch (error) {
            console.error(`動画 ${video.id} の分析サマリー取得に失敗`, error);
            return [video.id, null];
          }
        })
      );

      const summaryMap = Object.fromEntries(results);
      setVideoAnalyticsSummaries(summaryMap);
    } catch (error) {
      console.error(error);
    }
  }

  function toggleTaskExpanded(taskId) {
    setExpandedTaskIds((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  }

  // sceneForm → API payload に変換
  const buildScenePayload = (form) => ({
    title: form.title,
    script: form.script,
    materials: form.materials,
    section_type: form.section_type,
    status: form.status,
    duration_seconds:
      form.duration_seconds === "" || form.duration_seconds == null
        ? null
        : Number(form.duration_seconds),
    audio_path: form.audio_path,
    character_name: form.character_name,
    character_expression: form.character_expression,
    background_path: form.background_path,
    background_fit_mode: form.background_fit_mode,
    se_path: form.se_path,
    telop: form.telop,
    direction: form.direction,
    edit_note: form.edit_note,
  });

  // 未保存変更があるか判定
  const isSceneDirty = (form, scene) => {
    if (!scene) return false;

    const payload = buildScenePayload(form);

    return (
      payload.title !== (scene.title || "") ||
      payload.script !== (scene.script || "") ||
      payload.materials !== (scene.materials || "") ||
      payload.section_type !== (scene.section_type || "") ||
      payload.status !== (scene.status || "未着手") ||
      Number(payload.duration_seconds || 0) !== Number(scene.duration_seconds || 0) ||
      payload.audio_path !== (scene.audio_path || "") ||
      payload.character_name !== (scene.character_name || "") ||
      payload.character_expression !== (scene.character_expression || "") ||
      payload.background_path !== (scene.background_path || "") ||
      payload.background_fit_mode !== (scene.background_fit_mode || "cover") ||
      payload.se_path !== (scene.se_path || "") ||
      payload.telop !== (scene.telop || "") ||
      payload.direction !== (scene.direction || "") ||
      payload.edit_note !== (scene.edit_note || "")
    );
  };

  const handleExportDavinci = async () => {
    if (!selectedVideo) {
      alert("動画を選択してください");
      return;
    }

    if (isDavinciExporting) {
      return;
    }

    const defaultExportName = buildDefaultExportName(selectedVideo);
    const inputName = window.prompt(
      "DaVinci出力名を入力してください\n例: 字幕修正版 / 背景差し替え版\n空欄なら日時ベースになります",
      defaultExportName
    );

    if (inputName === null) {
      return;
    }

    const exportName = inputName.trim();

    setIsDavinciExporting(true);

    try {
      if (editingSceneId) {
        const targetScene = scenes.find((s) => s.id === editingSceneId);

        if (targetScene && isSceneDirty(sceneForm, targetScene)) {
          const payload = {
            ...sceneForm,
            duration_seconds:
              sceneForm.duration_seconds === "" || sceneForm.duration_seconds == null
                ? null
                : Number(sceneForm.duration_seconds),
          };

          await updateScene(editingSceneId, {
            ...payload,
            position: targetScene.position,
          });

          setScenes((prev) =>
            prev.map((s) =>
              s.id === editingSceneId
                ? { ...s, ...payload }
                : s
            )
          );
        }
      }

      const result = await exportVideoDavinci(selectedVideo.id, exportName);

      console.log(result);

      const exportedName = result.export_name || "日時ベース";
      alert(`DaVinci用データを出力しました\n出力名: ${exportedName}`);
    } catch (err) {
      console.error(err);
      alert("エクスポートに失敗しました");
    } finally {
      setIsDavinciExporting(false);
    }
  };

  const handleDownloadDavinciZip = () => {
    if (!selectedVideo) {
      alert("動画が選択されていません");
      return;
    }

    const url = getDavinciExportDownloadUrl(selectedVideo.id);
    window.open(url, "_blank");
  };

  function getSceneTaskProgress(sceneId) {
    const relatedTasks = tasks.filter((task) => task.scene_id === sceneId);
    const total = relatedTasks.length;

    if (total === 0) {
      return {
        total: 0,
        done: 0,
        percent: 0,
      };
    }

    const done = relatedTasks.filter((task) => task.status === "完了").length;

    return {
      total,
      done,
      percent: Math.round((done / total) * 100),
    };
  }

  function handleCancelEdit() {
    setEditingTaskId(null);
    setEditingTask(null);
  }

  async function handleSaveEdit(taskId) {
    try {
      await updateTask(taskId, editingTask);
      setEditingTaskId(null);
      setEditingTask(null);
      await loadTasksByVideo(selectedVideoId);
    } catch (e) {
      console.error(e);
      alert("更新失敗");
    }
  }

  async function loadTasksByVideo(videoId) {
    setTasksLoading(true);
    setTasksError("");

    try {
      const data = await fetchTasks({ videoId });
      setTasks(data);
    } catch (error) {
      console.error(error);
      setTasksError("TODO一覧の取得に失敗しました。");
    } finally {
      setTasksLoading(false);
    }
  }

  async function handleTaskDragEnd(event) {
    const { active, over } = event;

    if (!active || !over) return;

    const activeTask = active.data.current?.task;
    const overStatus = over.data.current?.status;

    if (!activeTask || !overStatus) return;
    if (activeTask.status === overStatus) return;

    try {
      await updateTask(activeTask.id, { status: overStatus });
      await loadTasksByVideo(selectedVideoId);
      await loadScenesByVideo(selectedVideoId);

      if (selectedScene) {
        const refreshedScenes = await fetchScenes(selectedVideoId);
        const matchedScene = refreshedScenes.find(
          (scene) => scene.id === selectedScene.id
        );

        if (matchedScene) {
          setSelectedScene(matchedScene);
          setSceneForm({
            title: matchedScene.title || "",
            script: matchedScene.script || "",
            materials: matchedScene.materials || "",
            position: matchedScene.position ?? 0,
            section_type: matchedScene.section_type || "",
            status: matchedScene.status || "未着手",
            duration_seconds: matchedScene.duration_seconds ?? "",
            audio_path: matchedScene.audio_path || "",
            character_name: matchedScene.character_name || "",
            character_expression: matchedScene.character_expression || "",
            background_path: matchedScene.background_path || "",
            background_fit_mode: matchedScene.background_fit_mode || "cover",
            se_path: matchedScene.se_path || "",
            telop: matchedScene.telop || "",
            direction: matchedScene.direction || "",
            edit_note: matchedScene.edit_note || "",
          });
        }
      }
    } catch (error) {
      console.error(error);
      alert("ステータス更新に失敗しました");
    }
  }

  async function loadVoiceAssets(sceneId) {
    if (!sceneId) return;

    try {
      setVoiceError("");
      const data = await fetchVoiceAssets(sceneId);
      setVoiceAssets(data);
    } catch (error) {
      console.error(error);
      setVoiceError(error.message);
    }
  }

  function handleVoiceFormChange(event) {
    const { name, value } = event.target;

    setVoiceForm((prev) => ({
      ...prev,
      [name]:
        name === "text"
          ? value
          : Number(value),
    }));
  }

  async function handleGenerateVoice() {
    if (!selectedScene) return;

    const textToUse =
      voiceForm.text?.trim() ||
      selectedScene.script ||
      selectedScene.telop ||
      "";

    if (!textToUse) {
      alert("セリフがありません");
      return;
    }

    try {
      setVoiceLoading(true);
      setVoiceError("");

      await generateVoiceAsset({
        scene_id: selectedScene.id,
        text: textToUse,
        style_id: Number(voiceForm.style_id),
        speed: Number(voiceForm.speed),
        pitch: Number(voiceForm.pitch),
        intonation: Number(voiceForm.intonation),
        volume: Number(voiceForm.volume),
      });

      await loadVoiceAssets(selectedScene.id);

      setVoiceForm((prev) => ({
        ...prev,
        text: textToUse,
      }));
    } catch (error) {
      console.error(error);
      setVoiceError(error.message);
    } finally {
      setVoiceLoading(false);
    }
  }

  async function handleAssetUpdated() {
    if (!selectedVideoId) return;

    const refreshedScenes = await fetchScenes(selectedVideoId);
    setScenes(refreshedScenes);

    if (selectedScene) {
      const matchedScene = refreshedScenes.find(
        (scene) => scene.id === selectedScene.id
      );

      if (matchedScene) {
        setSelectedScene(matchedScene);
        setSceneForm({
          ...matchedScene,
          title: matchedScene.title || "",
          script: matchedScene.script || "",
          materials: matchedScene.materials || "",
          duration_seconds: matchedScene.duration_seconds ?? "",
        });
      }
    }
  }

  async function handleSelectVoiceAsset(voiceAssetId) {
    if (!selectedScene) return;

    try {
      const result = await selectVoiceAsset(voiceAssetId);
      const updatedScene = result.scene;

      await loadVoiceAssets(selectedScene.id);

      if (updatedScene) {
        setScenes((prev) =>
          prev.map((scene) =>
            scene.id === updatedScene.id ? updatedScene : scene
          )
        );

        setSelectedScene(updatedScene);

        setSceneForm((prev) => ({
          ...prev,
          ...updatedScene,
          title: updatedScene.title || "",
          script: updatedScene.script || "",
          materials: updatedScene.materials || "",
          duration_seconds: updatedScene.duration_seconds ?? "",
        }));
      }
    } catch (error) {
      console.error(error);
      setVoiceError(error.message);
    }
  }

  const loadScenesByVideo = async (videoId) => {
    if (!videoId) {
      setScenes([]);
      setTasks([]);
      setTasksError("");
      return;
    }

    try {
      const data = await fetchScenes(videoId);
      setScenes(data);
    } catch (error) {
      console.error(error);
      alert(error.message || "シーン一覧の取得に失敗しました");
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  useEffect(() => {
    if (!selectedVideoId) {
      setScenes([]);
      setTasks([]);
      setTasksError("");
      return;
    }

    loadScenesByVideo(selectedVideoId);
    loadTasksByVideo(selectedVideoId);
  }, [selectedVideoId]);


  useEffect(() => {
    if (selectedVideoId) {
      loadScenesByVideo(selectedVideoId);
      loadTasksByVideo(selectedVideoId);
    } else {
      setScenes([]);
      setTasks([]);
      setTasksError("");
    }
  }, [selectedVideoId]);

  useEffect(() => {
    if (!selectedScene) {
      setVoiceAssets([]);
      return;
    }

    setVoiceForm((prev) => ({
      ...prev,
      text: selectedScene.script || selectedScene.telop || "",
    }));

    loadVoiceAssets(selectedScene.id);
  }, [selectedScene]);

  const filteredScenes = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) return scenes;

    return scenes.filter((scene) => {
      return (
        (scene.title || "").toLowerCase().includes(keyword) ||
        (scene.script || "").toLowerCase().includes(keyword) ||
        (scene.materials || "").toLowerCase().includes(keyword)
      );
    });
  }, [scenes, searchText]);

  const sortTasksByPriority = (taskList) => {
    return [...taskList].sort((a, b) => {
      const priorityDiff = getPriorityOrder(a.priority) - getPriorityOrder(b.priority);
      if (priorityDiff !== 0) return priorityDiff;

      return b.id - a.id;
    });
  };

  function getChildProgress(task) {
    const children = task.children || [];
    const total = children.length;
    const done = children.filter((child) => child.status === "完了").length;

    return { total, done };
  }

  function buildTaskTree(tasks) {
    const taskMap = {};
    const roots = [];

    tasks.forEach((task) => {
      taskMap[task.id] = {
        ...task,
        children: [],
      };
    });

    tasks.forEach((task) => {
      const current = taskMap[task.id];

      if (task.parent_task_id && taskMap[task.parent_task_id]) {
        taskMap[task.parent_task_id].children.push(current);
      } else {
        roots.push(current);
      }
    });

    return roots;
  }

  function resetNewTask() {
    setNewTask(initialNewTask);
  }

  function TaskTreeNode({
    task,
    expandedTaskIds,
    toggleTaskExpanded,
    handleUpdateTaskStatus,
    handleDeleteTask,
    scenes,
  }) {
    const relatedScene = scenes.find((scene) => scene.id === task.scene_id);
    const hasChildren = task.children && task.children.length > 0;

    return (
      <div className={hasChildren ? "task-tree-node" : "task-child-card"}>
        <div className={hasChildren ? "task-card-header" : "task-child-header"}>
          <div className={hasChildren ? "task-title-row task-title-row-parent" : "task-child-title-wrap"}>
            {hasChildren ? (
              <button
                type="button"
                className="task-expand-button"
                onClick={() => toggleTaskExpanded(task.id)}
              >
                {expandedTaskIds[task.id] ? "▼" : "▶"}
              </button>
            ) : (
              <span className="task-child-bullet">•</span>
            )}

            <span className={hasChildren ? "" : "task-child-title"}>
              {task.title}
            </span>
          </div>

          <div className={hasChildren ? "task-badge-group" : "task-child-badges"}>
            <span className={getPriorityClassName(task.priority)}>
              優先度: {task.priority}
            </span>
            <span className={getTaskStatusClassName(task.status)}>
              {task.status}
            </span>
          </div>
        </div>

        <div className="task-meta">
          <span className="task-meta-item">
            種別: {task.task_type || "未設定"}
          </span>
          <span className="task-meta-item">
            対象:{" "}
            {relatedScene
              ? `Scene #${relatedScene.position + 1} ${relatedScene.title}`
              : "動画全体"}
          </span>
        </div>

        <p className={hasChildren ? "task-detail" : "task-child-detail"}>
          {task.detail || "詳細は未設定です。"}
        </p>

        <div className={hasChildren ? "task-actions task-group-actions" : "task-actions task-child-actions"}>
          {task.status !== "未着手" && (
            <button type="button" onClick={() => handleUpdateTaskStatus(task, "未着手")}>
              未着手
            </button>
          )}
          {task.status !== "作業中" && (
            <button type="button" onClick={() => handleUpdateTaskStatus(task, "作業中")}>
              作業中
            </button>
          )}
          {task.status !== "完了" && (
            <button type="button" onClick={() => handleUpdateTaskStatus(task, "完了")}>
              完了
            </button>
          )}
          <button
            type="button"
            className="task-delete-button"
            onClick={() => handleDeleteTask(task.id)}
          >
            削除
          </button>
        </div>

        {hasChildren && expandedTaskIds[task.id] && (
          <div className="task-children">
            {task.children.map((child) => (
              <TaskTreeNode
                key={child.id}
                task={child}
                expandedTaskIds={expandedTaskIds}
                toggleTaskExpanded={toggleTaskExpanded}
                handleUpdateTaskStatus={handleUpdateTaskStatus}
                handleDeleteTask={handleDeleteTask}
                scenes={scenes}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const taskTree = useMemo(() => {
    return buildTaskTree(sortTasksByPriority(tasks));
  }, [tasks]);

  const sceneGroupTasks = useMemo(() => {
    return taskTree.filter((task) => task.task_type === "scene_group");
  }, [taskTree]);

  const sceneGroupBySceneId = useMemo(() => {
    const map = {};

    tasks.forEach((task) => {
      if (task.task_type === "scene_group" && task.scene_id != null) {
        map[task.scene_id] = task;
      }
    });

    return map;
  }, [tasks]);

  const availableParentTasks = useMemo(() => {
    if (!newTask.scene_id) return [];

    const sceneId = Number(newTask.scene_id);
    const sceneGroup = sceneGroupBySceneId[sceneId];

    if (!sceneGroup) return [];

    // 子タスク追加時は、scene_group直下の親タスクを候補にする
    return tasks.filter(
      (task) =>
        task.scene_id === sceneId &&
        task.parent_task_id === sceneGroup.id
    );
  }, [tasks, newTask.scene_id, sceneGroupBySceneId]);

  const taskColumns = useMemo(() => {
    return {
      未着手: sceneGroupTasks.filter((task) => task.status === "未着手"),
      作業中: sceneGroupTasks.filter((task) => task.status === "作業中"),
      完了: sceneGroupTasks.filter((task) => task.status === "完了"),
    };
  }, [sceneGroupTasks]);

  const resetSceneForm = () => {
    setSceneForm(initialSceneForm);
    setEditingSceneId(null);
  };

  const resetVideoForm = () => {
    setVideoForm(initialVideoForm);
  };

  const closeSceneModal = () => {
    setIsSceneModalOpen(false);
    setSelectedScene(null);
    resetSceneForm();
  };

  const closeVideoModal = () => {
    setIsVideoModalOpen(false);
    setEditingVideoId(null);
    resetVideoForm();
  };

  const openCreateSceneModal = () => {
    if (!selectedVideoId) {
      alert("先に動画を作成してください");
      return;
    }

    resetSceneForm();
    setIsSceneModalOpen(true);
  };

  const openEditVideoModal = () => {
    if (!selectedVideo) return;

    setVideoForm({
      title: selectedVideo.title || "",
      thumbnail_url: selectedVideo.thumbnail_url || "",
      thumbnail_input_type: selectedVideo.thumbnail_url?.startsWith("http")
        ? "url"
        : "upload",
      description: selectedVideo.description || "",
      tags: selectedVideo.tags || "",
      video_path: selectedVideo.video_path || "",
      youtube_url: selectedVideo.youtube_url || "",
      youtube_id: selectedVideo.youtube_id || "",
      analytics_source: selectedVideo.analytics_source || "mock",
      published_at: selectedVideo.published_at
        ? String(selectedVideo.published_at).slice(0, 16)
        : "",
      concept: selectedVideo.concept || "",
      target: selectedVideo.target || "",
      goal: selectedVideo.goal || "",
      status: selectedVideo.status || "draft",
      aspect_ratio: selectedVideo.aspect_ratio || "9:16",
      frame_width: selectedVideo.frame_width ?? 1080,
      frame_height: selectedVideo.frame_height ?? 1920,
    });

    setEditingVideoId(selectedVideo.id);
    setIsVideoModalOpen(true);
  };

  const openDetailModal = (scene) => {
    setSelectedScene(scene);

    setSceneForm({
      ...scene,
      title: scene.title || "",
      script: scene.script || "",
      materials: scene.materials || "",
      duration_seconds: scene.duration_seconds ?? "",
    });

    setEditingSceneId(scene.id);
    setIsSceneModalOpen(true);
  };

  const handleSceneChange = (e) => {
    const { name, value } = e.target;
    setSceneForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleVideoChange = (e) => {
    const { name, value } = e.target;
    setVideoForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  function getTaskPriorityCardClass(priority) {
    switch (priority) {
      case "高":
        return "task-card-priority-high";
      case "中":
        return "task-card-priority-medium";
      case "低":
        return "task-card-priority-low";
      default:
        return "";
    }
  }

  async function handleDeleteTask(taskId) {
    if (!selectedVideo) return;

    const ok = confirm("本当に削除しますか？");
    if (!ok) return;

    try {
      await deleteTask(taskId);
      await loadTasksByVideo(selectedVideo.id);
    } catch (error) {
      console.error(error);
      alert("削除に失敗しました");
    }
  }

  async function handleCreateTask() {
    if (!selectedVideo) return;

    if (!newTask.scene_id) {
      alert("対象シーンを選んでください");
      return;
    }

    if (!newTask.title.trim()) {
      alert("タイトルは必須です");
      return;
    }

    const sceneId = Number(newTask.scene_id);
    const sceneGroup = sceneGroupBySceneId[sceneId];

    if (!sceneGroup) {
      alert("このシーンの親タスクが見つかりません");
      return;
    }

    let parentTaskId = null;
    let taskType = "scene_sub";

    if (newTask.create_mode === "section") {
      // 親タスクを追加 → scene_group の直下
      parentTaskId = sceneGroup.id;
      taskType = "scene_section";
    } else {
      // 子タスクを追加 → 選んだ親タスクの直下
      if (!newTask.parent_task_id) {
        alert("親タスクを選んでください");
        return;
      }

      parentTaskId = Number(newTask.parent_task_id);

      const parentTask = tasks.find((task) => task.id === parentTaskId);

      if (!parentTask) {
        alert("親タスクが見つかりません");
        return;
      }

      // 既存カテゴリ親にぶら下げる場合は、それっぽい task_type に寄せる
      switch (parentTask.task_type) {
        case "voice":
          taskType = "voice_sub";
          break;
        case "background":
          taskType = "background_sub";
          break;
        case "asset":
          taskType = "asset_sub";
          break;
        default:
          taskType = "scene_sub";
          break;
      }
    }

    try {
      await createTask({
        video_id: selectedVideo.id,
        scene_id: sceneId,
        parent_task_id: parentTaskId,
        title: newTask.title.trim(),
        detail: newTask.detail.trim(),
        task_type: taskType,
        priority: newTask.priority,
        status: newTask.status,
      });

      setExpandedTaskIds((prev) => ({
        ...prev,
        [sceneGroup.id]: true,
        ...(parentTaskId ? { [parentTaskId]: true } : {}),
      }));

      resetNewTask();

      await loadTasksByVideo(selectedVideo.id);
    } catch (e) {
      console.error(e);
      alert("作成失敗");
    }
  }

  async function handleUpdateTaskStatus(task, newStatus) {
    try {
      await updateTask(task.id, {
        status: newStatus,
      });

      await loadTasksByVideo(selectedVideo.id);
      await loadScenesByVideo(selectedVideo.id);

      if (selectedScene) {
        const refreshedScenes = await fetchScenes(selectedVideo.id);
        const matchedScene = refreshedScenes.find((scene) => scene.id === selectedScene.id);

        if (matchedScene) {
          setSelectedScene(matchedScene);
          setSceneForm({
            title: matchedScene.title || "",
            script: matchedScene.script || "",
            materials: matchedScene.materials || "",
            position: matchedScene.position ?? 0,
            section_type: matchedScene.section_type || "",
            status: matchedScene.status || "未着手",
            duration_seconds: matchedScene.duration_seconds ?? "",
            audio_path: matchedScene.audio_path || "",
            character_name: matchedScene.character_name || "",
            character_expression: matchedScene.character_expression || "",
            background_path: matchedScene.background_path || "",
            background_fit_mode: matchedScene.background_fit_mode || "cover",
            se_path: matchedScene.se_path || "",
            telop: matchedScene.telop || "",
            direction: matchedScene.direction || "",
            edit_note: matchedScene.edit_note || "",
          });
        }
      }
    } catch (e) {
      console.error(e);
      alert("更新失敗");
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...sceneForm,
      duration_seconds: sceneForm.duration_seconds
        ? parseInt(sceneForm.duration_seconds)
        : null,
    };

    await createScene(payload);
  };

  const handleDragEnd = async (event) => {
    if (isSearching || !selectedVideoId) return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = scenes.findIndex((s) => s.id === active.id);
    const newIndex = scenes.findIndex((s) => s.id === over.id);

    const newScenes = arrayMove(scenes, oldIndex, newIndex);
    const updated = newScenes.map((scene, index) => ({
      ...scene,
      position: index,
    }));

    setScenes(updated);

    try {
      await reorderScenes(
        selectedVideoId,
        updated.map((scene) => ({
          id: scene.id,
          position: scene.position,
        }))
      );

      await loadScenesByVideo(selectedVideoId);
      await loadTasksByVideo(selectedVideoId);
    } catch (error) {
      console.error(error);
      alert(error.message || "シーン並び替えに失敗しました");
      loadScenesByVideo(selectedVideoId);
      loadTasksByVideo(selectedVideoId);
    }
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("このシーンを削除しますか？");
    if (!ok) return;

    try {
      await deleteScene(id);

      if (editingSceneId === id) {
        closeSceneModal();
      }

      await loadScenesByVideo(selectedVideoId);
      await loadTasksByVideo(selectedVideoId);
    } catch (error) {
      console.error(error);
      alert(error.message || "シーン削除に失敗しました");
    }
  };

  const handleDuplicate = async (sceneId) => {
    try {
      await duplicateScene(sceneId);
      await loadScenesByVideo(selectedVideoId);
      await loadTasksByVideo(selectedVideoId);
    } catch (error) {
      console.error(error);
      alert(error.message || "シーン複製に失敗しました");
    }
  };

  const handleSceneSubmit = async (e) => {
    e.preventDefault();

    if (!selectedVideoId) {
      alert("先に動画を選択してください");
      return;
    }

    const payload = {
      ...sceneForm,
      duration_seconds:
        sceneForm.duration_seconds === "" || sceneForm.duration_seconds == null
          ? null
          : Number(sceneForm.duration_seconds),
    };

    try {
      if (editingSceneId === null) {
        await createScene(selectedVideoId, {
          ...payload,
          position: scenes.length,
        });
      } else {
        const targetScene = scenes.find((s) => s.id === editingSceneId);

        if (!targetScene) {
          alert("更新対象のシーンが見つかりません");
          return;
        }

        await updateScene(editingSceneId, {
          ...payload,
          position: targetScene.position,
        });
      }

      closeSceneModal();
      await loadScenesByVideo(selectedVideoId);
      await loadTasksByVideo(selectedVideoId);
    } catch (error) {
      console.error(error);
      alert(error.message || "保存に失敗しました");
    }
  };

  const handleThumbnailFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await uploadVideoThumbnail(file);

      setVideoForm((prev) => ({
        ...prev,
        thumbnail_url: result.thumbnail_url,
        thumbnail_input_type: "upload",
      }));
    } catch (error) {
      console.error(error);
      alert("サムネイル画像のアップロードに失敗しました");
    } finally {
      event.target.value = "";
    }
  };

  const handleVideoSubmit = async () => {
    try {
      if (!videoForm.title || !videoForm.title.trim()) {
        alert("タイトルは必須です");
        return;
      }

      const payload = {
        title: videoForm.title.trim(),
        thumbnail_url: videoForm.thumbnail_url?.trim() || "",
        description: videoForm.description?.trim() || "",
        tags: videoForm.tags?.trim() || "",
        video_path: videoForm.video_path?.trim() || "",
        youtube_url: videoForm.youtube_url?.trim() || "",
        youtube_id: videoForm.youtube_id?.trim() || "",
        concept: videoForm.concept?.trim() || "",
        target: videoForm.target?.trim() || "",
        goal: videoForm.goal?.trim() || "",
        published_at: videoForm.published_at || null,
        status: videoForm.status || "draft",
        analytics_source: videoForm.analytics_source || "mock",
        aspect_ratio: videoForm.aspect_ratio || "9:16",
        frame_width: Number(videoForm.frame_width) || 1080,
        frame_height: Number(videoForm.frame_height) || 1920,
      };

      if (editingVideoId !== null) {
        await updateVideo(editingVideoId, payload);
      } else {
        await createVideo(payload);
      }

      await loadVideos();
      closeVideoModal();
    } catch (error) {
      console.error("動画の保存に失敗しました", error);
      alert(error.message || "動画の保存に失敗しました");
    }
  };

  const handleOpenCreateVideoModal = () => {
    setEditingVideoId(null);
    resetVideoForm();
    setIsVideoModalOpen(true);
  };

  const handleDuplicateVideo = async () => {
    if (!selectedVideoId) return;

    try {
      const duplicated = await duplicateVideo(selectedVideoId);
      await loadVideos();
      setSelectedVideoId(duplicated.id);
    } catch (error) {
      console.error(error);
      alert(error.message || "動画複製に失敗しました");
    }
  };

  const handleDeleteVideo = async () => {
    if (!selectedVideoId) return;

    const deletingId = selectedVideoId;
    const ok = window.confirm("この動画を削除しますか？（シーンも全部消えます）");
    if (!ok) return;

    try {
      await deleteVideo(deletingId);

      const nextVideos = videos.filter((v) => v.id !== deletingId);
      await loadVideos();

      setSelectedVideoId(nextVideos.length > 0 ? nextVideos[0].id : null);
    } catch (error) {
      console.error(error);
      alert(error.message || "動画削除に失敗しました");
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Video Scene Board</h1>
          <p>複数動画を、シーンごとのカードで管理する</p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setIsVideoModalOpen(true)}
          >
            ＋ 動画追加
          </button>
          <button
            type="button"
            className="add-scene-button"
            onClick={openCreateSceneModal}
          >
            ＋ シーン追加
          </button>
        </div>
      </header>

      <main className="scene-board">
        <section className="video-toolbar">
          <div className="video-selector">
            <label htmlFor="video-select">動画選択</label>
            <select
              id="video-select"
              value={selectedVideoId ?? ""}
              onChange={(e) =>
                setSelectedVideoId(e.target.value ? Number(e.target.value) : null)
              }
            >
              {videos.length === 0 ? (
                <option value="">動画がありません</option>
              ) : (
                videos.map((video) => (
                  <option key={video.id} value={video.id}>
                    {video.title}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="video-top-section">
            <div className="video-top-header">
              <h3>注目動画</h3>
              <span>7日再生数 Top 3</span>
            </div>

            {topVideos.length === 0 ? (
              <p className="video-top-empty">分析データのある動画がありません</p>
            ) : (
              <div className="video-top-list">
                {topVideos.map((video, index) => {
                  const isSelected = video.id === selectedVideoId;

                  return (
                    <article
                      key={video.id}
                      className={`video-top-card ${isSelected ? "is-selected" : ""}`}
                      onClick={() => setSelectedVideoId(video.id)}
                    >
                      <div className="video-top-rank">#{index + 1}</div>

                      <div className="video-top-card-header">
                        <strong>{video.title}</strong>
                        <span className={getStatusClassName(video.status)}>
                          {getStatusLabel(video.status)}
                        </span>
                      </div>

                      <p className="video-top-description">
                        {truncateDescription(video.description)}
                      </p>

                      <div className="video-analytics-mini">
                        <div className="video-analytics-mini-item">
                          <span className="video-analytics-mini-label">7日再生数</span>
                          <strong>
                            {formatAnalyticsNumber(video.summary?.views_last_7_days)}
                          </strong>
                        </div>

                        <div className="video-analytics-mini-item">
                          <span className="video-analytics-mini-label">再生数</span>
                          <strong>
                            {formatAnalyticsNumber(video.summary?.latest_views)}
                          </strong>
                        </div>

                        <div className="video-analytics-mini-item">
                          <span className="video-analytics-mini-label">CTR</span>
                          <strong>
                            {formatAnalyticsPercent(
                              video.summary?.latest_impression_click_through_rate
                            )}
                          </strong>
                        </div>

                        <div className="video-analytics-mini-item">
                          <span className="video-analytics-mini-label">取得日</span>
                          <strong>{video.summary?.latest_metric_date || "-"}</strong>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {selectedVideo && (
            <div className="selected-video-summary">
              {(() => {
                const summary = videoAnalyticsSummaries[selectedVideo.id];

                return (
                  <div className="selected-video-main">
                    <div
                      className="selected-video-thumbnail"
                      style={{
                        aspectRatio: `${selectedVideo.frame_width || 1080} / ${selectedVideo.frame_height || 1920}`,
                      }}
                    >
                      {selectedVideo.thumbnail_url ? (
                        <img
                          src={buildFileUrl(selectedVideo.thumbnail_url)}
                          alt={`${selectedVideo.title} のサムネイル`}
                        />
                      ) : (
                        <div className="selected-video-thumbnail-empty">未設定</div>
                      )}
                    </div>

                    <div className="selected-video-content">
                      <div className="selected-video-top">
                        <strong>{selectedVideo.title}</strong>
                        <span className={getStatusClassName(selectedVideo.status)}>
                          {getStatusLabel(selectedVideo.status)}
                        </span>
                      </div>

                      <p className="selected-video-description">
                        {truncateDescription(selectedVideo.description)}
                      </p>

                      <div className="video-analytics-mini">
                        <div className="video-analytics-mini-item">
                          <span className="video-analytics-mini-label">再生数</span>
                          <strong>{formatAnalyticsNumber(summary?.latest_views)}</strong>
                        </div>

                        <div className="video-analytics-mini-item">
                          <span className="video-analytics-mini-label">7日再生数</span>
                          <strong>{formatAnalyticsNumber(summary?.views_last_7_days)}</strong>
                        </div>

                        <div className="video-analytics-mini-item">
                          <span className="video-analytics-mini-label">CTR</span>
                          <strong>
                            {summary
                              ? formatAnalyticsPercent(
                                  summary.latest_impression_click_through_rate
                                )
                              : "-"}
                          </strong>
                        </div>

                        <div className="video-analytics-mini-item">
                          <span className="video-analytics-mini-label">取得日</span>
                          <strong>{summary?.latest_metric_date || "-"}</strong>
                        </div>
                      </div>

                      <div className="selected-video-meta-grid">
                        <div className="selected-video-meta-item">
                          <span className="selected-video-meta-label">タグ</span>
                          <span className="selected-video-meta-value">
                            {getDisplayText(selectedVideo.tags)}
                          </span>
                        </div>

                        <div className="selected-video-meta-item">
                          <span className="selected-video-meta-label">YouTube URL</span>
                          {selectedVideo.youtube_url ? (
                            <a
                              href={selectedVideo.youtube_url}
                              target="_blank"
                              rel="noreferrer"
                              className="selected-video-link"
                            >
                              {selectedVideo.youtube_url}
                            </a>
                          ) : (
                            <span className="selected-video-meta-value">未設定</span>
                          )}
                        </div>

                        <div className="selected-video-meta-item">
                          <span className="selected-video-meta-label">投稿日</span>
                          <span className="selected-video-meta-value">
                            {selectedVideo.published_at
                              ? formatDateTime(selectedVideo.published_at)
                              : "未設定"}
                          </span>
                        </div>
                      </div>

                      <div className="video-datetime-list">
                        <span>作成: {formatDateTime(selectedVideo.created_at)}</span>
                        <span>更新: {formatDateTime(selectedVideo.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {selectedVideo && (
            <section className="audience-section">
              <div className="audience-section-header">
                <h3>視聴者属性</h3>
                <span className="audience-section-date">
                  取得日: {selectedVideoAudience?.metric_date || "-"}
                </span>
              </div>

              {!selectedVideoAudience ? (
                <div className="audience-empty">
                  この動画の視聴者属性データはまだありません
                </div>
              ) : !hasAudienceData ? (
                <div className="audience-empty">
                  視聴者属性データはありますが、まだ表示できる集計値がありません
                </div>
              ) : (
                <div className="audience-summary-grid">
                  <AudienceGenderChart genderRatio={selectedVideoAudience.gender_ratio} />
                  <AudienceAgeChart ageDistribution={selectedVideoAudience.age_distribution} />
                </div>
              )}
            </section>
          )}

          {selectedVideo && (
            <div className="video-actions">
              <button className="submit-button" onClick={openEditVideoModal}>
                編集
              </button>
              <button
                type="button"
                className={`export-button ${isDavinciExporting ? "is-loading" : ""}`}
                onClick={handleExportDavinci}
                disabled={isDavinciExporting}
              >
                {isDavinciExporting ? "DaVinci出力中..." : "DaVinci出力"}
              </button>
              <button
                type="button"
                className="duplicate-button"
                onClick={handleDuplicateVideo}
              >
                複製
              </button>
              <button className="delete-button" onClick={handleDeleteVideo}>
                削除
              </button>
            </div>
          )}
        </section>

        {selectedVideo && (
          <section className="task-panel">
            <div className="task-panel-header">
              <div>
                <h2>TODOボード</h2>
                <p>ステータスごとにタスクを確認できます。</p>
              </div>
            </div>

            <div className="task-create-form">
              <h3>TODO追加</h3>

              <select
                value={newTask.create_mode}
                onChange={(e) =>
                  setNewTask((prev) => ({
                    ...prev,
                    create_mode: e.target.value,
                    parent_task_id: "",
                  }))
                }
              >
                <option value="section">親タスクを追加</option>
                <option value="child">子タスクを追加</option>
              </select>

              <select
                value={newTask.scene_id}
                onChange={(e) =>
                  setNewTask((prev) => ({
                    ...prev,
                    scene_id: e.target.value,
                    parent_task_id: "",
                  }))
                }
              >
                <option value="">対象シーンを選択</option>
                {scenes.map((scene) => (
                  <option key={scene.id} value={scene.id}>
                    Scene #{scene.position + 1} {scene.title}
                  </option>
                ))}
              </select>

              {newTask.create_mode === "child" && (
                <select
                  value={newTask.parent_task_id}
                  onChange={(e) =>
                    setNewTask((prev) => ({
                      ...prev,
                      parent_task_id: e.target.value,
                    }))
                  }
                  disabled={!newTask.scene_id}
                >
                  <option value="">親タスクを選択</option>
                  {availableParentTasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              )}

              <input
                type="text"
                placeholder={
                  newTask.create_mode === "section"
                    ? "親タスク名（例: テロップ）"
                    : "子タスク名（例: テロップを入れる）"
                }
                value={newTask.title}
                onChange={(e) =>
                  setNewTask((prev) => ({ ...prev, title: e.target.value }))
                }
              />

              <textarea
                placeholder="詳細"
                value={newTask.detail}
                onChange={(e) =>
                  setNewTask((prev) => ({ ...prev, detail: e.target.value }))
                }
              />

              <select
                value={newTask.priority}
                onChange={(e) =>
                  setNewTask((prev) => ({ ...prev, priority: e.target.value }))
                }
              >
                <option value="高">高</option>
                <option value="中">中</option>
                <option value="低">低</option>
              </select>

              <button
                type="button"
                className="submit-button"
                onClick={handleCreateTask}
              >
                追加
              </button>
            </div>

            {tasksLoading ? (
              <p className="empty-state">TODOを読み込み中です...</p>
            ) : tasksError ? (
              <p className="error-message">{tasksError}</p>
            ) : (
              <DndContext
                collisionDetection={closestCenter}
                onDragStart={(event) => {
                  setActiveTask(event.active.data.current?.task ?? null);
                }}
                onDragCancel={() => {
                  setActiveTask(null);
                }}
                onDragEnd={async (event) => {
                  const draggedTask = event.active.data.current?.task ?? null;
                  setActiveTask(null);

                  if (!draggedTask) return;

                  await handleTaskDragEnd(event);
                }}
              >
                <div className="task-board">
                  {["未着手", "作業中", "完了"].map((status) => (
                    <TaskDroppableColumn
                      key={status}
                      status={status}
                      count={taskColumns[status].length}
                    >
                      {taskColumns[status].length === 0 ? (
                        <p className="task-column-empty">タスクはありません</p>
                      ) : (
                        taskColumns[status].map((task) => {
                          const relatedScene = scenes.find(
                            (scene) => scene.id === task.scene_id
                          );

                          const hasChildren =
                            task.children && task.children.length > 0;

                          return (
                            <div key={task.id}>
                              {hasChildren ? (
                                <article
                                  className={`task-card ${getTaskPriorityCardClass(
                                    task.priority
                                  )}`}
                                >
                                  <div className="task-card-header">
                                    <span className="drag-handle task-drag-handle is-disabled">
                                      ⠿
                                    </span>

                                    <div className="task-title-row task-title-row-parent">
                                      <button
                                        type="button"
                                        className="task-expand-button"
                                        onClick={() => toggleTaskExpanded(task.id)}
                                      >
                                        {expandedTaskIds[task.id] ? "▼" : "▶"}
                                      </button>

                                      <h4>
                                        {task.title}
                                        <span className="task-progress-inline">
                                          {" "}
                                          ({getChildProgress(task).done}/
                                          {getChildProgress(task).total})
                                        </span>
                                      </h4>
                                    </div>

                                    <div className="task-badge-group">
                                      <span className={getPriorityClassName(task.priority)}>
                                        優先度: {task.priority}
                                      </span>
                                      <span className={getTaskStatusClassName(task.status)}>
                                        {task.status}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="task-meta">
                                    <span className="task-meta-item">
                                      種別: {task.task_type || "未設定"}
                                    </span>
                                    <span className="task-meta-item">
                                      対象:{" "}
                                      {relatedScene
                                        ? `Scene #${relatedScene.position + 1} ${relatedScene.title}`
                                        : "動画全体"}
                                    </span>
                                  </div>

                                  <p className="task-detail">
                                    {task.detail || "詳細は未設定です。"}
                                  </p>

                                  {expandedTaskIds[task.id] && (
                                    <div className="task-children">
                                      {task.children.map((child) => (
                                        <TaskTreeNode
                                          key={child.id}
                                          task={child}
                                          expandedTaskIds={expandedTaskIds}
                                          toggleTaskExpanded={toggleTaskExpanded}
                                          handleUpdateTaskStatus={handleUpdateTaskStatus}
                                          handleDeleteTask={handleDeleteTask}
                                          scenes={scenes}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </article>
                              ) : (
                                <DraggableTaskCard task={task}>
                                  {({ attributes, listeners }) => (
                                    <article
                                      className={`task-card ${getTaskPriorityCardClass(
                                        task.priority
                                      )}`}
                                    >
                                      <div className="task-card-header">
                                        <button
                                          type="button"
                                          className="drag-handle task-drag-handle"
                                          {...attributes}
                                          {...listeners}
                                          title="ドラッグで移動"
                                        >
                                          ⠿
                                        </button>

                                        <h4>{task.title}</h4>

                                        <div className="task-badge-group">
                                          <span className={getPriorityClassName(task.priority)}>
                                            優先度: {task.priority}
                                          </span>
                                          <span className={getTaskStatusClassName(task.status)}>
                                            {task.status}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="task-meta">
                                        <span className="task-meta-item">
                                          種別: {task.task_type || "未設定"}
                                        </span>
                                        <span className="task-meta-item">
                                          対象:{" "}
                                          {relatedScene
                                            ? `Scene #${relatedScene.position + 1} ${relatedScene.title}`
                                            : "動画全体"}
                                        </span>
                                      </div>

                                      <p className="task-detail">
                                        {task.detail || "詳細は未設定です。"}
                                      </p>

                                      <div className="task-actions">
                                        <button
                                          type="button"
                                          onClick={() => handleStartEdit(task)}
                                        >
                                          編集
                                        </button>

                                        {task.status !== "未着手" && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleUpdateTaskStatus(task, "未着手")
                                            }
                                          >
                                            未着手へ
                                          </button>
                                        )}

                                        {task.status !== "作業中" && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleUpdateTaskStatus(task, "作業中")
                                            }
                                          >
                                            作業中へ
                                          </button>
                                        )}

                                        {task.status !== "完了" && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleUpdateTaskStatus(task, "完了")
                                            }
                                          >
                                            完了へ
                                          </button>
                                        )}

                                        <button
                                          type="button"
                                          className="delete-button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteTask(task.id);
                                          }}
                                          onPointerDown={(e) => e.stopPropagation()}
                                        >
                                          削除
                                        </button>
                                      </div>
                                    </article>
                                  )}
                                </DraggableTaskCard>
                              )}
                            </div>
                          );
                        })
                      )}
                    </TaskDroppableColumn>
                  ))}
                </div>

                <DragOverlay>
                  {activeTask ? (
                    <article
                      className={`task-card ${getTaskPriorityCardClass(
                        activeTask.priority
                      )}`}
                      style={{
                        width: 420,
                        maxWidth: "calc(100vw - 32px)",
                      }}
                    >
                      <div className="task-card-header">
                        <h4>{activeTask.title}</h4>
                        <div className="task-badge-group">
                          <span className={getPriorityClassName(activeTask.priority)}>
                            優先度: {activeTask.priority}
                          </span>
                        </div>
                      </div>

                      <div className="task-meta">
                        <span className="task-meta-item">
                          種別: {activeTask.task_type || "未設定"}
                        </span>
                        <span className="task-meta-item">
                          対象:{" "}
                          {(() => {
                            const relatedScene = scenes.find(
                              (scene) => scene.id === activeTask.scene_id
                            );
                            return relatedScene
                              ? `Scene #${relatedScene.position + 1} ${relatedScene.title}`
                              : "動画全体";
                          })()}
                        </span>
                      </div>

                      <p className="task-detail">
                        {activeTask.detail || "詳細は未設定です。"}
                      </p>
                    </article>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
            <VideoAnalyticsPanel selectedVideo={selectedVideo} />
          </section>
        )}

        <div className="scene-toolbar">
          <input
            type="text"
            className="scene-search"
            placeholder="タイトル・台本・素材で検索"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            disabled={!selectedVideoId}
          />
          <span className="scene-count">
            {filteredScenes.length}件 / 全{scenes.length}件
          </span>
        </div>

        {isSearching && (
          <p className="search-notice">
            検索中は並び替えできません。並び替えるときは検索をクリアしてください。
          </p>
        )}

        {!selectedVideoId ? (
          <div className="empty-state">
            <p>まずは動画を1本作成してください。</p>
          </div>
        ) : (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={filteredScenes.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="scene-list">
                {filteredScenes.map((scene) => (
                  <SortableItem
                    key={scene.id}
                    scene={scene}
                    progress={getSceneTaskProgress(scene.id)}
                    onOpenDetail={openDetailModal}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                    dragDisabled={isSearching}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </main>

      <SceneModal
        isOpen={isSceneModalOpen}
        form={sceneForm}
        videoId={selectedVideoId}
        editingSceneId={editingSceneId}
        onChange={handleSceneChange}
        onSubmit={handleSceneSubmit}
        onClose={closeSceneModal}
        loadTasks={() => loadTasksByVideo(selectedVideoId)}
        onAssetUpdated={handleAssetUpdated}
        tasks={tasks}
        handleUpdateTaskStatus={handleUpdateTaskStatus}
        voiceForm={voiceForm}
        voiceLoading={voiceLoading}
        voiceError={voiceError}
        voiceAssets={voiceAssets}
        voiceStyleOptions={VOICE_STYLE_OPTIONS}
        onVoiceFormChange={handleVoiceFormChange}
        onGenerateVoice={handleGenerateVoice}
        onSelectVoiceAsset={handleSelectVoiceAsset}
        video={selectedVideo}
      />

      <VideoModal
        isOpen={isVideoModalOpen}
        form={videoForm}
        onChange={handleVideoChange}
        onSubmit={handleVideoSubmit}
        onClose={closeVideoModal}
        onThumbnailFileChange={handleThumbnailFileChange}
        editingVideoId={editingVideoId}
      />

    </div>
  );
}

export default App;