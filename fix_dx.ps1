$old = "99}}X{{else}}"
$new = "99}}<input disabled=`"disabled`" class=`"comb tnt-vi`" type=`"text`" value=`"X`" />{{else}}"
foreach ($f in @("e:\FoundryVTT\Data\systems\mega\templates\actor-sheet.html","e:\FoundryVTT\Data\systems\mega\templates\pnj-actor-sheet.html")) {
    $c = [IO.File]::ReadAllText($f,[Text.Encoding]::UTF8)
    $cn = $c.Replace($old,$new)
    [IO.File]::WriteAllText($f,$cn,[Text.Encoding]::UTF8)
    Write-Host "$f : $($cn.Contains($new))"
}
