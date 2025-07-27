import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface ClusterPreviewRow {
  sample_index?: number;
  cluster?: number;
  anomaly?: number;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get('modelId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const filter = searchParams.get('filter') || 'all';

    if (!modelId) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      );
    }

    // Path to the model metadata JSON file
    const metadataPath = path.join(process.cwd(), 'ml_backend', 'saved_models', `${modelId}_metadata.json`);

    // Check if file exists
    if (!fs.existsSync(metadataPath)) {
      return NextResponse.json(
        { error: 'Model metadata not found' },
        { status: 404 }
      );
    }

    // Read and parse the metadata
    const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
    const metadata = JSON.parse(metadataContent);

    // Get cluster preview data
    const clusterPreview: ClusterPreviewRow[] = metadata.metrics?.cluster_preview || [];
    
    if (clusterPreview.length === 0) {
      return NextResponse.json({
        data: [],
        totalRows: 0,
        totalPages: 0,
        currentPage: page,
        hasNext: false,
        hasPrev: false,
        columns: []
      });
    }

    // Get column names from the first row (excluding empty objects)
    const firstValidRow = clusterPreview.find((row: ClusterPreviewRow) => 
      row && typeof row === 'object' && Object.keys(row).length > 1
    );
    
    const columns = firstValidRow ? Object.keys(firstValidRow) : [];

    // Filter data based on filter parameter
    let filteredData = clusterPreview.filter((row: ClusterPreviewRow) => 
      row && typeof row === 'object' && Object.keys(row).length > 1
    );

    if (filter !== 'all') {
      if (filter === 'anomalies') {
        filteredData = filteredData.filter((row: ClusterPreviewRow) => row.anomaly === 1);
      } else if (filter === 'normal') {
        filteredData = filteredData.filter((row: ClusterPreviewRow) => row.anomaly === 0 || row.anomaly === -1);
      } else if (filter.startsWith('cluster_')) {
        const clusterNum = parseInt(filter.replace('cluster_', ''));
        filteredData = filteredData.filter((row: ClusterPreviewRow) => row.cluster === clusterNum);
      }
    }

    // Calculate pagination
    const totalRows = filteredData.length;
    const totalPages = Math.ceil(totalRows / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    // Get cluster information for filter options
    const clusterNumbers = [...new Set(
      clusterPreview
        .filter((row: ClusterPreviewRow) => row && typeof row === 'object' && row.cluster !== undefined)
        .map((row: ClusterPreviewRow) => row.cluster as number)
    )].sort((a: number, b: number) => a - b);

    // Check for anomaly detection
    const hasAnomalies = clusterPreview.some((row: ClusterPreviewRow) => 
      row && typeof row === 'object' && row.anomaly !== undefined
    );

    return NextResponse.json({
      data: paginatedData,
      totalRows,
      totalPages,
      currentPage: page,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      columns,
      clusterNumbers,
      hasAnomalies,
      filter,
      limit
    });

  } catch (error) {
    console.error('Error fetching cluster preview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cluster preview data' },
      { status: 500 }
    );
  }
}
