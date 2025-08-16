import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import Papa from 'papaparse';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file) {
      return NextResponse.json(
        { message: 'No file provided' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { message: 'User ID required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      return NextResponse.json(
        { message: 'Invalid file type. Please upload CSV or Excel files only.' },
        { status: 400 }
      );
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { message: 'File size exceeds 50MB limit' },
        { status: 400 }
      );
    }

    // Create temp directory structure
    const tempDir = path.join(process.cwd(), 'public', 'temp-datasets', userId);
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${safeFileName}`;
    const filePath = path.join(tempDir, fileName);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Parse CSV to get row and column count
    let rowCount = 0;
    let columnCount = 0;

    try {
      if (fileExtension === '.csv') {
        const fileContent = buffer.toString('utf-8');
        const parseResult = Papa.parse(fileContent, {
          header: true,
          skipEmptyLines: true
        });
        
        rowCount = parseResult.data.length;
        columnCount = parseResult.meta.fields?.length || 0;
      } else {
        // For Excel files, we'll set default values
        // You can add Excel parsing library here if needed
        rowCount = 0;
        columnCount = 0;
      }
    } catch (parseError) {
      console.warn('Error parsing file for stats:', parseError);
      // Continue without stats
    }

    // Generate public URL
    const publicUrl = `/temp-datasets/${userId}/${fileName}`;

    // Generate unique dataset ID
    const datasetId = `temp_${userId}_${timestamp}`;

    return NextResponse.json({
      success: true,
      id: datasetId,
      fileName: safeFileName,
      url: publicUrl,
      size: file.size,
      rowCount,
      columnCount,
      uploadedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { message: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Method not allowed' },
    { status: 405 }
  );
}
