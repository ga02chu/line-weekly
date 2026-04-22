export const maxDuration = 60;

export async function POST(req) {
  try {
    const { startDate, endDate } = await req.json();

    if (!startDate || !endDate) {
      return Response.json({ error: '請提供日期範圍' }, { status: 400 });
    }

    const sheetId = process.env.SHEET_ID;
    if (!sheetId) {
      return Response.json({ error: 'Sheet ID 未設定，請聯絡管理員' }, { status: 500 });
    }

    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
    const csvRes = await fetch(csvUrl);
    if (!csvRes.ok) {
      return Response.json({ error: '無法讀取 Google Sheet' }, { status: 400 });
    }
    const csvText = await csvRes.text();
    const rows = parseCSV(csvText);

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const rangeRows = rows.filter(row => {
      if (!row[0]) return false;
      const raw = row[0].trim().replace(/^'/, '').replace(/\//g, '-');
      const d = new Date(raw);
      return !isNaN(d) && d >= start && d <= end;
    });

    if (rangeRows.length === 0) {
      return Response.json({ error: '這個日期範圍找不到對話記錄' }, { status: 404 });
    }

    const uniqueDays = new Set(rangeRows.map(r => r[0].substring(0, 10))).size;
    const startFmt = `${start.getMonth()+1}/${start.getDate()}`;
    const endFmt = `${end.getMonth()+1}/${end.getDate()}`;
    const weekStr = `${startFmt} ~ ${endFmt}`;
    const convo = rangeRows.slice(0, 400).map(r => `[${r[0]}] ${r[1]}：${r[2]}`).join('\n');

    const prompt = `你是一個專業的工作群組對話分析助手。以下是 LINE 工作群組在 ${weekStr} 的對話記錄（格式：[時間] 發話者：訊息）：

${convo}

請仔細分析後，回傳以下 JSON（只回傳 JSON，不要加其他文字或 markdown）：
{
  "stats": {
    "totalMessages": ${rangeRows.length},
    "activeMembers": 數字,
    "totalDays": ${uniqueDays}
  },
  "summary": "2-3句話的整體重點摘要",
  "summaryCategories": [
    {
      "category": "分類名稱（如：品牌合作、廣告投放、店面系統、外出行程等）",
      "colorType": "只能填 red/gold/green/default 其中一個",
      "items": ["重點事項1", "重點事項2"],
      "tags": ["關鍵字1", "關鍵字2"]
    }
  ],
  "dealStatus": {
    "confirmed": [{"name": "合作名稱", "detail": "金額或說明"}],
    "pending": [{"name": "合作名稱", "detail": "報價或進度"}],
    "rejected": [{"name": "合作名稱", "detail": "拒絕原因"}],
    "evaluating": [{"name": "合作名稱", "detail": "評估說明"}]
  },
  "dailySummary": [
    {
      "date": "4/13",
      "title": "當天最重要的事（5字內）",
      "completed": ["完成事項1", "完成事項2"],
      "inProgress": ["處理中1", "處理中2"]
    }
  ],
  "todoItems": {
    "Apple": [{"priority": "高", "task": "待辦事項", "note": "說明"}],
    "闆娘": [{"priority": "中", "task": "待辦事項", "note": "說明"}],
    "雙方": [{"priority": "低", "task": "待辦事項", "note": "說明"}]
  },
  "warnings": ["注意事項1"]
}

重要規則：
- summaryCategories 分3-6個主題，colorType 根據性質選（red=緊急/業務, gold=財務/合作, green=完成/成功, default=一般）
- dealStatus 只列有提到的合作案，沒有就給空陣列
- dailySummary 必須列出每一天有對話的日期（格式 M/D，不含星期），每天各列2-4個重點
- todoItems 分別列 Apple、闆娘、雙方各自的待辦，沒有就給空陣列
- warnings 列截止日期、風險提醒，沒有就給空陣列`;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
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

    return Response.json({ digest, totalRows: rangeRows.length });

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
