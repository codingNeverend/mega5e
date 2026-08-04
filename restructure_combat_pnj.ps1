# Restructure the combat table in pnj-actor-sheet.html to use comb-cat-outer pattern
$path = "e:\FoundryVTT\Data\systems\mega\templates\pnj-actor-sheet.html"
$raw = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
$count0 = $raw.Length

$t6 = [string]::new([char]9, 6)
$t7 = [string]::new([char]9, 7)
$t8 = [string]::new([char]9, 8)
$t9 = [string]::new([char]9, 9)
$nl = "`r`n"

# ─── R1 : supprimer la cellule vide (width:0) de l'en-tête de colonnes ─────────
$old1 = "${t8}<td style=`"width:0;padding:0;border:none;overflow:visible;`"></td>${nl}"
if ($raw.Contains($old1)) { $raw = $raw.Replace($old1, ""); Write-Host "R1 OK" } else { Write-Host "R1 FAILED" }

# ─── R2 : fermer la table d'en-tête + démarrer Mains nues ───────────────────────
# La ligne vide (blank line) + <tr> Mains nues + rotation180 td
$old2 = "${nl}${nl}${t7}<tr style=`"background:rgba(205,127,50,0.08);border-left:3px solid rgba(205,127,50,0.6);`">${nl}${t8}<td rowspan=`"2`" class=`"rotation180`">${nl}${t9}<div class=`"combat-cat-label`">Mains nues</div>${nl}${t8}</td>"
$new2 = "${nl}${t6}</table>${nl}${t6}<div class=`"comb-cat-outer`">${nl}${t7}<div class=`"comb-cat-side-label`"><span>Mains nues</span></div>${nl}${t6}<table class=`"comb-cat-body`"><tbody>${nl}${nl}${t7}<tr style=`"background:rgba(205,127,50,0.08);border-left:3px solid rgba(205,127,50,0.6);`">"
if ($raw.Contains($old2)) { $raw = $raw.Replace($old2, $new2); Write-Host "R2 OK" } else { Write-Host "R2 FAILED" }

# ─── R3 : fermer Mains nues avant {{#or mainsnues1...}} ─────────────────────────
$old3 = "${t7}</tr>${nl}${t7}{{#or system.talents_combat.mainsnues1.label system.combat_large}}"
$new3 = "${t7}</tr>${nl}${t6}</tbody></table>${nl}${t6}</div>${nl}${t7}{{#or system.talents_combat.mainsnues1.label system.combat_large}}"
if ($raw.Contains($old3)) { $raw = $raw.Replace($old3, $new3); Write-Host "R3 OK" } else { Write-Host "R3 FAILED" }

# ─── R4 : démarrer Attaques spéciales après {{#or mainsnues1...}} ────────────────
# PNJ utilise &#233; pour é et couleur rgba(155,89,182)
$old4 = "${t7}{{#or system.talents_combat.mainsnues1.label system.combat_large}}${nl}${t7}<tr style=`"background:rgba(155,89,182,0.08);border-left:3px solid rgba(155,89,182,0.6);`">${nl}${t8}<td {{#unless (courtMetrage)}} rowspan=`"3`" {{/unless}} class=`"rotation180`">${nl}${t9}<div class=`"combat-cat-label`">Attaques sp&#233;ciales</div>${nl}${t8}</td>"
$new4 = "${t7}{{#or system.talents_combat.mainsnues1.label system.combat_large}}${nl}${t6}<div class=`"comb-cat-outer`">${nl}${t7}<div class=`"comb-cat-side-label`"><span>Attaques sp&#233;ciales</span></div>${nl}${t6}<table class=`"comb-cat-body`"><tbody>${nl}${t7}<tr style=`"background:rgba(155,89,182,0.08);border-left:3px solid rgba(155,89,182,0.6);`">"
if ($raw.Contains($old4)) { $raw = $raw.Replace($old4, $new4); Write-Host "R4 OK" } else { Write-Host "R4 FAILED" }

# ─── R5 : fermer Attaques spéciales + démarrer Armes courtes ────────────────────
$old5 = "${t7}{{/or}}${nl}${t7}{{#or system.talents_combat.armescourtes_1.label system.combat_large}}${nl}${t7}<tr style=`"background:rgba(52,152,219,0.08);border-left:3px solid rgba(52,152,219,0.6);`">${nl}${t8}<td {{#unless (courtMetrage)}}rowspan=`"2`" {{/unless}} class=`"rotation180`">${nl}${t9}<div class=`"combat-cat-label`">Armes courtes</div>${nl}${t8}</td>"
$new5 = "${t6}</tbody></table>${nl}${t6}</div>${nl}${t7}{{/or}}${nl}${t7}{{#or system.talents_combat.armescourtes_1.label system.combat_large}}${nl}${t6}<div class=`"comb-cat-outer`">${nl}${t7}<div class=`"comb-cat-side-label`"><span>Armes courtes</span></div>${nl}${t6}<table class=`"comb-cat-body`"><tbody>${nl}${t7}<tr style=`"background:rgba(52,152,219,0.08);border-left:3px solid rgba(52,152,219,0.6);`">"
if ($raw.Contains($old5)) { $raw = $raw.Replace($old5, $new5); Write-Host "R5 OK" } else { Write-Host "R5 FAILED" }

# ─── R6 : fermer Armes courtes + démarrer Armes longues ─────────────────────────
$old6 = "${t7}{{/or}}${nl}${t7}{{#or system.talents_combat.armeslongues_1.label system.combat_large}}${nl}${t7}<tr style=`"background:rgba(46,204,113,0.08);border-left:3px solid rgba(46,204,113,0.6);`">${nl}${t8}<td {{#unless (courtMetrage)}} rowspan=`"2`" {{/unless}} class=`"rotation180`">${nl}${t9}<div class=`"combat-cat-label`">Armes longues</div>${nl}${t8}</td>"
$new6 = "${t6}</tbody></table>${nl}${t6}</div>${nl}${t7}{{/or}}${nl}${t7}{{#or system.talents_combat.armeslongues_1.label system.combat_large}}${nl}${t6}<div class=`"comb-cat-outer`">${nl}${t7}<div class=`"comb-cat-side-label`"><span>Armes longues</span></div>${nl}${t6}<table class=`"comb-cat-body`"><tbody>${nl}${t7}<tr style=`"background:rgba(46,204,113,0.08);border-left:3px solid rgba(46,204,113,0.6);`">"
if ($raw.Contains($old6)) { $raw = $raw.Replace($old6, $new6); Write-Host "R6 OK" } else { Write-Host "R6 FAILED" }

# ─── R7 : fermer Armes longues + démarrer Armes de lancer ───────────────────────
$old7 = "${t7}{{/or}}${nl}${t7}{{#or system.talents_combat.lancer_1.label system.combat_large}}${nl}${t7}<tr style=`"background:rgba(241,196,15,0.07);border-left:3px solid rgba(241,196,15,0.55);`">${nl}${t8}<td {{#unless (courtMetrage)}} rowspan=`"2`" {{/unless}} class=`"rotation180`">${nl}${t9}<div class=`"combat-cat-label`">Armes de lancer</div>${nl}${t8}</td>"
$new7 = "${t6}</tbody></table>${nl}${t6}</div>${nl}${t7}{{/or}}${nl}${t7}{{#or system.talents_combat.lancer_1.label system.combat_large}}${nl}${t6}<div class=`"comb-cat-outer`">${nl}${t7}<div class=`"comb-cat-side-label`"><span>Armes de lancer</span></div>${nl}${t6}<table class=`"comb-cat-body`"><tbody>${nl}${t7}<tr style=`"background:rgba(241,196,15,0.07);border-left:3px solid rgba(241,196,15,0.55);`">"
if ($raw.Contains($old7)) { $raw = $raw.Replace($old7, $new7); Write-Host "R7 OK" } else { Write-Host "R7 FAILED" }

# ─── R8 : fermer Armes de lancer + démarrer Armes de tir ───────────────────────
$old8 = "${t7}{{/or}}${nl}${t7}{{#or system.talents_combat.tir_1.label system.combat_large}}${nl}${t7}<tr style=`"background:rgba(26,188,156,0.08);border-left:3px solid rgba(26,188,156,0.6);`">${nl}${t8}<td {{#unless (courtMetrage)}} rowspan=`"2`" {{/unless}} class=`"rotation180`">${nl}${t9}<div class=`"combat-cat-label`">Armes de tir</div>${nl}${t8}</td>"
$new8 = "${t6}</tbody></table>${nl}${t6}</div>${nl}${t7}{{/or}}${nl}${t7}{{#or system.talents_combat.tir_1.label system.combat_large}}${nl}${t6}<div class=`"comb-cat-outer`">${nl}${t7}<div class=`"comb-cat-side-label`"><span>Armes de tir</span></div>${nl}${t6}<table class=`"comb-cat-body`"><tbody>${nl}${t7}<tr style=`"background:rgba(26,188,156,0.08);border-left:3px solid rgba(26,188,156,0.6);`">"
if ($raw.Contains($old8)) { $raw = $raw.Replace($old8, $new8); Write-Host "R8 OK" } else { Write-Host "R8 FAILED" }

# ─── R9 : fermer Armes de tir + envelopper tfoot dans comb-footer ────────────────
$old9 = "${t7}{{/or}}${nl}${t7}<tfoot>"
$new9 = "${t6}</tbody></table>${nl}${t6}</div>${nl}${t7}{{/or}}${nl}${t6}<table class=`"comb-footer`">${nl}${t7}<tfoot>"
if ($raw.Contains($old9)) { $raw = $raw.Replace($old9, $new9); Write-Host "R9 OK" } else { Write-Host "R9 FAILED" }

# ─── WRITE ───────────────────────────────────────────────────────────────────────
[System.IO.File]::WriteAllText($path, $raw, [System.Text.Encoding]::UTF8)
Write-Host "Done. Length before: $count0 / after: $($raw.Length)"
Write-Host "comb-cat-outer count: $(($raw | Select-String 'comb-cat-outer' -AllMatches).Matches.Count)"
Write-Host "comb-cat-side-label count: $(($raw | Select-String 'comb-cat-side-label' -AllMatches).Matches.Count)"
