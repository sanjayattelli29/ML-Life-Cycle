import boto3
import os
import json
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_r2_client():
    """
    Initialize and return Cloudflare R2 client
    You'll need to set these environment variables:
    - CLOUDFLARE_R2_ACCESS_KEY
    - CLOUDFLARE_R2_SECRET_KEY
    - CLOUDFLARE_R2_ENDPOINT
    - CLOUDFLARE_R2_BUCKET_NAME
    """
    try:
        client = boto3.client(
            's3',
            endpoint_url=os.getenv('CLOUDFLARE_R2_ENDPOINT'),
            aws_access_key_id=os.getenv('CLOUDFLARE_R2_ACCESS_KEY'),
            aws_secret_access_key=os.getenv('CLOUDFLARE_R2_SECRET_KEY'),
            region_name='auto'  # Cloudflare R2 uses 'auto'
        )
        return client
    except Exception as e:
        logger.error(f"Failed to initialize R2 client: {e}")
        return None

def upload_to_cloudflare(local_file_path, remote_file_path=None):
    """
    Upload a file to Cloudflare R2
    
    Args:
        local_file_path: Path to the local file to upload
        remote_file_path: Path in the bucket (optional, defaults to filename)
    
    Returns:
        Dictionary with upload status and URL
    """
    try:
        # Check if file exists
        if not os.path.exists(local_file_path):
            return {
                "status": "error",
                "message": f"File not found: {local_file_path}"
            }
        
        # Get R2 client
        client = get_r2_client()
        if not client:
            return {
                "status": "error",
                "message": "Failed to initialize R2 client. Check your credentials."
            }
        
        # Get bucket name
        bucket_name = os.getenv('CLOUDFLARE_R2_BUCKET_NAME')
        if not bucket_name:
            return {
                "status": "error",
                "message": "CLOUDFLARE_R2_BUCKET_NAME environment variable not set"
            }
        
        # Set remote file path
        if remote_file_path is None:
            remote_file_path = os.path.basename(local_file_path)
        
        # Upload file
        with open(local_file_path, 'rb') as file:
            client.upload_fileobj(
                file,
                bucket_name,
                remote_file_path,
                ExtraArgs={
                    'Metadata': {
                        'uploaded_at': datetime.now().isoformat(),
                        'original_name': os.path.basename(local_file_path)
                    }
                }
            )
        
        # Generate URL (you might need to adjust this based on your R2 setup)
        r2_domain = os.getenv('CLOUDFLARE_R2_PUBLIC_DOMAIN', f"{bucket_name}.r2.cloudflarestorage.com")
        file_url = f"https://{r2_domain}/{remote_file_path}"
        
        logger.info(f"Successfully uploaded {local_file_path} to {remote_file_path}")
        
        return {
            "status": "success",
            "url": file_url,
            "bucket": bucket_name,
            "key": remote_file_path,
            "uploaded_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        error_msg = f"Upload failed: {str(e)}"
        logger.error(error_msg)
        return {
            "status": "error",
            "message": error_msg
        }

def upload_model_with_metadata(model_id, model_path, metadata_path):
    """
    Upload both model file and metadata to Cloudflare R2
    
    Args:
        model_id: Unique model identifier
        model_path: Path to the model pickle file
        metadata_path: Path to the metadata JSON file
    
    Returns:
        Dictionary with upload results
    """
    results = {
        "model_id": model_id,
        "uploads": []
    }
    
    # Upload model file
    model_result = upload_to_cloudflare(
        model_path, 
        f"models/{model_id}.pkl"
    )
    results["uploads"].append({
        "file_type": "model",
        "result": model_result
    })
    
    # Upload metadata file
    metadata_result = upload_to_cloudflare(
        metadata_path, 
        f"models/{model_id}_metadata.json"
    )
    results["uploads"].append({
        "file_type": "metadata",
        "result": metadata_result
    })
    
    # Check if both uploads were successful
    all_successful = all(
        upload["result"]["status"] == "success" 
        for upload in results["uploads"]
    )
    
    results["overall_status"] = "success" if all_successful else "partial_failure"
    
    return results

def download_from_cloudflare(remote_file_path, local_file_path):
    """
    Download a file from Cloudflare R2
    
    Args:
        remote_file_path: Path in the bucket
        local_file_path: Local path to save the file
    
    Returns:
        Dictionary with download status
    """
    try:
        # Get R2 client
        client = get_r2_client()
        if not client:
            return {
                "status": "error",
                "message": "Failed to initialize R2 client"
            }
        
        bucket_name = os.getenv('CLOUDFLARE_R2_BUCKET_NAME')
        
        # Download file
        client.download_file(bucket_name, remote_file_path, local_file_path)
        
        logger.info(f"Successfully downloaded {remote_file_path} to {local_file_path}")
        
        return {
            "status": "success",
            "local_path": local_file_path,
            "remote_path": remote_file_path
        }
        
    except Exception as e:
        error_msg = f"Download failed: {str(e)}"
        logger.error(error_msg)
        return {
            "status": "error",
            "message": error_msg
        }

def list_models_in_cloud():
    """
    List all models stored in Cloudflare R2
    
    Returns:
        List of model information
    """
    try:
        client = get_r2_client()
        if not client:
            return []
        
        bucket_name = os.getenv('CLOUDFLARE_R2_BUCKET_NAME')
        
        # List objects with 'models/' prefix
        response = client.list_objects_v2(
            Bucket=bucket_name,
            Prefix='models/'
        )
        
        models = []
        model_files = {}
        
        # Group files by model ID
        for obj in response.get('Contents', []):
            key = obj['Key']
            if key.endswith('.pkl'):
                model_id = os.path.basename(key).replace('.pkl', '')
                model_files[model_id] = model_files.get(model_id, {})
                model_files[model_id]['model_file'] = key
                model_files[model_id]['last_modified'] = obj['LastModified'].isoformat()
                model_files[model_id]['size'] = obj['Size']
            elif key.endswith('_metadata.json'):
                model_id = os.path.basename(key).replace('_metadata.json', '')
                model_files[model_id] = model_files.get(model_id, {})
                model_files[model_id]['metadata_file'] = key
        
        # Convert to list format
        for model_id, files in model_files.items():
            if 'model_file' in files:  # Only include if model file exists
                models.append({
                    'model_id': model_id,
                    'model_file': files['model_file'],
                    'metadata_file': files.get('metadata_file'),
                    'last_modified': files.get('last_modified'),
                    'size_bytes': files.get('size')
                })
        
        return models
        
    except Exception as e:
        logger.error(f"Failed to list models: {e}")
        return []

# Fallback function for local development (when R2 is not configured)
def save_locally(file_path, destination_folder="local_storage"):
    """
    Fallback function to save files locally when cloud storage is not available
    
    Args:
        file_path: Path to the file to save
        destination_folder: Local folder to save to
    
    Returns:
        Dictionary with save status
    """
    try:
        os.makedirs(destination_folder, exist_ok=True)
        
        filename = os.path.basename(file_path)
        destination_path = os.path.join(destination_folder, filename)
        
        # Copy file
        import shutil
        shutil.copy2(file_path, destination_path)
        
        return {
            "status": "success",
            "url": f"file://{os.path.abspath(destination_path)}",
            "local_path": destination_path,
            "message": "Saved locally (cloud storage not configured)"
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": f"Local save failed: {str(e)}"
        }
