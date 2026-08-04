$file = "e:\FoundryVTT\Data\systems\mega\templates\actor-sheet.html"
$c = [System.IO.File]::ReadAllText($file)

# Chercher le pattern exact en passant par IndexOf pour diagnostique
$search1 = "fas fa-bolt"
$idx = $c.IndexOf($search1)
if ($idx -ge 0) {
    $c.Substring([Math]::Max(0,$idx-30), 300) | Out-File "e:\FoundryVTT\Data\systems\mega\tir_debug.txt" -Encoding UTF8
    "Trouve a index $idx, snippet dans tir_debug.txt" | Write-Host
} else { "Non trouve" | Write-Host }
