#!/usr/bin/env python3
import sys
import json

path = sys.argv[1] if len(sys.argv) > 1 else 'snyk_report.json'
counts = {}
try:
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    vulns = data.get('vulnerabilities') or []
    for v in vulns:
        sev = v.get('severity', 'unknown')
        counts[sev] = counts.get(sev, 0) + 1
except Exception:
    pass

print(json.dumps(counts))
