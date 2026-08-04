$f = "e:\FoundryVTT\Data\systems\mega\templates\actor-sheet.html"
$c = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)

$t8  = [string]::new([char]9, 8)
$t9  = [string]::new([char]9, 9)
$nl  = "`r`n"  # CRLF line endings
$sty = 'style="background:rgba(90, 16, 16, 0.79);color:#ffffff;font-size:0.72em;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">'

# Header empty cell
$c = $c.Replace($t8 + '<td style="width:14px;"></td>',
                $t8 + '<td style="width:0;padding:0;border:none;overflow:visible;"></td>')

# Mains nues
$old = $t8 + '<td rowspan="2" class="rotation180" width="14px"' + $nl + $t9 + $sty + $nl + $t9 + "Mains nues</td>"
$new = $t8 + '<td rowspan="2" class="rotation180">' + $nl + $t9 + '<div class="combat-cat-label">Mains nues</div></td>'
$c = $c.Replace($old, $new)

# Attaques speciales
$old = $t8 + '<td {{#unless (courtMetrage)}} rowspan="3" {{/unless}} class="rotation180"' + $nl + $t9 + $sty + $nl + $t9 + "Attaques sp"
$new = $t8 + '<td {{#unless (courtMetrage)}} rowspan="3" {{/unless}} class="rotation180">' + $nl + $t9 + '<div class="combat-cat-label">Attaques sp'
$c = $c.Replace($old, $new)
$c = $c.Replace('<div class="combat-cat-label">Attaques sp' + [char]0xE9 + 'ciales</td>',
                '<div class="combat-cat-label">Attaques sp' + [char]0xE9 + 'ciales</div></td>')

# Armes courtes (no space before rowspan)
$old = $t8 + '<td {{#unless (courtMetrage)}}rowspan="2" {{/unless}} class="rotation180"' + $nl + $t9 + $sty + $nl + $t9 + "Armes courtes</td>"
$new = $t8 + '<td {{#unless (courtMetrage)}}rowspan="2" {{/unless}} class="rotation180">' + $nl + $t9 + '<div class="combat-cat-label">Armes courtes</div></td>'
$c = $c.Replace($old, $new)

# Armes longues
$old = $t8 + '<td {{#unless (courtMetrage)}} rowspan="2" {{/unless}} class="rotation180"' + $nl + $t9 + $sty + $nl + $t9 + "Armes longues</td>"
$new = $t8 + '<td {{#unless (courtMetrage)}} rowspan="2" {{/unless}} class="rotation180">' + $nl + $t9 + '<div class="combat-cat-label">Armes longues</div></td>'
$c = $c.Replace($old, $new)

# Armes de lancer
$old = $t8 + '<td {{#unless (courtMetrage)}} rowspan="2" {{/unless}} class="rotation180"' + $nl + $t9 + $sty + $nl + $t9 + "Armes de lancer</td>"
$new = $t8 + '<td {{#unless (courtMetrage)}} rowspan="2" {{/unless}} class="rotation180">' + $nl + $t9 + '<div class="combat-cat-label">Armes de lancer</div></td>'
$c = $c.Replace($old, $new)

# Armes de tir
$old = $t8 + '<td {{#unless (courtMetrage)}} rowspan="2" {{/unless}} class="rotation180"' + $nl + $t9 + $sty + $nl + $t9 + "Armes de tir</td>"
$new = $t8 + '<td {{#unless (courtMetrage)}} rowspan="2" {{/unless}} class="rotation180">' + $nl + $t9 + '<div class="combat-cat-label">Armes de tir</div></td>'
$c = $c.Replace($old, $new)

[System.IO.File]::WriteAllText($f, $c, [System.Text.Encoding]::UTF8)
Write-Host "actor-sheet.html done. combat-cat-label count:" ($c.Split("combat-cat-label").Count - 1)
