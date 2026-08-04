$opts = [System.Text.RegularExpressions.RegexOptions]::Singleline

$files = @(
    'e:\FoundryVTT\Data\systems\mega\templates\actor-sheet.html',
    'e:\FoundryVTT\Data\systems\mega\templates\pnj-actor-sheet.html'
)

foreach ($file in $files) {
    $c = [System.IO.File]::ReadAllText($file)
    $total = 0
    for ($i = 1; $i -le 6; $i++) {
        $ke = [Regex]::Escape("system.rg_spe_$i.value")
        $pat = '<td class="spe-rg">\+<input \{\{#if system\.verouille\}\}disabled="disabled" \{\{/if\}\}\s+class="comb spe-rgi" type="text" name="' + $ke + '"\s+value="\{\{' + $ke + '\}\}" data-dtype="Number" />&nbsp;Rg</td>'
        $rep = '<td class="spe-rg">{{#if system.verouille}}<span class="spe-rg-badge" data-val="{{system.rg_spe_' + $i + '.value}}">+{{system.rg_spe_' + $i + '.value}}Rg</span>{{else}}+<input class="comb spe-rgi" type="text" name="system.rg_spe_' + $i + '.value" value="{{system.rg_spe_' + $i + '.value}}" data-dtype="Number" />&nbsp;Rg{{/if}}</td>'
        $m = [System.Text.RegularExpressions.Regex]::Matches($c, $pat, $opts).Count
        Write-Host "  rg_spe_$i : $m match(es)"
        $total += $m
        if ($m -gt 0) { $c = [System.Text.RegularExpressions.Regex]::Replace($c, $pat, $rep, $opts) }
    }
    [System.IO.File]::WriteAllText($file, $c, [System.Text.Encoding]::UTF8)
    Write-Host "$([IO.Path]::GetFileName($file)) : $total transformations, saved."
}
Write-Host "All done."
