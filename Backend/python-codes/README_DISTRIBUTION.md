# DataVizAI Executable Distribution

## Overview
This package contains a single executable file that runs all DataVizAI services on any Windows computer without requiring Python installation or code setup.

## Quick Start

### Option 1: Using the Batch Launcher (Recommended)
1. Double-click `launch_datavizai.bat`
2. Wait for all services to start
3. Open your web browser and use your DataVizAI frontend

### Option 2: Direct Execution
1. Double-click `DataVizAI_Launcher.exe`
2. A console window will open showing service startup
3. Wait for all services to be marked as "HEALTHY (running)"

## Service Endpoints
Once started, the following services will be available:

- **ML Backend**: http://localhost:5000
  - Model training and prediction
  - Model management
  - Health check: http://localhost:5000/health

- **Data Quality**: http://localhost:1289
  - Data quality analysis
  - Dataset validation

- **Data Preprocessing**: http://localhost:1290
  - Data cleaning and transformation
  - Feature engineering

- **GANs Service**: http://localhost:4321
  - Synthetic data generation
  - GAN model training

## System Requirements

### Minimum Requirements
- Windows 10 or Windows 11 (64-bit)
- 4 GB RAM (8 GB recommended)
- 2 GB free disk space
- Available ports: 5000, 1289, 1290, 4321

### Recommended Requirements
- Windows 10/11 (64-bit)
- 8 GB RAM or more
- 4 GB free disk space
- Fast SSD storage
- Multiple CPU cores

## Usage Instructions

### Starting Services
1. Run the launcher (batch file or exe)
2. Wait for all services to show "HEALTHY (running)" status
3. Services are now ready to accept requests

### Stopping Services
- Press `Ctrl+C` in the console window
- Or simply close the console window

### Troubleshooting

#### Port Already in Use
If you see port errors, ensure these ports are free:
- 5000, 1289, 1290, 4321

You can check with: `netstat -an | findstr :5000`

#### Service Won't Start
1. Run as Administrator if needed
2. Check Windows Firewall settings
3. Ensure antivirus isn't blocking the executable

#### Performance Issues
1. Close other applications to free memory
2. Ensure adequate free disk space
3. Run on SSD if possible

### Firewall Configuration
Windows may ask for firewall permissions. Click "Allow" for:
- DataVizAI_Launcher.exe
- Python processes (if prompted)

## File Structure
```
dist/
├── DataVizAI_Launcher.exe    # Main executable
├── launch_datavizai.bat      # Launcher script
└── README.md                 # This file
```

## Features Included

### Machine Learning Backend
- Random Forest, XGBoost, Logistic Regression
- Linear Regression, SVM, K-Means, DBSCAN
- Isolation Forest for anomaly detection
- Model saving and loading
- Cloud storage integration

### Data Quality Service
- Data validation and quality metrics
- Missing value analysis
- Data type detection
- Statistical summaries

### Data Preprocessing
- Data cleaning and transformation
- Feature scaling and encoding
- Missing value imputation
- Data format conversion

### GANs Service
- CTGAN for tabular data synthesis
- Data generation and augmentation
- Quality assessment metrics
- Synthetic data validation

## Support and Updates

### For Issues
1. Check the console output for error messages
2. Verify system requirements
3. Try running as Administrator
4. Check firewall and antivirus settings

### Performance Tips
1. Use on systems with 8GB+ RAM for best performance
2. Close unnecessary applications
3. Ensure stable internet connection for cloud features
4. Use SSD storage when possible

## Technical Notes

### Built With
- PyInstaller for executable packaging
- Flask for web services
- scikit-learn, XGBoost for ML
- pandas, numpy for data processing
- boto3 for cloud storage

### Security
- All services run locally on your machine
- No data is sent externally unless explicitly using cloud features
- Cloud features require your own API keys

---

**DataVizAI - Making AI Accessible**
Version: 1.0 | Built: 2025
