'use client';
import { useState } from 'react';
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

function fmt(d) { return `${d.getMonth() + 1}/${d.getDate()}`; }

function weekLabel(offset) {
  const { start, end } = getWeekRange(offset);
  const range = `${fmt(start)}–${fmt(end)}`;
  if (offset === 0) return `本週 (${range})`;
  if (offset === -1) return `上週 (${range})`;
  return range;
}

function getWeekNum(offset) {
  const { start } = getWeekRange(offset);
  const startOfYear = new Date(start.getFullYear(), 0, 1);
  return Math.ceil(((start - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
}

export default function Home() {
  const [sheetId, setSheetId] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);
  const [status, setStatus] = useState('idle');
  const [digest, setDigest] = useState(null);
  const [error, setError] = useState('');

  async function generate() {
    if (!sheetId.trim()) { setError('請填入 Google Sheet ID'); return; }
    setStatus('loading'); setError(''); setDigest(null);
    try {
      const res = await fetch('/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetId: sheetId.trim(), weekOffset }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '未知錯誤');
      setDigest(data.digest);
      setStatus('done');
    } catch (e) {
      setError(e.message); setStatus('error');
    }
  }

  const priorityColor = { '高': styles.pHigh, '中': styles.pMid, '低': styles.pLow };
  const ownerClass = (owner) => {
    if (!owner) return styles.ownerDefault;
    if (owner.includes('Apple') || owner.includes('apple')) return styles.ownerApple;
    if (owner.includes('闆娘') || owner.includes('GA') || owner.includes('朱')) return styles.ownerBoss;
    return styles.ownerBoth;
  };

  return (
    <div className={styles.page}>
      {/* Top config bar */}
      <div className={styles.configBar}>
        <input
          type="text"
          className={styles.sheetInput}
          value={sheetId}
          onChange={e => setSheetId(e.target.value)}
          placeholder="Google Sheet ID"
          onKeyDown={e => e.key === 'Enter' && generate()}
        />
        <div className={styles.weekNav}>
          <button onClick={() => setWeekOffset(o => o - 1)}>←</button>
          <span>{weekLabel(weekOffset)}</span>
          <button onClick={() => setWeekOffset(o => Math.min(0, o + 1))} disabled={weekOffset >= 0}>→</button>
        </div>
        <button className={styles.btnGenerate} onClick={generate} disabled={status === 'loading'}>
          {status === 'loading' ? '分析中…' : '生成週報'}
        </button>
      </div>

      {status === 'idle' && (
        <div className={styles.emptyWrap}>
          <div className={styles.emptyInner}>
            <p className={styles.emptyTitle}>輸入 Google Sheet ID 生成週報</p>
            <p className={styles.emptySub}>請確認 Sheet 已設為「知道連結的人均可檢視」</p>
          </div>
        </div>
      )}

      {status === 'loading' && (
        <div className={styles.emptyWrap}>
          <div className={styles.emptyInner}>
            <p className={styles.emptyTitle}>AI 分析中，請稍候…</p>
            <p className={styles.emptySub}>通常需要 15–30 秒</p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className={styles.emptyWrap}>
          <div className={styles.errorBox}>{error}</div>
        </div>
      )}

      {status === 'done' && digest && (
        <div className={styles.report}>

          {/* Header */}
          <div className={styles.reportHeader}>
            <div>
              <div className={styles.weekBadge}>W{getWeekNum(weekOffset)}</div>
              <h1 className={styles.reportTitle}>工作群組週報</h1>
            </div>
            <div className={styles.reportMeta}>
              <div>{weekLabel(weekOffset)}</div>
              <div className={styles.reportMetaSub}>自動生成 · {new Date().toLocaleDateString('zh-TW')}</div>
            </div>
          </div>

          {/* Stats strip */}
          <div className={styles.statsStrip}>
            <div className={styles.statItem}>
              <div className={styles.statNum}>{digest.stats.totalMessages}</div>
              <div className={styles.statLabel}>本週訊息</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statNum}>{digest.stats.activeMembers}</div>
              <div className={styles.statLabel}>活躍成員</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statNum}>{digest.stats.totalDays}</div>
              <div className={styles.statLabel}>有對話天數</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statNum}>{digest.hotTopics?.length || 0}</div>
              <div className={styles.statLabel}>熱門話題數</div>
            </div>
          </div>

          {/* Section 1: 重點摘要 + 決議 */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>①</div>
              <div className={styles.sectionTitle}>本週重點摘要</div>
            </div>
            <div className={styles.cardGrid}>
              <div className={`${styles.card} ${styles.cardFull}`}>
                <div className={styles.cardLabel}>整週概述</div>
                <div className={styles.cardContent}>{digest.summary}</div>
              </div>
              {digest.decisions?.length > 0 && (
                <div className={`${styles.card} ${styles.cardFull} ${styles.cardGold}`}>
                  <div className={styles.cardLabel}>重要決議</div>
                  <div className={styles.cardContent}>
                    <ul>
                      {digest.decisions.map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: 熱門話題 */}
          {digest.hotTopics?.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>②</div>
                <div className={styles.sectionTitle}>本週熱門話題</div>
              </div>
              <div className={styles.topicList}>
                {digest.hotTopics.map((t, i) => {
                  const max = Math.max(...digest.hotTopics.map(x => x.count), 1);
                  return (
                    <div key={i} className={styles.topicRow}>
                      <span className={`${styles.topicRank} ${i === 0 ? styles.topicRankTop : ''}`}>{i+1}</span>
                      <div className={styles.topicBarWrap}>
                        <div className={styles.topicName}>{t.topic}</div>
                        <div className={styles.topicBar}>
                          <div className={styles.topicBarFill} style={{width:`${Math.round(t.count/max*100)}%`}} />
                        </div>
                      </div>
                      <span className={styles.topicLabel}>{t.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: 每日行動摘要 */}
          {digest.dailySummary?.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>③</div>
                <div className={styles.sectionTitle}>每日行動摘要</div>
              </div>
              {digest.dailySummary.map((day, i) => (
                <div key={i} className={styles.dayBlock}>
                  <div className={styles.dayLabel}>{day.date}　{day.title}</div>
                  <div className={styles.cardGrid}>
                    {day.completed?.length > 0 && (
                      <div className={styles.card}>
                        <div className={styles.cardLabel}>完成</div>
                        <div className={styles.cardContent}>
                          <ul>{day.completed.map((c, j) => <li key={j}>{c}</li>)}</ul>
                        </div>
                      </div>
                    )}
                    {day.inProgress?.length > 0 && (
                      <div className={`${styles.card} ${styles.cardGreen}`}>
                        <div className={styles.cardLabel}>處理中</div>
                        <div className={styles.cardContent}>
                          <ul>{day.inProgress.map((c, j) => <li key={j}>{c}</li>)}</ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Section 4: 待辦清單 */}
          {digest.todoItems?.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>④</div>
                <div className={styles.sectionTitle}>待辦清單</div>
              </div>
              <table className={styles.todoTable}>
                <thead>
                  <tr>
                    <th>優先</th>
                    <th>負責</th>
                    <th>事項</th>
                    <th>說明 / 期限</th>
                  </tr>
                </thead>
                <tbody>
                  {digest.todoItems.map((item, i) => (
                    <tr key={i}>
                      <td>
                        <span className={`${styles.priorityDot} ${priorityColor[item.priority] || styles.pLow}`} />
                        {item.priority}
                      </td>
                      <td><span className={`${styles.ownerBadge} ${ownerClass(item.owner)}`}>{item.owner}</span></td>
                      <td>{item.task}</td>
                      <td>{item.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {digest.warnings?.length > 0 && (
                <div className={styles.noteBox}>
                  💡 <strong>注意事項</strong>
                  <ul>
                    {digest.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className={styles.footer}>
            <span>工作群組週報 · 自動生成</span>
            <span>{weekLabel(weekOffset)} ｜ W{getWeekNum(weekOffset)}</span>
          </div>

        </div>
      )}
    </div>
  );
}
