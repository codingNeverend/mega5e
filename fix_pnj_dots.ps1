$f = 'e:\FoundryVTT\Data\systems\mega\templates\pnj-actor-sheet.html'
$c = [IO.File]::ReadAllText($f, [Text.Encoding]::UTF8)
$nl = "`r`n"
$t10 = "`t" * 10
$t11 = "`t" * 11
$t12 = "`t" * 12
$t13 = "`t" * 13

# ---- Bloc ARDENCE ----
$oldArd = @"
$t10<span class="tpc-name traits_rollable"
$t11value="ardence">{{system.caracs.ardence.label}}</span>
$t10<div class="tpc-dots">
$t11{{#each (range system.pts_ardence.max)}}
$t11<span
$t12class="tpc-dot {{#ifsuperior this ../system.pts_ardence.value}}tpc-dot--empty{{else}}tpc-dot--filled{{/ifsuperior}}"></span>
$t11{{/each}}
$t10</div>
"@

$newArd = @"
$t10<span class="tpc-name traits_rollable"
$t11value="ardence">{{system.caracs.ardence.label}}</span>
$t10<div class="tpc-dots-row">
$t11{{#unless system.verouille}}<button class="pts-adj-btn pts-adj-dec" data-field="system.pts_ardence.max" type="button">-</button>{{/unless}}
$t11<div class="tpc-dots" data-field="system.pts_ardence.value" data-max-field="system.pts_ardence.max">
$t12{{#each (range system.pts_ardence.max)}}
$t12<span data-dot-index="{{this}}"
$t13class="tpc-dot {{#ifsuperior this ../system.pts_ardence.value}}tpc-dot--empty{{else}}tpc-dot--filled{{/ifsuperior}}"></span>
$t12{{/each}}
$t11</div>
$t11{{#unless system.verouille}}<button class="pts-adj-btn pts-adj-inc" data-field="system.pts_ardence.max" type="button">+</button>{{/unless}}
$t10</div>
"@

# ---- Bloc RESONNANCE ----
$oldRes = @"
$t10<span class="tpc-name traits_rollable"
$t11value="resonnance">{{system.caracs.resonnance.label}}</span>
$t10<div class="tpc-dots">
$t11{{#each (range system.pts_ardence.max)}}
$t11<span
$t12class="tpc-dot {{#ifsuperior this ../system.pts_ardence.value}}tpc-dot--empty{{else}}tpc-dot--filled{{/ifsuperior}}"></span>
$t11{{/each}}
$t10</div>
"@

$newRes = @"
$t10<span class="tpc-name traits_rollable"
$t11value="resonnance">{{system.caracs.resonnance.label}}</span>
$t10<div class="tpc-dots-row">
$t11{{#unless system.verouille}}<button class="pts-adj-btn pts-adj-dec" data-field="system.pts_resonnance.max" type="button">-</button>{{/unless}}
$t11<div class="tpc-dots" data-field="system.pts_resonnance.value" data-max-field="system.pts_resonnance.max">
$t12{{#each (range system.pts_resonnance.max)}}
$t12<span data-dot-index="{{this}}"
$t13class="tpc-dot {{#ifsuperior this ../system.pts_resonnance.value}}tpc-dot--empty{{else}}tpc-dot--filled{{/ifsuperior}}"></span>
$t12{{/each}}
$t11</div>
$t11{{#unless system.verouille}}<button class="pts-adj-btn pts-adj-inc" data-field="system.pts_resonnance.max" type="button">+</button>{{/unless}}
$t10</div>
"@

# Normaliser les sauts de ligne des heredocs (PowerShell ajoute CRLF)
# -> laisser tel quel car le fichier est aussi en CRLF

Write-Host "Longueur initiale: $($c.Length)"
Write-Host "Ardence old trouvé: $($c.Contains($oldArd))"
Write-Host "Résonnance old trouvé: $($c.Contains($oldRes))"

if ($c.Contains($oldArd)) {
    $c = $c.Replace($oldArd, $newArd)
    Write-Host "Ardence remplacé OK"
} else {
    Write-Host "ERREUR: bloc ardence non trouvé"
}

if ($c.Contains($oldRes)) {
    $c = $c.Replace($oldRes, $newRes)
    Write-Host "Résonnance remplacé OK"
} else {
    Write-Host "ERREUR: bloc résonnance non trouvé"
}

[IO.File]::WriteAllText($f, $c, [Text.Encoding]::UTF8)
Write-Host "Fichier écrit. Longueur finale: $($c.Length)"
