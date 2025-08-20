
import subprocess
import os
import time
import signal
import sys
import codecs
import tkinter as tk
from tkinter import ttk
import threading
import webbrowser
from datetime import datetime

print(">> Data-VizAI Combined Services Launcher")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
print(f">> Working directory: {BASE_DIR}")
print(">> Starting All Flask Services...")
print("=" * 60)

# Store subprocesses for cleanup
processes = []

try:
    def launch_service(name, rel_path, port):
        full_path = os.path.join(BASE_DIR, rel_path)
        service_dir = os.path.dirname(full_path)
        service_file = os.path.basename(full_path)
        
        print(f">> {name} starting on port {port}...")
        print(f"   Directory: {service_dir}")
        print(f"   File: {service_file}")

        # Set environment variables for UTF-8 encoding
        env = os.environ.copy()
        env['PYTHONIOENCODING'] = 'utf-8'
        env['PYTHONLEGACYWINDOWSSTDIO'] = '0'
        env['PYTHONUTF8'] = '1'

        # Launch service in background with correct working directory and UTF-8 support
        process = subprocess.Popen(
            ["python", "-u", service_file],  # -u for unbuffered output
            cwd=service_dir,  # Set working directory to service directory
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            encoding='utf-8',
            env=env  # Pass UTF-8 environment variables
        )
        processes.append((name, process))

        # Wait briefly and check if still running
        time.sleep(3)  # Increased wait time for startup
        if process.poll() is None:
            print(f">> {name}: HEALTHY (running)")
        else:
            out, err = process.communicate()
            print(f">> {name} failed to start.")
            print("---- STDOUT ----")
            print(out if out else "No stdout")
            print("---- STDERR ----")
            print(err if err else "No stderr")

    # Launch each service
    launch_service("ML Backend", "ml_backend/app.py", 5000)
    launch_service("Data Quality", "metric-quality/app.py", 1289)
    launch_service("Data Preprocessing", "pre-processing/preprocessing_api.py", 1290)
    launch_service("GANs Service", "gans/gans.py", 4321)

    print("=" * 60)
    print(">> SERVICE ENDPOINTS:")
    print(">> ML Backend:          http://localhost:5000")
    print(">> Data Quality:        http://localhost:1289")
    print(">> Data Preprocessing:  http://localhost:1290")
    print(">> GANs Service:        http://localhost:4321")
    print("=" * 60)
    print(">> Press Ctrl+C to stop all services")

    # Keep script running
    while True:
        time.sleep(1)

except KeyboardInterrupt:
    print("\n>> Stopping all services...")
    for name, process in processes:
        process.terminate()
        print(f">> {name} terminated.")
    sys.exit(0)