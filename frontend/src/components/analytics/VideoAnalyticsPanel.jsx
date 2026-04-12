import { useEffect, useMemo, useState } from "react";
import {
  fetchVideoAnalyticsDaily,
  syncVideoAnalytics,
} from "../../api/youtubeAnalyticsApi";
import AnalyticsSummaryCards from "./AnalyticsSummaryCards";
import AnalyticsDailyTable from "./AnalyticsDailyTable";
import AnalyticsLineChart from "./AnalyticsLineChart";
import { fetchVideoAnalyticsSummary } from "../../api/youtubeAnalyticsApi";

export default function VideoAnalyticsPanel({ selectedVideo }) {
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);

  const canUseAnalytics = Boolean(selectedVideo?.id && selectedVideo?.youtube_id);

  const latestAnalytics = useMemo(() => {
    if (!analytics.length) return null;
    return analytics[analytics.length - 1];
  }, [analytics]);

  const loadAnalytics = async () => {
    if (!selectedVideo?.id) return;

    setLoading(true);
    setError("");

    try {
        const [dailyData, summaryData] = await Promise.all([
        fetchVideoAnalyticsDaily(selectedVideo.id),
        fetchVideoAnalyticsSummary(selectedVideo.id),
        ]);

        setAnalytics(dailyData);
        setSummary(summaryData);
    } catch (err) {
        console.error(err);
        setError("分析データの取得に失敗しました。");
    } finally {
        setLoading(false);
    }
    };

  const handleSync = async () => {
    if (!selectedVideo?.id) return;

    setSyncing(true);
    setError("");

    try {
        await syncVideoAnalytics(selectedVideo.id);

        const [dailyData, summaryData] = await Promise.all([
        fetchVideoAnalyticsDaily(selectedVideo.id),
        fetchVideoAnalyticsSummary(selectedVideo.id),
        ]);

        setAnalytics(dailyData);
        setSummary(summaryData);
    } catch (err) {
        console.error(err);
        setError("分析データの同期に失敗しました。");
    } finally {
        setSyncing(false);
    }
    };

  useEffect(() => {
    setAnalytics([]);
    setError("");

    if (canUseAnalytics) {
      loadAnalytics();
    }
  }, [selectedVideo?.id, selectedVideo?.youtube_id]);

  return (
    <section className="video-analytics-panel">
      <div className="section-header">
        <div>
          <h3>YouTube分析</h3>
          <p className="form-help-text">
            動画ごとの日次分析データを確認できます。
          </p>
        </div>

        <p className="form-help-text">
          (現在の取得元: {analytics[analytics.length - 1]?.data_source || selectedVideo.analytics_source || "mock"})
        </p>

        <button
          type="button"
          className="primary-button"
          onClick={handleSync}
          disabled={!canUseAnalytics || syncing}
        >
          {syncing ? "同期中..." : "分析データを同期"}
        </button>
      </div>

      {!selectedVideo ? (
        <p className="empty-text">動画を選択すると分析を表示できます。</p>
      ) : !selectedVideo.youtube_id ? (
        <p className="empty-text">
          YouTube分析を使うには、先に動画へ YouTube ID を設定してください。
        </p>
      ) : loading ? (
        <p className="empty-text">分析データを読み込み中です...</p>
      ) : error ? (
        <p className="error-text">{error}</p>
      ) : (
        <>
            <AnalyticsSummaryCards summary={summary} />
            <AnalyticsLineChart analytics={analytics} />
            <AnalyticsDailyTable analytics={analytics} />
        </>
      )}
    </section>
  );
}