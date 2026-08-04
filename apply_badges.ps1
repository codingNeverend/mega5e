$f = "e:\FoundryVTT\Data\systems\mega\templates\pnj-actor-sheet.html"
$c = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)
$orig = $c.Length
$t8  = "`t`t`t`t`t`t`t`t"
$t10 = "`t`t`t`t`t`t`t`t`t`t"
$nl  = "`r`n"

# 1. Bagarre TR style
$c = $c.Replace(
    '<tr style="background-color: rgba(0,0,0, 0.1);">' + $nl + $t8 + '<td align="left"><span label="Bagarre"',
    '<tr style="background:rgba(205,127,50,0.05);border-left:3px solid rgba(205,127,50,0.6);">' + $nl + $t8 + '<td align="left"><span label="Bagarre"')
Write-Host "1 Bagarre TR len=$($c.Length)"

# 2. Bagarre label badge
$c = [regex]::Replace($c,
    'data-dtype="text" \/>{{else}}<b>{{system\.talents_combat\.mainsnues\.label}}[\r\n]+\s*</b>{{/if}}</span></td>',
    'data-dtype="text" />{{else}}<span class="tech-badge tech-badge-bronze">{{system.talents_combat.mainsnues.label}}</span>{{/if}}</span></td>')
Write-Host "2 Bagarre badge len=$($c.Length)"

# 3. mainsnues1 TR + category cell
$c = [regex]::Replace($c,
    '<tr style="background-color: rgba\(255, 255, 255, 0\.1\);">[\r\n]+\s*<td \{\{#unless \(courtMetrage\)\}\} rowspan="3" \{\{/unless\}\} class="rotation180">[\r\n]+\s*<font size="0\.5"><b>Attaques sp.ciales</b></font>[\r\n]+\s*</td>',
    '<tr style="background:rgba(155,89,182,0.08);border-left:3px solid rgba(155,89,182,0.6);">' + $nl + $t8 + '<td {{#unless (courtMetrage)}} rowspan="3" {{/unless}} class="rotation180" style="background:rgba(155,89,182,0.22);color:#d4a8f0;font-size:0.72em;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">Attaques sp&#233;ciales</td>')
Write-Host "3 mn1 TR len=$($c.Length)"

# 4. mainsnues1 label badge
$c = $c.Replace(
    'name="{{system.talents_combat.mainsnues1.label}}"><b>{{system.talents_combat.mainsnues1.label}}</b></span>',
    'name="{{system.talents_combat.mainsnues1.label}}">{{#if system.talents_combat.mainsnues1.label}}<span class="tech-badge tech-badge-violet">{{system.talents_combat.mainsnues1.label}}</span>{{/if}}</span>')
Write-Host "4 mn1 badge len=$($c.Length)"

# 5. mainsnues2 TR + label
$c = [regex]::Replace($c,
    '<tr style="background-color: rgba\(255, 255, 255, 0\.1\);">[\r\n]+\s*<td align="left"><span class="clic_mainsnues" value="mainsnues2"[\r\n]+\s*label="{{system\.talents_combat\.mainsnues2\.label}}"><b>{{system\.talents_combat\.mainsnues2\.label}}</b></span>',
    '<tr style="background:rgba(155,89,182,0.05);border-left:3px solid rgba(155,89,182,0.6);">' + $nl + $t8 + '<td align="left"><span class="clic_mainsnues" value="mainsnues2"' + $nl + $t10 + 'label="{{system.talents_combat.mainsnues2.label}}">{{#if system.talents_combat.mainsnues2.label}}<span class="tech-badge tech-badge-violet">{{system.talents_combat.mainsnues2.label}}</span>{{/if}}</span>')
Write-Host "5 mn2 len=$($c.Length)"

# 6. mainsnues3 TR + label
$c = [regex]::Replace($c,
    '<tr style="background-color: rgba\(255, 255, 255, 0\.1\);">[\r\n]+\s*<td align="left"><span class="clic_mainsnues" value="mainsnues3"[\r\n]+\s*label="{{system\.talents_combat\.mainsnues3\.label}}"><b>{{system\.talents_combat\.mainsnues3\.label}}</b></span>',
    '<tr style="background:rgba(155,89,182,0.05);border-left:3px solid rgba(155,89,182,0.6);">' + $nl + $t8 + '<td align="left"><span class="clic_mainsnues" value="mainsnues3"' + $nl + $t10 + 'label="{{system.talents_combat.mainsnues3.label}}">{{#if system.talents_combat.mainsnues3.label}}<span class="tech-badge tech-badge-violet">{{system.talents_combat.mainsnues3.label}}</span>{{/if}}</span>')
Write-Host "6 mn3 len=$($c.Length)"

# 7. armescourtes_1 TR + category + label
$c = [regex]::Replace($c,
    '<tr style="background-color: rgba\(0, 0, 0, 0\.1\);">[\r\n]+\s*<td \{\{#unless \(courtMetrage\)\}\}rowspan="2" \{\{/unless\}\} class="rotation180">[\r\n]+\s*<font size="0\.5"><b>Armes courtes</b></font>[\r\n]+\s*</td>[\r\n]+\s*<!-- <td align="left">.*?-->[\r\n]+\s*<td align="left"><span id="span_clic_ac1" class="clic_technique_combat"[\r\n]+\s*label="{{system\.talents_combat\.armescourtes_1\.label}}"[\r\n]+\s*value="armescourtes_1"><b>{{system\.talents_combat\.armescourtes_1\.label}}</b></span>',
    '<tr style="background:rgba(52,152,219,0.08);border-left:3px solid rgba(52,152,219,0.6);">' + $nl + $t8 + '<td {{#unless (courtMetrage)}}rowspan="2" {{/unless}} class="rotation180" style="background:rgba(52,152,219,0.22);color:#90c8f8;font-size:0.72em;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">Armes courtes</td>' + $nl + $t8 + '<!-- <td align="left"><span id="span_clic_ac1" class="clic_technique_combat" value="armescourtes_1">{{#if system.talents_combat.armescourtes_1.modifiable}}<input id="equipement_ac1" readonly="true" class="equipement_equip" type="text" name="system.talents_combat.armescourtes_1.label" value="{{system.talents_combat.armescourtes_1.label}}" data-dtype="text"/>{{else}}<b>{{system.talents_combat.armescourtes_1.label}}</b>{{/if}}</span></td> -->' + $nl + $t8 + '<td align="left"><span id="span_clic_ac1" class="clic_technique_combat"' + $nl + $t10 + 'label="{{system.talents_combat.armescourtes_1.label}}"' + $nl + $t10 + 'value="armescourtes_1">{{#if system.talents_combat.armescourtes_1.label}}<span class="tech-badge tech-badge-blue">{{system.talents_combat.armescourtes_1.label}}</span>{{/if}}</span>',
    [System.Text.RegularExpressions.RegexOptions]::Singleline)
Write-Host "7 ac1 len=$($c.Length)"

# 8. armescourtes_2 TR + label
$c = [regex]::Replace($c,
    '<tr style="background-color: rgba\(0, 0, 0, 0\.1\);">[\r\n]+\s*<td align="left"><span class="clic_technique_combat" value="armescourtes_2"[\r\n]+\s*label="{{system\.talents_combat\.armescourtes_2\.label}}"><b>{{system\.talents_combat\.armescourtes_2\.label}}</b></span>',
    '<tr style="background:rgba(52,152,219,0.05);border-left:3px solid rgba(52,152,219,0.6);">' + $nl + $t8 + '<td align="left"><span class="clic_technique_combat" value="armescourtes_2"' + $nl + $t10 + 'label="{{system.talents_combat.armescourtes_2.label}}">{{#if system.talents_combat.armescourtes_2.label}}<span class="tech-badge tech-badge-blue">{{system.talents_combat.armescourtes_2.label}}</span>{{/if}}</span>')
Write-Host "8 ac2 len=$($c.Length)"

# 9. armeslongues_1 TR + category + label
$c = [regex]::Replace($c,
    '<tr style="background-color: rgba\(255, 255, 255, 0\.1\);">[\r\n]+\s*<td \{\{#unless \(courtMetrage\)\}\} rowspan="2" \{\{/unless\}\} class="rotation180">[\r\n]+\s*<font size="0\.5"><b>Armes longues</b></font>[\r\n]+\s*</td>[\r\n]+\s*<td align="left"><span class="clic_technique_combat" value="armeslongues_1"[\r\n]+\s*label="{{system\.talents_combat\.armeslongues_1\.label}}"><b>{{system\.talents_combat\.armeslongues_1\.label}}</b></span>',
    '<tr style="background:rgba(46,204,113,0.08);border-left:3px solid rgba(46,204,113,0.6);">' + $nl + $t8 + '<td {{#unless (courtMetrage)}} rowspan="2" {{/unless}} class="rotation180" style="background:rgba(46,204,113,0.22);color:#80e8a0;font-size:0.72em;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">Armes longues</td>' + $nl + $t8 + '<td align="left"><span class="clic_technique_combat" value="armeslongues_1"' + $nl + $t10 + 'label="{{system.talents_combat.armeslongues_1.label}}">{{#if system.talents_combat.armeslongues_1.label}}<span class="tech-badge tech-badge-green">{{system.talents_combat.armeslongues_1.label}}</span>{{/if}}</span>')
Write-Host "9 al1 len=$($c.Length)"

# 10. armeslongues_2 TR + label
$c = [regex]::Replace($c,
    '<tr style="background-color: rgba\(255, 255, 255, 0\.1\);">[\r\n]+\s*<td align="left"><span class="clic_technique_combat" value="armeslongues_2"[\r\n]+\s*label="{{system\.talents_combat\.armeslongues_2\.label}}"><b>{{system\.talents_combat\.armeslongues_2\.label}}</b></span>',
    '<tr style="background:rgba(46,204,113,0.05);border-left:3px solid rgba(46,204,113,0.6);">' + $nl + $t8 + '<td align="left"><span class="clic_technique_combat" value="armeslongues_2"' + $nl + $t10 + 'label="{{system.talents_combat.armeslongues_2.label}}">{{#if system.talents_combat.armeslongues_2.label}}<span class="tech-badge tech-badge-green">{{system.talents_combat.armeslongues_2.label}}</span>{{/if}}</span>')
Write-Host "10 al2 len=$($c.Length)"

# 11. lancer_1 TR + category + label
$c = [regex]::Replace($c,
    '<tr style="background-color: rgba\(0, 0, 0, 0\.1\);">[\r\n]+\s*<td \{\{#unless \(courtMetrage\)\}\} rowspan="2" \{\{/unless\}\} class="rotation180">[\r\n]+\s*<font size="0\.5"><b>Armes de lancer</b></font>[\r\n]+\s*</td>[\r\n\s]+<td align="left"><span class="clic_technique_combat" value="lancer_1"[\r\n\s]+label="{{system\.talents_combat\.lancer_1\.label}}">[\r\n\s]*\{\{#ifequal[\r\n\s]+system\.talents_combat\.lancer_1\.quantity[\r\n\s]+0\}\}<s>\{\{/ifequal\}\}{{system\.talents_combat\.lancer_1\.label}}\{\{#ifequal[\r\n\s]+system\.talents_combat\.lancer_1\.quantity 0\}\}</s>\{\{/ifequal\}\}</span>\{\{#if[\r\n\s]+system\.talents_combat\.lancer_1\.label\}\}<br><i class="fa fa fa-caret-right"></i>[\r\n\s]+{{system\.talents_combat\.lancer_1\.quantity}}\{\{/if\}\}</td>',
    '<tr style="background:rgba(241,196,15,0.07);border-left:3px solid rgba(241,196,15,0.55);">' + $nl + $t8 + '<td {{#unless (courtMetrage)}} rowspan="2" {{/unless}} class="rotation180" style="background:rgba(241,196,15,0.20);color:#f0d070;font-size:0.72em;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">Armes de lancer</td>' + $nl + $t8 + '<td align="left"><span class="clic_technique_combat" value="lancer_1"' + $nl + $t10 + 'label="{{system.talents_combat.lancer_1.label}}">{{#if system.talents_combat.lancer_1.label}}<span class="tech-badge tech-badge-amber">{{#ifequal system.talents_combat.lancer_1.quantity 0}}<s>{{/ifequal}}{{system.talents_combat.lancer_1.label}}{{#ifequal system.talents_combat.lancer_1.quantity 0}}</s>{{/ifequal}}</span>{{/if}}</span>{{#if system.talents_combat.lancer_1.label}}<br><i class="fa fa fa-caret-right"></i> {{system.talents_combat.lancer_1.quantity}}{{/if}}</td>',
    [System.Text.RegularExpressions.RegexOptions]::Singleline)
Write-Host "11 la1 len=$($c.Length)"

# 12. lancer_2 TR + label
$c = [regex]::Replace($c,
    '<tr style="background-color: rgba\(0, 0, 0, 0\.1\);">[\r\n]+\s*<td align="left"><span class="clic_technique_combat" value="lancer_2"[\r\n\s]+label="{{system\.talents_combat\.lancer_2\.label}}">[\r\n\s]*\{\{#ifequal[\r\n\s]+system\.talents_combat\.lancer_2\.quantity[\r\n\s]+0\}\}<s>\{\{/ifequal\}\}{{system\.talents_combat\.lancer_2\.label}}\{\{#ifequal[\r\n\s]+system\.talents_combat\.lancer_2\.quantity 0\}\}</s>\{\{/ifequal\}\}</span>\{\{#if[\r\n\s]+system\.talents_combat\.lancer_2\.label\}\}<br><i class="fa fa fa-caret-right"></i>[\r\n\s]+{{system\.talents_combat\.lancer_2\.quantity}}\{\{/if\}\}</td>',
    '<tr style="background:rgba(241,196,15,0.04);border-left:3px solid rgba(241,196,15,0.55);">' + $nl + $t8 + '<td align="left"><span class="clic_technique_combat" value="lancer_2"' + $nl + $t10 + 'label="{{system.talents_combat.lancer_2.label}}">{{#if system.talents_combat.lancer_2.label}}<span class="tech-badge tech-badge-amber">{{#ifequal system.talents_combat.lancer_2.quantity 0}}<s>{{/ifequal}}{{system.talents_combat.lancer_2.label}}{{#ifequal system.talents_combat.lancer_2.quantity 0}}</s>{{/ifequal}}</span>{{/if}}</span>{{#if system.talents_combat.lancer_2.label}}<br><i class="fa fa fa-caret-right"></i> {{system.talents_combat.lancer_2.quantity}}{{/if}}</td>',
    [System.Text.RegularExpressions.RegexOptions]::Singleline)
Write-Host "12 la2 len=$($c.Length)"

# 13. tir_1 TR + category + label
$c = [regex]::Replace($c,
    '<tr style="background-color: rgba\(255, 255, 255, 0\.1\);">[\r\n]+\s*<td \{\{#unless \(courtMetrage\)\}\} rowspan="2" \{\{/unless\}\} class="rotation180">[\r\n]+\s*<font size="0\.5"><b>Armes de tir</b></font>[\r\n]+\s*</td>[\r\n\s]+<td align="left"><span class="clic_technique_combat" value="tir_1"[\r\n\s]+label="{{system\.talents_combat\.tir_1\.label}}"><b>{{system\.talents_combat\.tir_1\.label}}</b><input[\r\n\s]+type="hidden" name="system\.talents_combat\.tir_1\.selection" value=""[\r\n\s]+data-dtype="Number" \/></span>\{\{#if system\.talents_combat\.tir_1\.label\}\}<br><i[\r\n\s]+class="fas fa-bolt"></i>{{system\.talents_combat\.tir_1\.charge}} \/ <i[\r\n\s]+class="fas fa-ruler-horizontal"></i> {{system\.talents_combat\.tir_1\.portee}}[\r\n\s]+m\{\{/if\}\}</td>',
    '<tr style="background:rgba(26,188,156,0.08);border-left:3px solid rgba(26,188,156,0.6);">' + $nl + $t8 + '<td {{#unless (courtMetrage)}} rowspan="2" {{/unless}} class="rotation180" style="background:rgba(26,188,156,0.22);color:#70e8d0;font-size:0.72em;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">Armes de tir</td>' + $nl + $t8 + '<td align="left"><span class="clic_technique_combat" value="tir_1"' + $nl + $t10 + 'label="{{system.talents_combat.tir_1.label}}">{{#if system.talents_combat.tir_1.label}}<span class="tech-badge tech-badge-teal">{{system.talents_combat.tir_1.label}}</span>{{/if}}<input type="hidden" name="system.talents_combat.tir_1.selection" value="" data-dtype="Number" /></span>{{#if system.talents_combat.tir_1.label}}<br><span class="tir-info-badge tir-badge-charge"><i class="fas fa-bolt"></i> {{system.talents_combat.tir_1.charge}}</span> <span class="tir-info-badge tir-badge-portee"><i class="fas fa-ruler-horizontal"></i> {{system.talents_combat.tir_1.portee}} m</span>{{/if}}</td>',
    [System.Text.RegularExpressions.RegexOptions]::Singleline)
Write-Host "13 tir1 len=$($c.Length)"

# 14. tir_2 TR + label
$c = [regex]::Replace($c,
    '<tr style="background-color: rgba\(255, 255, 255, 0\.1\);">[\r\n]+\s*<td align="left"><span class="clic_technique_combat" value="tir_2"[\r\n\s]+label="{{system\.talents_combat\.tir_2\.label}}"><b>{{system\.talents_combat\.tir_2\.label}}</b><input[\r\n\s]+type="hidden" name="system\.talents_combat\.tir_2\.selection" value=""[\r\n\s]+data-dtype="Number" \/></span>\{\{#if system\.talents_combat\.tir_2\.label\}\}<br><i[\r\n\s]+class="fas fa-bolt"></i>{{system\.talents_combat\.tir_2\.charge}} \/ <i[\r\n\s]+class="fas fa-ruler-horizontal"></i> {{system\.talents_combat\.tir_2\.portee}}[\r\n\s]+m\{\{/if\}\}</td>',
    '<tr style="background:rgba(26,188,156,0.05);border-left:3px solid rgba(26,188,156,0.6);">' + $nl + $t8 + '<td align="left"><span class="clic_technique_combat" value="tir_2"' + $nl + $t10 + 'label="{{system.talents_combat.tir_2.label}}">{{#if system.talents_combat.tir_2.label}}<span class="tech-badge tech-badge-teal">{{system.talents_combat.tir_2.label}}</span>{{/if}}<input type="hidden" name="system.talents_combat.tir_2.selection" value="" data-dtype="Number" /></span>{{#if system.talents_combat.tir_2.label}}<br><span class="tir-info-badge tir-badge-charge"><i class="fas fa-bolt"></i> {{system.talents_combat.tir_2.charge}}</span> <span class="tir-info-badge tir-badge-portee"><i class="fas fa-ruler-horizontal"></i> {{system.talents_combat.tir_2.portee}} m</span>{{/if}}</td>',
    [System.Text.RegularExpressions.RegexOptions]::Singleline)
Write-Host "14 tir2 len=$($c.Length)"

# 15. Protection labels p1/p2/p3
$c = $c.Replace('<td align="left"><span><b>{{system.protections.p1.label}}</b></span></td>', '<td align="left"><span class="tech-badge tech-badge-armor">{{system.protections.p1.label}}</span></td>')
$c = $c.Replace('<td align="left"><span><b>{{system.protections.p2.label}}</b></span></td>', '<td align="left"><span class="tech-badge tech-badge-armor">{{system.protections.p2.label}}</span></td>')
$c = $c.Replace('<td align="left"><span><b>{{system.protections.p3.label}}</b></span></td>', '<td align="left"><span class="tech-badge tech-badge-armor">{{system.protections.p3.label}}</span></td>')
Write-Host "15 protections len=$($c.Length)"

[System.IO.File]::WriteAllText($f, $c, [System.Text.Encoding]::UTF8)
Write-Host "DONE. Taille orig=$orig finale=$($c.Length)"
