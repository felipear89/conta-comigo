export interface Category {
  id: string
  name: string
  color: string
  icon: string
}

export interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  installment: string | null
  bill_month: string | null
  category_id: string | null
  category?: Category
  created_at: string
}

export interface CategoryRule {
  id: string
  keyword: string
  category_id: string
  category?: Category
}


export interface CsvRow {
  date: string
  description: string
  amount: number
}

export interface ForecastItem {
  description: string
  amount: number
  installment: string
}

export interface ForecastMonth {
  month: string   // "YYYY-MM"
  total: number
  items: ForecastItem[]
}

export interface FixedCostOverride {
  month: number
  amount: number
}

export interface FixedCost {
  id: string
  name: string
  year: number
  amount: number
  overrides: FixedCostOverride[]
}

export interface ImportPreviewTransaction extends CsvRow {
  installment: string | null
  bank_category: string | null
  suggested_category_id: string | null
  category_source: 'rule' | null
}
