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

class ServiceLauncher(tk.Tk):
    def __init__(self):
        super().__init__()

        # Window setup
        self.title("DataVizAI Service Manager")
        self.geometry("600x500")
        self.configure(bg='#f0f0f0')
        
        # Center window on screen
        screen_width = self.winfo_screenwidth()
        screen_height = self.winfo_screenheight()
        x = (screen_width - 600) // 2
        y = (screen_height - 500) // 2
        self.geometry(f"600x500+{x}+{y}")

        # Style configuration
        style = ttk.Style()
        style.configure("Custom.TFrame", background='#f0f0f0')
        style.configure("Status.TLabel", background='#f0f0f0', font=('Arial', 10))
        style.configure("Header.TLabel", background='#f0f0f0', font=('Arial', 12, 'bold'))
        style.configure("Service.TLabel", background='#f0f0f0', font=('Arial', 9))

        # Main frame
        self.main_frame = ttk.Frame(self, style="Custom.TFrame", padding="20")
        self.main_frame.pack(fill=tk.BOTH, expand=True)

        # Header
        header = ttk.Label(
            self.main_frame,
            text="DataVizAI Service Manager",
            style="Header.TLabel"
        )
        header.pack(pady=(0, 20))

        # Progress frame
        self.progress_frame = ttk.Frame(self.main_frame, style="Custom.TFrame")
        self.progress_frame.pack(fill=tk.X, pady=(0, 20))

        self.progress_var = tk.DoubleVar()
        self.progress = ttk.Progressbar(
            self.progress_frame,
            variable=self.progress_var,
            maximum=100
        )
        self.progress.pack(fill=tk.X)

        self.status_label = ttk.Label(
            self.progress_frame,
            text="Starting backend services... Please wait...",
            style="Status.TLabel"
        )
        self.status_label.pack(pady=(5, 0))
        
        # Add a note about the console window
        self.console_note = ttk.Label(
            self.progress_frame,
            text="Note: Keep the console window open while using the application",
            style="Status.TLabel",
            foreground='#666666'
        )
        self.console_note.pack(pady=(2, 0))

        # Services frame
        self.services_frame = ttk.Frame(self.main_frame, style="Custom.TFrame")
        self.services_frame.pack(fill=tk.BOTH, expand=True)

        # Service status labels
        self.service_labels = {}
        self.services = {
            "ML Backend": {"port": 5000, "path": "ml_backend/app.py"},
            "Data Quality": {"port": 1289, "path": "metric-quality/app.py"},
            "Data Preprocessing": {"port": 1290, "path": "pre-processing/preprocessing_api.py"},
            "GANs Service": {"port": 4321, "path": "gans/gans.py"}
        }

        for service in self.services:
            frame = ttk.Frame(self.services_frame, style="Custom.TFrame")
            frame.pack(fill=tk.X, pady=5)
            
            status_dot = tk.Canvas(frame, width=10, height=10, bg='#f0f0f0', highlightthickness=0)
            status_dot.pack(side=tk.LEFT, padx=(0, 5))
            status_dot.create_oval(2, 2, 8, 8, fill='gray')
            
            label = ttk.Label(
                frame,
                text=f"{service} (Port: {self.services[service]['port']})",
                style="Service.TLabel"
            )
            label.pack(side=tk.LEFT)
            
            self.service_labels[service] = {
                "label": label,
                "dot": status_dot,
                "process": None
            }

        # Control buttons frame
        self.button_frame = ttk.Frame(self.main_frame, style="Custom.TFrame")
        self.button_frame.pack(fill=tk.X, pady=(20, 0))

        self.open_dashboard_btn = ttk.Button(
            self.button_frame,
            text="Open Dashboard",
            command=self.open_dashboard,
            state=tk.DISABLED
        )
        self.open_dashboard_btn.pack(side=tk.LEFT, padx=5)

        self.stop_btn = ttk.Button(
            self.button_frame,
            text="Stop All Services",
            command=self.stop_services,
            state=tk.DISABLED
        )
        self.stop_btn.pack(side=tk.RIGHT, padx=5)

        # Start services in a separate thread
        self.processes = []
        threading.Thread(target=self.start_services, daemon=True).start()

    def update_service_status(self, service, status, color):
        """Update the status dot and label for a service"""
        self.service_labels[service]["dot"].create_oval(2, 2, 8, 8, fill=color)
        self.service_labels[service]["label"].configure(
            text=f"{service} (Port: {self.services[service]['port']}) - {status}"
        )

    def start_services(self):
        """Start all services in sequence"""
        base_dir = os.path.dirname(os.path.abspath(__file__))
        total_services = len(self.services)
        progress_step = 100 / total_services

        for i, (service_name, service_info) in enumerate(self.services.items(), 1):
            self.status_label.configure(text=f"Starting {service_name}...")
            self.update_service_status(service_name, "Starting...", "yellow")

            try:
                full_path = os.path.join(base_dir, service_info["path"])
                service_dir = os.path.dirname(full_path)
                service_file = os.path.basename(full_path)

                env = os.environ.copy()
                env['PYTHONIOENCODING'] = 'utf-8'
                env['PYTHONLEGACYWINDOWSSTDIO'] = '0'
                env['PYTHONUTF8'] = '1'

                process = subprocess.Popen(
                    ["python", "-u", service_file],
                    cwd=service_dir,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    encoding='utf-8',
                    env=env
                )

                self.service_labels[service_name]["process"] = process
                self.processes.append((service_name, process))

                # Wait briefly and check if still running
                time.sleep(2)
                if process.poll() is None:
                    self.update_service_status(service_name, "HEALTHY", "green")
                else:
                    self.update_service_status(service_name, "FAILED", "red")

            except Exception as e:
                self.update_service_status(service_name, f"ERROR: {str(e)}", "red")

            self.progress_var.set(i * progress_step)

        all_healthy = all(
            process.poll() is None
            for _, process in self.processes
        )

        if all_healthy:
            self.status_label.configure(
                text="All services are running. You can now access the endpoints."
            )
            self.open_dashboard_btn.configure(state=tk.NORMAL)
            self.stop_btn.configure(state=tk.NORMAL)
        else:
            self.status_label.configure(
                text="Some services failed to start. Check the status above."
            )
            self.stop_btn.configure(state=tk.NORMAL)

    def open_dashboard(self):
        """Open the ML Backend endpoint in the default browser"""
        webbrowser.open(f"http://localhost:5000")

    def stop_services(self):
        """Stop all running services"""
        self.status_label.configure(text="Stopping all services...")
        for service_name, process in self.processes:
            try:
                process.terminate()
                self.update_service_status(service_name, "Stopped", "gray")
            except:
                self.update_service_status(service_name, "Force stopped", "red")

        self.status_label.configure(text="All services stopped.")
        self.open_dashboard_btn.configure(state=tk.DISABLED)
        self.stop_btn.configure(state=tk.DISABLED)
        self.quit()

    def on_closing(self):
        """Handle window close event"""
        self.stop_services()
        self.destroy()

if __name__ == "__main__":
    # Handle PyInstaller frozen app
    if getattr(sys, 'frozen', False):
        # If running as executable, set environment variables
        os.environ['PATH'] = f"{sys._MEIPASS};{os.environ['PATH']}"
        os.environ['PYTHONPATH'] = sys._MEIPASS
        
        # Redirect errors to a log file in case of crash
        log_dir = os.path.join(os.path.expanduser('~'), 'DataVizAI_Logs')
        os.makedirs(log_dir, exist_ok=True)
        log_file = os.path.join(log_dir, f"datavizai_error_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
        
        try:
            # Try to set up error logging
            error_log = open(log_file, 'w')
            sys.stderr = error_log
        except:
            pass
    
    # Set UTF-8 encoding for output
    if sys.stdout.encoding != 'utf-8':
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    if sys.stderr.encoding != 'utf-8':
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

    # Show friendly console message
    print("\n" + "=" * 60)
    print("🚀 Welcome to DataVizAI Service Manager!")
    print("=" * 60)
    print("\n⚙️  Initializing services... This may take a minute.")
    print("📝 Please keep this console window open while using the application.")
    print("\n💡 The graphical interface will appear shortly...")
    print("\n⚠️  NOTE: Do not close this window until you're done using the application.")
    print("=" * 60 + "\n")

    app = ServiceLauncher()
    app.protocol("WM_DELETE_WINDOW", app.on_closing)
    app.mainloop()
