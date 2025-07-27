#!/usr/bin/env python3
"""
Combined Flask Services Runner (Subprocess Version)
This script runs all three Flask applications simultaneously using subprocesses:
1. ML Backend (port 5000)
2. Data Quality Metrics (port 1289) 
3. Data Preprocessing (port 1290)
"""

import os
import sys
import subprocess
import time
import signal
import logging
from pathlib import Path

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ServiceManager:
    def __init__(self):
        self.processes = []
        self.root_dir = Path(__file__).parent
        
    def start_service(self, name, script_path, port, cwd=None):
        """Start a Flask service in a subprocess"""
        try:
            if cwd is None:
                cwd = script_path.parent
                
            logger.info(f"🚀 Starting {name} on port {port}...")
            logger.info(f"📁 Working directory: {cwd}")
            logger.info(f"🐍 Script: {script_path}")
            
            # Use Python executable from current environment
            python_exe = sys.executable
            
            # Start the process
            process = subprocess.Popen(
                [python_exe, str(script_path)],
                cwd=str(cwd),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                universal_newlines=True,
                bufsize=1
            )
            
            self.processes.append({
                'name': name,
                'process': process,
                'port': port,
                'script': script_path
            })
            
            logger.info(f"✅ {name} started with PID: {process.pid}")
            return process
            
        except Exception as e:
            logger.error(f"❌ Failed to start {name}: {e}")
            return None
    
    def check_service_health(self, name, port, max_retries=10):
        """Check if a service is responding"""
        import requests
        
        url = f"http://localhost:{port}"
        if name == "ML Backend":
            url += "/health"
        
        for attempt in range(max_retries):
            try:
                response = requests.get(url, timeout=2)
                if response.status_code == 200:
                    logger.info(f"✅ {name} is healthy on port {port}")
                    return True
            except:
                pass
            time.sleep(1)
        
        logger.warning(f"⚠️  {name} health check failed after {max_retries} attempts")
        return False
    
    def monitor_processes(self):
        """Monitor all running processes"""
        while True:
            try:
                for service in self.processes:
                    if service['process'].poll() is not None:
                        logger.error(f"❌ {service['name']} has stopped unexpectedly!")
                        # Get the error output
                        stdout, stderr = service['process'].communicate()
                        if stderr:
                            logger.error(f"Error output: {stderr}")
                
                time.sleep(5)  # Check every 5 seconds
                
            except KeyboardInterrupt:
                break
    
    def stop_all_services(self):
        """Stop all running services"""
        logger.info("🛑 Stopping all services...")
        
        for service in self.processes:
            try:
                logger.info(f"🔄 Stopping {service['name']} (PID: {service['process'].pid})")
                service['process'].terminate()
                
                # Wait for graceful shutdown
                try:
                    service['process'].wait(timeout=5)
                except subprocess.TimeoutExpired:
                    logger.warning(f"⚠️  Force killing {service['name']}")
                    service['process'].kill()
                    
                logger.info(f"✅ {service['name']} stopped")
                
            except Exception as e:
                logger.error(f"❌ Error stopping {service['name']}: {e}")
    
    def start_all_services(self):
        """Start all three Flask services"""
        services_config = [
            {
                'name': 'ML Backend',
                'script': self.root_dir / 'src' / 'python-codes' / 'ml_backend' / 'app.py',
                'port': 5000
            },
            {
                'name': 'Data Quality Metrics',
                'script': self.root_dir / 'src' / 'python-codes' / 'metric-quality' / 'app.py',
                'port': 1289
            },
            {
                'name': 'Data Preprocessing',
                'script': self.root_dir / 'src' / 'python-codes' / 'pre-processing' / 'preprocessing_api.py',
                'port': 1290
            }
        ]
        
        # Start all services
        for config in services_config:
            if not config['script'].exists():
                logger.error(f"❌ Script not found: {config['script']}")
                continue
                
            process = self.start_service(
                config['name'],
                config['script'],
                config['port']
            )
            
            if process:
                time.sleep(3)  # Wait between starts
        
        # Wait a bit for services to initialize
        logger.info("⏳ Waiting for services to initialize...")
        time.sleep(5)
        
        # Check health of all services
        logger.info("\n" + "="*60)
        logger.info("🏥 HEALTH CHECK RESULTS")
        logger.info("="*60)
        
        for config in services_config:
            self.check_service_health(config['name'], config['port'])
        
        logger.info("="*60)
        logger.info("🌐 SERVICE ENDPOINTS:")
        logger.info("📊 ML Backend:          http://localhost:5000")
        logger.info("🔍 Data Quality:        http://localhost:1289") 
        logger.info("🔧 Data Preprocessing:  http://localhost:1290")
        logger.info("="*60)
        logger.info("💡 Press Ctrl+C to stop all services")
        
        # Monitor processes
        try:
            self.monitor_processes()
        except KeyboardInterrupt:
            pass
        finally:
            self.stop_all_services()

def main():
    """Main function"""
    try:
        # Check if we're in the right directory
        root_dir = Path(__file__).parent
        required_dirs = ['src', 'src/python-codes']
        
        for dir_name in required_dirs:
            if not (root_dir / dir_name).exists():
                logger.error(f"❌ Directory not found: {dir_name}")
                logger.error("Please run this script from the Data-VizAI-master root directory")
                sys.exit(1)
        
        logger.info("🎯 Data-VizAI Combined Services Launcher (Subprocess Version)")
        logger.info(f"📍 Working directory: {root_dir}")
        
        # Create service manager and start services
        manager = ServiceManager()
        
        # Set up signal handlers for graceful shutdown
        def signal_handler(signum, frame):
            logger.info(f"\n🛑 Received signal {signum}")
            manager.stop_all_services()
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        
        # Start all services
        manager.start_all_services()
        
    except Exception as e:
        logger.error(f"❌ Failed to start services: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
