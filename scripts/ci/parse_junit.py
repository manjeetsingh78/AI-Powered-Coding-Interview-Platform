#!/usr/bin/env python3
import sys
import xml.etree.ElementTree as ET
import json

path = sys.argv[1] if len(sys.argv) > 1 else 'backend/junit.xml'
try:
    tree = ET.parse(path)
    root = tree.getroot()
    tests = int(root.attrib.get('tests', 0))
    failures = int(root.attrib.get('failures', 0))
    errors = int(root.attrib.get('errors', 0))
    skipped = int(root.attrib.get('skipped', 0))
except Exception:
    tests = failures = errors = skipped = 0

print(json.dumps({'tests': tests, 'failures': failures, 'errors': errors, 'skipped': skipped}))
