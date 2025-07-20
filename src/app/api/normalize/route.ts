import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

// Initialize R2 client with proper credentials
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// In-memory storage for demo (replace with R2 or other storage for production)
const normalizedCSVs: Record<string, string> = {};

// Pure JS CSV parser with better handling of quoted fields and edge cases
function parseCSV(csvText: string): { headers: string[]; rows: string[][] } {
  const lines = csvText.trim().split('\n');
  
  // Parse CSV line considering quoted fields
  const parseLine = (line: string): string[] => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result.map(cell => cell.replace(/^"(.*)"$/, '$1')); // Remove surrounding quotes
  };
  
  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(line => parseLine(line));
  
  return { headers, rows };
}

// Pure JS CSV stringifier
function stringifyCSV(headers: string[], rows: string[][]): string {
  const csvLines = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ];
  return csvLines.join('\n');
}

// Statistical functions
function calculateStats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = values.length;
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((sum, val) => sum + val, 0) / n;
  
  // Standard deviation
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const std = Math.sqrt(variance);
  
  // Median and quartiles
  const median = n % 2 === 0 
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 
    : sorted[Math.floor(n / 2)];
  
  const q1 = sorted[Math.floor(n / 4)];
  const q3 = sorted[Math.floor(n * 3 / 4)];
  const iqr = q3 - q1;
  
  return { min, max, mean, std, median, q1, q3, iqr };
}

// Normalization functions
function normalizeColumn(values: number[], method: string, minVal?: number, maxVal?: number): number[] {
  const stats = calculateStats(values);
  
  switch (method) {
    case 'minmax':
      const targetMin = minVal ?? 0;
      const targetMax = maxVal ?? 1;
      const range = stats.max - stats.min;
      if (range === 0) return values.map(() => targetMin);
      return values.map(v => ((v - stats.min) / range) * (targetMax - targetMin) + targetMin);
    
    case 'zscore':
      if (stats.std === 0) return values.map(() => 0);
      return values.map(v => (v - stats.mean) / stats.std);
    
    case 'robust':
      if (stats.iqr === 0) return values.map(() => 0);
      return values.map(v => (v - stats.median) / stats.iqr);
    
    default:
      return values;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { datasetUrl, columns, method, min, max, returnFullCSV } = await req.json();
    
    console.log('Normalize API called with:', { datasetUrl, columns, method, min, max, returnFullCSV });
    
    // Enhanced validation
    if (!datasetUrl || !columns || columns.length === 0 || !method) {
      console.error('Missing required fields:', { datasetUrl: !!datasetUrl, columns, method });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    if (!['minmax', 'zscore', 'robust'].includes(method)) {
      console.error('Invalid method:', method);
      return NextResponse.json({ error: 'Invalid normalization method' }, { status: 400 });
    }
    
    if (method === 'minmax') {
      // More lenient validation for min/max - allow undefined values
      const minVal = min !== undefined ? Number(min) : 0;
      const maxVal = max !== undefined ? Number(max) : 1;
      
      if (isNaN(minVal) || isNaN(maxVal) || minVal >= maxVal) {
        console.error('Invalid min/max values:', { min: minVal, max: maxVal });
        return NextResponse.json({ error: 'Invalid min/max values for minmax scaling' }, { status: 400 });
      }
    }

    // Fetch CSV data directly from R2 storage
    console.log('Fetching dataset from R2:', datasetUrl);
    
    let csvText: string;
    
    // Check if this is an R2 URL and extract the key
    if (datasetUrl.includes('r2.cloudflarestorage.com')) {
      try {
        // Extract the object key from the URL
        const urlParts = datasetUrl.split('/');
        const key = urlParts.slice(4).join('/'); // Skip https, empty, domain, bucket
        
        console.log('Extracted R2 key:', key);
        
        // Get the object from R2
        const command = new GetObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: key,
        });
        
        const response = await s3Client.send(command);
        
        if (!response.Body) {
          console.error('No body in R2 response');
          return NextResponse.json({ error: 'Failed to read dataset from storage' }, { status: 400 });
        }
        
        // Convert the stream to string
        csvText = await response.Body.transformToString();
        console.log('CSV data loaded from R2, length:', csvText.length, 'characters');
        
      } catch (r2Error) {
        console.error('R2 fetch error:', r2Error);
        return NextResponse.json({ 
          error: `Failed to fetch dataset from storage: ${r2Error.message}` 
        }, { status: 400 });
      }
    } else {
      // Fallback to direct HTTP fetch for non-R2 URLs
      try {
        const csvRes = await fetch(datasetUrl, {
          method: 'GET',
          headers: {
            'Accept': 'text/csv,*/*',
            'User-Agent': 'DataVizAI-Normalizer/1.0'
          }
        });
        
        if (!csvRes.ok) {
          console.error('HTTP fetch failed:', csvRes.status, csvRes.statusText);
          return NextResponse.json({ 
            error: `Failed to fetch dataset: ${csvRes.status} ${csvRes.statusText}` 
          }, { status: 400 });
        }
        
        csvText = await csvRes.text();
        console.log('CSV data loaded via HTTP, length:', csvText.length, 'characters');
        
      } catch (httpError) {
        console.error('HTTP fetch error:', httpError);
        return NextResponse.json({ 
          error: `Failed to fetch dataset: ${httpError.message}` 
        }, { status: 400 });
      }
    }
    
    if (!csvText.trim()) {
      return NextResponse.json({ error: 'Dataset is empty' }, { status: 400 });
    }

    // Parse CSV
    const { headers, rows } = parseCSV(csvText);
    
    if (headers.length === 0 || rows.length === 0) {
      return NextResponse.json({ error: 'Dataset has no valid data' }, { status: 400 });
    }
    
    // Validate that selected columns exist
    const invalidColumns = columns.filter(col => !headers.includes(col));
    if (invalidColumns.length > 0) {
      return NextResponse.json({ 
        error: `Invalid columns: ${invalidColumns.join(', ')}` 
      }, { status: 400 });
    }
    
    // Create a copy of the data for normalization
    const normalizedRows = rows.map(row => [...row]);
    const normalizedColumnsInfo = [];

    // Normalize selected columns
    for (const columnName of columns) {
      const columnIndex = headers.indexOf(columnName);
      if (columnIndex === -1) continue;

      // Extract numeric values from the column
      const columnValues = rows.map(row => {
        const value = parseFloat(row[columnIndex]);
        return isNaN(value) ? 0 : value;
      });
      
      // Check if column has any valid numeric data
      const validValues = columnValues.filter((v, i) => v !== 0 || rows[i][columnIndex] === '0');
      if (validValues.length === 0) {
        normalizedColumnsInfo.push({
          column: columnName,
          warning: 'No valid numeric data found, values set to 0'
        });
      }

      // Normalize the values
      const normalizedValues = normalizeColumn(columnValues, method, min, max);

      // Update the normalized rows with formatted values
      normalizedValues.forEach((normalizedValue, rowIndex) => {
        // Format to reasonable decimal places
        const formattedValue = method === 'minmax' 
          ? normalizedValue.toFixed(4)
          : normalizedValue.toFixed(6);
        normalizedRows[rowIndex][columnIndex] = formattedValue;
      });
      
      normalizedColumnsInfo.push({
        column: columnName,
        method,
        originalRange: method === 'minmax' ? `${Math.min(...columnValues).toFixed(2)} - ${Math.max(...columnValues).toFixed(2)}` : undefined,
        normalizedRange: method === 'minmax' ? `${min} - ${max}` : undefined
      });
    }

    // Convert back to CSV
    const normalizedCSV = stringifyCSV(headers, normalizedRows);
    
    // Prepare response
    const previewRows = normalizedRows.slice(0, 10);
    const preview = {
      headers,
      rows: previewRows,
      sampleSize: previewRows.length,
      totalRows: normalizedRows.length,
      normalizedColumns: normalizedColumnsInfo,
      downloadUrl: undefined as string | undefined
    };

    // If full CSV is requested (for saving), include it directly in response
    if (returnFullCSV) {
      return NextResponse.json({ 
        preview,
        fullCSV: normalizedCSV 
      });
    }

    // Otherwise, use temporary storage for download (for preview/testing)
    const key = Math.random().toString(36).substring(2, 10);
    normalizedCSVs[key] = normalizedCSV;
    const downloadUrl = `/api/normalize/download?key=${key}`;
    preview.downloadUrl = downloadUrl;

    return NextResponse.json({ preview });
  } catch (err) {
    console.error('Normalization error:', err);
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : 'Internal server error' 
    }, { status: 500 });
  }
}

// Download handler (GET)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');
  if (!key || !normalizedCSVs[key]) {
    return new NextResponse('Not found', { status: 404 });
  }
  return new NextResponse(normalizedCSVs[key], {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="normalized.csv"',
    },
  });
} 