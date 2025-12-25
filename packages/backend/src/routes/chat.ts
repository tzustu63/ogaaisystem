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

// Helper function to get AI setting from database
async function getAISetting(key: string): Promise<string | null> {
  try {
    const result = await pool.query(
      `SELECT setting_value FROM ai_settings WHERE setting_key = $1`,
      [key]
    );
    return result.rows.length > 0 ? result.rows[0].setting_value : null;
  } catch (error) {
    console.error('Error fetching AI setting:', error);
    return null;
  }
}

// Helper function to get all AI settings for building prompts
async function getAllAISettings(): Promise<Record<string, string>> {
  try {
    const result = await pool.query(
      `SELECT setting_key, setting_value FROM ai_settings`
    );
    const settings: Record<string, string> = {};
    for (const row of result.rows) {
      settings[row.setting_key] = row.setting_value;
    }
    return settings;
  } catch (error) {
    console.error('Error fetching AI settings:', error);
    return {};
  }
}

// Default Database schema description for AI context (used as fallback)
const DEFAULT_DATABASE_SCHEMA = `
你是一個專業的資料庫助手，協助使用者查詢 OGA AI System（策略執行管理系統）的資料。

資料庫架構說明：

1. 使用者
- users: 使用者資料 (id, username, email, full_name, department, is_active, created_at)

2. KPI 管理
- kpi_registry: KPI 註冊表 (id, kpi_id, name_zh, name_en, definition, formula, data_source, data_steward, update_frequency, target_value, thresholds, created_at)
- kpi_values: KPI 數據 (id, kpi_id, period, value, target_value, status, notes, created_at)
- kpi_versions: KPI 版本歷史 (id, kpi_id, version_number, changes, created_at)

3. 策略專案（Initiatives）
- initiatives: 策略專案 (id, initiative_id, name_zh, name_en, initiative_type, status, risk_level, start_date, end_date, budget, responsible_unit, created_at)
- initiative_kpis: 策略專案與 KPI 關聯 (initiative_id, kpi_id, created_at)

4. OKR 管理
- okrs: 目標與關鍵結果 (id, initiative_id, quarter, objective, created_at)
- key_results: 關鍵結果 (id, okr_id, kr_number, description, target_value, current_value, unit, status, progress, kpi_id, created_at)

5. 任務管理
- tasks: 任務 (id, title, description, status, priority, due_date, assignee_id, kr_id, initiative_id, kpi_id, created_at)
  - status 可能值: 'todo', 'in_progress', 'review', 'done'
  - priority 可能值: 'low', 'medium', 'high', 'urgent'

6. PDCA 循環
- pdca_cycles: PDCA 循環 (id, name, initiative_id, okr_id, status, plan_content, do_content, check_content, act_content, created_at)

7. 緊急事件
- incidents: 緊急事件 (id, title, description, severity, status, created_at)

重要規則：
1. 只生成 SELECT 查詢，不允許 INSERT、UPDATE、DELETE
2. 不查詢敏感欄位：password, password_hash, api_key, secret, token
3. 限制查詢結果最多 100 筆（使用 LIMIT 100）
4. 優先使用 JOIN 而非子查詢以提高效能
5. 日期格式使用 PostgreSQL 標準格式
6. 使用中文回答使用者問題
7. 如果使用者問的問題不能轉換成 SQL，請返回 "SELECT 1 WHERE false" 並解釋原因

範例問題與查詢：
Q: "顯示所有 KPI"
A: SELECT id, kpi_id, name_zh, name_en, data_steward, update_frequency FROM kpi_registry LIMIT 100;

Q: "顯示所有進行中的任務"
A: SELECT id, title, description, status, priority, due_date FROM tasks WHERE status = 'in_progress' LIMIT 100;

Q: "顯示所有策略專案"
A: SELECT id, initiative_id, name_zh, initiative_type, status, responsible_unit FROM initiatives LIMIT 100;

Q: "顯示所有 OKR"
A: SELECT o.id, o.quarter, o.objective, i.name_zh as initiative_name FROM okrs o LEFT JOIN initiatives i ON o.initiative_id = i.id LIMIT 100;

Q: "顯示高優先級的任務"
A: SELECT id, title, description, status, priority, due_date FROM tasks WHERE priority = 'high' OR priority = 'urgent' LIMIT 100;
`;

// Generate SQL query from natural language
async function generateSQLQuery(userMessage: string, userId: string, modelId?: string): Promise<string> {
  try {
    const selectedModel = modelId || DEFAULT_MODEL;
    const model = genAI.getGenerativeModel({ model: selectedModel });

    // Get all settings from database
    const settings = await getAllAISettings();

    // Build structured prompt with fallbacks
    const dbSchema = settings['database_schema_prompt'] || DEFAULT_DATABASE_SCHEMA;
    const constraints = settings['ai_constraints_prompt'] || '';

    const prompt = `${dbSchema}

${constraints ? `查詢限制規則：\n${constraints}\n` : ''}

使用者問題：${userMessage}
使用者 ID：${userId}

請生成對應的 PostgreSQL SQL 查詢語句。只回傳 SQL 語句，不要包含其他說明文字。
重要：所有 id 欄位（如 user_id, assignee_id 等）都是 UUID 類型，比較時需要使用類型轉換。
如果問題提到「我的」或「我」，請使用 WHERE 條件過濾，例如：assignee_id = '${userId}'::uuid
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

// Default prompts (used as fallbacks)
const DEFAULT_ROLE = `你是慈濟大學全球事務處的 AI 助理，專門協助全球事務長進行策略規劃與執行管理。`;

const DEFAULT_OUTPUT_FORMAT = `回應格式要求：
1. 使用清晰的標題分段
2. 重要數據以列點方式呈現
3. 語氣正式、專業
4. 提供詳盡的分析說明
5. 使用數字編號 (1. 2. 3.) 列點
6. 段落之間以空行分隔
7. 重要資訊可用【】標註強調`;

// Generate natural language response from query results
async function generateResponse(
  userMessage: string,
  sqlQuery: string,
  queryResult: any[],
  modelId?: string,
  sqlError?: string | null
): Promise<string> {
  try {
    const selectedModel = modelId || DEFAULT_MODEL;
    const model = genAI.getGenerativeModel({ model: selectedModel });

    // Get all settings from database
    const settings = await getAllAISettings();

    // Build structured prompt with all components
    const role = settings['ai_role_prompt'] || DEFAULT_ROLE;
    const context = settings['ai_context_prompt'] || '';
    const outputFormat = settings['ai_output_format_prompt'] || DEFAULT_OUTPUT_FORMAT;
    const examples = settings['ai_examples_prompt'] || '';

    // Handle SQL error case
    let querySection: string;
    if (sqlError) {
      querySection = `【查詢狀態】
查詢執行時發生錯誤：${sqlError}

請根據使用者的問題，直接提供有幫助的回應。如果無法從資料庫取得資料，請說明可能的原因並提供建議。`;
    } else {
      querySection = `【SQL 查詢】
${sqlQuery}

【查詢結果】
${queryResult.length > 0 ? JSON.stringify(queryResult.slice(0, 20), null, 2) : '無查詢結果'}

總共 ${queryResult.length} 筆資料。`;
    }

    const prompt = `【角色設定】
${role}

${context ? `【背景資訊】\n${context}\n` : ''}
【使用者問題】
${userMessage}

${querySection}

${examples ? `【回應範例參考】\n${examples}\n` : ''}
【輸出格式要求】
${outputFormat}

請根據以上資訊，以專業、詳盡的方式回應使用者的問題。`;

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
    let sqlQuery: string;
    let rows: any[] = [];
    let sqlError: string | null = null;

    try {
      sqlQuery = await generateSQLQuery(message, userId, selectedModel);

      // Execute SQL query
      const queryResult = await client.query(sqlQuery);
      rows = queryResult.rows;
    } catch (sqlErr: any) {
      console.error('SQL generation or execution error:', sqlErr);
      sqlQuery = `-- 查詢生成或執行失敗: ${sqlErr.message}`;
      sqlError = sqlErr.message;
      rows = [];
    }

    // Generate AI response (even if SQL failed, let AI explain the situation)
    const aiResponse = await generateResponse(
      message,
      sqlQuery,
      rows,
      selectedModel,
      sqlError
    );

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

    // Check for quota exceeded error
    const errorMessage = error.message || '';
    if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('Too Many Requests')) {
      return res.status(429).json({
        error: 'API 配額超限',
        details: 'Google Gemini API 免費配額已用完（每天 20 次請求限制）。請稍後再試或升級付費方案。'
      });
    }

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
