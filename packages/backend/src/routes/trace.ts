import { Router, Response } from 'express';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// 取得上溯路徑（從任務到戰略）
router.get('/task/:id/up', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // 取得任務資訊
    const taskResult = await pool.query(
      `SELECT t.*, 
              i.id as initiative_id, i.name_zh as initiative_name,
              kr.id as kr_id, kr.description as kr_description,
              o.id as okr_id, o.objective as okr_objective
       FROM tasks t
       LEFT JOIN initiatives i ON t.initiative_id = i.id
       LEFT JOIN key_results kr ON t.kr_id = kr.id
       LEFT JOIN okrs o ON kr.okr_id = o.id
       WHERE t.id = $1`,
      [id]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: '任務不存在' });
    }

    const task = taskResult.rows[0];
    const path: any[] = [];

    // 1. 任務本身
    path.push({
      level: 'task',
      id: task.id,
      name: task.title,
      type: 'task',
      url: `/kanban?task=${task.id}`,
    });

    // 2. 關聯的 KR
    if (task.kr_id) {
      path.push({
        level: 'kr',
        id: task.kr_id,
        name: task.kr_description,
        type: 'key_result',
        url: `/okr?kr=${task.kr_id}`,
      });

      // 3. 關聯的 OKR
      if (task.okr_id) {
        path.push({
          level: 'okr',
          id: task.okr_id,
          name: task.okr_objective,
          type: 'okr',
          url: `/okr?okr=${task.okr_id}`,
        });
      }
    }

    // 4. 關聯的 Initiative
    if (task.initiative_id) {
      path.push({
        level: 'initiative',
        id: task.initiative_id,
        name: task.initiative_name,
        type: 'initiative',
        url: `/initiatives/${task.initiative_id}`,
      });

      // 5. 取得 Initiative 關聯的 BSC 目標
      const bscResult = await pool.query(
        `SELECT bo.*
         FROM bsc_objectives bo
         INNER JOIN initiative_bsc_objectives ibo ON bo.id = ibo.objective_id
         WHERE ibo.initiative_id = $1`,
        [task.initiative_id]
      );

      if (bscResult.rows.length > 0) {
        bscResult.rows.forEach((obj) => {
          path.push({
            level: 'bsc',
            id: obj.id,
            name: obj.name_zh,
            type: 'bsc_objective',
            perspective: obj.perspective,
            url: `/dashboard/strategy-map?objective=${obj.id}`,
          });
        });
      }
    }

    // 6. 影響的 KPI
    if (task.kpi_id) {
      const kpiResult = await pool.query(
        'SELECT * FROM kpi_registry WHERE id = $1',
        [task.kpi_id]
      );

      if (kpiResult.rows.length > 0) {
        const kpi = kpiResult.rows[0];
        path.push({
          level: 'kpi',
          id: kpi.id,
          name: kpi.name_zh,
          type: 'kpi',
          url: `/kpi/${kpi.id}`,
        });
      }
    }

    // 反轉路徑（從戰略到執行）
    const reversedPath = [...path].reverse();

    res.json({
      task_id: id,
      path_up: path, // 從任務到戰略
      path_down: reversedPath, // 從戰略到任務（用於顯示）
    });
  } catch (error: unknown) {
    console.error('Error fetching trace up path:', error);
    res.status(500).json({ error: '取得上溯路徑失敗' });
  }
});

// 取得下鑽路徑（從 KPI 到任務）
router.get('/kpi/:id/down', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const path: any[] = [];

    // 1. KPI 本身
    const kpiResult = await pool.query(
      'SELECT * FROM kpi_registry WHERE id = $1',
      [id]
    );

    if (kpiResult.rows.length === 0) {
      return res.status(404).json({ error: 'KPI 不存在' });
    }

    const kpi = kpiResult.rows[0];
    path.push({
      level: 'kpi',
      id: kpi.id,
      name: kpi.name_zh,
      type: 'kpi',
      url: `/kpi/${kpi.id}`,
    });

    // 2. 關聯的 Initiatives
    const initiativesResult = await pool.query(
      `SELECT i.*
       FROM initiatives i
       INNER JOIN initiative_kpis ik ON i.id = ik.initiative_id
       WHERE ik.kpi_id = $1`,
      [id]
    );

    initiativesResult.rows.forEach((initiative) => {
      path.push({
        level: 'initiative',
        id: initiative.id,
        name: initiative.name_zh,
        type: 'initiative',
        url: `/initiatives/${initiative.id}`,
      });
    });

    // 3. 關聯的 OKRs
    const okrsResult = await pool.query(
      `SELECT DISTINCT o.*
       FROM okrs o
       INNER JOIN key_results kr ON o.id = kr.okr_id
       INNER JOIN tasks t ON kr.id = t.kr_id
       WHERE t.kpi_id = $1`,
      [id]
    );

    okrsResult.rows.forEach((okr) => {
      path.push({
        level: 'okr',
        id: okr.id,
        name: okr.objective,
        type: 'okr',
        url: `/okr?okr=${okr.id}`,
      });
    });

    // 4. 關聯的任務
    const tasksResult = await pool.query(
      `SELECT t.*
       FROM tasks t
       WHERE t.kpi_id = $1`,
      [id]
    );

    tasksResult.rows.forEach((task) => {
      path.push({
        level: 'task',
        id: task.id,
        name: task.title,
        type: 'task',
        url: `/kanban?task=${task.id}`,
      });
    });

    res.json({
      kpi_id: id,
      path_down: path,
    });
  } catch (error: unknown) {
    console.error('Error fetching trace down path:', error);
    res.status(500).json({ error: '取得下鑽路徑失敗' });
  }
});

export default router;

