export const maxDuration = 60;

export async function POST(req) {
  try {
    const { sheetId, weekOffset } = await req.json();

    if (!sheetId) {
      return Response.json({ error: '請提供 Google Sheet ID' }, { status: 400 });
    }

    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
    const csvRes = await fetch(csvUrl);
    if (!csvRes.ok) {
      return Response.json({ error: '無法讀取 Google Sheet，請確認 Sheet ID 正確且已設為公開存取' }, { status: 400 });
    }
    const csvText = await csvRes.text();
    const rows = parseCSV(csvText);

    const weekRows = filterByWeek(rows, weekOffset || 0);
    if (weekRows.length === 0) {
      return Response.json({ error: '這週找不到對話記錄，請確認日期格式（YYYY/MM/DD HH:mm 或 YYYY-MM-DD HH:mm）' }, { status: 404 });
    }

    const { start, end } = getWeekRange(weekOffset || 0);
    const weekStr = `${formatDate(start)} ~ ${formatDate(end)}`;
    const uniqueDays = new Set(weekRows.map(r => r[0].substring(0, 10))).size;
    const convo = weekRows.slice(0, 400).map(r => `[${r[0]}] ${r[1]}：${r[2]}`).join('\n');

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2500,
        messages: [{
          role: 'user',
          content: `你是一個專業的群組對話分析助手。以下是 LINE 工作群組在 ${weekStr} 的對話記錄（格式：[時間] 發話者：訊息）：

${convo}

請仔細分析後，回傳以下 JSON（只回傳 JSON，不要加其他文字或 markdown）：
{
  "stats": {
    "totalMessages": ${weekRows.length},
    "activeMembers": 數字,
    "totalDays": ${uniqueDays}
  },
  "summary": "2-3句話的整週重點摘要（繁體中文，點出最重要的事）",
  "decisions": ["重要決議1", "重要決議2"],
  "dailySummary": [
    {
      "date": "4/13（一）",
      "title": "當天最重要的一件事（5字以內）",
      "completed": ["完成事項1", "完成事項2"],
      "inProgress": ["處理中事項1"]
    }
  ],
  "todoItems": [
    {
      "priority": "高",
      "owner": "負責人姓名",
      "task": "待辦事項",
      "note": "說明或期限"
    }
  ],
  "hotTopics": [
    {"topic": "話題名稱", "count": 相對熱度1到100, "label": "簡短說明"}
  ],
  "warnings": ["注意事項1", "注意事項2"]
}

注意：
- dailySummary 只列有對話的日期，每天的 completed 和 inProgress 各列2-4項重點
- todoItems 依優先順序排列（高/中/低），owner 填群組中的人名
- warnings 列出需要特別注意的事項（如截止日期、風險等），沒有可回傳空陣列`
        }]
      })
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      return Response.json({ error: `Claude API 錯誤：${err}` }, { status: 500 });
    }

    const claudeData = await claudeRes.json();
    const raw = claudeData.content?.find(b => b.type === 'text')?.text || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    let digest;
    try {
      digest = JSON.parse(clean);
    } catch(e) {
      return Response.json({ error: 'AI 回傳格式錯誤，請再試一次' }, { status: 500 });
    }

    return Response.json({ digest, totalRows: weekRows.length });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim());
  return lines.slice(1).map(line => {
    const cols = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ; continue; }
      if (line[i] === ',' && !inQ) { cols.push(cur.trim()); cur = ''; continue; }
      cur += line[i];
    }
    cols.push(cur.trim());
    return cols;
  }).filter(r => r.length >= 3 && r[0]);
}

function getWeekRange(offset) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

function filterByWeek(rows, offset) {
  const { start, end } = getWeekRange(offset);
  return rows.filter(row => {
    if (!row[0]) return false;
    const raw = row[0].trim().replace(/^'/, '').replace(/\//g, '-');
    const d = new Date(raw);
    return !isNaN(d) && d >= start && d <= end;
  });
}

function formatDate(d) {
  return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`;
}
