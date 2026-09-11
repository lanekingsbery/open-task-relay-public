"""One exact publication manifest for fresh public trees and website source archives."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = 'publication/manifest.json'
# Ownership paths can themselves disclose a credential, even in exclusions.
VERIFICATION_NAME = re.compile(r'(?i)(?<![a-z0-9])[a-f0-9]{32,128}\.txt\b')
INDEXNOW_PATH = re.compile(r'^public/(?:\.well-known/)?indexnow(?:[./_-]|$)', re.I)
# Defense in depth, not a general-purpose secret scanner. Never print matches.
PRIVATE_PATH = re.compile(r'(^|/)(?:\.openai|\.secrets|\.wrangler|\.sites-runtime|node_modules|dist|outputs|work|backups?)(?:/|$)|(^|/)(?:\.env(?!\.example$)|\.dev\.vars)[^/]*(?:/|$)|\.(?:pem|key|sqlite3?|db|log|tar|gz|zip)$|^wrangler\.jsonc$')
CREDENTIALS = re.compile(
    r'-----BEGIN (?:RSA |EC |OPENSSH )?' + r'PRIVATE KEY-----'
    + r'|gh[pousr]' + r'_[A-Za-z0-9]{30,}|github' + r'_pat_[A-Za-z0-9_]{30,}'
    + r'|ac' + r'(?:r)?_[a-f0-9]{64}|sk' + r'-[A-Za-z0-9_-]{32,}|AKIA' + r'[A-Z0-9]{16}'
    + r'|https?://[^\s/@\x27"<>]+:[^\s/@\x27"<>]+@')
METADATA = re.compile(r'appg(?:prj|dom|dep|ver)_' + r'|git\.chatgpt-team\.site|openai-site-' + r'verification='
    + r'|(?:account_id|database_id)\s*["\x27]?\s*[:=]\s*["\x27][0-9a-f-]{32,36}["\x27]')
IMPORT = re.compile(r'(?:\bfrom\s*|\bimport\s*\(?\s*)[\x27"]([^\x27"]+)[\x27"]')
URL_FILE = re.compile(r'new URL\([\x27"]([^\x27"]+)[\x27"],\s*import\.meta\.url\)')
READ_FILE = re.compile(r'\breadFileSync\([\x27"]([^\x27"]+)[\x27"]')
CODE = {'.ts', '.tsx', '.js', '.mjs'}
GENERATED_DIRS = {'.git', 'node_modules', 'dist', '.wrangler', '.next', 'coverage', '__pycache__'}
GENERATED_FILES = {'tsconfig.tsbuildinfo', 'next-env.d.ts', 'public/source/opentaskrelay-source.tar', 'public/source/checksum.json'}


def fail(path, reason):
    if VERIFICATION_NAME.search(str(path)) or re.fullmatch(r'public/[A-Za-z0-9-]{8,128}\.txt', str(path)):
        path = 'publication boundary'
    raise ValueError(f'{path}: {reason}')


def safe_name(name):
    if not isinstance(name, str) or not name or '\\' in name or PurePosixPath(name).is_absolute() or any(p in ('', '.', '..') for p in name.split('/')):
        fail('manifest', 'Expected a normalized relative file path')
    return name


def read_regular(root, name):
    safe_name(name)
    path = root
    for part in PurePosixPath(name).parts:
        path = path / part
        if path.is_symlink():
            fail(name, 'Symlinks are not publishable')
    if not path.is_file():
        fail(name, 'Required public file is missing or not regular')
    return path.read_bytes()


def manifest(root):
    m = json.loads(read_regular(root, MANIFEST))
    if VERIFICATION_NAME.search(json.dumps(m)):
        fail(MANIFEST, 'Secret-derived ownership filename; omit operational artifacts instead of enumerating them')
    if m.get('version') != 1 or not isinstance(m.get('files'), list):
        fail(MANIFEST, 'Unsupported manifest')
    names = m['files']
    if len(set(names)) != len(names):
        fail(MANIFEST, 'Duplicate paths')
    for name in names:
        safe_name(name)
        if PRIVATE_PATH.search(name) or INDEXNOW_PATH.search(name) or name in m['privateFiles']:
            fail(name, 'Private or generated path in manifest')
    for required in (MANIFEST, 'LICENSE', 'public/sdk/LICENSE.txt', 'docs/THIRD-PARTY.md', 'vendor/shadcn-tailwind-4.13.0.LICENSE.md', 'package.json', 'package-lock.json'):
        if required not in names:
            fail(required, 'Required publication notice/configuration missing from manifest')
    for target, source in m['replacements'].items():
        if target not in names or source not in names:
            fail(MANIFEST, 'Replacement and its public default must both be listed')
    return m


def public_files(root, m):
    files = {name: read_regular(root, m['replacements'].get(name, name)) for name in m['files']}
    package = json.loads(files['package.json'])
    package['scripts'] = m['packageScripts']
    files['package.json'] = (json.dumps(package, indent=2, ensure_ascii=False) + '\n').encode()
    return files


def normalized(base, name):
    return os.path.normpath(str(PurePosixPath(base).parent / name)).replace(os.sep, '/')


def exists(files, name, module=False):
    if name == '.' and not module:
        return True
    candidates = [name]
    if module:
        candidates += [name + ext for ext in ('.ts', '.tsx', '.js', '.mjs', '.json')]
        candidates += [name + '/index' + ext for ext in ('.ts', '.tsx', '.js', '.mjs')]
    return any(p in files for p in candidates) or (not module and any(p.startswith(name.rstrip('/') + '/') for p in files))


def check(files, m):
    for name, data in files.items():
        suffix = PurePosixPath(name).suffix
        if suffix in ('.png', '.webp'):
            valid = data.startswith(b'\x89PNG\r\n\x1a\n') if suffix == '.png' else data.startswith(b'RIFF') and data[8:12] == b'WEBP'
            if not valid:
                fail(name, 'Invalid image signature')
            continue
        try:
            text = data.decode('utf-8')
        except UnicodeDecodeError:
            fail(name, 'Unexpected binary file')
        if VERIFICATION_NAME.search(text):
            fail(name, 'Secret-derived ownership filename is not publishable')
        if name.startswith('public/') and suffix == '.txt' and re.fullmatch(r'[A-Za-z0-9-]{8,128}', text.strip()) and PurePosixPath(name).stem == text.strip():
            fail('publication boundary', 'IndexNow ownership files are not publishable')
        if name == '.env.example' and any(line.strip() and not line.lstrip().startswith('#') for line in text.splitlines()):
            fail(name, 'Environment example must contain comments/placeholders only')
        if '\0' in text or CREDENTIALS.search(text):
            fail(name, 'Possible credential or unexpected binary data; inspect locally')
        if METADATA.search(text.replace('00000000-0000-4000-8000-000000000000', 'LOCAL_DATABASE')):
            fail(name, 'Private deployment metadata')
        if suffix in CODE:
            for ref in IMPORT.findall(text):
                if ref.startswith(('.', '@/')):
                    target = ref[2:] if ref.startswith('@/') else normalized(name, ref)
                    if not exists(files, target, module=True):
                        fail(name, 'Missing local import: ' + target)
            for ref in URL_FILE.findall(text):
                if ref.startswith('.'):
                    target = normalized(name, ref)
                    # The optional private hosting manifest and build output are not public source inputs.
                    if target == '.openai/hosting.json' or target.startswith(('dist/', '.next/')):
                        continue
                    if not exists(files, target):
                        fail(name, 'Missing local resource: ' + target)
            if name.startswith('tests/'):
                for ref in READ_FILE.findall(text):
                    if ref.startswith(('dist/', '.next/')):
                        continue
                    if not exists(files, ref):
                        fail(name, 'Missing test resource: ' + ref)
        if suffix == '.md':
            refs = re.findall(r'\]\(([^)\s]+)\)|(?:src|href)="([^"]+)"', text)
            for pair in refs:
                ref = (pair[0] or pair[1]).split('#')[0]
                if not ref or re.match(r'(?:https?:|mailto:|/)', ref):
                    continue
                if not exists(files, normalized(name, ref)):
                    fail(name, 'Missing documentation reference: ' + ref)
    package = json.loads(files['package.json'])
    if package['scripts'] != m['packageScripts']:
        fail('package.json', 'Unexpected public scripts')
    for script in package['scripts'].values():
        for ref in re.findall(r'(?:scripts|tests)/[\w./-]+', script):
            if not exists(files, ref):
                fail('package.json', 'Missing script/test: ' + ref)
    for target, source in m['replacements'].items():
        if files[target] != files[source]:
            fail(target, 'Operational implementation found instead of public default')
    lock = json.loads(files['package-lock.json'])['packages']['']
    for section in ('dependencies', 'devDependencies'):
        if package.get(section) != lock.get(section):
            fail('package-lock.json', 'Root dependencies differ from package.json')


def check_tree(root, allow_generated):
    m = manifest(root)
    files = {}
    git_path = root / '.git'
    if allow_generated and git_path.is_symlink():
        fail('.git', 'Symlink Git metadata in public tree')
    if allow_generated and git_path.exists():
        tracked = subprocess.check_output(['git', '-C', str(root), 'ls-files', '--cached', '-z']).decode().split('\0')
        for name in filter(None, tracked):
            if name not in m['files']:
                fail(name, 'Tracked file outside exact publication manifest')
    for directory, dirs, names in os.walk(root, followlinks=False):
        relative = Path(directory).relative_to(root)
        for name in list(dirs):
            path = relative / name
            if (root / path).is_symlink():
                fail(path, 'Symlink directory in public tree')
            if allow_generated and relative == Path('.') and name in GENERATED_DIRS:
                dirs.remove(name)
        for name in names:
            path = (relative / name).as_posix()
            # Git above must accept this root gitfile before it can be ignored.
            # Nested .git files and symlinks retain the normal rejection rules.
            if allow_generated and path == '.git' and git_path.is_file():
                continue
            if allow_generated and path in GENERATED_FILES:
                continue
            if path not in m['files']:
                fail(path, 'File outside exact publication manifest')
            files[path] = read_regular(root, path)
    for name in m['files']:
        if name not in files:
            fail(name, 'Required public file is missing')
    check(files, m)
    return files


def archive_bytes(files):
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode='w', format=tarfile.USTAR_FORMAT) as tar:
        for name, data in sorted(files.items()):
            info = tarfile.TarInfo('opentaskrelay/' + name)
            info.size, info.mode, info.mtime = len(data), 0o644, 0
            tar.addfile(info, io.BytesIO(data))
    return buffer.getvalue()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Check the projected public files without writing')
    parser.add_argument('--tree', type=Path, help='Check an actual exported tree, without Git or private-source access')
    parser.add_argument('--allow-generated', action='store_true', help='Permit known local build/dependency outputs during tree checks; never publishes them')
    parser.add_argument('--output', type=Path, help='Write a fresh public tree; destination must not exist')
    args = parser.parse_args()
    if args.tree:
        if args.output:
            parser.error('--tree and --output are mutually exclusive')
        files = check_tree(args.tree.resolve(), args.allow_generated)
    else:
        m = manifest(ROOT)
        files = public_files(ROOT, m)
        check(files, m)
    if args.check or args.tree:
        print(f'Public-source checks passed for {len(files)} manifest files (no values printed).')
        return
    if args.output:
        destination = args.output.absolute()
        destination.mkdir(parents=True, exist_ok=False)
        for name, data in sorted(files.items()):
            path = destination / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
            path.chmod(0o644)
    else:
        data = archive_bytes(files)
        output = ROOT / 'public/source'
        output.mkdir(parents=True, exist_ok=True)
        (output / 'opentaskrelay-source.tar').write_bytes(data)
        (output / 'checksum.json').write_text(json.dumps({'file':'opentaskrelay-source.tar','sha256':hashlib.sha256(data).hexdigest(),'license':'MIT','includes':'Manifest-selected application source and synthetic tests; no operational payloads, secrets or Git history.'}, indent=2)+'\n')
    print(f'Exported {len(files)} manifest files.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, KeyError) as error:
        raise SystemExit(str(error))
