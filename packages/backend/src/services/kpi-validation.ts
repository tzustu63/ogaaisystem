// KPI 定義驗證邏輯

export interface KPIValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// 驗證 KPI ID 格式
export const validateKPIId = (kpiId: string): boolean => {
  // KPI ID 應符合格式：KPI-001, KPI-002 等
  const pattern = /^KPI-\d{3}$/;
  return pattern.test(kpiId);
};

// 驗證公式格式
export const validateFormula = (formula: string): KPIValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 檢查是否包含基本運算符
  if (!/[+\-*/()]/.test(formula)) {
    warnings.push('公式可能缺少運算符');
  }

  // 檢查是否包含除零風險
  if (formula.includes('/') && !formula.includes('IF')) {
    warnings.push('公式包含除法，建議加入除零檢查');
  }

  // 檢查是否包含未定義的變數（簡化檢查）
  const variables = formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
  const allowedKeywords = ['SUM', 'AVG', 'COUNT', 'MAX', 'MIN', 'IF', 'AND', 'OR'];
  const invalidVars = variables.filter(
    (v) => !allowedKeywords.includes(v.toUpperCase()) && !/^\d+$/.test(v)
  );

  if (invalidVars.length > 0) {
    warnings.push(`公式包含可能的未定義變數: ${invalidVars.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

// 驗證閾值設定
export const validateThresholds = (thresholds: any): KPIValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!thresholds.mode) {
    errors.push('閾值模式未設定');
    return { valid: false, errors, warnings };
  }

  if (thresholds.mode === 'fixed') {
    // 固定值模式：檢查範圍不重疊
    if (
      thresholds.green &&
      thresholds.yellow &&
      thresholds.red
    ) {
      const greenMin = thresholds.green.min || thresholds.green.value;
      const yellowMin = thresholds.yellow.min || thresholds.yellow.value;
      const yellowMax = thresholds.yellow.max || thresholds.yellow.value;
      const redMax = thresholds.red.max || thresholds.red.value;

      if (greenMin <= yellowMax) {
        errors.push('綠燈與黃燈範圍重疊');
      }
      if (yellowMin <= redMax) {
        errors.push('黃燈與紅燈範圍重疊');
      }
    }
  } else if (thresholds.mode === 'relative') {
    // 相對值模式：檢查基準設定
    if (!thresholds.baseline) {
      errors.push('相對值模式需要設定基準（baseline）');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

// 完整驗證 KPI 定義
export const validateKPIDefinition = (kpi: any): KPIValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 驗證必填欄位
  if (!kpi.kpi_id) errors.push('KPI ID 為必填');
  if (!kpi.name_zh) errors.push('KPI 中文名稱為必填');
  if (!kpi.definition) errors.push('KPI 定義為必填');
  if (!kpi.formula) errors.push('KPI 公式為必填');
  if (!kpi.data_source) errors.push('資料來源為必填');
  if (!kpi.data_steward) errors.push('資料負責人為必填');

  // 驗證 KPI ID 格式
  if (kpi.kpi_id && !validateKPIId(kpi.kpi_id)) {
    errors.push('KPI ID 格式不正確，應為 KPI-###');
  }

  // 驗證公式
  if (kpi.formula) {
    const formulaResult = validateFormula(kpi.formula);
    errors.push(...formulaResult.errors);
    warnings.push(...formulaResult.warnings);
  }

  // 驗證閾值
  if (kpi.thresholds) {
    const thresholdResult = validateThresholds(kpi.thresholds);
    errors.push(...thresholdResult.errors);
    warnings.push(...thresholdResult.warnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

