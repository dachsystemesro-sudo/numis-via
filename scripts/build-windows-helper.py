"""Build/check the public, photo-free Windows helper using only Python stdlib."""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parent.parent
PREFIX = 'NUMIS-VIA-pomocnik/'
ARTIFACT = ROOT / 'downloads/NUMIS-VIA-Windows-pomocnik.zip'

def sha(data):
    return hashlib.sha256(data).hexdigest()

def text_bytes(name):
    value = (ROOT / name).read_text(encoding='utf-8').replace('\r\n', '\n')
    return value.encode('utf-8')

def payload():
    pins = json.loads(text_bytes('windows-helper/supported-bases.json'))
    install = pins['install_files']
    files = {name: text_bytes(name) for name in install}
    files['SPUSTIT.mjs'] = text_bytes('windows-helper/SPUSTIT.mjs')
    files['SPUSTIT.cmd'] = text_bytes('windows-helper/SPUSTIT.cmd').replace(b'\n', b'\r\n')
    files['PRED-SPUSTENIM.txt'] = text_bytes('windows-helper/PRED-SPUSTENIM.txt') + ('\n'.join(install) + '\n').encode()
    manifest = {
        'schema_version': '2.0',
        'base_commit': pins['revisions']['pr25'],
        'audited_parent': pins['revisions']['pr26'],
        'helper_normalized_sha256': pins['hashes']['scripts/private-intake-storage.ps1']['pr25'],
        'runtime': [{'path': p, 'base_normalized_sha256': pins['hashes'][p]['pr25']} for p in pins['runtime_files']],
        'files': [{'path': p, 'sha256': sha(files[p]), 'normalized_sha256': sha(files[p]),
                   'base_normalized_sha256': pins['hashes'][p].get('pr25'),
                   'allowed_base_normalized_sha256': sorted(set(pins['hashes'][p].values()))} for p in install],
        'bundle_files': [{'path': p, 'sha256': sha(data)} for p, data in sorted(files.items())],
    }
    files['fix-manifest.json'] = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode()
    assert all(not p.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.heic')) for p in files)
    return {PREFIX + p: data for p, data in files.items()}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--write', action='store_true')
    group.add_argument('--check', action='store_true')
    parser.add_argument('--output', type=Path, default=ARTIFACT)
    args = parser.parse_args()
    expected = payload()
    if args.write:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(args.output, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
            for name, data in sorted(expected.items()):
                info = zipfile.ZipInfo(name, (1980, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o100644 << 16
                archive.writestr(info, data)
        Path(str(args.output) + '.sha256').write_text(sha(args.output.read_bytes()) + '  ' + args.output.name + '\n', encoding='utf-8')
    with zipfile.ZipFile(args.output) as archive:
        assert archive.testzip() is None, 'ZIP CRC failed'
        assert len(archive.namelist()) == len(expected), 'Unexpected or duplicate ZIP member'
        assert set(archive.namelist()) == set(expected), 'ZIP members differ from source allowlist'
        for name, data in expected.items():
            assert archive.read(name) == data, 'ZIP content differs from source: ' + name
    assert Path(str(args.output) + '.sha256').read_text().split()[0] == sha(args.output.read_bytes()), 'ZIP SHA-256 differs'
    print(json.dumps({'valid': True, 'files': len(expected), 'sha256': sha(args.output.read_bytes()), 'photos': 0}))

if __name__ == '__main__':
    main()
