import { Router, Response } from 'express';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// 取得上溯路徑（從任務到戰略）
router.get('/task/:id/up', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // 取得任務資訊（包含 KR 引用的 KPI）
    const taskResult = await pool.query(
      `SELECT t.*, 
              i.id as initiative_id, i.name_zh as initiative_name,
              kr.id as kr_id, kr.description as kr_description, 
              kr.kr_type, kr.kpi_id as kr_kpi_id,
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
        kr_type: task.kr_type,
        url: `/okr?kr=${task.kr_id}`,
      });

      // 2.1 如果 KR 是 KPI 類型，加入 KR 關聯的 KPI
      if (task.kr_type === 'kpi_based' && task.kr_kpi_id) {
        const krKpiResult = await pool.query(
          'SELECT * FROM kpi_registry WHERE id = $1',
          [task.kr_kpi_id]
        );
        if (krKpiResult.rows.length > 0) {
          const kpi = krKpiResult.rows[0];
          path.push({
            level: 'kpi',
            id: kpi.id,
            name: kpi.name_zh,
            type: 'kpi',
            source: 'kr_reference', // 標記來源是 KR 引用
            url: `/kpi/${kpi.id}`,
          });
        }
      }

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

    // 6. Task 直接影響的 KPI（保留向後相容）
    if (task.kpi_id) {
      // 檢查是否已透過 KR 加入相同的 KPI
      const alreadyAdded = path.some(p => p.type === 'kpi' && p.id === task.kpi_id);
      if (!alreadyAdded) {
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
            source: 'task_direct', // 標記來源是 Task 直接關聯
            url: `/kpi/${kpi.id}`,
          });
        }
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

    // 1. KPI 本身
    const kpiResult = await pool.query(
      'SELECT * FROM kpi_registry WHERE id = $1',
      [id]
    );

    if (kpiResult.rows.length === 0) {
      return res.status(404).json({ error: 'KPI 不存在' });
    }

    const kpi = kpiResult.rows[0];

    // 結構化的下鑽路徑
    const drillDown = {
      kpi: {
        id: kpi.id,
        kpi_id: kpi.kpi_id,
        name: kpi.name_zh,
        bsc_perspective: kpi.bsc_perspective,
        url: `/kpi/${kpi.id}`,
      },
      initiatives: [] as any[],
      okrs: [] as any[],
      key_results: [] as any[],
      tasks: [] as any[],
    };

    // 2. 透過 initiative_kpis 關聯的 Initiatives
    const initiativesResult = await pool.query(
      `SELECT i.*
       FROM initiatives i
       INNER JOIN initiative_kpis ik ON i.id = ik.initiative_id
       WHERE ik.kpi_id = $1`,
      [id]
    );

    initiativesResult.rows.forEach((initiative) => {
      drillDown.initiatives.push({
        id: initiative.id,
        initiative_id: initiative.initiative_id,
        name: initiative.name_zh,
        status: initiative.status,
        source: 'initiative_kpis',
        url: `/initiatives/${initiative.id}`,
      });
    });

    // 3. 透過 KR 引用此 KPI 的 OKRs（新增：整合後的追蹤方式）
    const okrsByKRResult = await pool.query(
      `SELECT DISTINCT o.*, kr.id as kr_id, kr.description as kr_description, kr.progress_percentage
       FROM okrs o
       INNER JOIN key_results kr ON o.id = kr.okr_id
       WHERE kr.kr_type = 'kpi_based' AND kr.kpi_id = $1`,
      [id]
    );

    okrsByKRResult.rows.forEach((row) => {
      // 添加 OKR（避免重複）
      if (!drillDown.okrs.some(o => o.id === row.id)) {
        drillDown.okrs.push({
          id: row.id,
          objective: row.objective,
          quarter: row.quarter,
          source: 'kr_kpi_reference',
          url: `/okr/${row.id}`,
        });
      }
      // 添加 Key Result
      drillDown.key_results.push({
        id: row.kr_id,
        description: row.kr_description,
        progress_percentage: row.progress_percentage,
        okr_id: row.id,
        source: 'kpi_based',
      });
    });

    // 4. 透過 Task 直接關聯的 OKRs（向後相容）
    const okrsByTaskResult = await pool.query(
      `SELECT DISTINCT o.*
       FROM okrs o
       INNER JOIN key_results kr ON o.id = kr.okr_id
       INNER JOIN tasks t ON kr.id = t.kr_id
       WHERE t.kpi_id = $1`,
      [id]
    );

    okrsByTaskResult.rows.forEach((okr) => {
      if (!drillDown.okrs.some(o => o.id === okr.id)) {
        drillDown.okrs.push({
          id: okr.id,
          objective: okr.objective,
          quarter: okr.quarter,
          source: 'task_kpi_direct',
          url: `/okr/${okr.id}`,
        });
      }
    });

    // 5. 透過 KR 引用此 KPI 的 Tasks
    const tasksByKRResult = await pool.query(
      `SELECT t.*, kr.description as kr_description
       FROM tasks t
       INNER JOIN key_results kr ON t.kr_id = kr.id
       WHERE kr.kr_type = 'kpi_based' AND kr.kpi_id = $1`,
      [id]
    );

    tasksByKRResult.rows.forEach((task) => {
      drillDown.tasks.push({
        id: task.id,
        title: task.title,
        status: task.status,
        kr_description: task.kr_description,
        source: 'kr_kpi_reference',
        url: `/kanban?task=${task.id}`,
      });
    });

    // 6. 直接關聯此 KPI 的 Tasks（向後相容）
    const tasksDirectResult = await pool.query(
      `SELECT t.*
       FROM tasks t
       WHERE t.kpi_id = $1`,
      [id]
    );

    tasksDirectResult.rows.forEach((task) => {
      if (!drillDown.tasks.some(t => t.id === task.id)) {
        drillDown.tasks.push({
          id: task.id,
          title: task.title,
          status: task.status,
          source: 'task_direct',
          url: `/kanban?task=${task.id}`,
        });
      }
    });

    // 統計摘要
    const summary = {
      total_initiatives: drillDown.initiatives.length,
      total_okrs: drillDown.okrs.length,
      total_key_results: drillDown.key_results.length,
      total_tasks: drillDown.tasks.length,
      tasks_completed: drillDown.tasks.filter(t => t.status === 'done').length,
      avg_kr_progress: drillDown.key_results.length > 0
        ? drillDown.key_results.reduce((sum, kr) => sum + (parseFloat(kr.progress_percentage) || 0), 0) / drillDown.key_results.length
        : 0,
    };

    res.json({
      kpi_id: id,
      drill_down: drillDown,
      summary,
    });
  } catch (error: unknown) {
    console.error('Error fetching trace down path:', error);
    res.status(500).json({ error: '取得下鑽路徑失敗' });
  }
});

export default router;

