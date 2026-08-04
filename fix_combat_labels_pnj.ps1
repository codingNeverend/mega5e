$f = "e:\FoundryVTT\Data\systems\mega\templates\pnj-actor-sheet.html"
$c = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)

$t5  = [string]::new([char]9, 5)
$t8  = [string]::new([char]9, 8)
$t9  = [string]::new([char]9, 9)
$nl  = "`r`n"
$sty = 'style="background:rgba(150,25,25,0.28);color:#ffffff;font-size:0.72em;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">'

# Container div
$c = $c.Replace($t5 + '<div style="margin-left:2px;">',
                $t5 + '<div style="margin-left:65px; position:relative;">')

# Header empty cell
$c = $c.Replace($t8 + '<td style="width:14px;"></td>',
                $t8 + '<td style="width:0;padding:0;border:none;overflow:visible;"></td>')

# Mains nues
$old = $t8 + '<td rowspan="2" class="rotation180" width="14px"' + $nl + $t9 + $sty + $nl + $t9 + "Mains nues</td>"
$new = $t8 + '<td rowspan="2" class="rotation180">' + $nl + $t9 + '<div class="combat-cat-label">Mains nues</div></td>'
$c = $c.Replace($old, $new)

# Attaques speciales (pnj uses HTML entity &#233;)
$old = $t8 + '<td {{#unless (courtMetrage)}} rowspan="3" {{/unless}} class="rotation180"' + $nl + $t9 + $sty + $nl + $t9 + "Attaques sp&#233;ciales</td>"
$new = $t8 + '<td {{#unless (courtMetrage)}} rowspan="3" {{/unless}} class="rotation180">' + $nl + $t9 + '<div class="combat-cat-label">Attaques sp&#233;ciales</div></td>'
$c = $c.Replace($old, $new)

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

$count = (Select-String -Path $f -Pattern "combat-cat-label" | Measure-Object).Count
Write-Host "pnj-actor-sheet.html done. combat-cat-label occurrences:" $count
