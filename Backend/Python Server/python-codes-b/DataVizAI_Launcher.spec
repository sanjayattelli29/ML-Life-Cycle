# -*- mode: python ; coding: utf-8 -*-

import os
import sys
from PyInstaller.utils.hooks import collect_submodules, collect_data_files

# Collect all necessary hidden imports
hiddenimports = [
    # Flask and web framework
    'flask.app', 'flask.templating', 'flask.json', 'werkzeug.serving',
    'werkzeug.middleware.dispatcher', 'werkzeug.exceptions',
    
    # ML Backend modules
    'ml_backend.models.random_forest',
    'ml_backend.models.xgboost_model', 
    'ml_backend.models.logistic_regression',
    'ml_backend.models.linear_regression',
    'ml_backend.models.svm',
    'ml_backend.models.kmeans',
    'ml_backend.models.dbscan',
    'ml_backend.models.isolation_forest',
    'ml_backend.utils.metrics',
    'ml_backend.utils.preprocessing',
    'ml_backend.utils.save_to_cloudflare',
    
    # ML libraries
    'sklearn.ensemble', 'sklearn.linear_model', 'sklearn.svm',
    'sklearn.cluster', 'sklearn.preprocessing', 'sklearn.metrics',
    'sklearn.model_selection', 'sklearn.tree', 'sklearn.utils',
    'xgboost', 'joblib', 'pandas', 'numpy', 'scipy',
    
    # Cloud storage
    'boto3', 'botocore', 'botocore.client', 'botocore.exceptions',
    
    # Environment
    'dotenv',
    
    # JSON and data
    'json', 'uuid', 'datetime', 'traceback', 'tempfile', 'zipfile',
    
    # Threading
    'threading', 'multiprocessing',
]

# Add GANs imports if available
try:
    hiddenimports.extend([
        'sdv', 'ctgan', 'copulas', 'sdmetrics',
        'sdv.single_table', 'sdv.metadata',
    ])
except:
    pass

# Collect data files
datas = [
    ('ml_backend', 'ml_backend'),
    ('metric-quality', 'metric-quality'),
    ('pre-processing', 'pre-processing'),
    ('gans', 'gans'),
]

# Exclude unnecessary modules to reduce size
excludes = [
    'matplotlib.pyplot', 'matplotlib.figure',
    'IPython', 'jupyter', 'notebook', 'PyQt5', 'PyQt6', 'PySide2', 'PySide6',
]

block_cipher = None

a = Analysis(
    ['service_manager_gui.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=excludes,
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='DataVizAI_Launcher',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,  # Keep console=True to show important messages
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='icon.ico' if os.path.exists('icon.ico') else None,
)