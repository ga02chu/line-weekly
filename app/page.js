'use client';
import { useState } from 'react';
import styles from './page.module.css';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function fmt(d) { return `${d.getMonth() + 1}/${d.getDate()}`; }

function toInputDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getThisWeek() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0,0,0,0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: monday, end: sunday };
}

function getWeekNum(d) {
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
}

function getCardClass(colorType, styles) {
  if (colorType === 'red') return `${styles.card} ${styles.cardRed}`;
  if (colorType === 'gold') return `${styles.card} ${styles.cardGold}`;
  if (colorType === 'green') return `${styles.card} ${styles.cardGreen}`;
  return styles.card;
}

function getTagClass(colorType, styles) {
  if (colorType === 'red') return `${styles.tag} ${styles.tagAccent}`;
  if (colorType === 'gold') return `${styles.tag} ${styles.tagGold}`;
  if (colorType === 'green') return `${styles.tag} ${styles.tagSage}`;
  return styles.tag;
}

export default function Home() {
  const thisWeek = getThisWeek();
  const [startDate, setStartDate] = useState(toInputDate(thisWeek.start));
  const [endDate, setEndDate] = useState(toInputDate(thisWeek.end));
  const [status, setStatus] = useState('idle');
  const [digest, setDigest] = useState(null);
  const [error, setError] = useState('');

  function setPreset(offset) {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
    monday.setHours(0,0,0,0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    setStartDate(toInputDate(monday));
    setEndDate(toInputDate(sunday));
  }

  const startObj = new Date(startDate);
  const endObj = new Date(endDate);
  const rangeLabel = `${fmt(startObj)}–${fmt(endObj)}`;

  async function generate() {
    if (!startDate || !endDate) { setError('請選擇日期範圍'); return; }
    setStatus('loading'); setError(''); setDigest(null);
    try {
      const res = await fetch('/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '未知錯誤');
      setDigest(data.digest);
      setStatus('done');
    } catch (e) {
      setError(e.message); setStatus('error');
    }
  }

  const priorityDot = (p) => {
    if (p === '高') return styles.pHigh;
    if (p === '中') return styles.pMid;
    return styles.pLow;
  };

  return (
    <div className={styles.page}>
      <div className={styles.configBar}>
        <div className={styles.presets}>
          <button onClick={() => setPreset(0)}>本週</button>
          <button onClick={() => setPreset(-1)}>上週</button>
          <button onClick={() => setPreset(-2)}>上上週</button>
        </div>
        <div className={styles.dateRange}>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={styles.dateInput} />
          <span className={styles.dateSep}>–</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={styles.dateInput} />
        </div>
        <button className={styles.btnGenerate} onClick={generate} disabled={status === 'loading'}>
          {status === 'loading' ? '分析中…' : '生成週報'}
        </button>
      </div>

      {status === 'idle' && (
        <div className={styles.emptyWrap}>
          <div className={styles.emptyInner}>
            <p className={styles.emptyTitle}>選擇日期範圍，按「生成週報」</p>
            <p className={styles.emptySub}>可選擇本週、上週，或自訂任意日期範圍</p>
          </div>
        </div>
      )}

      {status === 'loading' && (
        <div className={styles.emptyWrap}>
          <div className={styles.emptyInner}>
            <p className={styles.emptyTitle}>AI 分析中，請稍候…</p>
            <p className={styles.emptySub}>通常需要 20–40 秒</p>
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

          <div className={styles.reportHeader}>
            <div>
              <div className={styles.weekBadge}>W{getWeekNum(startObj)}</div>
              <h1 className={styles.reportTitle}>工作群組週報</h1>
            </div>
            <div className={styles.reportMeta}>
              <div>{rangeLabel}</div>
              <div className={styles.reportMetaSub}>自動生成 · {new Date().toLocaleDateString('zh-TW')}</div>
            </div>
          </div>

          <div className={styles.statsStrip}>
            <div className={styles.statItem}>
              <div className={styles.statNum}>{digest.stats.totalMessages}</div>
              <div className={styles.statLabel}>期間訊息</div>
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
              <div className={styles.statNum}>
                {(digest.todoItems?.Apple?.length || 0) + (digest.todoItems?.['闆娘']?.length || 0) + (digest.todoItems?.['雙方']?.length || 0)}
              </div>
              <div className={styles.statLabel}>待辦事項數</div>
            </div>
          </div>

          {/* Section 1: 重點摘要 */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>①</div>
              <div className={styles.sectionTitle}>重點摘要</div>
            </div>
            <div className={`${styles.card} ${styles.cardFull}`} style={{marginBottom: '12px'}}>
              <div className={styles.cardLabel}>整體概述</div>
              <div className={styles.cardContent}>{digest.summary}</div>
            </div>
            <div className={styles.cardGrid}>
              {digest.summaryCategories?.map((cat, i) => (
                <div key={i} className={getCardClass(cat.colorType, styles)}>
                  <div className={styles.cardLabel}>{cat.category}</div>
                  <div className={styles.cardContent}>
                    <ul>{cat.items.map((item, j) => <li key={j}>{item}</li>)}</ul>
                    {cat.tags?.length > 0 && (
                      <div className={styles.tags}>
                        {cat.tags.map((tag, k) => (
                          <span key={k} className={getTagClass(cat.colorType, styles)}>{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: 合作報價 */}
          {digest.dealStatus && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>②</div>
                <div className={styles.sectionTitle}>合作報價 & 洽談進度</div>
              </div>
              <div className={styles.cardGrid}>
                {digest.dealStatus.confirmed?.length > 0 && (
                  <div className={`${styles.card} ${styles.cardGreen}`}>
                    <div className={styles.cardLabel}>確認合作 ✓</div>
                    <div className={styles.cardContent}>
                      <ul>{digest.dealStatus.confirmed.map((d,i) => <li key={i}><strong>{d.name}</strong>｜{d.detail}</li>)}</ul>
                    </div>
                  </div>
                )}
                {digest.dealStatus.pending?.length > 0 && (
                  <div className={`${styles.card} ${styles.cardGold}`}>
                    <div className={styles.cardLabel}>報價中 / 待回覆</div>
                    <div className={styles.cardContent}>
                      <ul>{digest.dealStatus.pending.map((d,i) => <li key={i}><strong>{d.name}</strong>｜{d.detail}</li>)}</ul>
                    </div>
                  </div>
                )}
                {digest.dealStatus.rejected?.length > 0 && (
                  <div className={styles.card}>
                    <div className={styles.cardLabel}>拒絕 / 暫緩</div>
                    <div className={styles.cardContent}>
                      <ul>{digest.dealStatus.rejected.map((d,i) => <li key={i}><strong>{d.name}</strong>｜{d.detail}</li>)}</ul>
                    </div>
                  </div>
                )}
                {digest.dealStatus.evaluating?.length > 0 && (
                  <div className={`${styles.card} ${styles.cardBlue}`}>
                    <div className={styles.cardLabel}>評估中</div>
                    <div className={styles.cardContent}>
                      <ul>{digest.dealStatus.evaluating.map((d,i) => <li key={i}><strong>{d.name}</strong>｜{d.detail}</li>)}</ul>
                    </div>
                  </div>
                )}
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
              {digest.dailySummary.map((day, i) => {
                const m = day.date.match(/(\d+)\/(\d+)/);
                let displayDate = day.date;
                if (m) {
                  const d = new Date(startObj.getFullYear(), parseInt(m[1])-1, parseInt(m[2]));
                  displayDate = `${day.date}（${WEEKDAYS[d.getDay()]}）`;
                }
                return (
                  <div key={i} className={styles.dayBlock}>
                    <div className={styles.dayLabel}>{displayDate}　{day.title}</div>
                    <div className={styles.cardGrid}>
                      {day.completed?.length > 0 && (
                        <div className={styles.card}>
                          <div className={styles.cardLabel}>完成</div>
                          <div className={styles.cardContent}>
                            <ul>{day.completed.map((c,j) => <li key={j}>{c}</li>)}</ul>
                          </div>
                        </div>
                      )}
                      {day.inProgress?.length > 0 && (
                        <div className={`${styles.card} ${styles.cardGreen}`}>
                          <div className={styles.cardLabel}>處理中</div>
                          <div className={styles.cardContent}>
                            <ul>{day.inProgress.map((c,j) => <li key={j}>{c}</li>)}</ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Section 4: 待辦清單 */}
          {digest.todoItems && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>④</div>
                <div className={styles.sectionTitle}>待辦清單</div>
              </div>
              <div className={styles.todoColumns}>
                {['Apple', '闆娘', '雙方'].map(owner => {
                  const items = digest.todoItems[owner] || [];
                  if (items.length === 0) return null;
                  return (
                    <div key={owner} className={styles.todoColumn}>
                      <div className={`${styles.todoOwnerBadge} ${owner === 'Apple' ? styles.ownerApple : owner === '闆娘' ? styles.ownerBoss : styles.ownerBoth}`}>
                        {owner}
                      </div>
                      <table className={styles.todoTable}>
                        <thead>
                          <tr><th>優先</th><th>事項</th><th>說明</th></tr>
                        </thead>
                        <tbody>
                          {items.map((item, i) => (
                            <tr key={i}>
                              <td><span className={`${styles.priorityDot} ${priorityDot(item.priority)}`}/>{item.priority}</td>
                              <td>{item.task}</td>
                              <td>{item.note}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
              {digest.warnings?.length > 0 && (
                <div className={styles.noteBox}>
                  💡 <strong>注意事項</strong>
                  <ul>{digest.warnings.map((w,i) => <li key={i}>{w}</li>)}</ul>
                </div>
              )}
            </div>
          )}

          <div className={styles.footer}>
            <span>工作群組週報 · 自動生成</span>
            <span>{rangeLabel} ｜ W{getWeekNum(startObj)}</span>
          </div>

        </div>
      )}
    </div>
  );
}
