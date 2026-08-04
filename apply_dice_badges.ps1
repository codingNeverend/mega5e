# apply_dice_badges.ps1 - Transforme les cellules tnt-vc en badges dice colorés (mode verrouillé)

$files = @(
    'e:\FoundryVTT\Data\systems\mega\templates\pnj-actor-sheet.html',
    'e:\FoundryVTT\Data\systems\mega\templates\actor-sheet.html'
)

# Pattern : capture le nom du talent (group 1)
# Gère les deux variantes de mise en forme rencontrées dans les templates
$pattern = 'd \{\{#if system\.verouille\}\}\{\{#ifequal\s+system\.talents\.(\w+)\.value\s+99\}\}<input\s+disabled="disabled"\s+class="comb tnt-vi"\s+type="text"\s+value="X"\s*/>\{\{else\}\}<input\s+disabled="disabled"\s+class="comb tnt-vi"\s+type="text"\s+name="system\.talents\.\1\.value"\s+value="\{\{system\.talents\.\1\.value\}\}"\s+data-dtype="Number"\s*/>\{\{/ifequal\}\}\{\{else\}\}<input\s+class="comb tnt-vi"\s+type="text"\s+name="system\.talents\.\1\.value"\s+value="\{\{system\.talents\.\1\.value\}\}"\s+data-dtype="Number"\s*/>\{\{/if\}\}'

# Remplacement : badge rond en mode verouillé, input classique sinon
# $1 = nom du talent (ex: interpreter, langage_corporel, etc.)
$replacement = '{{#if system.verouille}}<span class="dice-badge" data-val="{{#ifequal system.talents.$1.value 99}}X{{else}}{{system.talents.$1.value}}{{/ifequal}}">d{{#ifequal system.talents.$1.value 99}}X{{else}}{{system.talents.$1.value}}{{/ifequal}}</span>{{else}}d <input class="comb tnt-vi" type="text" name="system.talents.$1.value" value="{{system.talents.$1.value}}" data-dtype="Number" />{{/if}}'

$opts = [System.Text.RegularExpressions.RegexOptions]::Singleline

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
    $matches_before = [System.Text.RegularExpressions.Regex]::Matches($content, $pattern, $opts)
    Write-Host "=== $($file.Split('\')[-1]) ==="
    Write-Host "  Cellules trouvees : $($matches_before.Count)"
    if ($matches_before.Count -gt 0) {
        $newContent = [System.Text.RegularExpressions.Regex]::Replace($content, $pattern, $replacement, $opts)
        [System.IO.File]::WriteAllText($file, $newContent, [System.Text.Encoding]::UTF8)
        Write-Host "  -> Fichier mis a jour."
    } else {
        Write-Host "  -> Aucun match, fichier inchange."
    }
}
Write-Host "Termine."
