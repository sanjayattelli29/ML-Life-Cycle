#!/usr/bin/env python3
"""
Combined Flask Services Runner
This script runs all three Flask applications simultaneously:
1. ML Backend (port 5000)
2. Data Quality Metrics (port 1289) 
3. Data Preprocessing (port 1290)
"""

import os
import sys
import threading
import time
from flask import Flask
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def run_ml_backend():
    """Run the ML Backend service on port 5000"""
    try:
        logger.info("🚀 Starting ML Backend service on port 5000...")
        
        # Change to the ml_backend directory
        ml_backend_path = os.path.join(os.path.dirname(__file__), 'src', 'python-codes', 'ml_backend')
        os.chdir(ml_backend_path)
        
        # Add the directory to Python path
        sys.path.insert(0, ml_backend_path)
        
        # Import and run the ML backend app
        from app import app as ml_app
        ml_app.run(debug=False, host='0.0.0.0', port=5000, use_reloader=False)
        
    except Exception as e:
        logger.error(f"❌ Failed to start ML Backend: {e}")

def run_data_quality():
    """Run the Data Quality Metrics service on port 1289"""
    try:
        logger.info("🔍 Starting Data Quality Metrics service on port 1289...")
        
        # Change to the metric-quality directory
        quality_path = os.path.join(os.path.dirname(__file__), 'src', 'python-codes', 'metric-quality')
        original_cwd = os.getcwd()
        os.chdir(quality_path)
        
        # Add the directory to Python path
        sys.path.insert(0, quality_path)
        
        # Import and run the quality metrics app
        import importlib.util
        spec = importlib.util.spec_from_file_location("quality_app", os.path.join(quality_path, "app.py"))
        quality_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(quality_module)
        
        quality_app = quality_module.app
        quality_app.run(debug=False, host='0.0.0.0', port=1289, use_reloader=False)
        
    except Exception as e:
        logger.error(f"❌ Failed to start Data Quality service: {e}")
    finally:
        os.chdir(original_cwd)

def run_preprocessing():
    """Run the Data Preprocessing service on port 1290"""
    try:
        logger.info("🔧 Starting Data Preprocessing service on port 1290...")
        
        # Change to the pre-processing directory
        preprocessing_path = os.path.join(os.path.dirname(__file__), 'src', 'python-codes', 'pre-processing')
        original_cwd = os.getcwd()
        os.chdir(preprocessing_path)
        
        # Add the directory to Python path
        sys.path.insert(0, preprocessing_path)
        
        # Import and run the preprocessing app
        import importlib.util
        spec = importlib.util.spec_from_file_location("preprocessing_app", os.path.join(preprocessing_path, "preprocessing_api.py"))
        preprocessing_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(preprocessing_module)
        
        preprocessing_app = preprocessing_module.app
        preprocessing_app.run(debug=False, host='0.0.0.0', port=1290, use_reloader=False)
        
    except Exception as e:
        logger.error(f"❌ Failed to start Preprocessing service: {e}")
    finally:
        os.chdir(original_cwd)

def health_check():
    """Perform health checks on all services"""
    import requests
    import json
    
    services = [
        {"name": "ML Backend", "url": "http://localhost:5000/health"},
        {"name": "Data Quality", "url": "http://localhost:1289/"},
        {"name": "Data Preprocessing", "url": "http://localhost:1290/"}
    ]
    
    time.sleep(5)  # Wait for services to start
    
    logger.info("\n" + "="*60)
    logger.info("🏥 HEALTH CHECK RESULTS")
    logger.info("="*60)
    
    for service in services:
        try:
            response = requests.get(service["url"], timeout=5)
            if response.status_code == 200:
                logger.info(f"✅ {service['name']}: HEALTHY (Status: {response.status_code})")
            else:
                logger.warning(f"⚠️  {service['name']}: UNHEALTHY (Status: {response.status_code})")
        except Exception as e:
            logger.error(f"❌ {service['name']}: FAILED ({str(e)})")
    
    logger.info("="*60)
    logger.info("🌐 SERVICE ENDPOINTS:")
    logger.info("📊 ML Backend:          http://localhost:5000")
    logger.info("🔍 Data Quality:        http://localhost:1289") 
    logger.info("🔧 Data Preprocessing:  http://localhost:1290")
    logger.info("="*60)

def main():
    """Main function to start all services"""
    try:
        logger.info("🚀 Starting All Flask Services...")
        logger.info("="*60)
        
        # Create threads for each service
        threads = []
        
        # ML Backend thread
        ml_thread = threading.Thread(target=run_ml_backend, daemon=True)
        ml_thread.name = "ML-Backend-Thread"
        threads.append(ml_thread)
        
        # Data Quality thread  
        quality_thread = threading.Thread(target=run_data_quality, daemon=True)
        quality_thread.name = "Data-Quality-Thread"
        threads.append(quality_thread)
        
        # Data Preprocessing thread
        preprocessing_thread = threading.Thread(target=run_preprocessing, daemon=True)
        preprocessing_thread.name = "Data-Preprocessing-Thread"
        threads.append(preprocessing_thread)
        
        # Start all threads
        for thread in threads:
            thread.start()
            time.sleep(2)  # Stagger startup to avoid port conflicts
        
        # Start health check in a separate thread
        health_thread = threading.Thread(target=health_check, daemon=True)
        health_thread.start()
        
        logger.info("✅ All services started successfully!")
        logger.info("🔄 Services are running in background threads...")
        logger.info("💡 Press Ctrl+C to stop all services")
        
        # Keep the main thread alive
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("\n🛑 Shutdown signal received...")
            logger.info("🔄 Stopping all services...")
            sys.exit(0)
            
    except Exception as e:
        logger.error(f"❌ Failed to start services: {e}")
        sys.exit(1)

if __name__ == "__main__":
    # Set environment variables if needed
    os.environ.setdefault('FLASK_ENV', 'development')
    
    # Check if we're in the right directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    expected_files = ['src', 'package.json', 'README.md']
    
    if not all(os.path.exists(os.path.join(current_dir, f)) for f in expected_files):
        logger.error("❌ Please run this script from the Data-VizAI-master root directory")
        sys.exit(1)
    
    logger.info("🎯 Data-VizAI Combined Services Launcher")
    logger.info("📍 Working directory: " + current_dir)
    
    main()
