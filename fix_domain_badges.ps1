$opts = [System.Text.RegularExpressions.RegexOptions]::Singleline
$domains = @(
    @{name='communication'; key='system.domaines.communication.value'},
    @{name='pratique'; key='system.domaines.pratique.value'},
    @{name='culture_milieux'; key='system.domaines.culture_milieux.value'}
)

foreach ($file in @('e:\FoundryVTT\Data\systems\mega\templates\actor-sheet.html','e:\FoundryVTT\Data\systems\mega\templates\pnj-actor-sheet.html')) {
    $c = [System.IO.File]::ReadAllText($file)
    foreach ($d in $domains) {
        $n = $d.name
        $k = [Regex]::Escape($d.key)
        $pat = '<span\s+class="tnt-dd">d<input\s+\{\{#if system\.verouille\}\}disabled="disabled"\s+\{\{/if\}\}\s+class="comb tnt-di" type="text"\s+name="' + $k + '"\s+value="\{\{' + $k + '\}\}"\s+data-dtype="Number" /></span>'
        $rep = '<span class="tnt-dd">{{#if system.verouille}}<span class="dice-badge" data-val="{{' + $d.key + '}}">d{{' + $d.key + '}}</span>{{else}}d<input class="comb tnt-di" type="text" name="' + $d.key + '" value="{{' + $d.key + '}}" data-dtype="Number" />{{/if}}</span>'
        $cnt = [System.Text.RegularExpressions.Regex]::Matches($c, $pat, $opts).Count
        Write-Host "$([IO.Path]::GetFileName($file)) - $n : $cnt match(es)"
        if ($cnt -gt 0) { $c = [System.Text.RegularExpressions.Regex]::Replace($c, $pat, $rep, $opts) }
    }
    [System.IO.File]::WriteAllText($file, $c, [System.Text.Encoding]::UTF8)
    Write-Host "$([IO.Path]::GetFileName($file)) saved."
}
Write-Host "All done."
