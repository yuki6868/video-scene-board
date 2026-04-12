import { useEffect, useMemo, useState } from "react";
import {
  fetchVideoAnalyticsDaily,
  syncVideoAnalytics,
} from "../../api/youtubeAnalyticsApi";

function formatNumber(value) {
  if (value == null) return "-";
  return new Intl.NumberFormat("ja-JP").format(value);
}

function formatPercent(value) {
  if (value == null) return "-";
  return `${(value * 100).toFixed(2)}%`;
}

export default function VideoAnalyticsPanel({ selectedVideo }) {
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

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
      const data = await fetchVideoAnalyticsDaily(selectedVideo.id);
      setAnalytics(data);
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
      const data = await syncVideoAnalytics(selectedVideo.id);
      setAnalytics(data);
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
          <div className="analytics-summary-grid">
            <article className="analytics-card">
              <span className="analytics-card-label">再生数</span>
              <strong>{formatNumber(latestAnalytics?.views)}</strong>
            </article>

            <article className="analytics-card">
              <span className="analytics-card-label">高評価</span>
              <strong>{formatNumber(latestAnalytics?.likes)}</strong>
            </article>

            <article className="analytics-card">
              <span className="analytics-card-label">コメント</span>
              <strong>{formatNumber(latestAnalytics?.comments)}</strong>
            </article>

            <article className="analytics-card">
              <span className="analytics-card-label">CTR</span>
              <strong>
                {latestAnalytics
                  ? formatPercent(latestAnalytics.impression_click_through_rate)
                  : "-"}
              </strong>
            </article>
          </div>

          <div className="analytics-table-wrapper">
            {analytics.length === 0 ? (
              <p className="empty-text">
                まだ分析データがありません。同期ボタンで取得してください。
              </p>
            ) : (
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>日付</th>
                    <th>再生数</th>
                    <th>高評価</th>
                    <th>コメント</th>
                    <th>平均視聴秒数</th>
                    <th>総視聴時間(分)</th>
                    <th>表示回数</th>
                    <th>CTR</th>
                    <th>登録者増</th>
                    <th>取得元</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.map((row) => (
                    <tr key={row.id}>
                      <td>{row.metric_date}</td>
                      <td>{formatNumber(row.views)}</td>
                      <td>{formatNumber(row.likes)}</td>
                      <td>{formatNumber(row.comments)}</td>
                      <td>{formatNumber(row.average_view_duration_seconds)}</td>
                      <td>{formatNumber(row.watch_time_minutes)}</td>
                      <td>{formatNumber(row.impressions)}</td>
                      <td>{formatPercent(row.impression_click_through_rate)}</td>
                      <td>{formatNumber(row.subscribers_gained)}</td>
                      <td>{row.data_source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </section>
  );
}