$file = "e:\FoundryVTT\Data\systems\mega\templates\actor-sheet.html"
$c = [System.IO.File]::ReadAllText($file)
$opts = [System.Text.RegularExpressions.RegexOptions]::Singleline
$errs = @()

function RX($content, $label, $pat, $rep) {
    $r = [regex]::Replace($content, $pat, $rep, [System.Text.RegularExpressions.RegexOptions]::Singleline)
    if ($r -eq $content) { Write-Host "ECHEC: $label"; $script:errs += $label } else { Write-Host "OK: $label" }
    return $r
}

# tir_1
$c = RX $c "tir_1-infos" `
    '(</span>\{\{#if system\.talents_combat\.tir_1\.label\}\})<br><i[^>]+class="fas fa-bolt"></i>\{\{system\.talents_combat\.tir_1\.charge\}\}\s*/\s*<i[^>]+class="fas fa-ruler-horizontal"></i>\s*\{\{system\.talents_combat\.tir_1\.portee\}\}\s*m(\{\{/if\}\}</td>)' `
    '$1<br><span class="tir-info-badge tir-badge-charge"><i class="fas fa-bolt"></i> {{system.talents_combat.tir_1.charge}}</span> <span class="tir-info-badge tir-badge-portee"><i class="fas fa-ruler-horizontal"></i> {{system.talents_combat.tir_1.portee}} m</span>$2'

# tir_2
$c = RX $c "tir_2-infos" `
    '(</span>\{\{#if system\.talents_combat\.tir_2\.label\}\})<br><i[^>]+class="fas fa-bolt"></i>\{\{system\.talents_combat\.tir_2\.charge\}\}\s*/\s*<i[^>]+class="fas fa-ruler-horizontal"></i>\s*\{\{system\.talents_combat\.tir_2\.portee\}\}\s*m(\{\{/if\}\}</td>)' `
    '$1<br><span class="tir-info-badge tir-badge-charge"><i class="fas fa-bolt"></i> {{system.talents_combat.tir_2.charge}}</span> <span class="tir-info-badge tir-badge-portee"><i class="fas fa-ruler-horizontal"></i> {{system.talents_combat.tir_2.portee}} m</span>$2'

if ($errs.Count -gt 0) { Write-Host "ERREURS - NON SAUVEGARDE" }
else {
    [System.IO.File]::WriteAllText($file, $c, (New-Object System.Text.UTF8Encoding $false))
    Write-Host "OK - sauvegarde. Taille: $((Get-Item $file).Length)"
}
