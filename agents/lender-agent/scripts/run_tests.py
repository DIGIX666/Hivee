#!/usr/bin/env python3
"""
Test runner script to execute all tests with proper Python path setup
"""

import sys
import os
import subprocess

# Add the project root to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
tests_dir = os.path.join(project_root, 'tests')

# Set PYTHONPATH to include project root
env = os.environ.copy()
env['PYTHONPATH'] = project_root + ':' + env.get('PYTHONPATH', '')

# Run pytest
cmd = ['python', '-m', 'pytest', tests_dir, '-v']
result = subprocess.run(cmd, env=env, cwd=project_root)
sys.exit(result.returncode)