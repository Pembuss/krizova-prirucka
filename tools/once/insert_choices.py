# Jednorazové vloženie rozhodovacích bodov do kapitol (ponechané pre prehľadnosť, ďalej sa upravujú priamo .md).
import importlib.util, re, sys, pathlib
root = pathlib.Path(__file__).resolve().parents[2]
for lang in ['sk', 'cs', 'en']:
    spec = importlib.util.spec_from_file_location('c', root / 'tools/once' / f'choices_{lang}.py')
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    for ch, (q, items) in mod.B.items():
        f = root / 'content' / lang / f'{ch}.md'
        src = f.read_text()
        if '::: choices' in src:
            continue
        lines = '\n'.join(f'- [{t}](#{tgt})' + (f'{{.if-{tag}}}' if tag else '') for t, tgt, tag in items)
        block = f'\n::: choices\n**{q}**\n\n{lines}\n:::\n'
        m = re.search(r'^\{\{now:[^}]+\}\}\n', src, re.M)
        if m:
            src = src[:m.end()] + block + src[m.end():]
        else:
            m = re.search(r'^## ', src, re.M)
            src = src[:m.start()] + block.lstrip('\n') + '\n' + src[m.start():]
        f.write_text(src)
        print(lang, ch)
