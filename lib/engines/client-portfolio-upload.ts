export type UploadedHolding = {
    code: string
    name?: string
    weight: number
    value?: number
    quantity?: number
    sourceRow: number
  }
  
  export type ParsedPortfolioUpload = {
    holdings: UploadedHolding[]
    totalWeight: number
    unmappedRows: string[]
    warnings: string[]
  }
  
  const CODE_HEADERS = ['code', 'ticker', 'symbol', 'security code', 'asx code']
  const NAME_HEADERS = ['name', 'security', 'holding', 'description']
  const WEIGHT_HEADERS = ['weight', 'portfolio weight', 'allocation', '%', 'weight %']
  const VALUE_HEADERS = ['value', 'market value', 'holding value', 'current value']
  const QUANTITY_HEADERS = ['quantity', 'units', 'shares']
  
  export function parseClientPortfolioCsv(csvText: string): ParsedPortfolioUpload {
    const rows = csvText
      .split(/\r?\n/)
      .map((row) => row.trim())
      .filter(Boolean)
  
    if (rows.length < 2) {
      return {
        holdings: [],
        totalWeight: 0,
        unmappedRows: [],
        warnings: ['CSV requires a header row and at least one holding row.'],
      }
    }
  
    const headers = splitCsvRow(rows[0]).map(normaliseHeader)
  
    const codeIndex = findHeaderIndex(headers, CODE_HEADERS)
    const nameIndex = findHeaderIndex(headers, NAME_HEADERS)
    const weightIndex = findHeaderIndex(headers, WEIGHT_HEADERS)
    const valueIndex = findHeaderIndex(headers, VALUE_HEADERS)
    const quantityIndex = findHeaderIndex(headers, QUANTITY_HEADERS)
  
    const warnings: string[] = []
    const unmappedRows: string[] = []
  
    if (codeIndex === -1 && nameIndex === -1) {
      warnings.push('No code or security name column found.')
    }
  
    if (weightIndex === -1 && valueIndex === -1) {
      warnings.push('No weight or market value column found.')
    }
  
    const rawHoldings = rows.slice(1).map((row, index) => {
      const columns = splitCsvRow(row)
  
      const code = codeIndex >= 0 ? normaliseCode(columns[codeIndex]) : ''
      const name = nameIndex >= 0 ? cleanText(columns[nameIndex]) : undefined
      const weight = weightIndex >= 0 ? parseNumber(columns[weightIndex]) : 0
      const value = valueIndex >= 0 ? parseNumber(columns[valueIndex]) : undefined
      const quantity = quantityIndex >= 0 ? parseNumber(columns[quantityIndex]) : undefined
  
      if (!code && !name) {
        unmappedRows.push(`Row ${index + 2}: missing code/name`)
      }
  
      return {
        code: code || normaliseCode(name || ''),
        name,
        weight,
        value,
        quantity,
        sourceRow: index + 2,
      }
    })
  
    let holdings = rawHoldings.filter((holding) => holding.code || holding.name)
  
    const hasWeights = holdings.some((holding) => holding.weight > 0)
    const hasValues = holdings.some((holding) => (holding.value || 0) > 0)
  
    if (!hasWeights && hasValues) {
      const totalValue = holdings.reduce(
        (sum, holding) => sum + (holding.value || 0),
        0,
      )
  
      holdings = holdings.map((holding) => ({
        ...holding,
        weight: totalValue > 0 ? ((holding.value || 0) / totalValue) * 100 : 0,
      }))
    }
  
    const totalWeight = round2(
      holdings.reduce((sum, holding) => sum + holding.weight, 0),
    )
  
    if (holdings.length === 0) {
      warnings.push('No valid holdings found.')
    }
  
    if (totalWeight > 0 && (totalWeight < 95 || totalWeight > 105)) {
      warnings.push(
        `Portfolio weights total ${totalWeight}%. Check whether cash, managed funds, or unlisted assets are missing.`,
      )
    }
  
    return {
      holdings: holdings.map((holding) => ({
        ...holding,
        weight: round2(holding.weight),
      })),
      totalWeight,
      unmappedRows,
      warnings,
    }
  }
  
  function splitCsvRow(row: string): string[] {
    const result: string[] = []
    let current = ''
    let insideQuotes = false
  
    for (let i = 0; i < row.length; i += 1) {
      const char = row[i]
  
      if (char === '"') {
        insideQuotes = !insideQuotes
        continue
      }
  
      if (char === ',' && !insideQuotes) {
        result.push(current.trim())
        current = ''
        continue
      }
  
      current += char
    }
  
    result.push(current.trim())
    return result
  }
  
  function findHeaderIndex(headers: string[], candidates: string[]): number {
    return headers.findIndex((header) => candidates.includes(header))
  }
  
  function normaliseHeader(value: string): string {
    return cleanText(value).toLowerCase()
  }
  
  function normaliseCode(value: string): string {
    return cleanText(value)
      .replace(/\.ASX$/i, '')
      .replace(/\s+/g, '')
      .toUpperCase()
  }
  
  function cleanText(value?: string): string {
    return (value || '').replace(/^"|"$/g, '').trim()
  }
  
  function parseNumber(value?: string): number {
    if (!value) return 0
  
    const cleaned = value
      .replace(/[$,%]/g, '')
      .replace(/\s+/g, '')
      .replace(/,/g, '')
  
    const parsed = Number(cleaned)
    return Number.isFinite(parsed) ? parsed : 0
  }
  
  function round2(value: number): number {
    return Math.round(value * 100) / 100
  }