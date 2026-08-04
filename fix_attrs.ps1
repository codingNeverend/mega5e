$file = "e:\FoundryVTT\Data\systems\mega\templates\actor-sheet.html"
$c = [System.IO.File]::ReadAllText($file)
$log = @()
$errs = @()

function LR($content, $label, $old, $new) {
    if (-not $content.Contains($old)) { $script:log += "ECHEC: $label"; $script:errs += $label; return $content }
    $script:log += "OK: $label"
    return $content.Replace($old, $new)
}

$c = LR $c 'mn1'     'mainsnues1.label}}>{{#if'     'mainsnues1.label}}">{{#if'
$c = LR $c 'mn2'     'mainsnues2.label}}>{{#if'     'mainsnues2.label}}">{{#if'
$c = LR $c 'mn3'     'mainsnues3.label}}>{{#if'     'mainsnues3.label}}">{{#if'
$c = LR $c 'ac1'     'armescourtes_1>{{#if'         'armescourtes_1">{{#if'
$c = LR $c 'ac2'     'armescourtes_2.label}}>{{#if' 'armescourtes_2.label}}">{{#if'
$c = LR $c 'al1'     'armeslongues_1.label}}>{{#if' 'armeslongues_1.label}}">{{#if'
$c = LR $c 'al2'     'armeslongues_2.label}}>{{#if' 'armeslongues_2.label}}">{{#if'
$c = LR $c 'la1'     'lancer_1.label}}">>{{#if'     'lancer_1.label}}">{{#if'
$c = LR $c 'la2'     'lancer_2.label}}">>{{#if'     'lancer_2.label}}">{{#if'
$c = LR $c 'tir1'    'tir_1.label}}>{{#if'          'tir_1.label}}">{{#if'
$c = LR $c 'tir2'    'tir_2.label}}>{{#if'          'tir_2.label}}">{{#if'
$c = LR $c 'p-align' 'align="left>{{#if'            'align="left">{{#if'

# Bagarre: appliquer si <b> est encore present (non-fatal si déjà correct)
$bagarreNew = [regex]::Replace($c, '<b>{{system\.talents_combat\.mainsnues\.label}}\s*</b>',
    '<span class="tech-badge tech-badge-bronze">{{system.talents_combat.mainsnues.label}}</span>',
    [System.Text.RegularExpressions.RegexOptions]::Singleline)
if ($bagarreNew -eq $c) { $log += "INFO: Bagarre deja correct (non-fatal)" } else { $log += "OK: Bagarre"; $c = $bagarreNew }

$log | ForEach-Object { Write-Host $_ }
if ($errs.Count -gt 0) { Write-Host "ERREURS: $($errs -join ', ') - NON SAUVEGARDE" }
else { [System.IO.File]::WriteAllText($file, $c, (New-Object System.Text.UTF8Encoding $false)); Write-Host "OK - sauvegarde. Taille: $((Get-Item $file).Length)" }
