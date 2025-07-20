const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.local' });

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function testConnection() {
  try {
    console.log('Testing R2 connection...');
    console.log('Endpoint:', process.env.R2_ENDPOINT);
    console.log('Bucket:', process.env.R2_BUCKET_NAME);
    console.log('Access Key ID:', process.env.R2_ACCESS_KEY_ID?.substring(0, 8) + '...');
    
    // First, list objects to see what's available
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      MaxKeys: 5
    });
    
    console.log('\nListing objects in bucket...');
    const listResponse = await s3Client.send(listCommand);
    
    if (listResponse.Contents && listResponse.Contents.length > 0) {
      console.log('✓ Found objects:');
      listResponse.Contents.forEach(obj => {
        console.log('  -', obj.Key);
      });
      
      // Try to get the first CSV file
      const csvFile = listResponse.Contents.find(obj => obj.Key?.endsWith('.csv'));
      if (csvFile) {
        console.log(`\nTesting download of: ${csvFile.Key}`);
        
        const getCommand = new GetObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: csvFile.Key,
        });
        
        const getResponse = await s3Client.send(getCommand);
        
        if (getResponse.Body) {
          const chunks = [];
          for await (const chunk of getResponse.Body) {
            chunks.push(Buffer.from(chunk));
          }
          const content = Buffer.concat(chunks).toString('utf-8');
          
          console.log('✓ Downloaded successfully!');
          console.log('Content length:', content.length);
          console.log('First 200 chars:', content.substring(0, 200));
        }
      } else {
        console.log('No CSV files found in bucket');
      }
    } else {
      console.log('No objects found in bucket');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.name === 'InvalidAccessKeyId') {
      console.error('❌ Invalid access key ID');
    } else if (error.name === 'SignatureDoesNotMatch') {
      console.error('❌ Invalid secret access key');
    } else if (error.name === 'AccessDenied') {
      console.error('❌ Access denied - check permissions');
    }
  }
}

testConnection();
