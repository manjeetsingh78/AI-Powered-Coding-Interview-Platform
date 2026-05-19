#!/usr/bin/env python3
import sys
import xml.etree.ElementTree as ET
import json

path = sys.argv[1] if len(sys.argv) > 1 else 'backend/coverage.xml'
percent = 0.0
try:
    tree = ET.parse(path)
    root = tree.getroot()
    # Cobertura file has 'line-rate' attribute on root or coverage tag
    lr = root.attrib.get('line-rate') or root.find('.').attrib.get('line-rate')
    if lr:
        percent = float(lr) * 100.0
except Exception:
    percent = 0.0

print(json.dumps({'coverage_percent': round(percent, 2)}))
