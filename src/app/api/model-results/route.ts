import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get('modelId');

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

    // Extract key information for the UI
    const modelResults = {
      // Basic model info
      model_id: metadata.model_id,
      model_name: metadata.model_name,
      task_type: metadata.task_type,
      model_variant: metadata.model_variant,
      created_at: metadata.created_at,
      
      // Features and target
      features: metadata.features || [],
      feature_columns: metadata.features || [],
      target: metadata.target,
      
      // Hyperparameters - both original and processed
      hyperparams: metadata.hyperparams || {},
      original_hyperparams: metadata.original_hyperparams || {},
      
      // Training parameters
      training_time: metadata.metrics?.training_time || null,
      
      // Data shape information
      data_shape: {
        rows: metadata.metrics?.total_samples || null,
        columns: metadata.features?.length || null
      },
      
      // Complete metrics object with all available data
      metrics: {
        ...metadata.metrics,
        // Ensure we capture all metric fields dynamically
        ...(metadata.metrics?.silhouette_score !== undefined && { silhouette_score: metadata.metrics.silhouette_score }),
        ...(metadata.metrics?.davies_bouldin_score !== undefined && { davies_bouldin_score: metadata.metrics.davies_bouldin_score }),
        ...(metadata.metrics?.inertia !== undefined && { inertia: metadata.metrics.inertia }),
        ...(metadata.metrics?.n_iter !== undefined && { n_iter: metadata.metrics.n_iter }),
        ...(metadata.metrics?.feature_count !== undefined && { feature_count: metadata.metrics.feature_count }),
        ...(metadata.metrics?.total_samples !== undefined && { total_samples: metadata.metrics.total_samples }),
        
        // Cluster-specific metrics
        ...(metadata.metrics?.cluster_centers && { cluster_centers: metadata.metrics.cluster_centers }),
        ...(metadata.metrics?.cluster_wcss && { cluster_wcss: metadata.metrics.cluster_wcss }),
        ...(metadata.metrics?.cluster_sizes && { cluster_sizes: metadata.metrics.cluster_sizes }),
        ...(metadata.metrics?.num_clusters !== undefined && { num_clusters: metadata.metrics.num_clusters }),
        
        // Hyperparameters from metrics (detailed model config)
        ...(metadata.metrics?.hyperparameters && { hyperparameters: metadata.metrics.hyperparameters }),
        
        // Performance and quality metrics
        ...(metadata.metrics?.performance_summary && { performance_summary: metadata.metrics.performance_summary }),
        ...(metadata.metrics?.cluster_statistics && { cluster_statistics: metadata.metrics.cluster_statistics }),
        
        // Preprocessing information
        ...(metadata.metrics?.preprocessing && { preprocessing: metadata.metrics.preprocessing })
      },
      
      // Clustering specific data
      ...(metadata.task_type === 'clustering' && {
        cluster_labels: metadata.metrics?.cluster_preview?.map((item: { cluster: number }) => item.cluster) || [],
        n_clusters: metadata.metrics?.num_clusters || metadata.hyperparams?.n_clusters,
        silhouette_score: metadata.metrics?.silhouette_score,
        davies_bouldin_score: metadata.metrics?.davies_bouldin_score,
        cluster_sizes: metadata.metrics?.cluster_sizes,
        cluster_centers: metadata.metrics?.cluster_centers,
        cluster_wcss: metadata.metrics?.cluster_wcss,
        inertia: metadata.metrics?.inertia,
        cluster_preview: metadata.metrics?.cluster_preview || [],
        cluster_statistics: metadata.metrics?.cluster_statistics || {}
      }),
      
      // Anomaly detection specific data
      ...(metadata.task_type === 'anomaly_detection' && {
        anomaly_labels: metadata.metrics?.anomaly_preview?.map((item: { anomaly_label: number }) => item.anomaly_label) || [],
        anomalies_detected: metadata.metrics?.anomalies_detected,
        anomaly_detection_rate: metadata.metrics?.anomaly_detection_rate,
        contamination: metadata.hyperparams?.contamination,
        anomaly_preview: metadata.metrics?.anomaly_preview || []
      }),
      
      // Performance summary
      performance_summary: metadata.metrics?.performance_summary || null,
      
      // Raw metadata for advanced use - includes everything
      raw_metadata: metadata
    };

    return NextResponse.json(modelResults);
    
  } catch (error) {
    console.error('Error fetching model results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch model results' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { modelId, analysisType } = body;

    if (!modelId) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      );
    }

    // This endpoint can be used for additional analysis requests
    // For now, just return the same data as GET
    const metadataPath = path.join(process.cwd(), 'ml_backend', 'saved_models', `${modelId}_metadata.json`);
    
    if (!fs.existsSync(metadataPath)) {
      return NextResponse.json(
        { error: 'Model metadata not found' },
        { status: 404 }
      );
    }

    const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
    const metadata = JSON.parse(metadataContent);

    return NextResponse.json({
      success: true,
      data: metadata,
      analysisType: analysisType || 'full'
    });
    
  } catch (error) {
    console.error('Error in POST model-results:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
