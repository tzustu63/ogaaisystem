import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

// Available Gemini models
export const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: '最新快速模型，支援 1M tokens' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: '最強大的模型，適合複雜查詢' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: '快速且穩定' },
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Experimental', description: '實驗性功能' },
];

// Default model
const DEFAULT_MODEL = 'gemini-2.5-flash';

// Database schema description for AI context
const DATABASE_SCHEMA = `
你是一個專業的資料庫助手，協助使用者查詢 OGA AI System 的資料。

資料庫架構說明：

1. 使用者與組織
- users: 使用者資料 (id, name, email, department_id, role_id, created_at)
- departments: 部門資料 (id, name, parent_id, created_at)
- roles: 角色資料 (id, name, permissions, created_at)

2. KPI 管理
- kpi_registry: KPI 註冊表 (id, kpi_code, kpi_name, unit, frequency, owner_id, created_at)
- kpi_values: KPI 數據 (id, kpi_id, period_start, period_end, target_value, actual_value, created_at)

3. OKR 管理
- okrs: 目標 (id, title, description, owner_id, parent_id, start_date, end_date, status, created_at)
- key_results: 關鍵結果 (id, okr_id, title, target_value, current_value, unit, weight, status, created_at)
- kr_kpi_mapping: KR-KPI 映射 (kr_id, kpi_id, contribution_weight, created_at)

4. 策略專案
- initiatives: 策略專案 (id, title, description, owner_id, start_date, end_date, budget, status, priority, created_at)
- initiative_okr_mapping: 專案-OKR 映射 (initiative_id, okr_id, contribution_weight, created_at)

5. 任務管理
- tasks: 任務 (id, title, description, assignee_id, parent_id, status, priority, due_date, kr_id, created_at)
- task_attachments: 任務附件 (id, task_id, filename, file_path, uploaded_by, created_at)

6. PDCA 循環
- pdca_cycles: PDCA 循環 (id, title, phase, target_id, target_type, owner_id, start_date, end_date, status, created_at)
- pdca_actions: PDCA 行動項目 (id, cycle_id, description, assignee_id, due_date, status, created_at)

7. 緊急事件
- incidents: 緊急事件 (id, title, description, severity, status, reporter_id, assignee_id, created_at, resolved_at)

8. 看板管理
- boards: 看板 (id, name, type, owner_id, created_at)
- board_columns: 看板欄位 (id, board_id, name, position, created_at)
- board_items: 看板項目 (id, board_id, column_id, task_id, position, created_at)

重要規則：
1. 只生成 SELECT 查詢，不允許 INSERT、UPDATE、DELETE
2. 不查詢敏感欄位：password, salt, api_key, secret
3. 使用參數化查詢防止 SQL 注入
4. 限制查詢結果最多 100 筆（使用 LIMIT 100）
5. 優先使用 JOIN 而非子查詢以提高效能
6. 日期格式使用 PostgreSQL 標準格式
7. 使用中文回答使用者問題

範例問題與查詢：
Q: "顯示所有進行中的 OKR"
A: SELECT id, title, description, status, start_date, end_date FROM okrs WHERE status = 'in_progress' LIMIT 100;

Q: "哪些 KPI 本月未達標？"
A: SELECT kr.kpi_code, kr.kpi_name, kv.target_value, kv.actual_value
   FROM kpi_registry kr
   JOIN kpi_values kv ON kr.id = kv.kpi_id
   WHERE kv.period_start >= date_trunc('month', CURRENT_DATE)
   AND kv.actual_value < kv.target_value
   LIMIT 100;

Q: "顯示我的任務"
A: SELECT id, title, description, status, priority, due_date FROM tasks WHERE assignee_id = $1 LIMIT 100;
`;

// Generate SQL query from natural language
async function generateSQLQuery(userMessage: string, userId: string, modelId?: string): Promise<string> {
  try {
    const selectedModel = modelId || DEFAULT_MODEL;
    const model = genAI.getGenerativeModel({ model: selectedModel });

    const prompt = `${DATABASE_SCHEMA}

使用者問題：${userMessage}
使用者 ID：${userId}

請生成對應的 PostgreSQL SQL 查詢語句。只回傳 SQL 語句，不要包含其他說明文字。
如果問題提到「我的」或「我」，請使用 WHERE 條件過濾 user_id 或相關欄位 = '${userId}'。
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let sqlQuery = response.text().trim();

    // Remove markdown code blocks if present
    sqlQuery = sqlQuery.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();

    // Validate query is SELECT only
    if (!sqlQuery.toUpperCase().startsWith('SELECT')) {
      throw new Error('只允許 SELECT 查詢');
    }

    // Check for forbidden keywords
    const forbidden = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE'];
    const upperQuery = sqlQuery.toUpperCase();
    for (const keyword of forbidden) {
      if (upperQuery.includes(keyword)) {
        throw new Error(`不允許使用 ${keyword} 操作`);
      }
    }

    return sqlQuery;
  } catch (error) {
    console.error('Error generating SQL:', error);
    throw error;
  }
}

// Generate natural language response from query results
async function generateResponse(userMessage: string, sqlQuery: string, queryResult: any[], modelId?: string): Promise<string> {
  try {
    const selectedModel = modelId || DEFAULT_MODEL;
    const model = genAI.getGenerativeModel({ model: selectedModel });

    const prompt = `使用者問題：${userMessage}

SQL 查詢：${sqlQuery}

查詢結果（前 10 筆）：
${JSON.stringify(queryResult.slice(0, 10), null, 2)}

總共 ${queryResult.length} 筆資料。

請用中文總結查詢結果，提供有意義的分析和見解。如果沒有資料，請友善地告知使用者。
回答要簡潔、專業，並突出重點資訊。`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Error generating response:', error);
    throw error;
  }
}

// POST /api/chat - Send message and get AI response
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();

  try {
    const { message, conversationId, model } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: '未授權' });
    }

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: '訊息內容不能為空' });
    }

    // Validate model if provided
    const selectedModel = model || DEFAULT_MODEL;
    const isValidModel = AVAILABLE_MODELS.some(m => m.id === selectedModel);
    if (!isValidModel) {
      return res.status(400).json({ error: '不支援的模型' });
    }

    await client.query('BEGIN');

    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      // Create new conversation
      const title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
      const convResult = await client.query(
        `INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING id`,
        [userId, title]
      );
      convId = convResult.rows[0].id;
    } else {
      // Verify conversation belongs to user
      const convCheck = await client.query(
        `SELECT id FROM conversations WHERE id = $1 AND user_id = $2`,
        [convId, userId]
      );
      if (convCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: '無權訪問此對話' });
      }

      // Update conversation timestamp
      await client.query(
        `UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [convId]
      );
    }

    // Save user message
    await client.query(
      `INSERT INTO messages (conversation_id, role, content) VALUES ($1, 'user', $2)`,
      [convId, message]
    );

    // Generate SQL query from user message
    const sqlQuery = await generateSQLQuery(message, userId, selectedModel);

    // Execute SQL query
    const queryResult = await client.query(sqlQuery);
    const rows = queryResult.rows;

    // Generate AI response
    const aiResponse = await generateResponse(message, sqlQuery, rows, selectedModel);

    // Save assistant message with query details
    await client.query(
      `INSERT INTO messages (conversation_id, role, content, sql_query, query_result)
       VALUES ($1, 'assistant', $2, $3, $4)`,
      [convId, aiResponse, sqlQuery, JSON.stringify(rows)]
    );

    await client.query('COMMIT');

    res.json({
      conversationId: convId,
      response: aiResponse,
      sqlQuery: sqlQuery,
      queryResult: rows,
      resultCount: rows.length,
      model: selectedModel
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Chat error:', error);
    res.status(500).json({
      error: '處理訊息時發生錯誤',
      details: error.message
    });
  } finally {
    client.release();
  }
});

// GET /api/chat/conversations - List user's conversations
router.get('/conversations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: '未授權' });
    }

    const result = await pool.query(
      `SELECT id, title, created_at, updated_at
       FROM conversations
       WHERE user_id = $1
       ORDER BY updated_at DESC
       LIMIT 50`,
      [userId]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: '獲取對話列表失敗' });
  }
});

// GET /api/chat/conversations/:id - Get conversation messages
router.get('/conversations/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: '未授權' });
    }

    // Verify conversation belongs to user
    const convCheck = await pool.query(
      `SELECT id FROM conversations WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (convCheck.rows.length === 0) {
      return res.status(403).json({ error: '無權訪問此對話' });
    }

    // Get all messages
    const result = await pool.query(
      `SELECT id, role, content, sql_query, query_result, created_at
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [id]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: '獲取訊息失敗' });
  }
});

// DELETE /api/chat/conversations/:id - Delete conversation
router.delete('/conversations/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: '未授權' });
    }

    // Delete conversation (cascade will delete messages)
    const result = await pool.query(
      `DELETE FROM conversations WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '對話不存在或無權刪除' });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: '刪除對話失敗' });
  }
});

// GET /api/chat/models - Get available AI models
router.get('/models', (req: Request, res: Response) => {
  res.json({
    models: AVAILABLE_MODELS,
    defaultModel: DEFAULT_MODEL
  });
});

export default router;
