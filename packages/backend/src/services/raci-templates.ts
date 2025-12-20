// RACI 預設模板
export const DEFAULT_RACI_TEMPLATES = [
  {
    name: '雙聯學制合約簽署',
    description: '雙聯學制合作協議簽署流程',
    scenario_type: 'contract_signing',
    raci_matrix: {
      R: [], // 將在建立時填入
      A: [], // 將在建立時填入
      C: [], // 將在建立時填入
      I: [], // 將在建立時填入
    },
    workflow_steps: [
      {
        step: 'Draft',
        step_name: '草案階段',
        roles: {
          R: ['create', 'edit', 'upload'],
          C: ['view'],
          A: ['view'],
          I: [],
        },
        sla_days: null,
        required_attachments: [],
      },
      {
        step: 'Consultation',
        step_name: '會簽階段',
        roles: {
          R: ['view', 'edit'],
          C: ['view', 'comment', 'approve', 'reject'],
          A: ['view'],
          I: ['view'],
        },
        sla_days: 5,
        required_attachments: ['學分對照表', '法規檢核表'],
      },
      {
        step: 'Approval',
        step_name: '核定階段',
        roles: {
          R: ['view'],
          C: ['view'],
          A: ['view', 'approve', 'reject'],
          I: ['view'],
        },
        sla_days: 3,
        required_attachments: ['完整合約文件'],
      },
      {
        step: 'Archive',
        step_name: '歸檔階段',
        roles: {
          R: ['view'],
          C: ['view'],
          A: ['view', 'archive'],
          I: ['view', 'notify'],
        },
        sla_days: null,
        required_attachments: [],
      },
    ],
  },
  {
    name: '境外生簽證申請',
    description: '境外生簽證申請與延期流程',
    scenario_type: 'visa_application',
    raci_matrix: {
      R: [],
      A: [],
      C: [],
      I: [],
    },
    workflow_steps: [
      {
        step: 'Draft',
        step_name: '申請準備',
        roles: {
          R: ['create', 'edit', 'upload'],
          C: ['view'],
          A: ['view'],
          I: [],
        },
        sla_days: null,
        required_attachments: ['護照影本', '在學證明'],
      },
      {
        step: 'Review',
        step_name: '審核階段',
        roles: {
          R: ['view', 'edit'],
          C: ['view', 'comment'],
          A: ['view', 'approve', 'reject'],
          I: ['view'],
        },
        sla_days: 3,
        required_attachments: ['完整申請文件'],
      },
      {
        step: 'Submit',
        step_name: '提交申請',
        roles: {
          R: ['view'],
          C: ['view'],
          A: ['view', 'submit'],
          I: ['view', 'notify'],
        },
        sla_days: 1,
        required_attachments: [],
      },
    ],
  },
  {
    name: '國際交流活動申請',
    description: '國際交流活動（如交換生計畫）申請流程',
    scenario_type: 'exchange_program',
    raci_matrix: {
      R: [],
      A: [],
      C: [],
      I: [],
    },
    workflow_steps: [
      {
        step: 'Draft',
        step_name: '活動規劃',
        roles: {
          R: ['create', 'edit', 'upload'],
          C: ['view'],
          A: ['view'],
          I: [],
        },
        sla_days: null,
        required_attachments: ['活動計畫書'],
      },
      {
        step: 'Consultation',
        step_name: '會簽階段',
        roles: {
          R: ['view', 'edit'],
          C: ['view', 'comment', 'approve', 'reject'],
          A: ['view'],
          I: ['view'],
        },
        sla_days: 7,
        required_attachments: ['預算表', '風險評估'],
      },
      {
        step: 'Approval',
        step_name: '核定階段',
        roles: {
          R: ['view'],
          C: ['view'],
          A: ['view', 'approve', 'reject'],
          I: ['view'],
        },
        sla_days: 5,
        required_attachments: ['完整申請文件'],
      },
      {
        step: 'Archive',
        step_name: '歸檔',
        roles: {
          R: ['view'],
          C: ['view'],
          A: ['view', 'archive'],
          I: ['view', 'notify'],
        },
        sla_days: null,
        required_attachments: [],
      },
    ],
  },
];

// 初始化預設模板到資料庫
export const initializeDefaultTemplates = async (dbPool: any) => {
  try {
    for (const template of DEFAULT_RACI_TEMPLATES) {
      // 檢查是否已存在
      const existing = await dbPool.query(
        'SELECT id FROM raci_templates WHERE name = $1',
        [template.name]
      );

      if (existing.rows.length === 0) {
        await dbPool.query(
          `INSERT INTO raci_templates (
            name, description, scenario_type, raci_matrix, workflow_steps, is_default
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            template.name,
            template.description,
            template.scenario_type,
            JSON.stringify(template.raci_matrix),
            JSON.stringify(template.workflow_steps),
            true,
          ]
        );
      }
    }
  } catch (error) {
    console.error('Error initializing default RACI templates:', error);
  }
};

