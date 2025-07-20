'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import BasePreprocessingPage from '../components/BasePreprocessingPage';
import { usePreprocessingContext } from '../context/PreprocessingContext';

interface InvalidDataIssue {
  rowIndex: number;
  column: string;
  value: string | number | null | undefined;
  originalValue: string | number | null | undefined;
  issue: string;
  category: 'type_mismatch' | 'domain_error' | 'range_error' | 'format_error' | 'missing_value' | 'logical_error';
  severity: 'critical' | 'warning' | 'info';
  suggestedFix: string | number | null;
  fixReason: string;
}

export default function InvalidData() {
  const { dataset, setProcessedData, setProcessingStatus, setIsProcessing } = usePreprocessingContext();
  const [detectedIssues, setDetectedIssues] = useState<InvalidDataIssue[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLocalProcessing, setIsLocalProcessing] = useState(false);

  // Comprehensive invalid data detection system
  const detectInvalidData = (data: Record<string, string | number>[], columns: { name: string; type: string }[]): InvalidDataIssue[] => {
    const issues: InvalidDataIssue[] = [];

    data.forEach((row, rowIndex) => {
      columns.forEach(column => {
        const value = row[column.name];
        const columnIssues = validateValue(value, column, rowIndex);
        issues.push(...columnIssues);
      });
    });

    return issues;
  };

  // Enhanced validation logic for comprehensive invalid data detection
  const validateValue = (
    value: string | number | null | undefined, 
    column: { name: string; type: string }, 
    rowIndex: number
  ): InvalidDataIssue[] => {
    const issues: InvalidDataIssue[] = [];

    // 1. Missing value detection
    if (value === null || value === undefined || value === '' || value === 'null' || value === 'undefined') {
      issues.push(createIssue(
        rowIndex, column.name, value, value,
        'Missing or null value',
        'missing_value', 'warning',
        getDefaultValue(column.type, column.name),
        'Replaced with appropriate default value'
      ));
      return issues; // Don't validate further if missing
    }

    // 2. Type mismatch detection
    const typeMismatchIssue = validateTypeMatch(value, column, rowIndex);
    if (typeMismatchIssue) {
      issues.push(typeMismatchIssue);
      return issues; // Don't validate further if type is wrong
    }

    // 3. Domain-specific validation
    issues.push(...validateDomainLogic(value, column, rowIndex));

    // 4. Range validation
    issues.push(...validateRanges(value, column, rowIndex));

    // 5. Format validation
    issues.push(...validateFormats(value, column, rowIndex));

    // 6. Logical consistency validation
    issues.push(...validateLogicalConsistency(value, column, rowIndex));

    return issues;
  };

  // Helper function to create issue objects
  const createIssue = (
    rowIndex: number,
    column: string,
    value: string | number | null | undefined,
    originalValue: string | number | null | undefined,
    issue: string,
    category: InvalidDataIssue['category'],
    severity: InvalidDataIssue['severity'],
    suggestedFix: string | number | null,
    fixReason: string
  ): InvalidDataIssue => ({
    rowIndex,
    column,
    value,
    originalValue,
    issue,
    category,
    severity,
    suggestedFix,
    fixReason
  });

  // Type mismatch validation
  const validateTypeMatch = (
    value: string | number | null | undefined,
    column: { name: string; type: string },
    rowIndex: number
  ): InvalidDataIssue | null => {
    const stringValue = String(value).trim();

    switch (column.type) {
      case 'numeric':
        if (isNaN(Number(stringValue)) || stringValue === '') {
          // Try to extract numeric part
          const numericMatch = stringValue.match(/-?\d*\.?\d+/);
          const suggestedFix = numericMatch ? Number(numericMatch[0]) : 0;
          
          return createIssue(
            rowIndex, column.name, value, value,
            `Non-numeric value "${value}" in numeric column`,
            'type_mismatch', 'critical',
            suggestedFix,
            numericMatch ? 'Extracted numeric value from string' : 'Replaced with zero'
          );
        }
        break;

      case 'date':
        const dateValue = new Date(stringValue);
        if (isNaN(dateValue.getTime())) {
          return createIssue(
            rowIndex, column.name, value, value,
            `Invalid date format "${value}"`,
            'type_mismatch', 'critical',
            new Date().toISOString().split('T')[0],
            'Replaced with current date'
          );
        }
        break;

      default: // text columns don't have strict type requirements
        break;
    }

    return null;
  };

  // Domain-specific logic validation
  const validateDomainLogic = (
    value: string | number | null | undefined,
    column: { name: string; type: string },
    rowIndex: number
  ): InvalidDataIssue[] => {
    const issues: InvalidDataIssue[] = [];
    const columnName = column.name.toLowerCase();
    const stringValue = String(value).toLowerCase().trim();

    // Age validation
    if (columnName.includes('age')) {
      const ageValue = Number(value);
      if (!isNaN(ageValue)) {
        if (ageValue < 0) {
          issues.push(createIssue(
            rowIndex, column.name, value, value,
            'Negative age value',
            'logical_error', 'critical',
            Math.abs(ageValue),
            'Converted to positive value'
          ));
        } else if (ageValue > 150) {
          issues.push(createIssue(
            rowIndex, column.name, value, value,
            'Unrealistic age (over 150)',
            'logical_error', 'warning',
            null,
            'Age seems too high for human'
          ));
        }
      }
    }

    // Price/Cost/Amount validation
    if (columnName.includes('price') || columnName.includes('cost') || columnName.includes('amount') || columnName.includes('salary')) {
      const numValue = Number(value);
      if (!isNaN(numValue) && numValue < 0) {
        issues.push(createIssue(
          rowIndex, column.name, value, value,
          'Negative value for price/cost/amount',
          'logical_error', 'critical',
          Math.abs(numValue),
          'Converted to positive value'
        ));
      }
    }

    // Percentage validation
    if (columnName.includes('percent') || columnName.includes('rate') || columnName.includes('ratio')) {
      const pctValue = Number(value);
      if (!isNaN(pctValue)) {
        if (pctValue < 0 || pctValue > 100) {
          issues.push(createIssue(
            rowIndex, column.name, value, value,
            'Percentage out of valid range (0-100)',
            'range_error', 'warning',
            Math.max(0, Math.min(100, pctValue)),
            'Clamped to valid percentage range'
          ));
        }
      }
    }

    // Gender validation
    if (columnName.includes('gender') || columnName.includes('sex')) {
      const validGenders = ['male', 'female', 'other', 'm', 'f', 'o', 'non-binary', 'prefer not to say'];
      if (!validGenders.includes(stringValue)) {
        issues.push(createIssue(
          rowIndex, column.name, value, value,
          'Invalid gender value',
          'domain_error', 'warning',
          'Other',
          'Standardized to "Other"'
        ));
      }
    }

    return issues;
  };

  // Range validation for various data types
  const validateRanges = (
    value: string | number | null | undefined,
    column: { name: string; type: string },
    rowIndex: number
  ): InvalidDataIssue[] => {
    const issues: InvalidDataIssue[] = [];
    const columnName = column.name.toLowerCase();

    // Date range validation
    if (column.type === 'date') {
      const dateValue = new Date(String(value));
      if (!isNaN(dateValue.getTime())) {
        const currentYear = new Date().getFullYear();
        const year = dateValue.getFullYear();
        
        if (year < 1900) {
          issues.push(createIssue(
            rowIndex, column.name, value, value,
            'Date too far in the past (before 1900)',
            'range_error', 'warning',
            `${currentYear - 30}-01-01`,
            'Adjusted to reasonable historical date'
          ));
        } else if (year > currentYear + 10) {
          issues.push(createIssue(
            rowIndex, column.name, value, value,
            'Date too far in the future',
            'range_error', 'warning',
            new Date().toISOString().split('T')[0],
            'Adjusted to current date'
          ));
        }
      }
    }

    // Numeric range validation
    if (column.type === 'numeric') {
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        // Phone number validation (if it looks like a phone)
        if (columnName.includes('phone') && (numValue < 1000000000 || numValue > 99999999999999)) {
          issues.push(createIssue(
            rowIndex, column.name, value, value,
            'Phone number outside valid range',
            'range_error', 'warning',
            null,
            'Phone number format appears invalid'
          ));
        }
      }
    }

    return issues;
  };

  // Format validation for text fields
  const validateFormats = (
    value: string | number | null | undefined,
    column: { name: string; type: string },
    rowIndex: number
  ): InvalidDataIssue[] => {
    const issues: InvalidDataIssue[] = [];
    const columnName = column.name.toLowerCase();
    const stringValue = String(value).trim();

    // Email format validation
    if (columnName.includes('email') || columnName.includes('mail')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(stringValue)) {
        issues.push(createIssue(
          rowIndex, column.name, value, value,
          'Invalid email format',
          'format_error', 'critical',
          'invalid@example.com',
          'Replaced with placeholder email'
        ));
      }
    }

    // Phone format validation
    if (columnName.includes('phone') || columnName.includes('mobile') || columnName.includes('tel')) {
      const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
      if (!phoneRegex.test(stringValue)) {
        issues.push(createIssue(
          rowIndex, column.name, value, value,
          'Invalid phone format',
          'format_error', 'warning',
          '+1-000-000-0000',
          'Replaced with placeholder phone'
        ));
      }
    }

    // URL format validation
    if (columnName.includes('url') || columnName.includes('website') || columnName.includes('link')) {
      try {
        new URL(stringValue.startsWith('http') ? stringValue : `https://${stringValue}`);
      } catch {
        issues.push(createIssue(
          rowIndex, column.name, value, value,
          'Invalid URL format',
          'format_error', 'warning',
          'https://example.com',
          'Replaced with placeholder URL'
        ));
      }
    }

    return issues;
  };

  // Logical consistency validation
  const validateLogicalConsistency = (
    value: string | number | null | undefined,
    column: { name: string; type: string },
    rowIndex: number
  ): InvalidDataIssue[] => {
    const issues: InvalidDataIssue[] = [];
    
    // Check for obvious inconsistencies
    const stringValue = String(value).toLowerCase().trim();

    // Boolean-like values in wrong format
    if (['yes', 'no', 'true', 'false', 'y', 'n', '1', '0'].includes(stringValue) && column.type !== 'text') {
      issues.push(createIssue(
        rowIndex, column.name, value, value,
        'Boolean-like value in non-text column',
        'logical_error', 'info',
        stringValue === 'yes' || stringValue === 'true' || stringValue === 'y' || stringValue === '1' ? 1 : 0,
        'Converted boolean to numeric representation'
      ));
    }

    return issues;
  };

  // Get appropriate default value based on column type and name
  const getDefaultValue = (columnType: string, columnName: string): string | number | null => {
    const lowerName = columnName.toLowerCase();
    
    switch (columnType) {
      case 'numeric':
        if (lowerName.includes('age')) return 0;
        if (lowerName.includes('price') || lowerName.includes('cost')) return 0;
        if (lowerName.includes('count') || lowerName.includes('quantity')) return 0;
        return 0;
      
      case 'date':
        return new Date().toISOString().split('T')[0];
      
      default: // text
        if (lowerName.includes('name')) return 'Unknown';
        if (lowerName.includes('email')) return 'noemail@example.com';
        if (lowerName.includes('phone')) return '+1-000-000-0000';
        if (lowerName.includes('status')) return 'Unknown';
        return 'N/A';
    }
  };

  // Main analysis function
  const handleAnalyzeData = async () => {
    if (!dataset) {
      toast.error('No dataset loaded');
      return;
    }

    setIsAnalyzing(true);
    setProcessingStatus('Analyzing data for invalid values...');
    
    try {
      const issues = detectInvalidData(dataset.data, dataset.columns);
      setDetectedIssues(issues);
      
      if (issues.length === 0) {
        toast.success('🎉 No invalid data detected! Your dataset looks clean.');
      } else {
        toast.error(`⚠️ Found ${issues.length} data quality issues that need attention`);
      }
    } catch (error) {
      console.error('Error analyzing data:', error);
      toast.error('Failed to analyze data');
    } finally {
      setIsAnalyzing(false);
      setProcessingStatus('');
    }
  };

  // Fix invalid data function
  const fixInvalidValue = (
    issue: InvalidDataIssue, 
    column: { name: string; type: string }
  ): string | number | null => {
    // Return the suggested fix if available
    if (issue.suggestedFix !== null) {
      return issue.suggestedFix;
    }

    // Fallback logic based on issue category
    switch (issue.category) {
      case 'missing_value':
        return getDefaultValue(column.type, column.name);
      
      case 'type_mismatch':
        if (column.type === 'numeric') {
          const numericMatch = String(issue.originalValue).match(/-?\d*\.?\d+/);
          return numericMatch ? Number(numericMatch[0]) : 0;
        }
        return getDefaultValue(column.type, column.name);
      
      case 'logical_error':
      case 'range_error':
        if (typeof issue.originalValue === 'number') {
          return Math.abs(issue.originalValue);
        }
        return getDefaultValue(column.type, column.name);
      
      default:
        return getDefaultValue(column.type, column.name);
    }
  };

  // Apply fixes to the dataset
  const handleFixData = async () => {
    if (!dataset || detectedIssues.length === 0) {
      toast.error('No issues to fix');
      return;
    }

    setIsLocalProcessing(true);
    setIsProcessing(true);
    setProcessingStatus('Applying fixes to invalid data...');
    
    try {
      const processedData = { ...dataset };
      const issuesByRow = new Map<number, InvalidDataIssue[]>();
      
      // Group issues by row for efficient processing
      detectedIssues.forEach(issue => {
        if (!issuesByRow.has(issue.rowIndex)) {
          issuesByRow.set(issue.rowIndex, []);
        }
        issuesByRow.get(issue.rowIndex)!.push(issue);
      });
      
      // Apply fixes to each row
      processedData.data = processedData.data.map((row, index) => {
        const rowIssues = issuesByRow.get(index);
        if (!rowIssues) return row;
        
        const fixedRow = { ...row };
        rowIssues.forEach(issue => {
          const column = dataset.columns.find(col => col.name === issue.column);
          if (column) {
            fixedRow[issue.column] = fixInvalidValue(issue, column);
          }
        });
        
        return fixedRow;
      });

      // Save processed data using the context
      setProcessedData(processedData);
      
      toast.success(`✅ Successfully fixed ${detectedIssues.length} data quality issues!`);
      setDetectedIssues([]);
      
    } catch (error) {
      console.error('Error fixing invalid data:', error);
      toast.error('Failed to fix invalid data');
    } finally {
      setIsLocalProcessing(false);
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // Group issues for better display
  const groupedIssues = detectedIssues.reduce((acc, issue) => {
    const key = `${issue.column}-${issue.category}-${issue.issue}`;
    if (!acc[key]) {
      acc[key] = { ...issue, count: 0, rows: [] as number[] };
    }
    acc[key].count++;
    acc[key].rows.push(issue.rowIndex);
    return acc;
  }, {} as Record<string, InvalidDataIssue & { count: number; rows: number[] }>);

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'type_mismatch': return '🔧';
      case 'missing_value': return '❌';
      case 'domain_error': return '🚫';
      case 'range_error': return '📏';
      case 'format_error': return '📝';
      case 'logical_error': return '🧠';
      default: return '⚠️';
    }
  };

  return (
    <BasePreprocessingPage
      title="Invalid Data Detection & Repair"
      description="Comprehensive detection and automatic fixing of invalid data including type mismatches, domain errors, range violations, and logical inconsistencies."
    >
      <div className="space-y-6">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 p-4 rounded-lg border border-red-200">
          <h3 className="text-lg font-medium text-gray-900 mb-2">🔍 Comprehensive Data Validation</h3>
          <p className="text-sm text-gray-600 mb-3">
            Advanced rule-based system that detects and fixes multiple types of data quality issues automatically.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div>
              <strong className="text-red-700">Type Mismatches:</strong>
              <div className="text-gray-600 mt-1">
                • Text in numeric columns<br/>
                • Invalid date formats<br/>
                • Wrong data types
              </div>
            </div>
            <div>
              <strong className="text-red-700">Domain & Logic Errors:</strong>
              <div className="text-gray-600 mt-1">
                • Negative ages/prices<br/>
                • Invalid email/phone formats<br/>
                • Out-of-range percentages
              </div>
            </div>
            <div>
              <strong className="text-red-700">Smart Fixes:</strong>
              <div className="text-gray-600 mt-1">
                • Extract numbers from text<br/>
                • Convert negatives to positive<br/>
                • Replace with intelligent defaults
              </div>
            </div>
          </div>
        </div>

        {/* Analysis Control */}
        <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Data Quality Analysis</h3>
            <p className="text-sm text-gray-500">
              Scan your dataset for invalid data across all columns using advanced validation rules
            </p>
          </div>
          <button
            onClick={handleAnalyzeData}
            disabled={isAnalyzing || !dataset}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing...
              </span>
            ) : (
              '🔍 Analyze Data Quality'
            )}
          </button>
        </div>

        {/* Issues Display */}
        {Object.keys(groupedIssues).length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h4 className="ml-2 text-sm font-medium text-red-800">
                Found {detectedIssues.length} invalid data issues across {Object.keys(groupedIssues).length} categories
              </h4>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {Object.values(groupedIssues).map((group, index) => (
                <div key={index} className="flex items-start justify-between p-4 bg-white rounded-md border border-red-200">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">{getCategoryIcon(group.category)}</span>
                      <div>
                        <p className="font-medium text-gray-900">{group.column}</p>
                        <p className="text-sm text-gray-600">{group.issue}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>{group.count} occurrences</span>
                      <span>
                        Rows: {group.rows.slice(0, 5).map(r => r + 1).join(', ')}
                        {group.rows.length > 5 && ` +${group.rows.length - 5} more`}
                      </span>
                    </div>
                    {group.suggestedFix !== null && (
                      <div className="mt-2 p-2 bg-green-50 rounded text-xs">
                        <strong>Suggested fix:</strong> {String(group.suggestedFix)}
                        <br />
                        <span className="text-green-600">{group.fixReason}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(group.severity)}`}>
                      {group.severity}
                    </span>
                    <span className="text-xs text-gray-500 capitalize bg-gray-100 px-2 py-1 rounded">
                      {group.category.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fix Button */}
        <div className="space-y-3">
          <button
            onClick={handleFixData}
            disabled={isLocalProcessing || detectedIssues.length === 0}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-green-300 disabled:cursor-not-allowed text-sm font-medium"
          >
            {isLocalProcessing ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Fixing Issues...
              </span>
            ) : (
              `🔧 Fix All ${detectedIssues.length} Issues Automatically`
            )}
          </button>
          
          {detectedIssues.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-4 bg-gray-50 rounded-lg">
              ✅ No issues detected. Run analysis first to check for invalid data.
            </p>
          )}
        </div>
      </div>
    </BasePreprocessingPage>
  );
}