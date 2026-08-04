import sys

INDICATOR = ('{{#if system.melee_impair}}'
             '<span class="melee-impair-indicator" '
             'title="Point de m&ecirc;l&eacute;e impair accumul&eacute; : prochain pt m&ecirc;l&eacute;e = 1 PV">'
             '&frac12;</span>{{/if}}')

ANCHOR = '5}}style="color: #e74c3c; font-weight: bold;" {{/ifinferior}} />'

for path in [
    r'e:\FoundryVTT\Data\systems\mega\templates\actor-sheet.html',
    r'e:\FoundryVTT\Data\systems\mega\templates\pnj-actor-sheet.html',
]:
    with open(path, encoding='utf-8') as f:
        content = f.read()
    if INDICATOR in content:
        print('DEJA FAIT: ' + path)
        continue
    if ANCHOR not in content:
        print('ERREUR ancre non trouvee: ' + path)
        sys.exit(1)
    content = content.replace(ANCHOR, ANCHOR + INDICATOR, 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('OK: ' + path)
