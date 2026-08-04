$file = "e:\FoundryVTT\Data\systems\mega\templates\actor-sheet.html"
$c = [System.IO.File]::ReadAllText($file)
$errors = @()
$log = @()

function DoReplace($content, $label, $pattern, $replacement) {
    $newContent = [regex]::Replace($content, $pattern, $replacement, [System.Text.RegularExpressions.RegexOptions]::Singleline)
    if ($newContent -eq $content) { $script:log += "ECHEC: $label"; $script:errors += $label }
    else { $script:log += "OK: $label" }
    return $newContent
}

$c = DoReplace $c "Bagarre" '<b>{{system\.talents_combat\.mainsnues\.label}}\s*</b>' '<span class="tech-badge tech-badge-bronze">{{system.talents_combat.mainsnues.label}}</span>'

$simples = @(
    @{ label="mn1"; key="mainsnues1"; color="violet" },
    @{ label="mn2"; key="mainsnues2"; color="violet" },
    @{ label="mn3"; key="mainsnues3"; color="violet" },
    @{ label="ac1"; key="armescourtes_1"; color="blue" },
    @{ label="ac2"; key="armescourtes_2"; color="blue" },
    @{ label="al1"; key="armeslongues_1"; color="green" },
    @{ label="al2"; key="armeslongues_2"; color="green" }
)
foreach ($s in $simples) {
    $pat = '">\s*<span\s+class="tech-badge tech-badge-' + $s.color + '">\{\{system\.talents_combat\.' + $s.key + '\.label\}\}</span>(</span>)'
    $rep = '">{{#if system.talents_combat.' + $s.key + '.label}}<span class="tech-badge tech-badge-' + $s.color + '">{{system.talents_combat.' + $s.key + '.label}}</span>{{/if}}$1'
    $c = DoReplace $c $s.label $pat $rep
}

foreach ($key in @("lancer_1", "lancer_2")) {
    $pat = '(?<=value="' + $key + '"[^>]{0,400}>)\s*<span\s+class="tech-badge tech-badge-amber">(.+?)</span>(</span>)'
    $rep = '{{#if system.talents_combat.' + $key + '.label}}<span class="tech-badge tech-badge-amber">$1</span>{{/if}}$2'
    $c = DoReplace $c $key $pat $rep
}

foreach ($key in @("tir_1", "tir_2")) {
    $pat = '">\s*<span\s+class="tech-badge tech-badge-teal">\{\{system\.talents_combat\.' + $key + '\.label\}\}</span>(<input)'
    $rep = '">{{#if system.talents_combat.' + $key + '.label}}<span class="tech-badge tech-badge-teal">{{system.talents_combat.' + $key + '.label}}</span>{{/if}}$1'
    $c = DoReplace $c $key $pat $rep
}

foreach ($key in @("p1","p2","p3")) {
    $pat = '">\s*<span\s+class="tech-badge tech-badge-armor">\{\{system\.protections\.' + $key + '\.label\}\}</span>(</td>)'
    $rep = '">{{#if system.protections.' + $key + '.label}}<span class="tech-badge tech-badge-armor">{{system.protections.' + $key + '.label}}</span>{{/if}}$1'
    $c = DoReplace $c "$key-armor" $pat $rep
}

$log | ForEach-Object { Write-Host $_ }
if ($errors.Count -gt 0) {
    Write-Host "ERREURS ($($errors.Count)): $($errors -join ', ')"
    Write-Host "FICHIER NON SAUVEGARDE."
} else {
    [System.IO.File]::WriteAllText($file, $c, (New-Object System.Text.UTF8Encoding $false))
    Write-Host "TOUT OK - Fichier sauvegarde. Taille: $((Get-Item $file).Length)"
}
