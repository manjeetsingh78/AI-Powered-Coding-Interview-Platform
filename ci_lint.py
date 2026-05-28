import sys, traceback
p = r"C:\Users\Acer\Downloads\AI Powered Coding Interview Platform\.github\workflows\ci.yml"
try:
    import yaml
except ImportError:
    print("PYYAML_MISSING")
    sys.exit(2)
try:
    with open(p, encoding='utf-8') as f:
        yaml.safe_load(f)
    print("YAML_OK")
except Exception as e:
    print("YAML_ERROR")
    traceback.print_exc()
    sys.exit(3)
