import { Router, Response } from 'express';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { hasPermission } from '../services/rbac';

const router = Router();

// 取得資料品質報告
router.get('/reports', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const canView = await hasPermission(req.user!.id, 'view_data_quality');
    if (!canView) {
      return res.status(403).json({ error: '無權限查看資料品質報告' });
    }

    const { start_date, end_date, pdca_cycle_id } = req.query;

    let query = `
      SELECT 
        pc.id,
        pc.cycle_name,
        pc.check_frequency,
        pc.responsible_user_id,
        u.full_name as responsible_name,
        pc.created_at,
        (
          SELECT json_agg(
            json_build_object(
              'id', pch.id,
              'check_date', pch.check_date,
              'completeness_status', pch.completeness_status,
              'timeliness_status', pch.timeliness_status,
              'consistency_status', pch.consistency_status,
              'completeness_issues', pch.completeness_issues,
              'timeliness_issues', pch.timeliness_issues,
              'consistency_issues', pch.consistency_issues,
              'variance_analysis', pch.variance_analysis,
              'checked_by', pch.checked_by,
              'created_at', pch.created_at
            )
            ORDER BY pch.check_date DESC
          )
          FROM pdca_checks pch
          WHERE pch.pdca_cycle_id = pc.id
        ) as checks
      FROM pdca_cycles pc
      LEFT JOIN users u ON pc.responsible_user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (pdca_cycle_id) {
      query += ` AND pc.id = $${paramIndex}`;
      params.push(pdca_cycle_id);
      paramIndex++;
    }

    if (start_date) {
      query += ` AND pc.created_at >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND pc.created_at <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    query += ' ORDER BY pc.created_at DESC';

    const result = await pool.query(query, params);

    // 計算統計資訊
    const reports = result.rows.map((row) => {
      const checks = row.checks || [];
      const totalChecks = checks.length;
      const passCount = checks.filter(
        (c: any) => c.completeness_status === 'pass' && 
                   c.timeliness_status === 'pass' && 
                   c.consistency_status === 'pass'
      ).length;
      const warningCount = checks.filter(
        (c: any) => c.completeness_status === 'warning' || 
                   c.timeliness_status === 'warning' || 
                   c.consistency_status === 'warning'
      ).length;
      const failCount = checks.filter(
        (c: any) => c.completeness_status === 'fail' || 
                   c.timeliness_status === 'fail' || 
                   c.consistency_status === 'fail'
      ).length;

      return {
        ...row,
        stats: {
          total_checks: totalChecks,
          pass_count: passCount,
          warning_count: warningCount,
          fail_count: failCount,
          pass_rate: totalChecks > 0 ? ((passCount / totalChecks) * 100).toFixed(2) : '0.00',
        },
      };
    });

    res.json(reports);
  } catch (error: unknown) {
    console.error('Error fetching quality reports:', error);
    res.status(500).json({ error: '取得品質報告失敗' });
  }
});

// 取得單一報告詳情
router.get('/reports/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT pch.*, 
              pc.cycle_name,
              u.full_name as checked_by_name
       FROM pdca_checks pch
       INNER JOIN pdca_cycles pc ON pch.pdca_cycle_id = pc.id
       LEFT JOIN users u ON pch.checked_by = u.id
       WHERE pch.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '報告不存在' });
    }

    res.json(result.rows[0]);
  } catch (error: unknown) {
    console.error('Error fetching quality report:', error);
    res.status(500).json({ error: '取得報告詳情失敗' });
  }
});

// 匯出報告
router.post('/reports/export', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const canExport = await hasPermission(req.user!.id, 'export_data_quality');
    if (!canExport) {
      return res.status(403).json({ error: '無權限匯出報告' });
    }

    const { report_ids, format = 'json' } = req.body;

    if (!report_ids || report_ids.length === 0) {
      return res.status(400).json({ error: '必須指定報告 ID' });
    }

    const result = await pool.query(
      `SELECT pch.*, 
              pc.cycle_name,
              u.full_name as checked_by_name
       FROM pdca_checks pch
       INNER JOIN pdca_cycles pc ON pch.pdca_cycle_id = pc.id
       LEFT JOIN users u ON pch.checked_by = u.id
       WHERE pch.id = ANY($1)
       ORDER BY pch.check_date DESC`,
      [report_ids]
    );

    if (format === 'csv') {
      // TODO: 實作 CSV 匯出
      res.json({ message: 'CSV 匯出功能待實作', data: result.rows });
    } else {
      res.json({
        format: 'json',
        exported_at: new Date().toISOString(),
        count: result.rows.length,
        data: result.rows,
      });
    }
  } catch (error: unknown) {
    console.error('Error exporting reports:', error);
    res.status(500).json({ error: '匯出報告失敗' });
  }
});

export default router;

