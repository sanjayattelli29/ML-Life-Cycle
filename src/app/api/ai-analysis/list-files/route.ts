import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || 'demo_user';
    
    if (!session?.user?.id) {
      console.log('⚠️ No authenticated session found, using fallback mode');
    }

    const { searchParams } = new URL(request.url);
    const datasetId = searchParams.get('datasetId');
    const datasetName = searchParams.get('datasetName');

    console.log('🔍 Fetching AI analysis files from R2...');
    console.log('User ID:', userId);
    console.log('Dataset ID:', datasetId);
    console.log('Dataset Name:', datasetName);
    
    try {
      // Call the Python ML backend to list AI analysis files
      const backendUrl = process.env.ML_BACKEND_URL || 'http://localhost:5000';
      const listUrl = `${backendUrl}/list-ai-analysis-files?user_id=${userId}${datasetId ? `&dataset_id=${encodeURIComponent(datasetId)}` : ''}`;
      
      console.log('🔗 Backend list URL:', listUrl);
      
      const response = await fetch(listUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('❌ Failed to fetch AI analysis files from backend:', response.status);
        throw new Error(`Backend responded with status ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Successfully fetched AI analysis files from R2:', data);

      // Transform the data to match frontend expectations
      const files = data.files || [];
      const transformedFiles = files.map((file: {
        model_id: string;
        dataset_id?: string;
        dataset_name?: string;
        model_name?: string;
        saved_at?: string;
        file_path?: string;
        size_bytes?: number;
      }) => ({
        model_id: file.model_id,
        dataset_id: file.dataset_id || 'unknown',
        dataset_name: file.dataset_name || datasetName || 'Unknown',
        model_name: file.model_name || file.model_id,
        saved_at: file.saved_at || new Date().toISOString(),
        file_path: file.file_path,
        size: file.size_bytes || 0,
        download_url: `${backendUrl}/download-ai-analysis-file?user_id=${userId}&file_path=${encodeURIComponent(file.file_path || '')}`
      }));

      return NextResponse.json({
        files: transformedFiles,
        total_count: transformedFiles.length,
        user_id: userId,
        dataset_id: datasetId
      });

    } catch (backendError) {
      console.error('❌ Error connecting to ML backend:', backendError);
      
      // Fallback: Create mock AI analysis files based on known patterns
      // For Sales Data, show relevant model names
      const isTransformedSalesData = datasetName?.toLowerCase().includes('sales') || 
                                   datasetId?.toLowerCase().includes('sales') ||
                                   datasetName?.toLowerCase().includes('Sales Data');
      const isStudentData = datasetName?.toLowerCase().includes('student') || 
                           datasetId?.toLowerCase().includes('student');
      
      let fallbackFiles = [];
      
      if (isTransformedSalesData) {
        // Sales Data specific models
        fallbackFiles = [
          {
            model_id: '0667b45e-e466-4fb3-8b4c-010b4a3f5786',
            dataset_id: datasetId || 'unknown',
            dataset_name: datasetName || 'Sales Data Analysis',
            model_name: 'Sales Prediction Model (Random Forest)',
            saved_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
            file_path: `aianalysis/${userId}/${datasetId || 'unknown'}/0667b45e-e466-4fb3-8b4c-010b4a3f5786.json`,
            size: 18500,
            is_fallback: true,
            download_url: null
          },
          {
            model_id: '92501aa3-f1f9-4f20-99fd-01ccdecb9a99',
            dataset_id: datasetId || 'unknown',
            dataset_name: datasetName || 'Sales Data Analysis',
            model_name: 'Sales Revenue Forecasting (XGBoost)',
            saved_at: new Date('2025-01-27').toISOString(),
            file_path: `aianalysis/${userId}/${datasetId || 'unknown'}/92501aa3-f1f9-4f20-99fd-01ccdecb9a99.json`,
            size: 16200,
            is_fallback: true,
            download_url: null
          },
          {
            model_id: 'ca13b7e3-0552-4b8f-9056-424ba2a1470c',
            dataset_id: datasetId || 'unknown',
            dataset_name: datasetName || 'Sales Data Analysis',
            model_name: 'Customer Segment Analysis (Gradient Boosting)',
            saved_at: new Date('2025-01-26').toISOString(),
            file_path: `aianalysis/${userId}/${datasetId || 'unknown'}/ca13b7e3-0552-4b8f-9056-424ba2a1470c.json`,
            size: 17800,
            is_fallback: true,
            download_url: null
          }
        ];
      } else if (isStudentData) {
        // Student Data specific models
        fallbackFiles = [
          {
            model_id: '0667b45e-e466-4fb3-8b4c-010b4a3f5786',
            dataset_id: datasetId || 'unknown',
            dataset_name: datasetName || 'Student Placement Analysis',
            model_name: 'Placement Prediction Model (Random Forest)',
            saved_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            file_path: `aianalysis/${userId}/${datasetId || 'unknown'}/0667b45e-e466-4fb3-8b4c-010b4a3f5786.json`,
            size: 14200,
            is_fallback: true,
            download_url: null
          },
          {
            model_id: '92501aa3-f1f9-4f20-99fd-01ccdecb9a99',
            dataset_id: datasetId || 'unknown',
            dataset_name: datasetName || 'Student Placement Analysis',
            model_name: 'Academic Performance Analysis (SVM)',
            saved_at: new Date('2025-01-27').toISOString(),
            file_path: `aianalysis/${userId}/${datasetId || 'unknown'}/92501aa3-f1f9-4f20-99fd-01ccdecb9a99.json`,
            size: 13800,
            is_fallback: true,
            download_url: null
          }
        ];
      } else {
        // Generic models for other datasets
        fallbackFiles = [
          {
            model_id: '0667b45e-e466-4fb3-8b4c-010b4a3f5786',
            dataset_id: datasetId || 'unknown',
            dataset_name: datasetName || 'Analysis Ready Dataset',
            model_name: 'Recently Trained Model (AI Analysis)',
            saved_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            file_path: `aianalysis/${userId}/${datasetId || 'unknown'}/0667b45e-e466-4fb3-8b4c-010b4a3f5786.json`,
            size: 15000,
            is_fallback: true,
            download_url: null
          },
          {
            model_id: '92501aa3-f1f9-4f20-99fd-01ccdecb9a99',
            dataset_id: datasetId || 'unknown',
            dataset_name: datasetName || 'Analysis Ready Dataset',
            model_name: 'Machine Learning Model (Random Forest)',
            saved_at: new Date('2025-01-27').toISOString(),
            file_path: `aianalysis/${userId}/${datasetId || 'unknown'}/92501aa3-f1f9-4f20-99fd-01ccdecb9a99.json`,
            size: 15000,
            is_fallback: true,
            download_url: null
          }
        ];
      }

      console.log('🔄 Using fallback AI analysis files since backend is unavailable');
      console.log(`📊 Dataset type detected: ${isTransformedSalesData ? 'Sales Data' : isStudentData ? 'Student Data' : 'Generic'}`);

      return NextResponse.json({
        files: fallbackFiles,
        total_count: fallbackFiles.length,
        user_id: userId,
        dataset_id: datasetId,
        fallback_mode: true,
        error: 'Using fallback files - ML backend not available. Use "Save for AI Analysis" button on Model Training page to create new files.'
      });
    }

  } catch (error) {
    console.error('❌ Error in AI analysis files API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        files: []
      },
      { status: 500 }
    );
  }
}
