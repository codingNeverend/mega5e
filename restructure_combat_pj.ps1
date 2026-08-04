# Restructure the combat table in actor-sheet.html to use comb-cat-outer pattern
$path = "e:\FoundryVTT\Data\systems\mega\templates\actor-sheet.html"
$raw = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
$count0 = $raw.Length

$t6 = [string]::new([char]9, 6)
$t7 = [string]::new([char]9, 7)
$t8 = [string]::new([char]9, 8)
$t9 = [string]::new([char]9, 9)
$nl = "`r`n"

# ─── R1 : supprimer la cellule vide (width:0) de l'en-tête de colonnes ─────────
$raw = $raw.Replace(
    "${t8}<td style=`"width:0;padding:0;border:none;overflow:visible;`"></td>${nl}",
    "")

# ─── R2 : fermer la table d'en-tête + démarrer Mains nues ───────────────────────
# Remplace le commentaire <!--Initial--> + la balise <tr> + la cellule rotation180
$old = "${t7}<!--Initial-->${nl}${t7}<tr style=`"border-left:3px solid rgba(200,50,50,0.6);`">${nl}${t8}<td rowspan=`"2`" class=`"rotation180`">${nl}${t9}<div class=`"combat-cat-label`">Mains nues</div>${nl}${t8}</td>"
$new = "${t6}</table>${nl}${t6}<div class=`"comb-cat-outer`">${nl}${t7}<div class=`"comb-cat-side-label`"><span>Mains nues</span></div>${nl}${t6}<table class=`"comb-cat-body`"><tbody>${nl}${t7}<!--Initial-->${nl}${t7}<tr style=`"border-left:3px solid rgba(200,50,50,0.6);`">"
if ($raw.Contains($old)) { $raw = $raw.Replace($old, $new); Write-Host "R2 OK" } else { Write-Host "R2 FAILED" }

# ─── R3 : fermer Mains nues avant {{#or mainsnues1...}} ─────────────────────────
$old = "${t7}</tr>${nl}${t7}{{#or system.talents_combat.mainsnues1.label system.combat_large}}"
$new = "${t7}</tr>${nl}${t6}</tbody></table>${nl}${t6}</div>${nl}${t7}{{#or system.talents_combat.mainsnues1.label system.combat_large}}"
if ($raw.Contains($old)) { $raw = $raw.Replace($old, $new); Write-Host "R3 OK" } else { Write-Host "R3 FAILED" }

# ─── R4 : démarrer Attaques spéciales après {{#or mainsnues1...}} ────────────────
$old = "${t7}{{#or system.talents_combat.mainsnues1.label system.combat_large}}${nl}${t7}<tr style=`"background:rgba(160,30,30,0.10);border-left:3px solid rgba(180,40,40,0.7);`">${nl}${t8}<td {{#unless (courtMetrage)}} rowspan=`"3`" {{/unless}} class=`"rotation180`">${nl}${t9}<div class=`"combat-cat-label`">Attaques sp" + [char]0xE9 + "ciales</div>${nl}${t8}</td>"
$new = "${t7}{{#or system.talents_combat.mainsnues1.label system.combat_large}}${nl}${t6}<div class=`"comb-cat-outer`">${nl}${t7}<div class=`"comb-cat-side-label`"><span>Attaques sp" + [char]0xE9 + "ciales</span></div>${nl}${t6}<table class=`"comb-cat-body`"><tbody>${nl}${t7}<tr style=`"background:rgba(160,30,30,0.10);border-left:3px solid rgba(180,40,40,0.7);`">"
if ($raw.Contains($old)) { $raw = $raw.Replace($old, $new); Write-Host "R4 OK" } else { Write-Host "R4 FAILED" }

# ─── R5 : fermer Attaques spéciales + démarrer Armes courtes ────────────────────
$old = "${t7}{{/or}}${nl}${t7}{{#or system.talents_combat.armescourtes_1.label system.combat_large}}${nl}${t7}<tr style=`"background:rgba(180,40,20,0.10);border-left:3px solid rgba(220,80,50,0.65);`">${nl}${t8}<td {{#unless (courtMetrage)}}rowspan=`"2`" {{/unless}} class=`"rotation180`">${nl}${t9}<div class=`"combat-cat-label`">Armes courtes</div>${nl}${t8}</td>"
$new = "${t6}</tbody></table>${nl}${t6}</div>${nl}${t7}{{/or}}${nl}${t7}{{#or system.talents_combat.armescourtes_1.label system.combat_large}}${nl}${t6}<div class=`"comb-cat-outer`">${nl}${t7}<div class=`"comb-cat-side-label`"><span>Armes courtes</span></div>${nl}${t6}<table class=`"comb-cat-body`"><tbody>${nl}${t7}<tr style=`"background:rgba(180,40,20,0.10);border-left:3px solid rgba(220,80,50,0.65);`">"
if ($raw.Contains($old)) { $raw = $raw.Replace($old, $new); Write-Host "R5 OK" } else { Write-Host "R5 FAILED" }

# ─── R6 : fermer Armes courtes + démarrer Armes longues ─────────────────────────
$old = "${t7}{{/or}}${nl}${t7}{{#or system.talents_combat.armeslongues_1.label system.combat_large}}${nl}${t7}<tr style=`"background:rgba(140,20,20,0.11);border-left:3px solid rgba(190,50,50,0.65);`">${nl}${t8}<td {{#unless (courtMetrage)}} rowspan=`"2`" {{/unless}} class=`"rotation180`">${nl}${t9}<div class=`"combat-cat-label`">Armes longues</div>${nl}${t8}</td>"
$new = "${t6}</tbody></table>${nl}${t6}</div>${nl}${t7}{{/or}}${nl}${t7}{{#or system.talents_combat.armeslongues_1.label system.combat_large}}${nl}${t6}<div class=`"comb-cat-outer`">${nl}${t7}<div class=`"comb-cat-side-label`"><span>Armes longues</span></div>${nl}${t6}<table class=`"comb-cat-body`"><tbody>${nl}${t7}<tr style=`"background:rgba(140,20,20,0.11);border-left:3px solid rgba(190,50,50,0.65);`">"
if ($raw.Contains($old)) { $raw = $raw.Replace($old, $new); Write-Host "R6 OK" } else { Write-Host "R6 FAILED" }

# ─── R7 : fermer Armes longues + démarrer Armes de lancer ───────────────────────
$old = "${t7}{{/or}}${nl}${t7}{{#or system.talents_combat.lancer_1.label system.combat_large}}${nl}${t7}<tr style=`"background:rgba(200,60,30,0.09);border-left:3px solid rgba(230,90,60,0.60);`">${nl}${t8}<td {{#unless (courtMetrage)}} rowspan=`"2`" {{/unless}} class=`"rotation180`">${nl}${t9}<div class=`"combat-cat-label`">Armes de lancer</div>${nl}${t8}</td>"
$new = "${t6}</tbody></table>${nl}${t6}</div>${nl}${t7}{{/or}}${nl}${t7}{{#or system.talents_combat.lancer_1.label system.combat_large}}${nl}${t6}<div class=`"comb-cat-outer`">${nl}${t7}<div class=`"comb-cat-side-label`"><span>Armes de lancer</span></div>${nl}${t6}<table class=`"comb-cat-body`"><tbody>${nl}${t7}<tr style=`"background:rgba(200,60,30,0.09);border-left:3px solid rgba(230,90,60,0.60);`">"
if ($raw.Contains($old)) { $raw = $raw.Replace($old, $new); Write-Host "R7 OK" } else { Write-Host "R7 FAILED" }

# ─── R8 : fermer Armes de lancer + démarrer Armes de tir ───────────────────────
$old = "${t7}{{/or}}${nl}${t7}{{#or system.talents_combat.tir_1.label system.combat_large}}${nl}${t7}<tr style=`"background:rgba(170,30,30,0.10);border-left:3px solid rgba(210,60,60,0.65);`">${nl}${t8}<td {{#unless (courtMetrage)}} rowspan=`"2`" {{/unless}} class=`"rotation180`">${nl}${t9}<div class=`"combat-cat-label`">Armes de tir</div>${nl}${t8}</td>"
$new = "${t6}</tbody></table>${nl}${t6}</div>${nl}${t7}{{/or}}${nl}${t7}{{#or system.talents_combat.tir_1.label system.combat_large}}${nl}${t6}<div class=`"comb-cat-outer`">${nl}${t7}<div class=`"comb-cat-side-label`"><span>Armes de tir</span></div>${nl}${t6}<table class=`"comb-cat-body`"><tbody>${nl}${t7}<tr style=`"background:rgba(170,30,30,0.10);border-left:3px solid rgba(210,60,60,0.65);`">"
if ($raw.Contains($old)) { $raw = $raw.Replace($old, $new); Write-Host "R8 OK" } else { Write-Host "R8 FAILED" }

# ─── R9 : fermer Armes de tir + envelopper le tfoot dans comb-footer ────────────
$old = "${t7}{{/or}}${nl}${t7}<tfoot>"
$new = "${t6}</tbody></table>${nl}${t6}</div>${nl}${t7}{{/or}}${nl}${t6}<table class=`"comb-footer`">${nl}${t7}<tfoot>"
if ($raw.Contains($old)) { $raw = $raw.Replace($old, $new); Write-Host "R9 OK" } else { Write-Host "R9 FAILED" }

# ─── WRITE ───────────────────────────────────────────────────────────────────────
[System.IO.File]::WriteAllText($path, $raw, [System.Text.Encoding]::UTF8)
Write-Host "Done. Length before: $count0 / after: $($raw.Length)"
Write-Host "comb-cat-outer count: $(($raw | Select-String 'comb-cat-outer' -AllMatches).Matches.Count)"
Write-Host "comb-cat-side-label count: $(($raw | Select-String 'comb-cat-side-label' -AllMatches).Matches.Count)"
