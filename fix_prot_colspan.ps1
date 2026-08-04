$f = "e:\FoundryVTT\Data\systems\mega\templates\pnj-actor-sheet.html"
$c = [IO.File]::ReadAllText($f, [Text.Encoding]::UTF8)
$before = $c.Length
$c = [regex]::Replace($c, '<td align="left">(<span[\s\S]*?tech-badge-armor[\s\S]*?</td>)', '<td align="left" colspan="2">$1', [Text.RegularExpressions.RegexOptions]::Singleline)
[IO.File]::WriteAllText($f, $c, [Text.Encoding]::UTF8)
Write-Host "before=$before after=$($c.Length)"
Select-String "armor" $f | % { "L$($_.LineNumber): $($_.Line.Trim().Substring(0,80))" }
