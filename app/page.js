'use client';
import { useState, useEffect } from 'react';
import styles from './page.module.css';

function getWeekRange(offset) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: monday, end: sunday };
}

function fmt(d) {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function weekLabel(offset) {
  const { start, end } = getWeekRange(offset);
  const range = `${fmt(start)}–${fmt(end)}`;
  if (offset === 0) return `本週 (${range})`;
  if (offset === -1) return `上週 (${range})`;
  return range;
}

export default function Home() {
  const [sheetId, setSheetId] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);
  const [status, setStatus] = useState('idle');
  const [digest, setDigest] = useState(null);
  const [error, setError] = useState('');
  const [totalRows, setTotalRows] = useState(0);

  async function generate() {
    if (!sheetId.trim()) { setError('請填入 Google Sheet ID'); return; }
    setStatus('loading');
    setError('');
    setDigest(null);
    try {
      const res = await fetch('/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetId: sheetId.trim(), weekOffset }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '未知錯誤');
      setDigest(data.digest);
      setTotalRows(data.totalRows);
      setStatus('done');
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  }

  const maxCount = digest ? Math.max(...digest.hotTopics.map(t => t.count), 1) : 1;

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.lineIcon}>
            <svg viewBox="0 0 24 24" fill="white" width="20" height="20">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.07 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
            </svg>
          </div>
          <div>
            <h1 className={styles.title}>Line 群組週報</h1>
            <p className={styles.subtitle}>每週自動整理重點</p>
          </div>
        </div>
        <div className={styles.weekNav}>
          <button onClick={() => setWeekOffset(o => o - 1)}>←</button>
          <span className={styles.weekLabel}>{weekLabel(weekOffset)}</span>
          <button onClick={() => setWeekOffset(o => Math.min(0, o + 1))} disabled={weekOffset >= 0}>→</button>
        </div>
      </header>

      <div className={styles.configBar}>
        <label className={styles.configLabel}>Google Sheet ID：</label>
        <input
          type="text"
          className={styles.sheetInput}
          value={sheetId}
          onChange={e => setSheetId(e.target.value)}
          placeholder="貼上 Spreadsheet ID（網址 /d/ 後面那段）"
          onKeyDown={e => e.key === 'Enter' && generate()}
        />
        <button className={styles.btnPrimary} onClick={generate} disabled={status === 'loading'}>
          {status === 'loading' ? '生成中...' : '生成週報'}
        </button>
      </div>

      <main className={styles.main}>
        {status === 'idle' && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            <p>輸入 Google Sheet ID，選好週次，按「生成週報」</p>
            <small>請確認 Google Sheet 已設定為「知道連結的人均可檢視」</small>
            <code>網址範例：docs.google.com/spreadsheets/d/<strong>這段是 ID</strong>/edit</code>
          </div>
        )}
        {status === 'loading' && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>⚙️</div>
            <p>正在讀取 Google Sheet 並分析對話...</p>
            <small>通常需要 10–20 秒</small>
          </div>
        )}
        {status === 'error' && (
          <div className={styles.errorCard}>{error}</div>
        )}
        {status === 'done' && digest && (
          <div className={styles.digestGrid}>
            <div className={styles.statRow}>
              <div className={styles.statCard}><div className={styles.statLabel}>本週訊息</div><div className={styles.statValue}>{digest.stats.totalMessages}</div></div>
              <div className={styles.statCard}><div className={styles.statLabel}>活躍成員</div><div className={styles.statValue}>{digest.stats.activeMembers}</div></div>
              <div className={styles.statCard}><div className={styles.statLabel}>有對話天數</div><div className={styles.statValue}>{digest.stats.totalDays}</div></div>
              <div className={styles.statCard}><div className={styles.statLabel}>分析訊息數</div><div className={styles.statValue}>{totalRows}</div></div>
            </div>
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}><span className={styles.dot} style={{background:'#06C755'}} /><span className={styles.sectionTitle}>重點摘要</span></div>
              <div className={styles.sectionBody}><p className={styles.summaryText}>{digest.summary}</p></div>
            </div>
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}><span className={styles.dot} style={{background:'#185FA5'}} /><span className={styles.sectionTitle}>重要決議</span></div>
              <div className={styles.sectionBody}>
                {digest.decisions.length === 0 ? <p className={styles.empty}>本週無明確決議</p> :
                  <ul className={styles.list}>{digest.decisions.map((d, i) => <li key={i} className={styles.listItem}><span className={styles.decIcon}>{i+1}</span><span>{d}</span></li>)}</ul>}
              </div>
            </div>
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}><span className={styles.dot} style={{background:'#BA7517'}} /><span className={styles.sectionTitle}>待辦事項</span></div>
              <div className={styles.sectionBody}>
                {digest.actionItems.length === 0 ? <p className={styles.empty}>本週無明確待辦事項</p> :
                  <ul className={styles.list}>{digest.actionItems.map((a, i) => <li key={i} className={styles.listItem}><span className={styles.checkbox} /><span>{a}</span></li>)}</ul>}
              </div>
            </div>
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}><span className={styles.dot} style={{background:'#D4537E'}} /><span className={styles.sectionTitle}>熱門話題排行</span></div>
              <div className={styles.sectionBody}>
                {digest.hotTopics.map((t, i) => (
                  <div key={i} className={styles.topicItem}>
                    <span className={`${styles.rank} ${i === 0 ? styles.rankTop : ''}`}>{i+1}</span>
                    <div className={styles.topicBarWrap}>
                      <div className={styles.topicName}>{t.topic}</div>
                      <div className={styles.topicBar}><div className={styles.topicBarFill} style={{width:`${Math.round(t.count/maxCount*100)}%`}} /></div>
                    </div>
                    <span className={styles.topicLabel}>{t.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
